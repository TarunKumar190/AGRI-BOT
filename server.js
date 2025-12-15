// server.js (ES Module) - patched for hackathon:
// - auto-approve low severity
// - keep medium/high in admin review queue
// - admin endpoints: list pending, approve, reject
// - logs requests and auth header to help debug

import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import fetch from 'node-fetch';
import multer from 'multer';
import { 
  fetchRealMandiPrices, 
  getStateFromCoordinates, 
  startRealDataScheduler,
  MSP_RATES 
} from './real-data-scraper.js';

dotenv.config();

// External Disease Detection API (ML Model hosted on Render)
const DISEASE_API_URL = 'https://plant-disease-api-yt7l.onrender.com';

// Multer setup for file uploads (in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_demo';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_quick';
const PORT = process.env.PORT || 4000;

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  // request logger
  app.use((req, res, next) => {
    console.log('[REQ]', new Date().toISOString(), req.method, req.originalUrl);
    next();
  });

  // Schemas (flexible)
  const Schema = mongoose.Schema;
  const SchemeSchema = new Schema({
    scheme_id: String, 
    scheme_name: String, 
    ministry: String, 
    sector: String,
    description: String, 
    eligibility: String, 
    benefits: String, 
    official_portal: String, 
    sources: Array,
    // New fields for better information
    application_deadline: Date,
    last_date_to_apply: String,
    application_status: { type: String, enum: ['open', 'closed', 'upcoming', 'ongoing'], default: 'ongoing' },
    how_to_apply: String,
    documents_required: [String],
    helpline: String,
    last_updated_from_source: Date,
    is_active: { type: Boolean, default: true }
  }, { timestamps: true });
  const UpdateSchema = new Schema({
    scheme_id: String, change_type: String, summary: String, details: String,
    effective_date: Date, severity: String, source: Object,
    approved: { type: Boolean, default: false },
    reviewed_by: String, reviewed_at: Date, rejected: Boolean, rejection_reason: String
  }, { timestamps: true });

  const Scheme = mongoose.model('Scheme', SchemeSchema);
  const Update = mongoose.model('Update', UpdateSchema);

  // health
  app.get('/v1/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

  // public endpoints - schemes
  app.get('/v1/schemes', async (req, res) => {
    try {
      const { status, q } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (q) filter.$or = [
        { scheme_name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') }
      ];
      const schemes = await Scheme.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
      return res.json({ ok: true, results: schemes });
    } catch (e) {
      console.error('schemes error', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/schemes/:id', async (req, res) => {
    const s = await Scheme.findById(req.params.id).lean();
    res.json(s || null);
  });

  // public approved updates
  app.get('/v1/updates', async (req, res) => {
    const results = await Update.find({ approved: true }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ total: results.length, results });
  });

  // simple auth middleware
  function requireAuth(req, res, next) {
    if (process.env.IGNORE_AUTH === '1') { req.user = { role: 'dev', user: 'dev' }; return next(); }
    const header = req.headers.authorization || '';
    console.log('AUTH HEADER:', header);
    if (!header) return res.status(401).json({ error: 'missing auth' });
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      next();
    } catch (e) {
      console.error('JWT verify error:', e.message);
      return res.status(403).json({ error: 'invalid token', message: e.message });
    }
  }

  // ingest endpoint (protected)
  app.post('/v1/ingest', requireAuth, async (req, res) => {
    try {
      const p = req.body;
      if (!p || !p.scheme_name) return res.status(400).json({ error: 'invalid payload' });

      // upsert scheme by scheme_id or name
      const schemeId = p.scheme_id || (p.scheme_name || '').toLowerCase().replace(/\s+/g, '-');
      let scheme = await Scheme.findOne({ scheme_id: schemeId });
      if (!scheme) {
        scheme = new Scheme({
          scheme_id: schemeId,
          scheme_name: p.scheme_name,
          ministry: p.ministry || '',
          sector: p.sector || '',
          description: p.description || '',
          eligibility: p.eligibility || '',
          benefits: p.benefits || '',
          official_portal: p.official_portal || '',
          sources: p.source ? [p.source] : []
        });
        await scheme.save();
      } else {
        // update some fields if provided
        scheme.description = p.description || scheme.description;
        scheme.eligibility = p.eligibility || scheme.eligibility;
        scheme.benefits = p.benefits || scheme.benefits;
        scheme.sources = (scheme.sources || []).concat(p.source || {});
        scheme.last_fetched_at = new Date();
        await scheme.save();
      }

      // create update (diff logic can be extended later)
      const upd = new Update({
        scheme_id: scheme.scheme_id,
        change_type: (p.change && p.change.change_type) || 'notice',
        summary: (p.change && p.change.summary) || p.scheme_name,
        details: (p.change && p.change.details) || '',
        effective_date: (p.change && p.change.effective_date) || null,
        severity: (p.change && p.change.severity) || 'medium',
        source: p.source || {}
      });

      // AUTO-APPROVE rule for hackathon/demo:
      // auto-approve 'low' severity so your front-end has visible content.
      // keep medium/high as unapproved so admins can review.
      if (upd.severity === 'low') {
        upd.approved = true;
        upd.reviewed_by = 'auto';
        upd.reviewed_at = new Date();
      } else {
        upd.approved = false;
        console.log('Queued for review: updateId=', upd._id, 'severity=', upd.severity);
      }

      await upd.save();

      // response
      res.json({
        ok: true,
        scheme: { id: scheme._id, scheme_name: scheme.scheme_name, scheme_id: scheme.scheme_id },
        update: { id: upd._id, approved: upd.approved, severity: upd.severity }
      });
    } catch (e) {
      console.error('Ingest error', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // ADMIN: list pending updates
  app.get('/v1/admin/updates', requireAuth, async (req, res) => {
    const updates = await Update.find({ approved: false, rejected: { $ne: true } }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ total: updates.length, results: updates });
  });

  // ADMIN: approve
  app.post('/v1/approve/:id', requireAuth, async (req, res) => {
    const id = req.params.id;
    const u = await Update.findById(id);
    if (!u) return res.status(404).json({ error: 'update not found' });
    u.approved = true;
    u.rejected = false;
    u.reviewed_by = req.user?.user || 'admin';
    u.reviewed_at = new Date();
    await u.save();
    res.json({ ok: true, update: u });
  });

  // ADMIN: reject
  app.post('/v1/reject/:id', requireAuth, async (req, res) => {
    const id = req.params.id;
    const u = await Update.findById(id);
    if (!u) return res.status(404).json({ error: 'update not found' });
    u.approved = false;
    u.rejected = true;
    u.rejection_reason = req.body.reason || 'rejected by admin';
    u.reviewed_by = req.user?.user || 'admin';
    u.reviewed_at = new Date();
    await u.save();
    res.json({ ok: true, update: u });
  });

  // chatbot GET: search schemes and attach latest updates
  app.get('/v1/chatbot', async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      if (!q) return res.status(400).json({ error: 'missing q query parameter' });

      const schemes = await Scheme.find({ $or: [{ scheme_name: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }] }).limit(6).lean();

      let results = [];
      if (schemes.length) {
        for (const s of schemes) {
          const updates = await Update.find({ scheme_id: s.scheme_id, approved: true }).sort({ createdAt:-1 }).limit(6).lean();
          results.push({ scheme: s, updates });
        }
      } else {
        const updates = await Update.find({ approved: true, $or: [{summary: new RegExp(q,'i')}, {details: new RegExp(q,'i')}] }).sort({ createdAt:-1 }).limit(8).lean();
        results = updates.map(u => ({ update: u }));
      }

      res.json({ ok: true, query: q, results });
    } catch (e) {
      console.error('chatbot error', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // chatbot POST: AI-powered response generation with location support
  app.post('/v1/chatbot', async (req, res) => {
    try {
      const { query, language = 'en', lat, lng, state: userState } = req.body;
      if (!query) return res.status(400).json({ error: 'missing query' });

      console.log(`[CHATBOT] Query: "${query}" | State: ${userState} | Lat: ${lat} | Lng: ${lng}`);

      const queryLower = query.toLowerCase();
      
      // Check if user is asking about market prices/mandi rates FIRST
      const marketKeywords = ['price', 'rate', 'mandi', 'market', 'भाव', 'मंडी', 'दाम', 'msp', 'बेचना', 'bhav', 'bazaar', 'sell', 'बेच'];
      const isMarketQuery = marketKeywords.some(kw => queryLower.includes(kw)) && 
                            !queryLower.includes('scheme') && !queryLower.includes('yojana');
      
      if (isMarketQuery) {
        // Get user's state - PRIORITY: explicit state > geocoded coordinates
        let state = null;
        let locationInfo = null;
        
        // FIRST: Use explicitly provided state (from user's location header)
        if (userState) {
          state = userState;
          console.log(`[CHATBOT] Using user-selected state: ${state}`);
        }
        // SECOND: Try geocoding from coordinates if no state provided
        else if (lat && lng) {
          locationInfo = await getStateFromCoordinates(lat, lng);
          state = locationInfo.state;
          console.log(`[CHATBOT] Geocoded from coordinates: ${state}, ${locationInfo.district}`);
        }
        
        // Fallback to Punjab if nothing available
        if (!state) {
          state = 'Punjab';
          console.log(`[CHATBOT] No location provided, defaulting to Punjab`);
        }
        
        console.log(`[CHATBOT] Final state for mandi prices: ${state}`);
        
        // Fetch mandi prices for user's location
        const mandiData = await fetchRealMandiPrices(state);
        
        if (mandiData && mandiData.prices && mandiData.prices.length > 0) {
          let response = language === 'hi' 
            ? `📊 **${state || 'आपके क्षेत्र'} के मंडी भाव (${mandiData.date})**\n\n`
            : `📊 **Mandi Prices in ${state || 'Your Area'} (${mandiData.date})**\n\n`;
          
          if (locationInfo?.district) {
            response += language === 'hi' 
              ? `📍 आपका स्थान: ${locationInfo.district}, ${state}\n\n`
              : `📍 Your Location: ${locationInfo.district}, ${state}\n\n`;
          }
          
          // Get crop emoji
          const getCropEmoji = (cropName) => {
            const crop = (cropName || '').toLowerCase();
            if (crop.includes('wheat')) return '🌾';
            if (crop.includes('rice') || crop.includes('paddy')) return '🍚';
            if (crop.includes('onion')) return '🧅';
            if (crop.includes('potato')) return '🥔';
            if (crop.includes('tomato')) return '🍅';
            if (crop.includes('cauliflower')) return '🥬';
            if (crop.includes('brinjal')) return '🍆';
            if (crop.includes('chilli') || crop.includes('green chilli')) return '🌶️';
            if (crop.includes('banana')) return '🍌';
            if (crop.includes('spinach')) return '🥬';
            if (crop.includes('cucumber') || crop.includes('kheera')) return '🥒';
            if (crop.includes('soybean') || crop.includes('soya')) return '🫘';
            if (crop.includes('cotton')) return '🧵';
            if (crop.includes('maize')) return '🌽';
            if (crop.includes('groundnut')) return '🥜';
            if (crop.includes('gram') || crop.includes('urd') || crop.includes('urad')) return '🫛';
            return '🌱';
          };
          
          // Hindi translations for crop names
          const getCropNameHindi = (cropName) => {
            const crop = (cropName || '').toLowerCase();
            if (crop.includes('wheat')) return 'गेहूं';
            if (crop.includes('rice') || crop.includes('paddy')) return 'धान/चावल';
            if (crop.includes('onion')) return 'प्याज';
            if (crop.includes('potato')) return 'आलू';
            if (crop.includes('tomato')) return 'टमाटर';
            if (crop.includes('cauliflower')) return 'फूलगोभी';
            if (crop.includes('brinjal')) return 'बैंगन';
            if (crop.includes('chilli') || crop.includes('green chilli')) return 'हरी मिर्च';
            if (crop.includes('banana')) return 'केला';
            if (crop.includes('spinach')) return 'पालक';
            if (crop.includes('cucumber') || crop.includes('kheera')) return 'खीरा';
            if (crop.includes('soybean') || crop.includes('soya')) return 'सोयाबीन';
            if (crop.includes('cotton')) return 'कपास';
            if (crop.includes('maize')) return 'मक्का';
            if (crop.includes('groundnut')) return 'मूंगफली';
            if (crop.includes('gram') || crop.includes('chana')) return 'चना';
            if (crop.includes('urd') || crop.includes('urad')) return 'उड़द';
            if (crop.includes('moong')) return 'मूंग';
            if (crop.includes('mustard')) return 'सरसों';
            if (crop.includes('sugarcane')) return 'गन्ना';
            if (crop.includes('apple')) return 'सेब';
            if (crop.includes('mango')) return 'आम';
            if (crop.includes('ginger')) return 'अदरक';
            if (crop.includes('garlic')) return 'लहसुन';
            if (crop.includes('peas') || crop.includes('pea')) return 'मटर';
            if (crop.includes('carrot')) return 'गाजर';
            if (crop.includes('cabbage')) return 'पत्तागोभी';
            if (crop.includes('radish') || crop.includes('raddish')) return 'मूली';
            if (crop.includes('lentil') || crop.includes('masoor')) return 'मसूर';
            if (crop.includes('bitter gourd')) return 'करेला';
            if (crop.includes('bottle gourd')) return 'लौकी';
            if (crop.includes('lady finger') || crop.includes('okra') || crop.includes('bhindi')) return 'भिंडी';
            if (crop.includes('coriander')) return 'धनिया';
            if (crop.includes('turmeric')) return 'हल्दी';
            return cropName; // Return original if no translation
          };
          
          mandiData.prices.forEach(p => {
            // Handle both real API data (commodity, market) and simulated data (crop, mandi)
            const cropNameEn = p.crop || p.commodity || 'Unknown';
            const cropName = language === 'hi' ? getCropNameHindi(cropNameEn) : cropNameEn;
            const marketName = p.mandi || p.market || (language === 'hi' ? 'स्थानीय मंडी' : 'Local Mandi');
            const district = p.district || '';
            const priceStr = p.price || (p.modalPrice ? `₹${p.modalPrice.toLocaleString('en-IN')}/${language === 'hi' ? 'क्विंटल' : 'quintal'}` : 'N/A');
            const mspStr = p.msp ? (typeof p.msp === 'string' ? p.msp : `₹${p.msp.toLocaleString('en-IN')}`) : null;
            const emoji = p.emoji || getCropEmoji(cropNameEn);
            
            // Calculate trend with Hindi/English support
            let trend = '';
            if (p.trend) {
              // Translate trend if in Hindi
              if (language === 'hi' && p.trend) {
                trend = p.trend
                  .replace(/above MSP/gi, 'MSP से ऊपर')
                  .replace(/below MSP/gi, 'MSP से नीचे')
                  .replace(/At MSP/gi, 'MSP पर')
                  .replace(/Stable/gi, 'स्थिर');
              } else {
                trend = p.trend;
              }
            } else if (p.modalPrice && p.msp) {
              const mspValue = typeof p.msp === 'number' ? p.msp : parseInt(p.msp.replace(/[^0-9]/g, ''));
              const diff = ((p.modalPrice - mspValue) / mspValue * 100).toFixed(1);
              if (language === 'hi') {
                if (diff > 0) trend = `📈 MSP से ${diff}% ऊपर`;
                else if (diff < 0) trend = `📉 MSP से ${Math.abs(diff)}% नीचे`;
                else trend = '➡️ MSP पर';
              } else {
                if (diff > 0) trend = `📈 ${diff}% above MSP`;
                else if (diff < 0) trend = `📉 ${Math.abs(diff)}% below MSP`;
                else trend = '➡️ At MSP';
              }
            }
            
            response += `**${emoji} ${cropName}**\n`;
            response += language === 'hi' 
              ? `  📍 मंडी: ${marketName}${district ? ` (${district})` : ''}\n`
              : `  📍 Mandi: ${marketName}${district ? ` (${district})` : ''}\n`;
            response += language === 'hi'
              ? `  💰 भाव: ${priceStr}\n`
              : `  💰 Price: ${priceStr}\n`;
            if (mspStr) {
              response += language === 'hi'
                ? `  📋 MSP: ${mspStr}\n`
                : `  📋 MSP: ${mspStr}\n`;
            }
            if (trend) response += `  ${trend}\n`;
            response += '\n';
          });
          
          response += language === 'hi'
            ? `\n💡 *MSP = न्यूनतम समर्थन मूल्य (2024-25)*\n📱 लाइव भाव देखें: enam.gov.in\n⚠️ *वास्तविक भाव के लिए स्थानीय मंडी से संपर्क करें*`
            : `\n💡 *MSP = Minimum Support Price (2024-25)*\n📱 Check live: enam.gov.in\n⚠️ *Contact local mandi for exact rates*`;
          
          return res.json({ 
            ok: true, 
            response, 
            isMarketQuery: true, 
            mandiData,
            location: { state, district: locationInfo?.district }
          });
        }
      }
      
      // Check if user is asking about government schemes
      const schemeKeywords = ['scheme', 'yojana', 'योजना', 'government', 'सरकारी', 'pm-kisan', 'pmkisan', 'किसान', 'subsidy', 'सब्सिडी', 'pmfby', 'बीमा', 'insurance', 'loan', 'ऋण', 'kcc', 'credit card', 'किसान क्रेडिट'];
      const isSchemeQuery = schemeKeywords.some(kw => queryLower.includes(kw));

      // Search for relevant schemes - broader search for scheme queries
      let schemes = [];
      if (isSchemeQuery) {
        // Return all schemes if asking generally about schemes
        schemes = await Scheme.find({}).sort({ updatedAt: -1 }).limit(10).lean();
      } else {
        schemes = await Scheme.find({ 
          $or: [
            { scheme_name: new RegExp(query, 'i') }, 
            { description: new RegExp(query, 'i') },
            { eligibility: new RegExp(query, 'i') },
            { sector: new RegExp(query, 'i') }
          ] 
        }).limit(5).lean();
      }

      // Search for relevant updates
      const updates = await Update.find({ 
        approved: true, 
        $or: [
          { summary: new RegExp(query, 'i') }, 
          { details: new RegExp(query, 'i') }
        ] 
      }).sort({ createdAt: -1 }).limit(5).lean();

      // Generate contextual response
      let response = '';
      
      // If asking about government schemes, format nicely
      if (isSchemeQuery && schemes.length > 0) {
        response = language === 'hi' 
          ? '🏛️ **सरकारी योजनाएं (Government Schemes)**\n\nकिसानों के लिए उपलब्ध प्रमुख योजनाएं:\n\n'
          : '🏛️ **Government Schemes for Farmers**\n\nHere are the major schemes available:\n\n';
        
        schemes.forEach((s, idx) => {
          response += `**${idx + 1}. ${s.scheme_name}**\n`;
          response += `📝 ${s.description || 'No description available'}\n`;
          if (s.benefits) response += `✅ Benefits: ${s.benefits}\n`;
          if (s.eligibility) response += `👤 Eligibility: ${s.eligibility}\n`;
          // Show deadline prominently
          if (s.last_date_to_apply) {
            response += `⏰ **Last Date to Apply:** ${s.last_date_to_apply}\n`;
          }
          if (s.application_status) {
            const statusEmoji = s.application_status === 'open' ? '🟢' : s.application_status === 'ongoing' ? '🔵' : '🟡';
            response += `${statusEmoji} Status: ${s.application_status.toUpperCase()}\n`;
          }
          if (s.how_to_apply) response += `📋 How to Apply: ${s.how_to_apply.split('\n')[0]}...\n`;
          if (s.helpline) response += `📞 Helpline: ${s.helpline}\n`;
          if (s.official_portal) response += `🔗 Portal: ${s.official_portal}\n`;
          response += '\n';
        });

        // Add recent updates if any
        if (updates.length > 0) {
          response += language === 'hi' 
            ? '\n📰 **ताज़ा अपडेट:**\n'
            : '\n📰 **Recent Updates:**\n';
          updates.slice(0, 3).forEach(u => {
            response += `• ${u.summary || u.details?.substring(0, 150)}\n`;
          });
        }

        return res.json({ ok: true, response, schemes, updates, isSchemeQuery: true });
      }
      
      // Agriculture knowledge base
      const knowledgeBase = {
        'pest|कीट|insect': 'For pest control, use integrated pest management (IPM). Neem oil spray (5ml/L) is effective for most pests. For specific pests like aphids, use Imidacloprid 17.8 SL @ 0.5ml/L.',
        'fertilizer|खाद|urea': 'Apply fertilizers based on soil test. For wheat: N:P:K = 120:60:40 kg/ha. For rice: N:P:K = 100:50:50 kg/ha. Apply urea in 3 splits.',
        'irrigation|सिंचाई|water': 'Use drip irrigation for 40-60% water savings. Critical irrigation stages: Crown root (21 days), Tillering (45 days), Flowering (70 days), Grain filling (90 days).',
        'wheat|गेहूं': 'Best sowing time: Oct 15 - Nov 15. Seed rate: 100 kg/ha. Varieties: HD-3086, PBW-725, WH-1105. First irrigation at 21 days after sowing.',
        'rice|धान|paddy': 'Transplanting: June-July. Seed rate: 20-25 kg/ha (nursery). NPK: 100:50:50 kg/ha. Harvest at 80% grain maturity.',
        'pm-kisan|किसान': 'PM-KISAN provides ₹6000/year in 3 installments. Check status at pmkisan.gov.in. Required: Aadhaar, bank account, land records.',
        'weather|मौसम': 'Monitor IMD forecasts. Avoid spraying before rain. Ideal spraying: Early morning or evening, wind speed <10 km/h.',
        'disease|रोग|blight': 'For leaf blight: Remove infected parts, apply Mancozeb 75% WP @ 2g/L. For rust: Propiconazole 25% EC @ 1ml/L.',
      };

      // Check knowledge base
      for (const [pattern, answer] of Object.entries(knowledgeBase)) {
        if (new RegExp(pattern, 'i').test(query)) {
          response = answer;
          break;
        }
      }

      // Add scheme information if found (for non-scheme queries)
      if (schemes.length > 0 && !isSchemeQuery) {
        response += '\n\n📋 **Related Government Schemes:**\n';
        schemes.forEach(s => {
          response += `\n• **${s.scheme_name}**: ${s.description?.substring(0, 100)}...`;
          if (s.benefits) response += `\n  ✅ Benefits: ${s.benefits.substring(0, 80)}...`;
        });
      }

      // Add recent updates if found
      if (updates.length > 0) {
        response += '\n\n📰 **Recent Updates:**\n';
        updates.forEach(u => {
          response += `\n• ${u.summary || u.details?.substring(0, 100)}`;
        });
      }

      // Default response if nothing found
      if (!response) {
        response = language === 'hi' 
          ? 'मुझे इस विषय पर विशिष्ट जानकारी नहीं मिली। कृपया अपना प्रश्न और विस्तार से पूछें या फसल का नाम बताएं।\n\nआप पूछ सकते हैं:\n• फसल रोग और उपचार\n• खाद और सिंचाई\n• सरकारी योजनाएं\n• मंडी भाव'
          : 'I could not find specific information on this topic. Please provide more details or mention the crop name.\n\nYou can ask about:\n• Crop diseases and treatment\n• Fertilizers and irrigation\n• Government schemes\n• Market prices';
      }

      res.json({ ok: true, response, schemes, updates });
    } catch (e) {
      console.error('chatbot POST error', e);
      res.status(500).json({ error: 'internal', response: 'Sorry, something went wrong. Please try again.' });
    }
  });

  // Disease detection endpoint - Proxy to external ML API
  // Note: Render free tier has cold starts that can take 30-60 seconds
  app.post('/v1/disease/detect', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const crop = req.body.crop || 'Unknown';
      console.log(`[Disease] Analyzing ${crop} image, size: ${req.file.size} bytes`);
      console.log('[Disease] Calling external API (may take up to 5 minutes for cold start)...');

      // Create FormData for external API
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype
      });
      formData.append('crop', crop);

      // Create AbortController with 5 minute timeout for Render cold starts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes

      try {
        // Call external Disease Detection API with extended timeout
        const response = await fetch(`${DISEASE_API_URL}/predict`, {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders(),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Disease API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('[Disease] Detection result:', data.class, 'Confidence:', data.confidence);

        res.json(data);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('[Disease] Error:', error.message);
      // Fallback response if external API fails
      res.json({
        class: 'Unknown_Disease',
        confidence: 0.5,
        crop: req.body?.crop || 'Unknown',
        error: 'Could not connect to disease detection service. Please try again.',
        fallback: true
      });
    }
  });

  // Weather endpoint - Real weather using Open-Meteo API (free, no API key required)
  app.get('/v1/weather', async (req, res) => {
    try {
      const { lat, lng, state } = req.query;
      
      // Default to Delhi if no coordinates
      const latitude = parseFloat(lat) || 28.7041;
      const longitude = parseFloat(lng) || 77.1025;
      
      // Fetch real weather from Open-Meteo API
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FKolkata`;
      
      const response = await fetch(weatherUrl);
      const data = await response.json();
      
      // Weather code to condition and icon mapping
      const weatherCodeMap = {
        0: { condition: 'Clear', icon: '☀️' },
        1: { condition: 'Mainly Clear', icon: '🌤️' },
        2: { condition: 'Partly Cloudy', icon: '⛅' },
        3: { condition: 'Overcast', icon: '☁️' },
        45: { condition: 'Foggy', icon: '🌫️' },
        48: { condition: 'Rime Fog', icon: '🌫️' },
        51: { condition: 'Light Drizzle', icon: '🌦️' },
        53: { condition: 'Drizzle', icon: '🌦️' },
        55: { condition: 'Heavy Drizzle', icon: '🌧️' },
        61: { condition: 'Light Rain', icon: '🌦️' },
        63: { condition: 'Rain', icon: '🌧️' },
        65: { condition: 'Heavy Rain', icon: '🌧️' },
        71: { condition: 'Light Snow', icon: '🌨️' },
        73: { condition: 'Snow', icon: '❄️' },
        75: { condition: 'Heavy Snow', icon: '❄️' },
        80: { condition: 'Light Showers', icon: '🌦️' },
        81: { condition: 'Showers', icon: '🌧️' },
        82: { condition: 'Heavy Showers', icon: '⛈️' },
        95: { condition: 'Thunderstorm', icon: '⛈️' },
        96: { condition: 'Thunderstorm with Hail', icon: '⛈️' },
        99: { condition: 'Heavy Thunderstorm', icon: '⛈️' },
      };
      
      const currentCode = data.current?.weather_code || 0;
      const weatherInfo = weatherCodeMap[currentCode] || { condition: 'Clear', icon: '☀️' };
      
      // Build 7-day forecast
      const forecast = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      if (data.daily) {
        for (let i = 0; i < Math.min(7, data.daily.time?.length || 0); i++) {
          const date = new Date(data.daily.time[i]);
          const code = data.daily.weather_code[i];
          const forecastInfo = weatherCodeMap[code] || { condition: 'Clear', icon: '☀️' };
          
          forecast.push({
            day: dayNames[date.getDay()],
            icon: forecastInfo.icon,
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            rain: data.daily.precipitation_probability_max[i] || 0,
          });
        }
      }
      
      res.json({
        current: {
          temp: Math.round(data.current?.temperature_2m || 28),
          feels_like: Math.round(data.current?.apparent_temperature || 30),
          condition: weatherInfo.condition,
          icon: weatherInfo.icon,
          humidity: data.current?.relative_humidity_2m || 60,
          wind: Math.round(data.current?.wind_speed_10m || 10),
          uv: 6,
        },
        forecast: forecast,
        location: state || 'India',
        advisory: {
          farming: data.current?.temperature_2m > 35 
            ? 'High temperature. Avoid field work during peak afternoon hours. Ensure adequate water supply for crops.'
            : 'Good weather for farming activities. Monitor soil moisture levels regularly.',
          irrigation: data.current?.relative_humidity_2m < 40
            ? 'Low humidity detected. Consider irrigating in early morning or late evening to minimize water loss.'
            : 'Humidity levels are adequate. Water crops as per regular schedule.',
        },
        alerts: [],
      });
    } catch (error) {
      console.error('Weather API error:', error);
      // Fallback response
      res.json({
        current: {
          temp: 28,
          feels_like: 30,
          condition: 'Clear',
          icon: '☀️',
          humidity: 60,
          wind: 10,
          uv: 6,
        },
        forecast: [],
        location: req.query.state || 'India',
        advisory: {
          farming: 'Weather data temporarily unavailable. Check local conditions before field work.',
          irrigation: 'Follow standard irrigation schedule.',
        },
        alerts: [],
      });
    }
  });

  // Market prices endpoint - with location support
  app.get('/v1/market/prices', async (req, res) => {
    try {
      const { lat, lng, state: userState } = req.query;
      
      // Get user's state from coordinates or use provided state
      let state = userState;
      let locationInfo = null;
      
      if (!state && lat && lng) {
        locationInfo = await getStateFromCoordinates(parseFloat(lat), parseFloat(lng));
        state = locationInfo.state;
        console.log(`[MARKET API] Location: ${state}, ${locationInfo.district}`);
      }
      
      const mandiData = await fetchRealMandiPrices(state);
      
      // Map the prices data to a consistent format
      // Handles both real API data and simulated data
      const results = mandiData.prices.map((p, idx) => {
        // Determine crop emoji
        const getEmoji = (cropName) => {
          const crop = (cropName || '').toLowerCase();
          if (crop.includes('wheat') || crop.includes('गेहूं')) return '🌾';
          if (crop.includes('rice') || crop.includes('paddy') || crop.includes('धान')) return '🍚';
          if (crop.includes('soy') || crop.includes('सोया')) return '🫘';
          if (crop.includes('cotton') || crop.includes('कपास')) return '🧵';
          if (crop.includes('maize') || crop.includes('मक्का')) return '🌽';
          if (crop.includes('groundnut') || crop.includes('मूंगफली')) return '🥜';
          if (crop.includes('mustard') || crop.includes('सरसों')) return '🌻';
          if (crop.includes('gram') || crop.includes('chana') || crop.includes('चना')) return '🫛';
          if (crop.includes('onion') || crop.includes('प्याज')) return '🧅';
          if (crop.includes('potato') || crop.includes('आलू')) return '🥔';
          if (crop.includes('tomato') || crop.includes('टमाटर')) return '🍅';
          return p.emoji || '🌱';
        };
        
        const cropName = p.crop || p.commodity || 'Unknown';
        const marketName = p.mandi || p.market || 'Local Mandi';
        const priceStr = p.price || (p.modalPrice ? `₹${p.modalPrice.toLocaleString('en-IN')}/quintal` : 'N/A');
        const mspStr = p.msp ? (typeof p.msp === 'string' ? p.msp : `₹${p.msp.toLocaleString('en-IN')}`) : null;
        const trend = p.trend || (p.modalPrice && MSP_RATES[p.commodity?.toLowerCase()] 
          ? (p.modalPrice > MSP_RATES[p.commodity.toLowerCase()] ? '📈 Above MSP' : '📉 Below MSP')
          : '→ At market');
        
        return {
          id: idx + 1,
          crop: cropName,
          emoji: getEmoji(cropName),
          mandi: marketName,
          state: p.state || state || 'India',
          district: p.district || locationInfo?.district || '',
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          modalPrice: p.modalPrice,
          price: priceStr,
          msp: mspStr,
          trend: trend,
        };
      });
      
      res.json({
        ok: true,
        date: mandiData.date,
        source: mandiData.source,
        location: locationInfo ? { state, district: locationInfo.district } : { state: state || 'All India' },
        results,
      });
    } catch (error) {
      console.error('Market API error:', error);
      res.json({
        ok: false,
        error: 'Failed to fetch market prices',
        results: [
          { id: 1, crop: 'Wheat', emoji: '🌾', mandi: 'Khanna', state: 'Punjab', price: '₹2,250/qt', msp: '₹2,275/qt', trend: '📈 Above MSP' },
          { id: 2, crop: 'Rice', emoji: '🍚', mandi: 'Karnal', state: 'Haryana', price: '₹2,100/qt', msp: '₹2,300/qt', trend: '📉 Below MSP' },
        ],
      });
    }
  });

  // Manual refresh endpoint for schemes
  app.post('/v1/refresh-schemes', requireAuth, async (req, res) => {
    try {
      console.log('🔄 Manual scheme refresh triggered');
      const schemes = await scrapeAllSchemes();
      
      for (const scheme of schemes) {
        await Scheme.findOneAndUpdate(
          { scheme_id: scheme.scheme_id },
          { $set: { ...scheme, last_updated_from_source: new Date() } },
          { upsert: true }
        );
      }
      
      res.json({ ok: true, message: `Refreshed ${schemes.length} schemes`, schemes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    // Start real data scheduler (fetches live data from government APIs)
    try {
      startRealDataScheduler(6);
      console.log('✅ Real data scheduler started - fetching from government APIs');
    } catch (err) {
      console.error('Data scheduler error:', err.message);
    }
  });
}

start().catch(err => {
  console.error('Server start failed:', err);
  process.exit(1);
});
