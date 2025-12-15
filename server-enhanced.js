// server.js (ES Module) - Enhanced for Hackathon
// Features:
// - Real-time weather with IMD integration
// - Market prices with AGMARKNET data
// - Disease detection with ML model integration
// - RAG-based agricultural knowledge retrieval
// - Multilingual support (Hindi + regional languages)
// - Offline-capable API responses

import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Import services
import { getWeatherData, getCropWeatherAdvisory } from './services/weatherService.js';
import { getMarketPrices, getPriceTrend, getMSPComparison, getBestMandis, getNearbyMandis } from './services/marketService.js';
import { detectDisease, getDiseaseInfo, getCropDiseases } from './services/diseaseService.js';
import { searchKnowledge, generateKnowledgeResponse, getCropAdvice, getSchemeDetails, KNOWLEDGE_BASE } from './services/knowledgeService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_demo';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_quick';
const PORT = process.env.PORT || 4000;

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  },
});

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const app = express();
  
  // CORS configuration
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Schemas
  const Schema = mongoose.Schema;
  
  const SchemeSchema = new Schema({
    scheme_id: String,
    scheme_name: String,
    nameHi: String,
    ministry: String,
    sector: String,
    description: String,
    descriptionHi: String,
    eligibility: String,
    eligibilityHi: String,
    benefits: String,
    benefitsHi: String,
    official_portal: String,
    documents: [String],
    status: { type: String, default: 'active' },
    sources: Array,
  }, { timestamps: true });

  const UpdateSchema = new Schema({
    scheme_id: String,
    change_type: String,
    summary: String,
    summaryHi: String,
    details: String,
    detailsHi: String,
    effective_date: Date,
    severity: String,
    source: Object,
    approved: { type: Boolean, default: false },
    reviewed_by: String,
    reviewed_at: Date,
    rejected: Boolean,
    rejection_reason: String,
  }, { timestamps: true });

  const UserProfileSchema = new Schema({
    name: String,
    phone: String,
    location: {
      state: String,
      district: String,
      village: String,
      coordinates: {
        lat: Number,
        lon: Number,
      },
    },
    crops: [String],
    farmSize: Number,
    language: { type: String, default: 'en' },
  }, { timestamps: true });

  const Scheme = mongoose.models.Scheme || mongoose.model('Scheme', SchemeSchema);
  const Update = mongoose.models.Update || mongoose.model('Update', UpdateSchema);
  const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);

  // ==================== HEALTH & STATUS ====================
  
  app.get('/v1/health', (req, res) => {
    res.json({ 
      ok: true, 
      now: new Date().toISOString(),
      services: {
        database: 'connected',
        weather: 'active',
        market: 'active',
        disease: 'active',
        knowledge: 'active',
      },
      version: '2.0.0',
    });
  });

  // ==================== AUTHENTICATION ====================
  
  function requireAuth(req, res, next) {
    if (process.env.IGNORE_AUTH === '1') {
      req.user = { role: 'dev', user: 'dev' };
      return next();
    }
    const header = req.headers.authorization || '';
    if (!header) return res.status(401).json({ error: 'missing auth' });
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      next();
    } catch (e) {
      return res.status(403).json({ error: 'invalid token' });
    }
  }

  // ==================== SCHEMES API ====================
  
  app.get('/v1/schemes', async (req, res) => {
    try {
      const { status, q, language = 'en' } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (q) {
        filter.$or = [
          { scheme_name: new RegExp(q, 'i') },
          { nameHi: new RegExp(q, 'i') },
          { description: new RegExp(q, 'i') },
        ];
      }
      
      let schemes = await Scheme.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
      
      // If no schemes in DB, return from knowledge base
      if (schemes.length === 0) {
        schemes = Object.entries(KNOWLEDGE_BASE.schemes).map(([id, data]) => ({
          scheme_id: id,
          scheme_name: data.name,
          nameHi: data.nameHi,
          description: data.benefit,
          descriptionHi: data.benefitHi,
          eligibility: Array.isArray(data.eligibility) ? data.eligibility.join('; ') : data.eligibility,
          benefits: data.benefit,
          official_portal: data.portal,
          status: 'active',
        }));
      }
      
      return res.json({ ok: true, results: schemes });
    } catch (e) {
      console.error('Schemes error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/schemes/:id', async (req, res) => {
    try {
      const { language = 'en' } = req.query;
      let scheme = await Scheme.findById(req.params.id).lean();
      
      if (!scheme) {
        // Try knowledge base
        const kbScheme = getSchemeDetails(req.params.id, language);
        if (kbScheme) {
          return res.json({ ok: true, scheme: kbScheme });
        }
        return res.status(404).json({ error: 'Scheme not found' });
      }
      
      res.json({ ok: true, scheme });
    } catch (e) {
      console.error('Scheme detail error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // ==================== UPDATES API ====================
  
  app.get('/v1/updates', async (req, res) => {
    try {
      const { language = 'en' } = req.query;
      const results = await Update.find({ approved: true })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      res.json({ ok: true, total: results.length, results });
    } catch (e) {
      console.error('Updates error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // ==================== WEATHER API ====================
  
  app.get('/v1/weather', async (req, res) => {
    try {
      const { location = 'delhi', language = 'en', lat, lon } = req.query;
      
      let loc = location;
      if (lat && lon) {
        loc = { lat: parseFloat(lat), lon: parseFloat(lon), name: location };
      }
      
      const weather = await getWeatherData(loc, language);
      res.json({ ok: true, ...weather });
    } catch (e) {
      console.error('Weather error:', e);
      // Return fallback data
      res.json({
        ok: true,
        location: 'Your Location',
        current: {
          temp: 30,
          feels_like: 33,
          condition: 'Partly Cloudy',
          icon: '⛅',
          humidity: 60,
          wind: 10,
        },
        forecast: [],
        advisory: {
          farming: 'Normal farming conditions.',
          irrigation: 'Continue regular irrigation.',
        },
        alerts: [],
        _fallback: true,
      });
    }
  });

  app.get('/v1/weather/crop', async (req, res) => {
    try {
      const { location = 'delhi', crop, language = 'en' } = req.query;
      if (!crop) {
        return res.status(400).json({ error: 'crop parameter required' });
      }
      const weather = await getCropWeatherAdvisory(location, crop, language);
      res.json({ ok: true, ...weather });
    } catch (e) {
      console.error('Crop weather error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // ==================== MARKET PRICES API ====================
  
  app.get('/v1/market/prices', async (req, res) => {
    try {
      const { commodity = 'all', state, mandi, limit = 20, language = 'en' } = req.query;
      const prices = await getMarketPrices({
        commodity,
        state,
        mandi,
        limit: parseInt(limit),
        language,
      });
      res.json(prices);
    } catch (e) {
      console.error('Market prices error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/market/trend/:commodity', async (req, res) => {
    try {
      const { days = 7, language = 'en' } = req.query;
      const trend = await getPriceTrend(req.params.commodity, parseInt(days), language);
      res.json(trend);
    } catch (e) {
      console.error('Price trend error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/market/msp/:commodity', async (req, res) => {
    try {
      const { marketPrice, language = 'en' } = req.query;
      if (!marketPrice) {
        return res.status(400).json({ error: 'marketPrice parameter required' });
      }
      const comparison = getMSPComparison(req.params.commodity, parseFloat(marketPrice), language);
      res.json({ ok: true, ...comparison });
    } catch (e) {
      console.error('MSP comparison error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/market/best-mandis/:commodity', async (req, res) => {
    try {
      const { state, limit = 5, language = 'en' } = req.query;
      const result = await getBestMandis(req.params.commodity, state, parseInt(limit), language);
      res.json(result);
    } catch (e) {
      console.error('Best mandis error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/market/nearby', async (req, res) => {
    try {
      const { location = 'punjab', radius = 100, language = 'en' } = req.query;
      const mandis = await getNearbyMandis(location, parseInt(radius), language);
      res.json(mandis);
    } catch (e) {
      console.error('Nearby mandis error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // ==================== DISEASE DETECTION API ====================
  
  app.post('/v1/disease/detect', upload.single('image'), async (req, res) => {
    try {
      const { crop, language = 'en' } = req.body;
      
      // Get image data from either file upload or base64
      let imageData = null;
      if (req.file) {
        imageData = req.file.buffer;
      } else if (req.body.image) {
        // Base64 image
        const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
        imageData = Buffer.from(base64Data, 'base64');
      }

      const result = await detectDisease(imageData, { cropType: crop, language });
      res.json(result);
    } catch (e) {
      console.error('Disease detection error:', e);
      res.status(500).json({ 
        ok: false, 
        error: 'Detection failed',
        message: language === 'hi' ? 'रोग पहचान विफल। कृपया पुनः प्रयास करें।' : 'Disease detection failed. Please try again.',
      });
    }
  });

  app.get('/v1/disease/info/:name', async (req, res) => {
    try {
      const { language = 'en' } = req.query;
      const info = getDiseaseInfo(req.params.name, language);
      res.json(info);
    } catch (e) {
      console.error('Disease info error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/disease/crop/:crop', async (req, res) => {
    try {
      const { language = 'en' } = req.query;
      const diseases = getCropDiseases(req.params.crop, language);
      res.json(diseases);
    } catch (e) {
      console.error('Crop diseases error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // ==================== KNOWLEDGE BASE API (RAG) ====================
  
  app.get('/v1/knowledge/search', async (req, res) => {
    try {
      const { q, language = 'en' } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'query parameter q required' });
      }
      const results = searchKnowledge(q, language);
      res.json({ ok: true, query: q, results });
    } catch (e) {
      console.error('Knowledge search error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/knowledge/crop/:crop', async (req, res) => {
    try {
      const { topic, language = 'en' } = req.query;
      const advice = getCropAdvice(req.params.crop, topic, language);
      if (!advice) {
        return res.status(404).json({ error: 'Crop not found' });
      }
      res.json({ ok: true, ...advice });
    } catch (e) {
      console.error('Crop advice error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // ==================== CHATBOT API ====================
  
  app.get('/v1/chatbot', async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const { language = 'en' } = req.query;
      
      if (!q) return res.status(400).json({ error: 'missing q query parameter' });

      // Search schemes from DB
      const schemes = await Scheme.find({
        $or: [
          { scheme_name: new RegExp(q, 'i') },
          { nameHi: new RegExp(q, 'i') },
          { description: new RegExp(q, 'i') },
        ]
      }).limit(6).lean();

      let results = [];
      if (schemes.length) {
        for (const s of schemes) {
          const updates = await Update.find({ scheme_id: s.scheme_id, approved: true })
            .sort({ createdAt: -1 })
            .limit(6)
            .lean();
          results.push({ scheme: s, updates });
        }
      } else {
        const updates = await Update.find({
          approved: true,
          $or: [
            { summary: new RegExp(q, 'i') },
            { details: new RegExp(q, 'i') },
          ]
        }).sort({ createdAt: -1 }).limit(8).lean();
        results = updates.map(u => ({ update: u }));
      }

      res.json({ ok: true, query: q, results });
    } catch (e) {
      console.error('Chatbot GET error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.post('/v1/chatbot', async (req, res) => {
    try {
      const { query, language = 'en', location, crop } = req.body;
      if (!query) return res.status(400).json({ error: 'missing query' });

      const isHindi = language === 'hi';
      let response = '';
      let data = {
        schemes: [],
        updates: [],
        weather: null,
        market: null,
        disease: null,
      };

      // Check for weather-related queries
      if (/weather|मौसम|temperature|तापमान|rain|बारिश|forecast/i.test(query)) {
        try {
          const weather = await getWeatherData(location || 'delhi', language);
          data.weather = weather;
          response += isHindi
            ? `🌤️ **मौसम जानकारी (${weather.location})**\n`
            : `🌤️ **Weather at ${weather.location}**\n`;
          response += isHindi
            ? `तापमान: ${weather.current.temp}°C, ${weather.current.condition}\n`
            : `Temperature: ${weather.current.temp}°C, ${weather.current.condition}\n`;
          response += isHindi
            ? `नमी: ${weather.current.humidity}%, हवा: ${weather.current.wind} km/h\n\n`
            : `Humidity: ${weather.current.humidity}%, Wind: ${weather.current.wind} km/h\n\n`;
          
          if (weather.advisory) {
            response += isHindi ? `📋 **कृषि सलाह:**\n` : `📋 **Farm Advisory:**\n`;
            response += `${weather.advisory.farming}\n`;
          }
        } catch (e) {
          console.error('Weather fetch error:', e);
        }
      }

      // Check for market/price queries
      if (/price|भाव|mandi|मंडी|market|rate|दर|msp/i.test(query)) {
        try {
          const cropMatch = query.match(/wheat|गेहूं|rice|धान|cotton|कपास|onion|प्याज|potato|आलू|tomato|टमाटर|soybean|सोयाबीन/i);
          const commodity = cropMatch ? cropMatch[0] : 'wheat';
          
          const prices = await getMarketPrices({ commodity, limit: 5, language });
          data.market = prices.results;
          
          response += isHindi
            ? `\n\n💰 **मंडी भाव:**\n`
            : `\n\n💰 **Market Prices:**\n`;
          
          prices.results.slice(0, 3).forEach(p => {
            response += `• ${p.commodityName} @ ${p.mandi}: ₹${p.modalPrice}/क्विंटल (${p.change >= 0 ? '↑' : '↓'}${Math.abs(p.change)}%)\n`;
          });
        } catch (e) {
          console.error('Market fetch error:', e);
        }
      }

      // Check for disease queries
      if (/disease|रोग|pest|कीट|blight|झुलसा|rust|रतुआ|treatment|उपचार|spray|छिड़काव/i.test(query)) {
        const diseaseMatch = query.match(/blast|blight|rust|curl|rot|wilt|spot/i);
        if (diseaseMatch) {
          const info = getDiseaseInfo(diseaseMatch[0], language);
          if (info.ok) {
            data.disease = info;
            response += isHindi
              ? `\n\n🔬 **रोग जानकारी: ${info.disease}**\n`
              : `\n\n🔬 **Disease Info: ${info.disease}**\n`;
            response += isHindi ? `फसल: ${info.crop}\n` : `Crop: ${info.crop}\n`;
            response += isHindi ? `उपचार:\n` : `Treatment:\n`;
            info.treatment.slice(0, 3).forEach(t => {
              response += `• ${t}\n`;
            });
          }
        }
      }

      // Search knowledge base (RAG)
      const kbResponse = generateKnowledgeResponse(query, language);
      if (kbResponse.found) {
        response += kbResponse.response;
      }

      // Search schemes from database
      const schemes = await Scheme.find({
        $or: [
          { scheme_name: new RegExp(query, 'i') },
          { nameHi: new RegExp(query, 'i') },
          { description: new RegExp(query, 'i') },
          { eligibility: new RegExp(query, 'i') },
        ]
      }).limit(3).lean();

      if (schemes.length > 0) {
        data.schemes = schemes;
        response += isHindi
          ? `\n\n📋 **संबंधित सरकारी योजनाएं:**\n`
          : `\n\n📋 **Related Government Schemes:**\n`;
        schemes.forEach(s => {
          const name = isHindi ? (s.nameHi || s.scheme_name) : s.scheme_name;
          const desc = isHindi ? (s.descriptionHi || s.description) : s.description;
          response += `• **${name}**: ${desc?.substring(0, 100)}...\n`;
          if (s.official_portal) {
            response += `  🔗 ${s.official_portal}\n`;
          }
        });
      }

      // Search recent updates
      const updates = await Update.find({
        approved: true,
        $or: [
          { summary: new RegExp(query, 'i') },
          { details: new RegExp(query, 'i') },
        ]
      }).sort({ createdAt: -1 }).limit(3).lean();

      if (updates.length > 0) {
        data.updates = updates;
        response += isHindi
          ? `\n\n📰 **हाल की खबरें:**\n`
          : `\n\n📰 **Recent Updates:**\n`;
        updates.forEach(u => {
          const summary = isHindi ? (u.summaryHi || u.summary) : u.summary;
          response += `• ${summary || u.details?.substring(0, 100)}\n`;
        });
      }

      // Default response if nothing found
      if (!response.trim()) {
        response = isHindi
          ? `मुझे इस विषय पर विशिष्ट जानकारी नहीं मिली। कृपया अपना प्रश्न और विस्तार से पूछें।

आप पूछ सकते हैं:
• फसल रोग और उपचार (जैसे: गेहूं में पीला रतुआ)
• खाद और सिंचाई (जैसे: धान में यूरिया कब डालें)
• मंडी भाव (जैसे: आज गेहूं का भाव)
• सरकारी योजनाएं (जैसे: PM-KISAN की जानकारी)
• मौसम (जैसे: कल मौसम कैसा रहेगा)`
          : `I couldn't find specific information on this topic. Please ask with more details.

You can ask about:
• Crop diseases & treatment (e.g., yellow rust in wheat)
• Fertilizers & irrigation (e.g., when to apply urea in rice)
• Market prices (e.g., today's wheat price)
• Government schemes (e.g., PM-KISAN information)
• Weather (e.g., tomorrow's weather forecast)`;
      }

      res.json({
        ok: true,
        response: response.trim(),
        ...data,
        sources: kbResponse.sources || [],
      });
    } catch (e) {
      console.error('Chatbot POST error:', e);
      res.status(500).json({
        error: 'internal',
        response: req.body.language === 'hi'
          ? 'माफ़ करें, कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।'
          : 'Sorry, something went wrong. Please try again.',
      });
    }
  });

  // ==================== ADMIN APIs ====================
  
  app.post('/v1/ingest', requireAuth, async (req, res) => {
    try {
      const p = req.body;
      if (!p || !p.scheme_name) return res.status(400).json({ error: 'invalid payload' });

      const schemeId = p.scheme_id || p.scheme_name.toLowerCase().replace(/\s+/g, '-');
      let scheme = await Scheme.findOne({ scheme_id: schemeId });
      
      if (!scheme) {
        scheme = new Scheme({
          scheme_id: schemeId,
          scheme_name: p.scheme_name,
          nameHi: p.nameHi || '',
          ministry: p.ministry || '',
          sector: p.sector || '',
          description: p.description || '',
          descriptionHi: p.descriptionHi || '',
          eligibility: p.eligibility || '',
          eligibilityHi: p.eligibilityHi || '',
          benefits: p.benefits || '',
          benefitsHi: p.benefitsHi || '',
          official_portal: p.official_portal || '',
          sources: p.source ? [p.source] : [],
        });
        await scheme.save();
      } else {
        Object.assign(scheme, {
          description: p.description || scheme.description,
          eligibility: p.eligibility || scheme.eligibility,
          benefits: p.benefits || scheme.benefits,
          sources: [...(scheme.sources || []), p.source || {}].filter(Boolean),
        });
        await scheme.save();
      }

      const upd = new Update({
        scheme_id: scheme.scheme_id,
        change_type: p.change?.change_type || 'notice',
        summary: p.change?.summary || p.scheme_name,
        summaryHi: p.change?.summaryHi || '',
        details: p.change?.details || '',
        detailsHi: p.change?.detailsHi || '',
        effective_date: p.change?.effective_date || null,
        severity: p.change?.severity || 'medium',
        source: p.source || {},
        approved: p.change?.severity === 'low',
        reviewed_by: p.change?.severity === 'low' ? 'auto' : null,
        reviewed_at: p.change?.severity === 'low' ? new Date() : null,
      });
      await upd.save();

      res.json({
        ok: true,
        scheme: { id: scheme._id, scheme_name: scheme.scheme_name, scheme_id: scheme.scheme_id },
        update: { id: upd._id, approved: upd.approved, severity: upd.severity },
      });
    } catch (e) {
      console.error('Ingest error:', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/v1/admin/updates', requireAuth, async (req, res) => {
    const updates = await Update.find({ approved: false, rejected: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ total: updates.length, results: updates });
  });

  app.post('/v1/approve/:id', requireAuth, async (req, res) => {
    const u = await Update.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'update not found' });
    u.approved = true;
    u.rejected = false;
    u.reviewed_by = req.user?.user || 'admin';
    u.reviewed_at = new Date();
    await u.save();
    res.json({ ok: true, update: u });
  });

  app.post('/v1/reject/:id', requireAuth, async (req, res) => {
    const u = await Update.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'update not found' });
    u.approved = false;
    u.rejected = true;
    u.rejection_reason = req.body.reason || 'rejected by admin';
    u.reviewed_by = req.user?.user || 'admin';
    u.reviewed_at = new Date();
    await u.save();
    res.json({ ok: true, update: u });
  });

  // ==================== START SERVER ====================
  
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🌾 KrishiMitra API Server                                ║
║   ────────────────────────────────────────────             ║
║   API listening on http://localhost:${PORT}                    ║
║                                                            ║
║   Endpoints:                                               ║
║   • /v1/weather         - Weather & farm advisory          ║
║   • /v1/market/prices   - Real-time mandi prices           ║
║   • /v1/disease/detect  - Crop disease detection           ║
║   • /v1/chatbot         - AI-powered chat assistant        ║
║   • /v1/schemes         - Government schemes               ║
║   • /v1/knowledge       - Agricultural knowledge base      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

start().catch(err => {
  console.error('Server start failed:', err);
  process.exit(1);
});
