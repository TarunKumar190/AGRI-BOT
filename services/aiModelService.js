/**
 * LangChain-Style AI Model Service for KrishiMitra
 * 
 * Chain Flow: Custom Knowledge Base → Grok AI (fallback)
 * 
 * 1. First queries local knowledge base (training data, scraped data)
 * 2. Then real-time APIs (mandi prices, weather, disease)
 * 3. Finally Grok AI for unanswered queries
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment
const USE_GROK_AI = process.env.USE_GROK_AI === 'true';
const GROK_API_KEY = process.env.GROK_API_KEY || '';
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// Real-time API keys
const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';

// Chaining strategy
const CHAIN_STRATEGY = process.env.AI_CHAIN_STRATEGY || 'CUSTOM_FIRST';

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

// Language-specific disclaimers
const DISCLAIMERS = {
  'hi': '\n\n---\n🤖 *AI द्वारा उत्तर | गंभीर समस्याओं के लिए KVK/कृषि अधिकारी से संपर्क करें*',
  'te': '\n\n---\n🤖 *AI ద్వారా సమాధానం | తీవ్రమైన సమస్యలకు KVK/వ్యవసాయ అధికారిని సంప్రదించండి*',
  'mr': '\n\n---\n🤖 *AI द्वारे उत्तर | गंभीर समस्यांसाठी KVK/कृषी अधिकाऱ्यांशी संपर्क साधा*',
  'en': '\n\n---\n🤖 *AI-powered response | For serious issues, consult your local KVK/agriculture officer*'
};

// ============ KNOWLEDGE BASE (Local Training Data) ============
let knowledgeBase = null;

/**
 * Load training data into knowledge base
 */
function loadKnowledgeBase() {
  if (knowledgeBase) return knowledgeBase;
  
  console.log('[LangChain] Loading knowledge base from training data...');
  knowledgeBase = {
    qaData: [],
    schemes: [],
    diseases: [],
    crops: [],
    intents: []
  };

  const trainingDataDir = path.join(__dirname, '..', 'llm_training_data');
  
  try {
    // Load Q&A training data
    const qaFiles = [
      'MASSIVE_QA_PART1_MANDI.json',
      'MASSIVE_QA_PART2_CROP_ADVISORY.json',
      'MASSIVE_QA_PART3_DISEASES.json',
      'MASSIVE_QA_PART4_SCHEMES.json',
      'MASSIVE_QA_PART5_WEATHER.json',
      'MASSIVE_QA_PART6_FERTILIZER_PEST.json',
      'MASSIVE_QA_PART7_CONVERSATIONS.json'
    ];

    for (const file of qaFiles) {
      const filePath = path.join(trainingDataDir, file);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (data.qa_pairs) {
          knowledgeBase.qaData.push(...data.qa_pairs);
        }
        if (data.training_examples) {
          knowledgeBase.qaData.push(...data.training_examples);
        }
      }
    }

    // Load schemes data
    const schemesFile = path.join(trainingDataDir, 'government_schemes.json');
    if (fs.existsSync(schemesFile)) {
      const data = JSON.parse(fs.readFileSync(schemesFile, 'utf-8'));
      knowledgeBase.schemes = data.schemes || [];
    }

    // Load disease data
    const diseaseFile = path.join(trainingDataDir, 'DISEASE_PEST_DATABASE.json');
    if (fs.existsSync(diseaseFile)) {
      const data = JSON.parse(fs.readFileSync(diseaseFile, 'utf-8'));
      knowledgeBase.diseases = data.diseases || [];
    }

    // Load crop data
    const cropFile = path.join(trainingDataDir, 'CROP_CULTIVATION_GUIDE.json');
    if (fs.existsSync(cropFile)) {
      const data = JSON.parse(fs.readFileSync(cropFile, 'utf-8'));
      knowledgeBase.crops = data.crops || [];
    }

    // Load intent patterns
    const intentFile = path.join(trainingDataDir, 'query_patterns_intents.json');
    if (fs.existsSync(intentFile)) {
      const data = JSON.parse(fs.readFileSync(intentFile, 'utf-8'));
      knowledgeBase.intents = data.intents || [];
    }

    console.log(`[LangChain] ✅ Knowledge base loaded: ${knowledgeBase.qaData.length} Q&A pairs`);
  } catch (error) {
    console.error('[LangChain] Error loading knowledge base:', error.message);
  }

  return knowledgeBase;
}

/**
 * Detect query intent
 */
function detectIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  // Intent patterns
  const intentPatterns = {
    'MANDI_PRICE': ['price', 'rate', 'mandi', 'bhav', 'भाव', 'दाम', 'रेट', 'मंडी', 'sell', 'बेचना'],
    'WEATHER': ['weather', 'rain', 'temperature', 'forecast', 'मौसम', 'बारिश', 'तापमान'],
    'DISEASE': ['disease', 'pest', 'insect', 'fungus', 'रोग', 'कीट', 'बीमारी', 'spot', 'yellow', 'wilt'],
    'SCHEME': ['scheme', 'yojana', 'subsidy', 'loan', 'pm-kisan', 'pmfby', 'योजना', 'सब्सिडी', 'ऋण', 'किसान'],
    'FERTILIZER': ['fertilizer', 'urea', 'dap', 'npk', 'manure', 'खाद', 'उर्वरक', 'यूरिया'],
    'IRRIGATION': ['irrigation', 'water', 'drip', 'सिंचाई', 'पानी', 'sprinkler'],
    'CROP_ADVISORY': ['sow', 'plant', 'harvest', 'बुवाई', 'रोपाई', 'कटाई', 'cultivation', 'खेती']
  };

  for (const [intent, keywords] of Object.entries(intentPatterns)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      return intent;
    }
  }
  
  return 'GENERAL';
}

/**
 * Search knowledge base for relevant Q&A
 */
function searchKnowledgeBase(query, language = 'en') {
  const kb = loadKnowledgeBase();
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  
  let bestMatch = null;
  let bestScore = 0;

  // Search Q&A pairs
  for (const qa of kb.qaData) {
    const question = (qa.question?.en || qa.question || '').toLowerCase();
    const questionHi = (qa.question?.hi || '').toLowerCase();
    
    let score = 0;
    for (const word of words) {
      if (question.includes(word)) score += 2;
      if (questionHi.includes(word)) score += 2;
    }

    // Boost exact phrase matches
    if (question.includes(lowerQuery) || questionHi.includes(lowerQuery)) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  // Return if good match found (threshold: 4 points = 2 matching words)
  if (bestMatch && bestScore >= 4) {
    const answer = language === 'hi' 
      ? (bestMatch.answer?.hi || bestMatch.answer?.en || bestMatch.answer)
      : (bestMatch.answer?.en || bestMatch.answer);
    
    return {
      found: true,
      response: answer,
      confidence: Math.min(bestScore / 10, 1),
      source: 'knowledge_base',
      intent: bestMatch.intent || detectIntent(query)
    };
  }

  return { found: false };
}

/**
 * Search schemes database
 */
function searchSchemes(query, language = 'en') {
  const kb = loadKnowledgeBase();
  const lowerQuery = query.toLowerCase();
  
  const matchedSchemes = kb.schemes.filter(scheme => {
    const name = (scheme.name || scheme.scheme_name || '').toLowerCase();
    const desc = (scheme.description || '').toLowerCase();
    return lowerQuery.split(' ').some(word => 
      name.includes(word) || desc.includes(word)
    );
  });

  if (matchedSchemes.length > 0) {
    let response = language === 'hi' ? '🏛️ **संबंधित योजनाएं:**\n\n' : '🏛️ **Related Government Schemes:**\n\n';
    
    matchedSchemes.slice(0, 3).forEach(scheme => {
      response += `**${scheme.name || scheme.scheme_name}**\n`;
      response += `📋 ${scheme.description?.substring(0, 200)}...\n`;
      if (scheme.benefits) response += `✅ Benefits: ${scheme.benefits.substring(0, 100)}...\n`;
      if (scheme.eligibility) response += `👤 Eligibility: ${scheme.eligibility.substring(0, 100)}...\n`;
      if (scheme.official_portal) response += `🔗 Portal: ${scheme.official_portal}\n`;
      response += '\n';
    });

    return {
      found: true,
      response: response,
      confidence: 0.8,
      source: 'schemes_database'
    };
  }

  return { found: false };
}

/**
 * Search disease database
 */
function searchDiseases(query, language = 'en') {
  const kb = loadKnowledgeBase();
  const lowerQuery = query.toLowerCase();
  
  const matchedDiseases = kb.diseases.filter(disease => {
    const name = (disease.name || disease.disease_name || '').toLowerCase();
    const symptoms = (disease.symptoms || []).join(' ').toLowerCase();
    const crops = (disease.affected_crops || []).join(' ').toLowerCase();
    return lowerQuery.split(' ').some(word => 
      name.includes(word) || symptoms.includes(word) || crops.includes(word)
    );
  });

  if (matchedDiseases.length > 0) {
    const disease = matchedDiseases[0];
    let response = language === 'hi' ? '🦠 **रोग की जानकारी:**\n\n' : '🦠 **Disease Information:**\n\n';
    
    response += `**${disease.name || disease.disease_name}**\n\n`;
    if (disease.symptoms) {
      response += `📋 **Symptoms:** ${Array.isArray(disease.symptoms) ? disease.symptoms.join(', ') : disease.symptoms}\n\n`;
    }
    if (disease.treatment) {
      response += `💊 **Treatment:**\n${Array.isArray(disease.treatment) ? disease.treatment.join('\n• ') : disease.treatment}\n\n`;
    }
    if (disease.prevention) {
      response += `🛡️ **Prevention:**\n${Array.isArray(disease.prevention) ? disease.prevention.join('\n• ') : disease.prevention}\n`;
    }

    return {
      found: true,
      response: response,
      confidence: 0.85,
      source: 'disease_database'
    };
  }

  return { found: false };
}

// ============ REAL-TIME APIs ============

/**
 * Fetch real-time mandi prices
 */
async function fetchMandiPrices(commodity, state) {
  try {
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${DATA_GOV_API_KEY}&format=json&limit=10`;
    const params = new URLSearchParams();
    if (commodity) params.append('filters[commodity]', commodity);
    if (state) params.append('filters[state]', state);
    
    const response = await fetch(`${url}&${params.toString()}`, { timeout: 10000 });
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.records && data.records.length > 0) {
      let result = '📊 **Live Mandi Prices:**\n\n';
      data.records.slice(0, 5).forEach(record => {
        result += `🌾 **${record.commodity}** (${record.variety || 'Standard'})\n`;
        result += `📍 ${record.market}, ${record.district}, ${record.state}\n`;
        result += `💰 Price: ₹${record.min_price} - ₹${record.max_price}/quintal\n`;
        result += `📈 Modal: ₹${record.modal_price}/quintal\n`;
        result += `📅 Date: ${record.arrival_date}\n\n`;
      });
      return { found: true, response: result, source: 'mandi_api' };
    }
  } catch (error) {
    console.error('[LangChain] Mandi API error:', error.message);
  }
  return { found: false };
}

/**
 * Fetch weather data
 */
async function fetchWeather(lat, lon, city) {
  if (!OPENWEATHER_API_KEY) return { found: false };
  
  try {
    let url = `https://api.openweathermap.org/data/2.5/weather?appid=${OPENWEATHER_API_KEY}&units=metric`;
    if (lat && lon) {
      url += `&lat=${lat}&lon=${lon}`;
    } else if (city) {
      url += `&q=${encodeURIComponent(city)},IN`;
    } else {
      return { found: false };
    }

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) return { found: false };
    
    const data = await response.json();
    let result = `🌤️ **Weather Update:**\n\n`;
    result += `📍 **${data.name}**\n`;
    result += `🌡️ Temperature: ${data.main.temp}°C (Feels like: ${data.main.feels_like}°C)\n`;
    result += `💧 Humidity: ${data.main.humidity}%\n`;
    result += `☁️ Conditions: ${data.weather[0]?.description || 'N/A'}\n`;
    result += `💨 Wind: ${data.wind.speed} m/s\n`;
    if (data.rain) result += `🌧️ Rain (1h): ${data.rain['1h']}mm\n`;

    return { found: true, response: result, source: 'weather_api' };
  } catch (error) {
    console.error('[LangChain] Weather API error:', error.message);
  }
  return { found: false };
}

// ============ GROK AI (Fallback) ============

/**
 * Call Grok AI API as fallback
 */
async function callGrokAI(query, language = 'en', state = '', conversationHistory = []) {
  if (!GROK_API_KEY) {
    console.warn('[LangChain] Grok API key not configured');
    return null;
  }

  try {
    const langPrompts = {
      'hi': `${query}\n\n(कृपया हिंदी में जवाब दें। स्थान: ${state || 'भारत'})`,
      'te': `${query}\n\n(దయచేసి తెలుగులో సమాధానం ఇవ్వండి. స్థానం: ${state || 'భారతదేశం'})`,
      'mr': `${query}\n\n(कृपया मराठीत उत्तर द्या. स्थान: ${state || 'भारत'})`,
      'en': `${query}\n\n(Location context: ${state || 'India'})`
    };

    const userMessage = langPrompts[language] || langPrompts['en'];

    const messages = [{ role: 'system', content: AGRI_SYSTEM_PROMPT }];

    // Add conversation history
    if (conversationHistory?.length > 0) {
      conversationHistory.slice(-10).forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    messages.push({ role: 'user', content: userMessage });

    console.log('[LangChain] Calling Grok AI (fallback)...');
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages,
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
      console.log('[LangChain] ✅ Grok response received');
      return {
        response: aiResponse,
        model: 'grok',
        tokensUsed: data.usage?.total_tokens || 0
      };
    }

    return null;
  } catch (error) {
    console.error('[LangChain] Grok error:', error.message);
    return null;
  }
}

// ============ MAIN LANGCHAIN FUNCTION ============

/**
 * LangChain-style AI response with proper chaining:
 * 1. Custom Knowledge Base (Training Data)
 * 2. Real-time APIs (Mandi, Weather)
 * 3. Grok AI (Fallback)
 */
export async function getAIResponse(query, language = 'en', state = '', conversationHistory = []) {
  console.log(`[LangChain] Processing: "${query.substring(0, 50)}..." | Strategy: ${CHAIN_STRATEGY}`);
  
  const intent = detectIntent(query);
  console.log(`[LangChain] Detected intent: ${intent}`);

  let result = null;
  let modelUsed = null;

  try {
    // ========== STEP 1: Custom Knowledge Base (FIRST) ==========
    console.log('[LangChain] Step 1: Searching custom knowledge base...');
    
    // Search main Q&A knowledge base
    const kbResult = searchKnowledgeBase(query, language);
    if (kbResult.found && kbResult.confidence >= 0.6) {
      console.log(`[LangChain] ✅ Knowledge base match (confidence: ${kbResult.confidence})`);
      result = { response: kbResult.response, model: 'custom_kb' };
      modelUsed = 'custom_knowledge_base';
    }

    // If scheme-related, also search schemes
    if (!result && (intent === 'SCHEME' || query.toLowerCase().includes('yojana'))) {
      const schemeResult = searchSchemes(query, language);
      if (schemeResult.found) {
        console.log('[LangChain] ✅ Schemes database match');
        result = { response: schemeResult.response, model: 'schemes_db' };
        modelUsed = 'schemes_database';
      }
    }

    // If disease-related, search disease database
    if (!result && intent === 'DISEASE') {
      const diseaseResult = searchDiseases(query, language);
      if (diseaseResult.found) {
        console.log('[LangChain] ✅ Disease database match');
        result = { response: diseaseResult.response, model: 'disease_db' };
        modelUsed = 'disease_database';
      }
    }

    // ========== STEP 2: Real-time APIs ==========
    if (!result) {
      console.log('[LangChain] Step 2: Checking real-time APIs...');
      
      // Mandi prices
      if (intent === 'MANDI_PRICE') {
        // Extract commodity from query
        const commodities = ['wheat', 'rice', 'cotton', 'soybean', 'maize', 'onion', 'potato', 'tomato', 'गेहूं', 'चावल', 'कपास'];
        const foundCommodity = commodities.find(c => query.toLowerCase().includes(c));
        
        const mandiResult = await fetchMandiPrices(foundCommodity, state);
        if (mandiResult.found) {
          console.log('[LangChain] ✅ Mandi API response');
          result = { response: mandiResult.response, model: 'mandi_api' };
          modelUsed = 'mandi_realtime_api';
        }
      }

      // Weather data
      if (!result && intent === 'WEATHER') {
        // Extract city from query
        const cities = ['delhi', 'mumbai', 'pune', 'ludhiana', 'jaipur', 'lucknow', 'patna', 'chandigarh'];
        const foundCity = cities.find(c => query.toLowerCase().includes(c));
        
        const weatherResult = await fetchWeather(null, null, foundCity || 'delhi');
        if (weatherResult.found) {
          console.log('[LangChain] ✅ Weather API response');
          result = { response: weatherResult.response, model: 'weather_api' };
          modelUsed = 'weather_realtime_api';
        }
      }
    }

    // ========== STEP 3: Grok AI (Fallback) ==========
    if (!result && USE_GROK_AI && GROK_API_KEY) {
      console.log('[LangChain] Step 3: Falling back to Grok AI...');
      const grokResult = await callGrokAI(query, language, state, conversationHistory);
      if (grokResult) {
        result = grokResult;
        modelUsed = 'grok_ai';
      }
    }

    // ========== Return Result ==========
    if (result) {
      const disclaimer = DISCLAIMERS[language] || DISCLAIMERS['en'];
      return {
        ok: true,
        response: result.response + disclaimer,
        model: modelUsed,
        intent: intent,
        tokensUsed: result.tokensUsed || 0
      };
    }

    return {
      ok: false,
      response: null,
      model: null
    };

  } catch (error) {
    console.error('[LangChain] Chain error:', error.message);
    return {
      ok: false,
      response: null,
      error: error.message
    };
  }
}

/**
 * Get AI service status
 */
export function getAIServiceStatus() {
  const kb = loadKnowledgeBase();
  return {
    grokEnabled: USE_GROK_AI && !!GROK_API_KEY,
    customKnowledgeBase: kb.qaData.length > 0,
    qaCount: kb.qaData.length,
    schemesCount: kb.schemes.length,
    diseasesCount: kb.diseases.length,
    chainStrategy: CHAIN_STRATEGY,
    mandiApiEnabled: !!DATA_GOV_API_KEY,
    weatherApiEnabled: !!OPENWEATHER_API_KEY
  };
}

// Export individual functions
export { callGrokAI, searchKnowledgeBase, searchSchemes, searchDiseases, fetchMandiPrices, fetchWeather };
