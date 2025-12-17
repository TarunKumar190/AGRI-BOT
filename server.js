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
import { startScraperScheduler } from './auto-scraper.js';
import { getAIResponse, getAIServiceStatus } from './services/aiModelService.js';

dotenv.config();

// External Disease Detection API (ML Model hosted on Render)
const DISEASE_API_URL = 'https://plant-disease-api-yt7l.onrender.com';

// External Price Forecast API (ML Model hosted on Render)
const PRICE_FORECAST_API = 'https://agri-price-forecast.onrender.com';

// ============ AI MODEL CHAINING ============
// Configure in .env:
// - USE_GROK_AI=true/false
// - GROK_API_KEY=your_grok_api_key  
// - CUSTOM_MODEL_URL=your_custom_model_endpoint
// - CUSTOM_MODEL_API_KEY=your_custom_model_api_key (optional)
// - AI_CHAIN_STRATEGY=GROK_FIRST|CUSTOM_FIRST|PARALLEL|REFINE|ROUTE
const USE_GROK_AI = process.env.USE_GROK_AI === 'true';
const GROK_API_KEY = process.env.GROK_API_KEY || '';
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// Agricultural context prompt for Grok
const AGRI_SYSTEM_PROMPT = `You are KrishiMitra (कृषिमित्र), an expert AI assistant for Indian farmers.
You provide advice on:
- Crop diseases, pests, and their treatment
- Fertilizers, irrigation, and soil management
- Government schemes (PM-KISAN, PMFBY, KCC, etc.)
- Market prices and selling strategies
- Seasonal farming practices
- Organic farming techniques

Guidelines:
- Give practical, actionable advice suitable for Indian farming conditions
- Mention specific product names, dosages (e.g., "Mancozeb 75% WP @ 2g/L")
- Include both Hindi and English terms when helpful
- Be concise but comprehensive
- Always recommend consulting local KVK or agriculture officer for serious issues
- Format responses with emojis and bullet points for readability`;

// Keep-alive system to prevent Render cold starts
let diseaseApiStatus = 'cold'; // 'cold', 'warming', 'ready'
let lastWarmupTime = 0;

// Aggressive warm-up function - pings every 3 minutes to keep Render server alive
async function keepDiseaseApiWarm() {
  try {
    console.log('[Disease API] 🔥 Sending keep-alive ping...');
    const startTime = Date.now();
    
    const response = await fetch(`${DISEASE_API_URL}/`, {
      method: 'GET',
      timeout: 60000 // 60 second timeout for warmup
    });
    
    const elapsed = Date.now() - startTime;
    
    if (response.ok) {
      diseaseApiStatus = 'ready';
      lastWarmupTime = Date.now();
      console.log(`[Disease API] ✅ Server is warm! Response time: ${elapsed}ms`);
    } else {
      diseaseApiStatus = 'warming';
      console.log(`[Disease API] ⚠️ Server responded with status ${response.status}`);
    }
  } catch (error) {
    diseaseApiStatus = 'cold';
    console.log(`[Disease API] ❄️ Server appears cold or unavailable: ${error.message}`);
  }
}

// Start keep-alive system
function startDiseaseApiKeepAlive() {
  // Initial warmup
  console.log('[Disease API] 🚀 Starting keep-alive system to prevent cold starts...');
  keepDiseaseApiWarm();
  
  // Ping every 3 minutes (Render sleeps after 15 min of inactivity)
  setInterval(keepDiseaseApiWarm, 3 * 60 * 1000);
  
  console.log('[Disease API] ⏰ Keep-alive scheduled every 3 minutes');
}

// Multer setup for file uploads (in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_demo';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_quick';
const PORT = process.env.PORT || 4000;

/**
 * Call Grok AI for agricultural queries
 * This is a temporary solution - replace with your custom model when ready
 * @param {string} query - User's question
 * @param {string} language - 'hi', 'te', 'mr', or 'en'
 * @param {string} state - User's state for location context
 */
async function callGrokAI(query, language = 'en', state = '') {
  if (!GROK_API_KEY) {
    console.warn('[GROK] API key not configured');
    return null;
  }

  try {
    // Language-specific prompts
    const langPrompts = {
      'hi': `${query}\n\n(कृपया हिंदी में जवाब दें। स्थान: ${state || 'भारत'})`,
      'te': `${query}\n\n(దయచేసి తెలుగులో సమాధానం ఇవ్వండి. స్థానం: ${state || 'భారతదేశం'})`,
      'mr': `${query}\n\n(कृपया मराठीत उत्तर द्या. स्थान: ${state || 'भारत'})`,
      'en': `${query}\n\n(Location context: ${state || 'India'})`
    };
    
    const userMessage = langPrompts[language] || langPrompts['en'];

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: AGRI_SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (aiResponse) {
      // Add AI disclaimer in selected language
      const disclaimers = {
        'hi': '\n\n---\n🤖 *AI द्वारा उत्तर | गंभीर समस्याओं के लिए KVK/कृषि अधिकारी से संपर्क करें*',
        'te': '\n\n---\n🤖 *AI ద్వారా సమాధానం | తీవ్రమైన సమస్యలకు KVK/వ్యవసాయ అధికారిని సంప్రదించండి*',
        'mr': '\n\n---\n🤖 *AI द्वारे उत्तर | गंभीर समस्यांसाठी KVK/कृषी अधिकाऱ्यांशी संपर्क साधा*',
        'en': '\n\n---\n🤖 *AI-powered response | For serious issues, consult your local KVK/agriculture officer*'
      };
      
      const disclaimer = disclaimers[language] || disclaimers['en'];
      return aiResponse + disclaimer;
    }
    
    return null;
  } catch (error) {
    console.error('[GROK] Error calling API:', error.message);
    return null;
  }
}

// ============ CUSTOM MODEL PLACEHOLDER ============
// When your custom model is ready, implement this function
// async function callCustomAgriModel(query, language, state) {
//   const response = await fetch('YOUR_CUSTOM_MODEL_API_URL', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ query, language, state })
//   });
//   const data = await response.json();
//   return data.response;
// }

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

  // AI Service Status Endpoint
  app.get('/v1/ai/status', (req, res) => {
    const status = getAIServiceStatus();
    res.json({
      ok: true,
      ...status,
      timestamp: new Date().toISOString()
    });
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
      
      // ============ PRICE FORECAST/PREDICTION DETECTION ============
      const forecastKeywords = ['forecast', 'prediction', 'predict', 'पूर्वानुमान', 'भविष्य', 'अगले', 'कल का भाव', 'आने वाले', 'future price', 'tomorrow price', 'next week', 'अगले हफ्ते'];
      const isForecastQuery = forecastKeywords.some(kw => queryLower.includes(kw)) && 
                              (queryLower.includes('price') || queryLower.includes('भाव') || queryLower.includes('rate') || queryLower.includes('दाम'));
      
      if (isForecastQuery) {
        console.log(`[CHATBOT] Detected PRICE FORECAST query`);
        
        // Extract crop from query
        const cropMap = {
          'potato': 'Potato', 'आलू': 'Potato', 'aloo': 'Potato',
          'onion': 'Onion', 'प्याज': 'Onion', 'pyaj': 'Onion',
          'tomato': 'Tomato', 'टमाटर': 'Tomato', 'tamatar': 'Tomato',
          'wheat': 'Wheat', 'गेहूं': 'Wheat', 'gehun': 'Wheat',
          'rice': 'Rice', 'चावल': 'Rice', 'धान': 'Rice', 'chawal': 'Rice'
        };
        
        let detectedCrop = null;
        for (const [key, value] of Object.entries(cropMap)) {
          if (queryLower.includes(key)) {
            detectedCrop = value;
            break;
          }
        }
        
        // Get state
        let state = userState || 'Punjab';
        
        if (detectedCrop) {
          try {
            const forecastUrl = `${PRICE_FORECAST_API}/api/forecast?crop=${encodeURIComponent(detectedCrop)}&state=${encodeURIComponent(state)}&days=7`;
            console.log(`[CHATBOT] Fetching forecast: ${forecastUrl}`);
            
            const forecastResponse = await fetch(forecastUrl, { timeout: 60000 });
            const forecastData = await forecastResponse.json();
            
            if (forecastData.success) {
              let response = language === 'hi'
                ? `📈 **${detectedCrop} का भाव पूर्वानुमान (${state})**\n\n`
                : `📈 **${detectedCrop} Price Forecast (${state})**\n\n`;
              
              response += language === 'hi'
                ? `🔮 **7 दिन का पूर्वानुमान:**\n`
                : `🔮 **7-Day Forecast:**\n`;
              
              response += language === 'hi'
                ? `• शुरुआती भाव: ₹${forecastData.start_price?.toFixed(2)}/क्विंटल\n`
                : `• Start Price: ₹${forecastData.start_price?.toFixed(2)}/quintal\n`;
              
              response += language === 'hi'
                ? `• अंतिम भाव: ₹${forecastData.end_price?.toFixed(2)}/क्विंटल\n`
                : `• End Price: ₹${forecastData.end_price?.toFixed(2)}/quintal\n`;
              
              response += language === 'hi'
                ? `• बदलाव: ${forecastData.trend_emoji} ${forecastData.percent_change?.toFixed(2)}%\n`
                : `• Change: ${forecastData.trend_emoji} ${forecastData.percent_change?.toFixed(2)}%\n`;
              
              response += language === 'hi'
                ? `• रुझान: ${forecastData.trend_emoji} ${forecastData.trend}\n\n`
                : `• Trend: ${forecastData.trend_emoji} ${forecastData.trend}\n\n`;
              
              if (forecastData.daily_forecast && forecastData.daily_forecast.length > 0) {
                response += language === 'hi' ? `📅 **दैनिक भाव:**\n` : `📅 **Daily Prices:**\n`;
                forecastData.daily_forecast.slice(0, 5).forEach(day => {
                  const date = new Date(day.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });
                  response += `• ${date}: ₹${day.price?.toFixed(2)}\n`;
                });
              }
              
              response += language === 'hi'
                ? `\n💡 **सुझाव:** ${forecastData.percent_change > 0 ? 'भाव बढ़ने की संभावना है, थोड़ा इंतजार करें।' : 'भाव गिर सकते हैं, जल्दी बेचना बेहतर हो सकता है।'}`
                : `\n💡 **Tip:** ${forecastData.percent_change > 0 ? 'Prices may rise, consider waiting.' : 'Prices may fall, consider selling soon.'}`;
              
              return res.json({ response });
            }
          } catch (err) {
            console.error('[CHATBOT] Forecast API error:', err.message);
          }
        }
        
        // If no crop detected or API failed, show crop selection in chat
        const response = language === 'hi'
          ? `📈 **भाव पूर्वानुमान**\n\nकिस फसल का भाव जानना है? नीचे से चुनें:\n\n🥔 **आलू** - "आलू का भाव पूर्वानुमान"\n🧅 **प्याज** - "प्याज का भाव पूर्वानुमान"\n🌾 **गेहूं** - "गेहूं का भाव पूर्वानुमान"\n🍅 **टमाटर** - "टमाटर का भाव पूर्वानुमान"\n🍚 **चावल** - "चावल का भाव पूर्वानुमान"\n\n💡 बस फसल का नाम लिखें और "भाव पूर्वानुमान" जोड़ें!`
          : `📈 **Price Forecast**\n\nWhich crop price do you want to predict? Choose below:\n\n🥔 **Potato** - "potato price forecast"\n🧅 **Onion** - "onion price forecast"\n🌾 **Wheat** - "wheat price forecast"\n🍅 **Tomato** - "tomato price forecast"\n🍚 **Rice** - "rice price forecast"\n\n💡 Just type the crop name + "price forecast"!`;
        
        return res.json({ response });
      }
      
      // ============ MARKET PRICE DETECTION (CHECK FIRST!) ============
      // Check if user is asking about market prices/mandi rates FIRST before crop advisory
      const marketKeywords = ['price', 'rate', 'mandi', 'market', 'भाव', 'मंडी', 'दाम', 'msp', 'बेचना', 'bhav', 'bazaar', 'sell', 'बेच', 'कीमत', 'किमत', 'ధర', 'మార్కెట్', 'बाजार', 'बाजारभाव'];
      const isMarketQuery = marketKeywords.some(kw => queryLower.includes(kw)) && 
                            !queryLower.includes('scheme') && !queryLower.includes('yojana');
      
      if (isMarketQuery) {
        console.log(`[CHATBOT] Detected MARKET PRICE query`);
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
      
      // ============ CROP ADVISORY DETECTION (AFTER market price check) ============
      // Check if user is asking about crop advice/farming conditions
      const cropKeywords = [
        // Millets
        'मंडुवा', 'मंडुआ', 'mandua', 'mandwa', 'ragi', 'finger millet', 'बाजरा', 'bajra', 'ज्वार', 'jowar',
        // Cereals
        'गेहूं', 'गेहुं', 'wheat', 'धान', 'rice', 'paddy', 'चावल', 'मक्का', 'मक्के', 'maize', 'corn',
        // Pulses
        'चना', 'gram', 'दाल', 'dal', 'उड़द', 'urad', 'मूंग', 'moong', 'अरहर', 'arhar', 'मसूर', 'masoor',
        // Vegetables
        'आलू', 'potato', 'टमाटर', 'tomato', 'प्याज', 'onion', 'लहसुन', 'garlic', 'मिर्च', 'chilli',
        'गोभी', 'cabbage', 'cauliflower', 'बैंगन', 'brinjal', 'भिंडी', 'okra', 'मटर', 'peas',
        // Oilseeds
        'सरसों', 'mustard', 'मूंगफली', 'groundnut', 'सोयाबीन', 'soybean', 'तिल', 'sesame', 'सूरजमुखी', 'sunflower',
        // Cash crops
        'गन्ना', 'sugarcane', 'कपास', 'cotton', 'जूट', 'jute',
        // Fruits
        'आम', 'mango', 'केला', 'banana', 'सेब', 'apple', 'अंगूर', 'grapes', 'संतरा', 'orange',
        // General
        'फसल', 'crop', 'खेती', 'farming', 'बुवाई', 'sowing', 'सिंचाई', 'irrigation', 
        'कृषि', 'agriculture', 'उगाना', 'grow', 'उगाई', 'पैदावार', 'yield'
      ];
      
      const cropAdviceKeywords = [
        // Hindi advice words
        'सलाह', 'advice', 'कैसे', 'how', 'कब', 'when', 'क्या करें', 'what to do',
        'जानकारी', 'information', 'बताओ', 'बताइए', 'बताएं', 'tell',
        'उगाना', 'उगाई', 'उगाएं', 'बुवाई', 'लगाना', 'लगाएं', 'plant',
        'तरीका', 'method', 'विधि', 'technique',
        // Patterns that indicate farming query
        'की खेती', 'का उत्पादन', 'की पैदावार', 'की बुवाई', 'की सिंचाई',
        'में खेती', 'में उगाना', 'में बोना', 'में लगाना'
      ];
      
      const hasCropKeyword = cropKeywords.some(kw => queryLower.includes(kw.toLowerCase()));
      const hasAdviceKeyword = cropAdviceKeywords.some(kw => queryLower.includes(kw.toLowerCase()));
      
      // Also detect if query has pattern: "[location] में [crop] की खेती" or "[crop] [location] में"
      const hasFarmingPattern = /में.*खेती|में.*उगा|में.*बो|खेती.*में|farming.*in|crop.*advice|advice.*crop/i.test(query);
      
      const isCropAdvisoryQuery = hasCropKeyword && (hasAdviceKeyword || hasFarmingPattern);
      
      if (isCropAdvisoryQuery) {
        console.log(`[CHATBOT] Detected CROP ADVISORY query, forwarding to /v1/crop-advice`);
        
        // Forward to crop advice endpoint
        const cropResponse = await fetch(`http://localhost:${PORT}/v1/crop-advice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, lat, lng, state: userState, language })
        });
        
        const cropData = await cropResponse.json();
        return res.json({
          response: cropData.response,
          type: 'crop-advice',
          data: cropData.data
        });
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

      // Default response if nothing found - Use AI Model Chaining Service
      if (!response) {
        console.log('[CHATBOT] No local match found, forwarding to AI Model Chain...');
        try {
          // Get conversation history from request if available
          const conversationHistory = req.body.conversationHistory || [];
          
          const aiResult = await getAIResponse(query, language, userState, conversationHistory);
          if (aiResult.ok && aiResult.response) {
            response = aiResult.response;
            console.log(`[CHATBOT] ✅ AI response received from: ${aiResult.model}`);
          }
        } catch (aiError) {
          console.error('[CHATBOT] AI Chain error:', aiError.message);
        }
        
        // Fallback if AI also fails
        if (!response) {
          response = language === 'hi' 
            ? 'मुझे इस विषय पर विशिष्ट जानकारी नहीं मिली। कृपया अपना प्रश्न और विस्तार से पूछें या फसल का नाम बताएं।\n\nआप पूछ सकते हैं:\n• फसल रोग और उपचार\n• खाद और सिंचाई\n• सरकारी योजनाएं\n• मंडी भाव'
            : 'I could not find specific information on this topic. Please provide more details or mention the crop name.\n\nYou can ask about:\n• Crop diseases and treatment\n• Fertilizers and irrigation\n• Government schemes\n• Market prices';
        }
      }

      // Get AI service status
      const aiStatus = getAIServiceStatus();
      res.json({ ok: true, response, schemes, updates, aiPowered: aiStatus.grokEnabled || aiStatus.customModelEnabled, aiModel: aiStatus.chainStrategy });
    } catch (e) {
      console.error('chatbot POST error', e);
      res.status(500).json({ error: 'internal', response: 'Sorry, something went wrong. Please try again.' });
    }
  });

  // Disease detection endpoint - Proxy to external ML API
  // Server-side proxy with keep-alive ensures faster responses
  app.post('/v1/disease/detect', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const crop = req.body.crop || 'Unknown';
      console.log(`[Disease] Analyzing ${crop} image, size: ${req.file.size} bytes`);
      console.log(`[Disease] API Status: ${diseaseApiStatus}, Last warmup: ${lastWarmupTime ? new Date(lastWarmupTime).toISOString() : 'never'}`);

      // If API was recently warmed (within 5 minutes), it should respond fast
      const timeSinceWarmup = Date.now() - lastWarmupTime;
      const expectedWait = timeSinceWarmup < 5 * 60 * 1000 ? '10-30 seconds' : '1-2 minutes (server warming up)';
      console.log(`[Disease] Expected response time: ${expectedWait}`);

      // Create FormData for external API
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype
      });
      formData.append('crop', crop);

      // Use 2 minute timeout - Render should respond faster with keep-alive
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2 * 60 * 1000);

      const startTime = Date.now();
      
      try {
        // Call external Disease Detection API
        const response = await fetch(`${DISEASE_API_URL}/predict`, {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders(),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`Disease API returned ${response.status}`);
        }

        const data = await response.json();
        console.log(`[Disease] ✅ Detection complete in ${elapsed}ms: ${data.class} (${(data.confidence * 100).toFixed(1)}%)`);
        
        // Update status - API is definitely warm now
        diseaseApiStatus = 'ready';
        lastWarmupTime = Date.now();

        res.json(data);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('[Disease] ❌ Error:', error.message);
      
      // Send proper error - no fallback fake results
      res.status(503).json({
        error: 'Disease detection service temporarily unavailable',
        message: error.name === 'AbortError' 
          ? 'Request timed out. The AI server is starting up. Please try again in 30 seconds.'
          : 'Could not connect to disease detection service. Please try again.',
        retry: true
      });
    }
  });

  // Disease API status endpoint - frontend can check if API is ready
  app.get('/v1/disease/status', (req, res) => {
    const timeSinceWarmup = Date.now() - lastWarmupTime;
    res.json({
      status: diseaseApiStatus,
      lastWarmup: lastWarmupTime ? new Date(lastWarmupTime).toISOString() : null,
      timeSinceWarmup: timeSinceWarmup,
      estimatedResponseTime: timeSinceWarmup < 5 * 60 * 1000 ? 'fast' : 'slow',
      ready: diseaseApiStatus === 'ready' && timeSinceWarmup < 5 * 60 * 1000
    });
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

  // ============ PRICE PREDICTION API (ML Model on Render) ============
  const PRICE_FORECAST_API = 'https://agri-price-forecast.onrender.com';

  // Keep price forecast API warm
  let priceForecastApiStatus = 'cold';
  async function keepPriceForecastApiWarm() {
    try {
      const response = await fetch(`${PRICE_FORECAST_API}/api`, { timeout: 30000 });
      if (response.ok) {
        priceForecastApiStatus = 'ready';
        console.log('[Price Forecast API] ✅ Server is warm');
      }
    } catch (error) {
      priceForecastApiStatus = 'cold';
      console.log('[Price Forecast API] ❄️ Server cold:', error.message);
    }
  }
  // Warm up every 5 minutes
  setInterval(keepPriceForecastApiWarm, 5 * 60 * 1000);
  keepPriceForecastApiWarm(); // Initial warmup

  // Get available crops for price prediction
  app.get('/v1/price-forecast/crops', async (req, res) => {
    try {
      const response = await fetch(`${PRICE_FORECAST_API}/api/crops`);
      const data = await response.json();
      res.json({ ok: true, ...data });
    } catch (error) {
      console.error('[Price Forecast] Crops error:', error);
      res.json({ 
        ok: true, 
        crops: ['Potato', 'Onion', 'Wheat', 'Tomato', 'Rice'] 
      });
    }
  });

  // Get available states for a crop
  app.get('/v1/price-forecast/states', async (req, res) => {
    try {
      const { crop } = req.query;
      const url = crop 
        ? `${PRICE_FORECAST_API}/api/states?crop=${encodeURIComponent(crop)}`
        : `${PRICE_FORECAST_API}/api/states`;
      const response = await fetch(url);
      const data = await response.json();
      res.json({ ok: true, ...data });
    } catch (error) {
      console.error('[Price Forecast] States error:', error);
      res.json({ 
        ok: true, 
        states: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'West Bengal'] 
      });
    }
  });

  // Predict next day price
  app.get('/v1/price-forecast/predict', async (req, res) => {
    try {
      const { crop, state } = req.query;
      if (!crop || !state) {
        return res.status(400).json({ ok: false, error: 'crop and state are required' });
      }
      
      const url = `${PRICE_FORECAST_API}/api/predict?crop=${encodeURIComponent(crop)}&state=${encodeURIComponent(state)}`;
      console.log(`[Price Forecast] Predicting: ${crop} in ${state}`);
      
      const response = await fetch(url, { timeout: 60000 });
      const data = await response.json();
      
      res.json({ ok: true, ...data });
    } catch (error) {
      console.error('[Price Forecast] Predict error:', error);
      res.status(500).json({ ok: false, error: 'Price prediction failed' });
    }
  });

  // Forecast multiple days
  app.get('/v1/price-forecast/forecast', async (req, res) => {
    try {
      const { crop, state, days = 7 } = req.query;
      if (!crop || !state) {
        return res.status(400).json({ ok: false, error: 'crop and state are required' });
      }
      
      const url = `${PRICE_FORECAST_API}/api/forecast?crop=${encodeURIComponent(crop)}&state=${encodeURIComponent(state)}&days=${days}`;
      console.log(`[Price Forecast] Forecasting ${days} days: ${crop} in ${state}`);
      
      const response = await fetch(url, { timeout: 60000 });
      const data = await response.json();
      
      res.json({ ok: true, ...data });
    } catch (error) {
      console.error('[Price Forecast] Forecast error:', error);
      res.status(500).json({ ok: false, error: 'Price forecast failed' });
    }
  });

  // Price forecast API status
  app.get('/v1/price-forecast/status', (req, res) => {
    res.json({
      ok: true,
      status: priceForecastApiStatus,
      message: priceForecastApiStatus === 'ready' 
        ? 'Price prediction model is ready' 
        : 'Model is warming up, may take 30-60 seconds'
    });
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

  // ============ TTS PROXY FOR HINDI SPEECH ============
  // Proxy Google Translate TTS to avoid CORS issues
  app.get('/v1/tts', async (req, res) => {
    const { text, lang = 'hi' } = req.query;
    
    if (!text) {
      return res.status(400).json({ error: 'Text parameter required' });
    }
    
    try {
      const encodedText = encodeURIComponent(text);
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}`;
      
      const response = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://translate.google.com/'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Google TTS returned ${response.status}`);
      }
      
      // Set audio headers
      res.set({
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400' // Cache for 1 day
      });
      
      // Stream the audio
      response.body.pipe(res);
    } catch (error) {
      console.error('[TTS] Error:', error.message);
      res.status(500).json({ error: 'TTS failed: ' + error.message });
    }
  });

  // ============ CROP ADVISORY SYSTEM ============
  // Smart farming advice based on weather, location, and crop type
  // Inspired by the Python voice assistant for farmers
  
  // Crop-specific advice rules (like Python's mandua_advice)
  const CROP_ADVICE_RULES = {
    // Mandua (Ragi/Finger Millet) - Traditional Uttarakhand crop
    'mandua': {
      nameHi: 'मंडुवा',
      nameEn: 'Finger Millet (Ragi)',
      optimalTemp: { min: 20, max: 30 },
      optimalRainfall: { min: 50, max: 150 }, // mm per month
      soilMoisture: { min: 25, max: 60 },
      getAdvice: (temp, rain, moisture, lang) => {
        const advice = [];
        if (rain < 50) {
          advice.push(lang === 'hi' ? 'बारिश कम है। हल्की सिंचाई करें।' : 'Rainfall is low. Do light irrigation.');
        }
        if (temp > 30) {
          advice.push(lang === 'hi' ? 'तापमान अधिक है। सुबह सिंचाई करें।' : 'Temperature is high. Irrigate in morning.');
        }
        if (moisture < 20) {
          advice.push(lang === 'hi' ? 'मिट्टी सूखी है। सिंचाई की आवश्यकता है।' : 'Soil is dry. Irrigation needed.');
        }
        if (advice.length === 0) {
          advice.push(lang === 'hi' ? 'मौसम मंडुवा के लिए अनुकूल है।' : 'Weather is favorable for Mandua cultivation.');
        }
        return advice;
      }
    },
    // Wheat
    'wheat': {
      nameHi: 'गेहूं',
      nameEn: 'Wheat',
      optimalTemp: { min: 15, max: 25 },
      optimalRainfall: { min: 30, max: 100 },
      soilMoisture: { min: 20, max: 50 },
      getAdvice: (temp, rain, moisture, lang) => {
        const advice = [];
        if (temp > 25) {
          advice.push(lang === 'hi' ? 'गर्मी बढ़ रही है। फसल की निगरानी करें।' : 'Temperature rising. Monitor crop closely.');
        }
        if (moisture < 20) {
          advice.push(lang === 'hi' ? 'सिंचाई करें, मिट्टी में नमी कम है।' : 'Irrigate now, soil moisture is low.');
        }
        if (temp < 10) {
          advice.push(lang === 'hi' ? 'पाला पड़ सकता है। फसल को ढकें।' : 'Frost possible. Cover the crop.');
        }
        if (advice.length === 0) {
          advice.push(lang === 'hi' ? 'गेहूं के लिए मौसम अच्छा है।' : 'Weather is good for wheat.');
        }
        return advice;
      }
    },
    // Rice/Paddy
    'rice': {
      nameHi: 'धान',
      nameEn: 'Rice/Paddy',
      optimalTemp: { min: 22, max: 32 },
      optimalRainfall: { min: 100, max: 200 },
      soilMoisture: { min: 50, max: 80 },
      getAdvice: (temp, rain, moisture, lang) => {
        const advice = [];
        if (rain < 80) {
          advice.push(lang === 'hi' ? 'पानी की कमी है। खेत में पानी भरें।' : 'Water shortage. Flood the field.');
        }
        if (temp > 35) {
          advice.push(lang === 'hi' ? 'बहुत गर्मी है। पानी का स्तर बनाए रखें।' : 'Very hot. Maintain water level.');
        }
        if (advice.length === 0) {
          advice.push(lang === 'hi' ? 'धान के लिए मौसम अनुकूल है।' : 'Weather is suitable for rice.');
        }
        return advice;
      }
    },
    // Maize
    'maize': {
      nameHi: 'मक्का',
      nameEn: 'Maize/Corn',
      optimalTemp: { min: 18, max: 32 },
      optimalRainfall: { min: 50, max: 120 },
      soilMoisture: { min: 30, max: 60 },
      getAdvice: (temp, rain, moisture, lang) => {
        const advice = [];
        if (moisture < 25) {
          advice.push(lang === 'hi' ? 'मिट्टी में नमी कम है। सिंचाई करें।' : 'Soil moisture low. Irrigate.');
        }
        if (temp > 35) {
          advice.push(lang === 'hi' ? 'गर्मी से फसल को बचाएं। मल्चिंग करें।' : 'Protect from heat. Do mulching.');
        }
        if (advice.length === 0) {
          advice.push(lang === 'hi' ? 'मक्का के लिए मौसम ठीक है।' : 'Weather is fine for maize.');
        }
        return advice;
      }
    },
    // Potato
    'potato': {
      nameHi: 'आलू',
      nameEn: 'Potato',
      optimalTemp: { min: 15, max: 22 },
      optimalRainfall: { min: 40, max: 80 },
      soilMoisture: { min: 30, max: 50 },
      getAdvice: (temp, rain, moisture, lang) => {
        const advice = [];
        if (temp > 25) {
          advice.push(lang === 'hi' ? 'तापमान ज्यादा है। कंद विकास प्रभावित हो सकता है।' : 'Temperature high. Tuber development may be affected.');
        }
        if (moisture > 60) {
          advice.push(lang === 'hi' ? 'अधिक नमी है। झुलसा रोग का खतरा।' : 'High moisture. Risk of blight disease.');
        }
        if (advice.length === 0) {
          advice.push(lang === 'hi' ? 'आलू के लिए मौसम अच्छा है।' : 'Weather is good for potato.');
        }
        return advice;
      }
    },
    // Tomato
    'tomato': {
      nameHi: 'टमाटर',
      nameEn: 'Tomato',
      optimalTemp: { min: 18, max: 28 },
      optimalRainfall: { min: 40, max: 80 },
      soilMoisture: { min: 35, max: 55 },
      getAdvice: (temp, rain, moisture, lang) => {
        const advice = [];
        if (temp > 32) {
          advice.push(lang === 'hi' ? 'गर्मी में फूल झड़ सकते हैं। छायादार जाली लगाएं।' : 'Flowers may drop in heat. Use shade net.');
        }
        if (moisture > 65) {
          advice.push(lang === 'hi' ? 'अधिक नमी से रोग फैल सकता है। जल निकासी करें।' : 'High moisture may spread disease. Ensure drainage.');
        }
        if (advice.length === 0) {
          advice.push(lang === 'hi' ? 'टमाटर के लिए मौसम ठीक है।' : 'Weather is suitable for tomato.');
        }
        return advice;
      }
    },
    // Default/Generic
    'default': {
      nameHi: 'फसल',
      nameEn: 'Crop',
      getAdvice: (temp, rain, moisture, lang) => {
        const advice = [];
        if (temp > 35) {
          advice.push(lang === 'hi' ? 'बहुत गर्मी है। सुबह-शाम काम करें।' : 'Very hot. Work in morning/evening.');
        }
        if (temp < 10) {
          advice.push(lang === 'hi' ? 'ठंड है। फसल को पाले से बचाएं।' : 'Cold weather. Protect crop from frost.');
        }
        if (rain > 100) {
          advice.push(lang === 'hi' ? 'अधिक बारिश। जल निकासी सुनिश्चित करें।' : 'Heavy rain. Ensure proper drainage.');
        }
        if (advice.length === 0) {
          advice.push(lang === 'hi' ? 'मौसम खेती के लिए अनुकूल है।' : 'Weather is suitable for farming.');
        }
        return advice;
      }
    }
  };

  // Crop name detection from query (Hindi + English) - handles genitive forms
  const detectCrop = (query) => {
    const q = query.toLowerCase();
    // Mandua/Ragi
    if (q.includes('मंडुवा') || q.includes('मंडुआ') || q.includes('mandua') || q.includes('mandwa') || q.includes('ragi') || q.includes('finger millet')) return 'mandua';
    // Wheat
    if (q.includes('गेहूं') || q.includes('गेहुं') || q.includes('गेंहू') || q.includes('wheat') || q.includes('gehun')) return 'wheat';
    // Rice
    if (q.includes('धान') || q.includes('चावल') || q.includes('rice') || q.includes('paddy') || q.includes('chawal')) return 'rice';
    // Maize - handle "मक्के" (genitive form)
    if (q.includes('मक्का') || q.includes('मक्के') || q.includes('maize') || q.includes('corn') || q.includes('makka') || q.includes('makke')) return 'maize';
    // Potato
    if (q.includes('आलू') || q.includes('potato') || q.includes('aloo') || q.includes('aaloo')) return 'potato';
    // Tomato
    if (q.includes('टमाटर') || q.includes('tomato') || q.includes('tamatar')) return 'tomato';
    // Onion
    if (q.includes('प्याज') || q.includes('प्याज़') || q.includes('onion') || q.includes('pyaz') || q.includes('pyaaz')) return 'onion';
    // Sugarcane
    if (q.includes('गन्ना') || q.includes('गन्ने') || q.includes('sugarcane') || q.includes('ganna') || q.includes('ganne')) return 'sugarcane';
    // Mustard
    if (q.includes('सरसों') || q.includes('mustard') || q.includes('sarson')) return 'mustard';
    // Gram/Chana
    if (q.includes('चना') || q.includes('चने') || q.includes('gram') || q.includes('chana') || q.includes('chane')) return 'gram';
    // Bajra
    if (q.includes('बाजरा') || q.includes('बाजरे') || q.includes('bajra') || q.includes('bajre') || q.includes('pearl millet')) return 'bajra';
    // Soybean
    if (q.includes('सोयाबीन') || q.includes('soybean') || q.includes('soya')) return 'soybean';
    // Groundnut
    if (q.includes('मूंगफली') || q.includes('groundnut') || q.includes('peanut') || q.includes('moongfali')) return 'groundnut';
    // Cotton
    if (q.includes('कपास') || q.includes('cotton') || q.includes('kapas')) return 'cotton';
    return 'default';
  };

  // Extract place name from query - IMPROVED for better extraction
  const extractPlaceFromQuery = (query) => {
    // List of crop words to EXCLUDE from place extraction
    const cropWords = [
      // Hindi crop names (all forms)
      'मंडुवा', 'मंडुआ', 'mandua', 'mandwa', 'ragi', 'finger millet',
      'गेहूं', 'गेहुं', 'गेंहू', 'wheat', 'धान', 'rice', 'paddy', 'चावल',
      'मक्का', 'मक्के', 'maize', 'corn', 'आलू', 'potato', 'टमाटर', 'tomato',
      'प्याज', 'प्याज़', 'onion', 'गन्ना', 'गन्ने', 'sugarcane', 'कपास', 'cotton',
      'सोयाबीन', 'soybean', 'सरसों', 'mustard', 'मूंगफली', 'groundnut',
      'चना', 'चने', 'gram', 'उड़द', 'urad', 'मूंग', 'moong', 'अरहर', 'arhar',
      'बाजरा', 'बाजरे', 'bajra', 'ज्वार', 'jowar',
      // Common query words
      'फसल', 'crop', 'खेती', 'farming', 'सलाह', 'advice',
      'जानकारी', 'information', 'बताओ', 'बताइए', 'tell', 'कैसे', 'how', 
      'कब', 'when', 'क्या', 'what', 'about', 'for', 'की', 'का', 'के', 'में'
    ];
    
    // Try to find known district/city names in query FIRST
    const knownPlaces = [
      // Uttarakhand districts
      'chamoli', 'चमोली', 'dehradun', 'देहरादून', 'haridwar', 'हरिद्वार', 
      'nainital', 'नैनीताल', 'almora', 'अल्मोड़ा', 'pithoragarh', 'पिथौरागढ़',
      'rudraprayag', 'रुद्रप्रयाग', 'tehri', 'टिहरी', 'pauri', 'पौड़ी', 'गढ़वाल',
      'uttarkashi', 'उत्तरकाशी', 'bageshwar', 'बागेश्वर', 'champawat', 'चम्पावत',
      'udham singh nagar', 'ऊधम सिंह नगर', 'garhwal', 'rishikesh', 'ऋषिकेश',
      // Uttar Pradesh - Major districts
      'lucknow', 'लखनऊ', 'varanasi', 'वाराणसी', 'agra', 'आगरा', 'kanpur', 'कानपुर',
      'allahabad', 'prayagraj', 'प्रयागराज', 'noida', 'नोएडा', 'ghaziabad', 'गाज़ियाबाद',
      'meerut', 'मेरठ', 'moradabad', 'मुरादाबाद', 'bareilly', 'बरेली', 'aligarh', 'अलीगढ़',
      'mathura', 'मथुरा', 'gorakhpur', 'गोरखपुर', 'jhansi', 'झांसी', 'ayodhya', 'अयोध्या',
      'saharanpur', 'सहारनपुर', 'muzaffarnagar', 'मुज़फ्फरनगर', 'bijnor', 'बिजनौर',
      'rampur', 'रामपुर', 'shahjahanpur', 'शाहजहांपुर', 'budaun', 'बदायूं',
      'firozabad', 'फिरोज़ाबाद', 'mainpuri', 'मैनपुरी', 'etah', 'एटा', 'kasganj', 'कासगंज',
      'farrukhabad', 'फर्रुखाबाद', 'hardoi', 'हरदोई', 'unnao', 'उन्नाव', 'rae bareli', 'रायबरेली',
      'sitapur', 'सीतापुर', 'lakhimpur kheri', 'लखीमपुर खीरी', 'bahraich', 'बहराइच',
      'shravasti', 'श्रावस्ती', 'balrampur', 'बलरामपुर', 'gonda', 'गोंडा', 'basti', 'बस्ती',
      'siddharthnagar', 'सिद्धार्थनगर', 'maharajganj', 'महाराजगंज', 'kushinagar', 'कुशीनगर',
      'deoria', 'देवरिया', 'azamgarh', 'आज़मगढ़', 'mau', 'मऊ', 'ballia', 'बलिया',
      'jaunpur', 'जौनपुर', 'ghazipur', 'ग़ाज़ीपुर', 'chandauli', 'चंदौली', 'mirzapur', 'मिर्ज़ापुर',
      'sonbhadra', 'सोनभद्र', 'sant kabir nagar', 'संत कबीर नगर', 'ambedkar nagar', 'अंबेडकर नगर',
      'sultanpur', 'सुल्तानपुर', 'amethi', 'अमेठी', 'pratapgarh', 'प्रतापगढ़', 'kaushambi', 'कौशांबी',
      'fatehpur', 'फतेहपुर', 'banda', 'बांदा', 'chitrakoot', 'चित्रकूट', 'hamirpur', 'हमीरपुर',
      'mahoba', 'महोबा', 'lalitpur', 'ललितपुर', 'auraiya', 'औरैया', 'etawah', 'इटावा',
      'kannauj', 'कन्नौज', 'kanpur dehat', 'कानपुर देहात',
      // HP districts
      'shimla', 'शिमला', 'manali', 'मनाली', 'kullu', 'कुल्लू', 'kangra', 'कांगड़ा',
      'mandi', 'solan', 'सोलन', 'sirmaur', 'सिरमौर', 'una', 'ऊना', 'bilaspur', 'बिलासपुर',
      'hamirpur', 'chamba', 'चंबा', 'kinnaur', 'किन्नौर', 'lahaul', 'लाहौल', 'spiti', 'स्पिति',
      // Punjab
      'ludhiana', 'लुधियाना', 'amritsar', 'अमृतसर', 'jalandhar', 'जालंधर', 'patiala', 'पटियाला',
      'bathinda', 'बठिंडा', 'mohali', 'मोहाली', 'pathankot', 'पठानकोट', 'hoshiarpur', 'होशियारपुर',
      'gurdaspur', 'गुरदासपुर', 'ferozepur', 'फिरोज़पुर', 'sangrur', 'संगरूर', 'moga', 'मोगा',
      'barnala', 'बरनाला', 'faridkot', 'फरीदकोट', 'muktsar', 'मुक्तसर', 'mansa', 'मानसा',
      'kapurthala', 'कपूरथला', 'nawanshahr', 'नवांशहर', 'rupnagar', 'रूपनगर', 'fatehgarh sahib', 'फतेहगढ़ साहिब',
      // Haryana  
      'gurugram', 'gurgaon', 'गुरुग्राम', 'faridabad', 'फरीदाबाद', 'karnal', 'करनाल',
      'hisar', 'हिसार', 'rohtak', 'रोहतक', 'panipat', 'पानीपत', 'ambala', 'अंबाला',
      'yamunanagar', 'यमुनानगर', 'sonipat', 'सोनीपत', 'jhajjar', 'झज्जर', 'rewari', 'रेवाड़ी',
      'mahendragarh', 'महेंद्रगढ़', 'bhiwani', 'भिवानी', 'jind', 'जींद', 'kaithal', 'कैथल',
      'kurukshetra', 'कुरुक्षेत्र', 'sirsa', 'सिरसा', 'fatehabad', 'फतेहाबाद', 'palwal', 'पलवल',
      'nuh', 'नूह', 'charkhi dadri', 'चरखी दादरी',
      // Rajasthan
      'jaipur', 'जयपुर', 'jodhpur', 'जोधपुर', 'udaipur', 'उदयपुर', 'kota', 'कोटा',
      'ajmer', 'अजमेर', 'bikaner', 'बीकानेर', 'alwar', 'अलवर', 'bharatpur', 'भरतपुर',
      'sikar', 'सीकर', 'pali', 'पाली', 'nagaur', 'नागौर', 'sri ganganagar', 'श्री गंगानगर',
      // MP
      'bhopal', 'भोपाल', 'indore', 'इंदौर', 'gwalior', 'ग्वालियर', 'jabalpur', 'जबलपुर',
      'ujjain', 'उज्जैन', 'sagar', 'सागर', 'rewa', 'रीवा', 'satna', 'सतना',
      // Maharashtra
      'mumbai', 'मुंबई', 'pune', 'पुणे', 'nagpur', 'नागपुर', 'nashik', 'नासिक',
      'aurangabad', 'औरंगाबाद', 'solapur', 'सोलापुर', 'kolhapur', 'कोल्हापुर', 'sangli', 'सांगली',
      // Bihar
      'patna', 'पटना', 'gaya', 'गया', 'muzaffarpur', 'मुज़फ्फरपुर', 'bhagalpur', 'भागलपुर',
      'darbhanga', 'दरभंगा', 'purnia', 'पूर्णिया', 'begusarai', 'बेगूसराय', 'katihar', 'कटिहार',
      // West Bengal
      'kolkata', 'कोलकाता', 'howrah', 'हावड़ा', 'darjeeling', 'दार्जिलिंग', 'siliguri', 'सिलीगुड़ी',
      // Gujarat
      'ahmedabad', 'अहमदाबाद', 'surat', 'सूरत', 'vadodara', 'वडोदरा', 'rajkot', 'राजकोट',
      // Karnataka
      'bangalore', 'bengaluru', 'बैंगलोर', 'mysore', 'mysuru', 'मैसूर', 'hubli', 'हुबली',
      // Tamil Nadu
      'chennai', 'चेन्नई', 'coimbatore', 'कोयंबटूर', 'madurai', 'मदुरई', 'salem', 'सेलम',
      // Andhra Pradesh & Telangana
      'hyderabad', 'हैदराबाद', 'visakhapatnam', 'vizag', 'विशाखापट्टनम', 'vijayawada', 'विजयवाड़ा',
      // Kerala
      'kochi', 'cochin', 'कोच्चि', 'trivandrum', 'thiruvananthapuram', 'तिरुवनंतपुरम',
      // Odisha
      'bhubaneswar', 'भुवनेश्वर', 'cuttack', 'कटक', 'rourkela', 'राउरकेला',
      // Other metros/UTs
      'delhi', 'दिल्ली', 'chandigarh', 'चंडीगढ़', 'jammu', 'जम्मू', 'srinagar', 'श्रीनगर',
      'goa', 'गोवा', 'panaji', 'पणजी', 'puducherry', 'pondicherry', 'पुडुचेरी',
    ];
    
    const queryLower = query.toLowerCase();
    
    // FIRST: Check for known places in query
    for (const place of knownPlaces) {
      if (queryLower.includes(place.toLowerCase())) {
        console.log(`[PLACE] Found known place: "${place}"`);
        return place;
      }
    }
    
    // Remove crop keywords to isolate place
    let cleanQuery = query;
    cropWords.forEach(word => {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    cleanQuery = cleanQuery.trim();
    
    // Common Hindi patterns for place extraction
    const hindiPatterns = [
      /(.+?)\s+में\b/i,           // "चमोली में" -> चमोली
      /(.+?)\s+का\b/i,            // "चमोली का" -> चमोली
      /(.+?)\s+के\s+लिए/i,        // "चमोली के लिए" -> चमोली
      /(.+?)\s+की\b/i,            // "चमोली की" -> चमोली
      /(.+?)\s+पर\b/i,            // "चमोली पर" -> चमोली
    ];
    
    // English patterns - look for place after "in", "at", etc.
    const englishPatterns = [
      /\bin\s+([a-zA-Z]+)(?:\s*\?|\s*$)/i,           // "in pauri?" -> pauri
      /\bat\s+([a-zA-Z]+)(?:\s*\?|\s*$)/i,           // "at pauri?" -> pauri  
      /\bin\s+([a-zA-Z]+)\s+(?:district|area|region)/i,
    ];
    
    // Try English patterns on ORIGINAL query (not cleaned)
    for (const pattern of englishPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const place = match[1].trim().toLowerCase();
        // Make sure it's not a crop word
        if (place.length > 2 && !cropWords.some(c => c.toLowerCase() === place)) {
          console.log(`[PLACE] Extracted from English pattern: "${place}"`);
          return place;
        }
      }
    }
    
    // Try Hindi patterns on cleaned query
    for (const pattern of hindiPatterns) {
      const match = cleanQuery.match(pattern);
      if (match && match[1]) {
        const place = match[1].trim();
        // Filter out common non-place words
        if (place.length > 1 && !['का', 'की', 'के', 'में', 'पर', 'और', 'या'].includes(place)) {
          console.log(`[PLACE] Extracted from Hindi pattern: "${place}"`);
          return place;
        }
      }
    }
    
    return null;
  };

  // Geocode place name to coordinates using Nominatim (like Python's geopy)
  // Does NOT restrict by state - finds the actual location anywhere in India
  const geocodePlaceName = async (placeName, hintState = '') => {
    try {
      // FIRST: Try without state restriction to find actual location
      let searchQuery = `${placeName}, India`;
      let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&addressdetails=1`;
      
      console.log(`[GEOCODE] Searching for: "${searchQuery}"`);
      
      let response = await fetch(url, {
        headers: {
          'User-Agent': 'KrishiMitra-AgriBot/1.0' // Required by Nominatim
        }
      });
      
      let results = await response.json();
      
      // If no results and we have a hint state, try with state as backup
      if ((!results || results.length === 0) && hintState) {
        searchQuery = `${placeName}, ${hintState}, India`;
        url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&addressdetails=1`;
        console.log(`[GEOCODE] Retrying with state hint: "${searchQuery}"`);
        
        response = await fetch(url, {
          headers: { 'User-Agent': 'KrishiMitra-AgriBot/1.0' }
        });
        results = await response.json();
      }
      
      if (results && results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Extract state and district from address - trust the geocoding result
        const address = result.address || {};
        const state = address.state || address.state_district || '';
        const district = address.county || address.city || address.town || address.village || address.state_district || placeName;
        
        console.log(`[GEOCODE] ✅ Found: ${district}, ${state} at (${lat}, ${lng})`);
        
        return {
          lat,
          lng,
          district,
          state,  // This is the ACTUAL state from geocoding, not user's selection
          displayName: result.display_name
        };
      }
      
      console.log(`[GEOCODE] ❌ No results for: "${placeName}"`);
      return null;
    } catch (error) {
      console.error(`[GEOCODE] Error:`, error.message);
      return null;
    }
  };

  // Crop Advisory Endpoint
  app.post('/v1/crop-advice', async (req, res) => {
    try {
      const { query, lat: providedLat, lng: providedLng, state: userSelectedState, language = 'hi' } = req.body;
      
      console.log(`[CROP-ADVICE] Query: "${query}" | User State: ${userSelectedState} | Coords: ${providedLat}, ${providedLng}`);
      
      // Detect crop from query
      const cropKey = detectCrop(query);
      const cropInfo = CROP_ADVICE_RULES[cropKey] || CROP_ADVICE_RULES['default'];
      const cropName = language === 'hi' ? cropInfo.nameHi : cropInfo.nameEn;
      
      // PRIORITY: Extract place from query and geocode it for accurate location
      const extractedPlace = extractPlaceFromQuery(query);
      console.log(`[CROP-ADVICE] Extracted place from query: "${extractedPlace}"`);
      
      let lat = providedLat;
      let lng = providedLng;
      let locationInfo = { state: '', district: '' };
      let placeName = '';
      
      // If we extracted a place name, geocode it to find ACTUAL location (not restricted by user's state)
      if (extractedPlace) {
        console.log(`[CROP-ADVICE] Geocoding "${extractedPlace}" (unrestricted - will find actual state)`);
        const geocoded = await geocodePlaceName(extractedPlace, userSelectedState);
        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
          // TRUST THE GEOCODED STATE - this is the actual location
          locationInfo = {
            state: geocoded.state,  // Actual state from geocoding (e.g., Uttar Pradesh for Moradabad)
            district: geocoded.district
          };
          placeName = geocoded.district || extractedPlace;
          console.log(`[CROP-ADVICE] ✅ Geocoded "${extractedPlace}" to: ${locationInfo.district}, ${locationInfo.state} (${lat}, ${lng})`);
        } else {
          // Fallback: if geocoding fails completely, use user's state
          locationInfo.state = userSelectedState || 'India';
          locationInfo.district = extractedPlace;
          placeName = extractedPlace;
          console.log(`[CROP-ADVICE] ⚠️ Geocoding failed for "${extractedPlace}", using fallback: ${userSelectedState}`);
        }
      } else {
        // No place mentioned in query - use user's selected state from header
        locationInfo.state = userSelectedState || 'India';
        placeName = userSelectedState || 'your area';
        console.log(`[CROP-ADVICE] No place in query, using user-selected state: ${userSelectedState}`);
      }
      
      // Get weather data
      let weatherData = { temp: 25, humidity: 50, rainfall: 30 };
      
      // Fetch real weather if we have coordinates
      if (lat && lng) {
        try {
          // Get 30-day historical weather like Python code
          const end = new Date();
          const start = new Date(end - 30 * 24 * 60 * 60 * 1000);
          
          const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia/Kolkata`;
          
          console.log(`[CROP-ADVICE] Fetching weather for (${lat}, ${lng})`);
          const weatherRes = await fetch(weatherUrl);
          const weatherJson = await weatherRes.json();
          
          if (weatherJson.daily) {
            const temps = weatherJson.daily.temperature_2m_max.map((max, i) => 
              (max + weatherJson.daily.temperature_2m_min[i]) / 2
            );
            const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
            const totalRain = weatherJson.daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
            
            weatherData = {
              temp: Math.round(avgTemp * 10) / 10,
              rainfall: Math.round(totalRain * 10) / 10,
              humidity: 50
            };
            console.log(`[CROP-ADVICE] Weather: ${weatherData.temp}°C, ${weatherData.rainfall}mm rain`);
          }
          
          // Get current weather too
          const currentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m`;
          const currentRes = await fetch(currentUrl);
          const currentJson = await currentRes.json();
          if (currentJson.current) {
            weatherData.currentTemp = Math.round(currentJson.current.temperature_2m);
            weatherData.humidity = currentJson.current.relative_humidity_2m;
          }
        } catch (e) {
          console.error('[CROP-ADVICE] Weather fetch error:', e.message);
        }
        
        // If we don't have location info yet, reverse geocode
        if (!locationInfo.state && !locationInfo.district) {
          try {
            locationInfo = await getStateFromCoordinates(lat, lng);
          } catch (e) {
            console.error('[CROP-ADVICE] Reverse geocode error:', e.message);
          }
        }
      }
      
      // Estimate soil moisture based on rainfall (simplified like Python placeholder)
      const soilMoisture = Math.min(80, Math.max(10, weatherData.rainfall * 0.5 + 20));
      const soilType = weatherData.rainfall > 100 ? 'Clay' : weatherData.rainfall > 50 ? 'Loamy' : 'Sandy';
      
      // Get crop-specific advice
      const adviceList = cropInfo.getAdvice 
        ? cropInfo.getAdvice(weatherData.temp, weatherData.rainfall, soilMoisture, language)
        : CROP_ADVICE_RULES['default'].getAdvice(weatherData.temp, weatherData.rainfall, soilMoisture, language);
      
      // Build response like Python code's speak() output
      let response = '';
      
      if (language === 'hi') {
        response = `🌾 **${cropName} के लिए कृषि सलाह**\n\n`;
        response += `📍 **स्थान:** ${locationInfo.district ? locationInfo.district + ', ' : ''}${locationInfo.state || placeName}\n\n`;
        response += `🌡️ **मौसम जानकारी (पिछले 30 दिन):**\n`;
        response += `• औसत तापमान: ${weatherData.temp}°C\n`;
        if (weatherData.currentTemp) response += `• आज का तापमान: ${weatherData.currentTemp}°C\n`;
        response += `• कुल बारिश: ${weatherData.rainfall} मिमी\n`;
        response += `• आर्द्रता: ${weatherData.humidity}%\n\n`;
        response += `🌱 **मिट्टी की स्थिति:**\n`;
        response += `• मिट्टी का प्रकार: ${soilType === 'Loamy' ? 'दोमट' : soilType === 'Clay' ? 'चिकनी' : 'बलुई'}\n`;
        response += `• मिट्टी की नमी: ${Math.round(soilMoisture)}%\n\n`;
        response += `💡 **सलाह:**\n`;
        adviceList.forEach(advice => {
          response += `• ${advice}\n`;
        });
      } else {
        response = `🌾 **Crop Advisory for ${cropName}**\n\n`;
        response += `📍 **Location:** ${locationInfo.district ? locationInfo.district + ', ' : ''}${locationInfo.state || placeName}\n\n`;
        response += `🌡️ **Weather Data (Last 30 Days):**\n`;
        response += `• Average Temperature: ${weatherData.temp}°C\n`;
        if (weatherData.currentTemp) response += `• Today's Temperature: ${weatherData.currentTemp}°C\n`;
        response += `• Total Rainfall: ${weatherData.rainfall} mm\n`;
        response += `• Humidity: ${weatherData.humidity}%\n\n`;
        response += `🌱 **Soil Condition:**\n`;
        response += `• Soil Type: ${soilType}\n`;
        response += `• Soil Moisture: ${Math.round(soilMoisture)}%\n\n`;
        response += `💡 **Advice:**\n`;
        adviceList.forEach(advice => {
          response += `• ${advice}\n`;
        });
      }
      
      // Add MSP info if available
      const mspData = MSP_RATES[cropKey] || MSP_RATES[cropName.toLowerCase()];
      if (mspData) {
        response += language === 'hi' 
          ? `\n📊 **MSP:** ₹${mspData.msp}/क्विंटल\n`
          : `\n📊 **MSP:** ₹${mspData.msp}/quintal\n`;
      }
      
      res.json({
        success: true,
        response,
        data: {
          crop: cropKey,
          cropName,
          location: locationInfo,
          weather: weatherData,
          soil: { type: soilType, moisture: soilMoisture },
          advice: adviceList
        }
      });
      
    } catch (error) {
      console.error('[CROP-ADVICE] Error:', error);
      res.status(500).json({ 
        error: error.message,
        response: language === 'hi' 
          ? 'कृषि सलाह प्राप्त करने में समस्या हुई। कृपया पुनः प्रयास करें।'
          : 'Error getting crop advice. Please try again.'
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    
    // Start Disease API keep-alive system FIRST (most important for user experience)
    startDiseaseApiKeepAlive();
    
    // Start real data scheduler (fetches live data from government APIs)
    try {
      startRealDataScheduler(6);
      console.log('✅ Real data scheduler started - fetching from government APIs');
    } catch (err) {
      console.error('Data scheduler error:', err.message);
    }
    
    // Start RSS scraper for government scheme updates (runs every 6 hours)
    try {
      startScraperScheduler(6);
      console.log('✅ RSS scraper scheduler started - fetching from PIB and government sources');
    } catch (err) {
      console.error('RSS Scraper error:', err.message);
    }
  });
}

start().catch(err => {
  console.error('Server start failed:', err);
  process.exit(1);
});
