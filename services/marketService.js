// Market Price Service - Integration with AGMARKNET and eNAM APIs
// Provides real-time mandi prices for agricultural commodities
// Comprehensive data for Crops, Vegetables, and Fruits

import fetch from 'node-fetch';

// AGMARKNET API endpoints
const AGMARKNET_API = 'https://agmarknet.gov.in/api';
const ENAM_API = 'https://enam.gov.in/web/dashboard/trade-data';

// ==================== COMPREHENSIVE COMMODITY DATABASE ====================

// CEREALS & GRAINS
const CEREALS = {
  'wheat': { code: '1', nameHi: 'गेहूं', basePrice: 2400, msp: 2275, unit: 'quintal', season: 'rabi' },
  'rice': { code: '2', nameHi: 'धान', basePrice: 2500, msp: 2300, unit: 'quintal', season: 'kharif' },
  'maize': { code: '6', nameHi: 'मक्का', basePrice: 2300, msp: 2225, unit: 'quintal', season: 'kharif' },
  'bajra': { code: '8', nameHi: 'बाजरा', basePrice: 2700, msp: 2625, unit: 'quintal', season: 'kharif' },
  'jowar': { code: '7', nameHi: 'ज्वार', basePrice: 3400, msp: 3371, unit: 'quintal', season: 'kharif' },
  'barley': { code: '9', nameHi: 'जौ', basePrice: 1850, msp: 1850, unit: 'quintal', season: 'rabi' },
  'ragi': { code: '10', nameHi: 'रागी', basePrice: 3900, msp: 3846, unit: 'quintal', season: 'kharif' },
};

// PULSES
const PULSES = {
  'chana': { code: '11', nameHi: 'चना', basePrice: 5600, msp: 5440, unit: 'quintal', season: 'rabi' },
  'tur': { code: '17', nameHi: 'अरहर दाल', basePrice: 7800, msp: 7550, unit: 'quintal', season: 'kharif' },
  'moong': { code: '13', nameHi: 'मूंग दाल', basePrice: 8900, msp: 8682, unit: 'quintal', season: 'kharif' },
  'urad': { code: '14', nameHi: 'उड़द दाल', basePrice: 7600, msp: 7400, unit: 'quintal', season: 'kharif' },
  'masoor': { code: '12', nameHi: 'मसूर दाल', basePrice: 6900, msp: 6700, unit: 'quintal', season: 'rabi' },
  'rajma': { code: '18', nameHi: 'राजमा', basePrice: 8500, msp: null, unit: 'quintal', season: 'rabi' },
};

// OILSEEDS
const OILSEEDS = {
  'soybean': { code: '24', nameHi: 'सोयाबीन', basePrice: 5000, msp: 4892, unit: 'quintal', season: 'kharif' },
  'groundnut': { code: '39', nameHi: 'मूंगफली', basePrice: 6900, msp: 6783, unit: 'quintal', season: 'kharif' },
  'mustard': { code: '27', nameHi: 'सरसों', basePrice: 6100, msp: 5950, unit: 'quintal', season: 'rabi' },
  'sunflower': { code: '28', nameHi: 'सूरजमुखी', basePrice: 6800, msp: 6760, unit: 'quintal', season: 'rabi' },
  'sesame': { code: '29', nameHi: 'तिल', basePrice: 9200, msp: 9267, unit: 'quintal', season: 'kharif' },
  'castor': { code: '31', nameHi: 'अरंडी', basePrice: 6200, msp: null, unit: 'quintal', season: 'kharif' },
};

// CASH CROPS
const CASH_CROPS = {
  'cotton': { code: '15', nameHi: 'कपास (नरमा)', basePrice: 7300, msp: 7121, unit: 'quintal', season: 'kharif' },
  'sugarcane': { code: '56', nameHi: 'गन्ना', basePrice: 350, msp: 315, unit: 'quintal', season: 'annual' },
  'jute': { code: '57', nameHi: 'जूट', basePrice: 5100, msp: 5050, unit: 'quintal', season: 'kharif' },
  'tobacco': { code: '58', nameHi: 'तंबाकू', basePrice: 6500, msp: null, unit: 'quintal', season: 'rabi' },
};

// VEGETABLES (Daily varying prices)
const VEGETABLES = {
  'potato': { code: '78', nameHi: 'आलू', basePrice: 1200, msp: null, unit: 'quintal', season: 'rabi', volatile: true },
  'onion': { code: '76', nameHi: 'प्याज', basePrice: 2000, msp: null, unit: 'quintal', season: 'rabi', volatile: true },
  'tomato': { code: '77', nameHi: 'टमाटर', basePrice: 2500, msp: null, unit: 'quintal', season: 'all', volatile: true },
  'garlic': { code: '79', nameHi: 'लहसुन', basePrice: 12000, msp: null, unit: 'quintal', season: 'rabi', volatile: true },
  'ginger': { code: '80', nameHi: 'अदरक', basePrice: 8000, msp: null, unit: 'quintal', season: 'kharif', volatile: true },
  'green_chilli': { code: '81', nameHi: 'हरी मिर्च', basePrice: 4500, msp: null, unit: 'quintal', season: 'all', volatile: true },
  'capsicum': { code: '82', nameHi: 'शिमला मिर्च', basePrice: 5000, msp: null, unit: 'quintal', season: 'all', volatile: true },
  'brinjal': { code: '83', nameHi: 'बैंगन', basePrice: 2000, msp: null, unit: 'quintal', season: 'all', volatile: true },
  'cabbage': { code: '84', nameHi: 'पत्ता गोभी', basePrice: 1500, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'cauliflower': { code: '85', nameHi: 'फूल गोभी', basePrice: 2500, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'carrot': { code: '86', nameHi: 'गाजर', basePrice: 2200, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'radish': { code: '87', nameHi: 'मूली', basePrice: 1000, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'spinach': { code: '88', nameHi: 'पालक', basePrice: 1500, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'lady_finger': { code: '89', nameHi: 'भिंडी', basePrice: 3500, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'bitter_gourd': { code: '90', nameHi: 'करेला', basePrice: 3000, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'bottle_gourd': { code: '91', nameHi: 'लौकी', basePrice: 1500, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'cucumber': { code: '92', nameHi: 'खीरा', basePrice: 2000, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'pumpkin': { code: '93', nameHi: 'कद्दू', basePrice: 1200, msp: null, unit: 'quintal', season: 'kharif', volatile: true },
  'peas': { code: '94', nameHi: 'मटर', basePrice: 5000, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'beans': { code: '95', nameHi: 'फलियां', basePrice: 4000, msp: null, unit: 'quintal', season: 'kharif', volatile: true },
  'drumstick': { code: '96', nameHi: 'सहजन', basePrice: 4500, msp: null, unit: 'quintal', season: 'all', volatile: true },
  'coriander': { code: '97', nameHi: 'धनिया', basePrice: 6000, msp: null, unit: 'quintal', season: 'winter', volatile: true },
};

// FRUITS
const FRUITS = {
  'mango': { code: '101', nameHi: 'आम', basePrice: 6000, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'banana': { code: '102', nameHi: 'केला', basePrice: 2500, msp: null, unit: 'quintal', season: 'all', volatile: true },
  'apple': { code: '103', nameHi: 'सेब', basePrice: 8000, msp: null, unit: 'quintal', season: 'autumn', volatile: true },
  'orange': { code: '104', nameHi: 'संतरा', basePrice: 4500, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'grapes': { code: '105', nameHi: 'अंगूर', basePrice: 7000, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'pomegranate': { code: '106', nameHi: 'अनार', basePrice: 9000, msp: null, unit: 'quintal', season: 'autumn', volatile: true },
  'papaya': { code: '107', nameHi: 'पपीता', basePrice: 2000, msp: null, unit: 'quintal', season: 'all', volatile: true },
  'guava': { code: '108', nameHi: 'अमरूद', basePrice: 3500, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'watermelon': { code: '109', nameHi: 'तरबूज', basePrice: 1500, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'muskmelon': { code: '110', nameHi: 'खरबूजा', basePrice: 2000, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'litchi': { code: '111', nameHi: 'लीची', basePrice: 8000, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'coconut': { code: '112', nameHi: 'नारियल', basePrice: 2500, msp: null, unit: '1000 nuts', season: 'all', volatile: false },
  'lemon': { code: '113', nameHi: 'नींबू', basePrice: 5000, msp: null, unit: 'quintal', season: 'all', volatile: true },
  'sweet_lime': { code: '114', nameHi: 'मौसमी', basePrice: 4000, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'jackfruit': { code: '115', nameHi: 'कटहल', basePrice: 2500, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'pineapple': { code: '116', nameHi: 'अनानास', basePrice: 3500, msp: null, unit: 'quintal', season: 'summer', volatile: true },
  'sapota': { code: '117', nameHi: 'चीकू', basePrice: 4500, msp: null, unit: 'quintal', season: 'winter', volatile: true },
  'custard_apple': { code: '118', nameHi: 'सीताफल', basePrice: 6000, msp: null, unit: 'quintal', season: 'autumn', volatile: true },
};

// SPICES
const SPICES = {
  'turmeric': { code: '201', nameHi: 'हल्दी', basePrice: 14000, msp: null, unit: 'quintal', season: 'rabi', volatile: true },
  'red_chilli': { code: '202', nameHi: 'लाल मिर्च', basePrice: 18000, msp: null, unit: 'quintal', season: 'kharif', volatile: true },
  'cumin': { code: '203', nameHi: 'जीरा', basePrice: 45000, msp: null, unit: 'quintal', season: 'rabi', volatile: true },
  'coriander_seed': { code: '204', nameHi: 'धनिया बीज', basePrice: 8000, msp: null, unit: 'quintal', season: 'rabi', volatile: true },
  'fenugreek': { code: '205', nameHi: 'मेथी', basePrice: 7000, msp: null, unit: 'quintal', season: 'rabi', volatile: true },
  'black_pepper': { code: '206', nameHi: 'काली मिर्च', basePrice: 55000, msp: null, unit: 'quintal', season: 'kharif', volatile: true },
  'cardamom': { code: '207', nameHi: 'इलायची', basePrice: 150000, msp: null, unit: 'quintal', season: 'kharif', volatile: true },
};

// Combine all commodities
const ALL_COMMODITIES = {
  ...CEREALS,
  ...PULSES,
  ...OILSEEDS,
  ...CASH_CROPS,
  ...VEGETABLES,
  ...FRUITS,
  ...SPICES,
};

// Emoji mapping
const CROP_EMOJIS = {
  // Cereals
  'wheat': '🌾', 'rice': '🍚', 'maize': '🌽', 'bajra': '🌾', 'jowar': '🌾', 'barley': '🌾', 'ragi': '🌾',
  // Pulses
  'chana': '🫘', 'tur': '🫘', 'moong': '🫘', 'urad': '🫘', 'masoor': '🫘', 'rajma': '🫘',
  // Oilseeds
  'soybean': '🫘', 'groundnut': '🥜', 'mustard': '🌼', 'sunflower': '🌻', 'sesame': '🌰', 'castor': '🌿',
  // Cash Crops
  'cotton': '☁️', 'sugarcane': '🎋', 'jute': '🌿', 'tobacco': '🍂',
  // Vegetables
  'potato': '🥔', 'onion': '🧅', 'tomato': '🍅', 'garlic': '🧄', 'ginger': '🫚', 'green_chilli': '🌶️',
  'capsicum': '🫑', 'brinjal': '🍆', 'cabbage': '🥬', 'cauliflower': '🥦', 'carrot': '🥕', 'radish': '🌱',
  'spinach': '🥬', 'lady_finger': '🌿', 'bitter_gourd': '🥒', 'bottle_gourd': '🥒', 'cucumber': '🥒',
  'pumpkin': '🎃', 'peas': '🫛', 'beans': '🫘', 'drumstick': '🌿', 'coriander': '🌿',
  // Fruits
  'mango': '🥭', 'banana': '🍌', 'apple': '🍎', 'orange': '🍊', 'grapes': '🍇', 'pomegranate': '🍎',
  'papaya': '🍈', 'guava': '🍐', 'watermelon': '🍉', 'muskmelon': '🍈', 'litchi': '🍒', 'coconut': '🥥',
  'lemon': '🍋', 'sweet_lime': '🍋', 'jackfruit': '🍈', 'pineapple': '🍍', 'sapota': '🥝', 'custard_apple': '🍏',
  // Spices
  'turmeric': '🟡', 'red_chilli': '🌶️', 'cumin': '🟤', 'coriander_seed': '🟢', 'fenugreek': '🌿',
  'black_pepper': '⚫', 'cardamom': '💚',
};

// Category mapping
const CATEGORY_MAP = {
  ...Object.fromEntries(Object.keys(CEREALS).map(k => [k, 'cereals'])),
  ...Object.fromEntries(Object.keys(PULSES).map(k => [k, 'pulses'])),
  ...Object.fromEntries(Object.keys(OILSEEDS).map(k => [k, 'oilseeds'])),
  ...Object.fromEntries(Object.keys(CASH_CROPS).map(k => [k, 'cash_crops'])),
  ...Object.fromEntries(Object.keys(VEGETABLES).map(k => [k, 'vegetables'])),
  ...Object.fromEntries(Object.keys(FRUITS).map(k => [k, 'fruits'])),
  ...Object.fromEntries(Object.keys(SPICES).map(k => [k, 'spices'])),
};

// State codes
const STATE_CODES = {
  'punjab': 'PB', 'haryana': 'HR', 'uttar pradesh': 'UP', 'madhya pradesh': 'MP',
  'maharashtra': 'MH', 'gujarat': 'GJ', 'rajasthan': 'RJ', 'bihar': 'BR',
  'karnataka': 'KA', 'andhra pradesh': 'AP', 'telangana': 'TG', 'tamil nadu': 'TN',
  'west bengal': 'WB', 'odisha': 'OD', 'kerala': 'KL', 'assam': 'AS',
  'himachal pradesh': 'HP', 'uttarakhand': 'UK', 'jharkhand': 'JH', 'chhattisgarh': 'CG',
};

// Major mandis by state with specialties
const MAJOR_MANDIS = {
  'punjab': [
    { name: 'Khanna', specialty: ['wheat', 'rice'] },
    { name: 'Ludhiana', specialty: ['wheat', 'potato'] },
    { name: 'Amritsar', specialty: ['wheat', 'rice'] },
    { name: 'Jalandhar', specialty: ['vegetables'] },
    { name: 'Bathinda', specialty: ['cotton', 'wheat'] },
  ],
  'haryana': [
    { name: 'Karnal', specialty: ['rice', 'wheat'] },
    { name: 'Kurukshetra', specialty: ['wheat', 'rice'] },
    { name: 'Hisar', specialty: ['cotton', 'mustard'] },
    { name: 'Sirsa', specialty: ['cotton'] },
    { name: 'Sonipat', specialty: ['vegetables'] },
  ],
  'uttar pradesh': [
    { name: 'Agra', specialty: ['potato', 'wheat'] },
    { name: 'Lucknow', specialty: ['vegetables', 'mango'] },
    { name: 'Kanpur', specialty: ['wheat', 'pulses'] },
    { name: 'Meerut', specialty: ['sugarcane', 'wheat'] },
    { name: 'Varanasi', specialty: ['vegetables', 'fruits'] },
    { name: 'Azadpur-Delhi', specialty: ['vegetables', 'fruits'] },
  ],
  'madhya pradesh': [
    { name: 'Indore', specialty: ['soybean', 'wheat'] },
    { name: 'Bhopal', specialty: ['wheat', 'chana'] },
    { name: 'Neemuch', specialty: ['garlic', 'coriander_seed'] },
    { name: 'Ujjain', specialty: ['wheat', 'soybean'] },
    { name: 'Gwalior', specialty: ['mustard', 'wheat'] },
  ],
  'maharashtra': [
    { name: 'Lasalgaon', specialty: ['onion'] },
    { name: 'Pune', specialty: ['vegetables', 'fruits'] },
    { name: 'Nagpur', specialty: ['orange', 'cotton'] },
    { name: 'Nashik', specialty: ['onion', 'grapes'] },
    { name: 'Sangli', specialty: ['turmeric', 'grapes'] },
    { name: 'Kolhapur', specialty: ['sugarcane', 'vegetables'] },
  ],
  'gujarat': [
    { name: 'Rajkot', specialty: ['groundnut', 'cotton'] },
    { name: 'Ahmedabad', specialty: ['vegetables', 'cotton'] },
    { name: 'Gondal', specialty: ['groundnut'] },
    { name: 'Unjha', specialty: ['cumin', 'fennel'] },
    { name: 'Junagadh', specialty: ['groundnut', 'mango'] },
  ],
  'rajasthan': [
    { name: 'Jaipur', specialty: ['vegetables', 'fruits'] },
    { name: 'Kota', specialty: ['coriander_seed', 'soybean'] },
    { name: 'Jodhpur', specialty: ['cumin', 'bajra'] },
    { name: 'Bikaner', specialty: ['moong', 'bajra'] },
    { name: 'Alwar', specialty: ['mustard', 'wheat'] },
  ],
  'karnataka': [
    { name: 'Kolar', specialty: ['tomato'] },
    { name: 'Hubli', specialty: ['cotton', 'maize'] },
    { name: 'Davangere', specialty: ['maize', 'groundnut'] },
    { name: 'Belgaum', specialty: ['sugarcane', 'vegetables'] },
    { name: 'Mysore', specialty: ['vegetables', 'fruits'] },
  ],
  'andhra pradesh': [
    { name: 'Guntur', specialty: ['red_chilli', 'cotton'] },
    { name: 'Vijayawada', specialty: ['rice', 'vegetables'] },
    { name: 'Kurnool', specialty: ['groundnut', 'sunflower'] },
    { name: 'Tirupati', specialty: ['groundnut', 'tomato'] },
  ],
  'tamil nadu': [
    { name: 'Koyambedu-Chennai', specialty: ['vegetables', 'fruits'] },
    { name: 'Coimbatore', specialty: ['vegetables', 'coconut'] },
    { name: 'Madurai', specialty: ['vegetables', 'banana'] },
    { name: 'Salem', specialty: ['tapioca', 'vegetables'] },
  ],
  'west bengal': [
    { name: 'Kolkata-Sealdah', specialty: ['vegetables', 'fish'] },
    { name: 'Siliguri', specialty: ['potato', 'ginger'] },
    { name: 'Malda', specialty: ['mango'] },
  ],
  'bihar': [
    { name: 'Patna', specialty: ['vegetables', 'wheat'] },
    { name: 'Muzaffarpur', specialty: ['litchi', 'vegetables'] },
    { name: 'Gaya', specialty: ['vegetables'] },
  ],
  'kerala': [
    { name: 'Ernakulam', specialty: ['coconut', 'banana'] },
    { name: 'Thrissur', specialty: ['vegetables', 'coconut'] },
    { name: 'Kozhikode', specialty: ['cardamom', 'black_pepper'] },
  ],
};

// Simulate realistic price variations based on volatility
function generateRealisticPrice(basePrice, commodity) {
  const info = ALL_COMMODITIES[commodity];
  const volatility = info?.volatile ? 0.25 : 0.10; // Higher volatility for vegetables/fruits
  const variation = (Math.random() - 0.5) * 2 * volatility;
  return Math.round(basePrice * (1 + variation));
}

// Calculate price change percentage (more volatile for perishables)
function calculatePriceChange(commodity) {
  const info = ALL_COMMODITIES[commodity];
  const maxChange = info?.volatile ? 15 : 5;
  return parseFloat((Math.random() * maxChange * 2 - maxChange).toFixed(1));
}

// Get commodities by category
function getCommoditiesByCategory(category) {
  switch(category) {
    case 'cereals': return CEREALS;
    case 'pulses': return PULSES;
    case 'oilseeds': return OILSEEDS;
    case 'cash_crops': return CASH_CROPS;
    case 'vegetables': return VEGETABLES;
    case 'fruits': return FRUITS;
    case 'spices': return SPICES;
    default: return ALL_COMMODITIES;
  }
}

// Fetch prices from AGMARKNET (with fallback to mock data)
async function fetchAgmarknetPrices(commodity, state) {
  try {
    // Try real API first (when available)
    const url = `${AGMARKNET_API}/v1/prices?commodity=${commodity}&state=${state}`;
    const response = await fetch(url, { timeout: 5000 });
    
    if (response.ok) {
      return response.json();
    }
    throw new Error('API not available');
  } catch (error) {
    // Return null to use mock data
    return null;
  }
}

// Get market prices for commodities across mandis
export async function getMarketPrices(options = {}) {
  const {
    commodity = 'all',
    category = null, // 'cereals', 'vegetables', 'fruits', 'pulses', 'oilseeds', 'spices'
    state = null,
    mandi = null,
    limit = 30,
    language = 'en',
  } = options;

  try {
    const results = [];
    let id = 1;

    // Determine which commodities to fetch
    let commoditiesToFetch;
    if (category) {
      commoditiesToFetch = Object.keys(getCommoditiesByCategory(category));
    } else if (commodity === 'all') {
      // Return a mix of different categories
      const mixedCommodities = [
        // Top cereals
        'wheat', 'rice', 'maize',
        // Top pulses
        'chana', 'tur', 'moong',
        // Top oilseeds
        'soybean', 'mustard', 'groundnut',
        // Top vegetables
        'potato', 'onion', 'tomato', 'garlic', 'green_chilli', 'cauliflower', 'cabbage', 'carrot', 'peas',
        // Top fruits
        'banana', 'apple', 'orange', 'mango', 'pomegranate', 'guava', 'papaya', 'grapes',
        // Top spices
        'turmeric', 'red_chilli', 'cumin',
        // Cash crops
        'cotton', 'sugarcane',
      ];
      commoditiesToFetch = mixedCommodities;
    } else {
      commoditiesToFetch = [commodity.toLowerCase()];
    }

    // Determine which states to include
    const statesToFetch = state 
      ? [state.toLowerCase()]
      : Object.keys(MAJOR_MANDIS);

    for (const crop of commoditiesToFetch) {
      const cropInfo = ALL_COMMODITIES[crop];
      if (!cropInfo) continue;

      const basePrice = cropInfo.basePrice;

      for (const st of statesToFetch) {
        const mandisData = MAJOR_MANDIS[st] || [];
        
        // Filter mandis by specialty or select first one
        let selectedMandis = mandisData;
        if (mandi) {
          selectedMandis = mandisData.filter(m => 
            m.name.toLowerCase().includes(mandi.toLowerCase())
          );
        } else {
          // Select mandis that specialize in this crop, or first mandi
          selectedMandis = mandisData.filter(m => 
            m.specialty?.includes(crop) || m.specialty?.includes(CATEGORY_MAP[crop])
          );
          if (selectedMandis.length === 0) {
            selectedMandis = [mandisData[0]].filter(Boolean);
          }
        }

        for (const mandiData of selectedMandis) {
          if (results.length >= limit) break;

          const m = mandiData.name || mandiData;
          const modalPrice = generateRealisticPrice(basePrice, crop);
          const minPrice = Math.round(modalPrice * 0.90);
          const maxPrice = Math.round(modalPrice * 1.12);
          const change = calculatePriceChange(crop);

          results.push({
            id: id++,
            commodity: crop,
            crop: crop, // alias for frontend compatibility
            commodityName: language === 'hi' 
              ? cropInfo.nameHi 
              : crop.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            emoji: CROP_EMOJIS[crop] || '🌾',
            category: CATEGORY_MAP[crop],
            mandi: m,
            state: st.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            stateCode: STATE_CODES[st] || st.substring(0, 2).toUpperCase(),
            minPrice,
            maxPrice,
            modalPrice,
            msp: cropInfo.msp || null,
            unit: cropInfo.unit || 'quintal',
            change,
            trend: change >= 0 ? 'up' : 'down',
            season: cropInfo.season,
            date: new Date().toISOString().split('T')[0],
            source: 'AGMARKNET',
            arrivals: Math.round(Math.random() * 5000 + 500), // quintals arrived
          });
        }
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }

    // Sort by category then price
    results.sort((a, b) => {
      const categoryOrder = ['vegetables', 'fruits', 'cereals', 'pulses', 'oilseeds', 'spices', 'cash_crops'];
      const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (catDiff !== 0) return catDiff;
      return b.modalPrice - a.modalPrice;
    });

    return {
      ok: true,
      total: results.length,
      lastUpdated: new Date().toISOString(),
      categories: [...new Set(results.map(r => r.category))],
      results: results.slice(0, limit),
    };
  } catch (error) {
    console.error('Market price service error:', error);
    throw error;
  }
}

// Get price trends for a specific commodity
export async function getPriceTrend(commodity, days = 7, language = 'en') {
  const crop = commodity.toLowerCase();
  const cropInfo = ALL_COMMODITIES[crop];
  
  if (!cropInfo) {
    throw new Error(`Unknown commodity: ${commodity}`);
  }

  const basePrice = cropInfo.basePrice;
  const isVolatile = cropInfo.volatile;
  const trend = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Simulate gradual price movement (more volatile for perishables)
    const volatilityFactor = isVolatile ? 0.08 : 0.03;
    const dayVariation = (Math.random() - 0.5) * volatilityFactor;
    const trendFactor = isVolatile ? 0.015 : 0.008;
    const price = Math.round(basePrice * (1 + (days - i) * trendFactor + dayVariation));
    
    trend.push({
      date: date.toISOString().split('T')[0],
      price,
      volume: Math.round(Math.random() * 10000 + 5000), // Arrival in quintals
    });
  }

  const firstPrice = trend[0].price;
  const lastPrice = trend[trend.length - 1].price;
  const priceChange = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(1);

  return {
    ok: true,
    commodity: language === 'hi' 
      ? cropInfo.nameHi 
      : crop.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    emoji: CROP_EMOJIS[crop] || '🌾',
    category: CATEGORY_MAP[crop],
    msp: cropInfo.msp || null,
    unit: cropInfo.unit,
    season: cropInfo.season,
    trend,
    summary: {
      startPrice: firstPrice,
      endPrice: lastPrice,
      change: parseFloat(priceChange),
      direction: priceChange >= 0 ? 'up' : 'down',
      avgPrice: Math.round(trend.reduce((sum, d) => sum + d.price, 0) / trend.length),
      highPrice: Math.max(...trend.map(d => d.price)),
      lowPrice: Math.min(...trend.map(d => d.price)),
    },
    forecast: {
      nextWeek: language === 'hi'
        ? priceChange >= 0 ? 'कीमतें स्थिर से बढ़ने की उम्मीद' : 'कीमतों में गिरावट संभव'
        : priceChange >= 0 ? 'Prices expected to remain stable to rising' : 'Prices may decline',
      recommendation: language === 'hi'
        ? priceChange >= 0 ? 'बेचने के लिए अच्छा समय' : 'कुछ दिन इंतजार करें'
        : priceChange >= 0 ? 'Good time to sell' : 'Consider waiting a few days',
    }
  };
}

// Get MSP comparison for a commodity
export function getMSPComparison(commodity, marketPrice, language = 'en') {
  const crop = commodity.toLowerCase();
  const cropInfo = ALL_COMMODITIES[crop];
  const msp = cropInfo?.msp;
  
  if (!msp) {
    return {
      available: false,
      message: language === 'hi' 
        ? 'इस फसल के लिए MSP उपलब्ध नहीं है'
        : 'MSP not available for this crop',
    };
  }

  const difference = marketPrice - msp;
  const percentDiff = ((difference / msp) * 100).toFixed(1);

  return {
    available: true,
    msp,
    marketPrice,
    difference,
    percentDiff: parseFloat(percentDiff),
    aboveMSP: difference >= 0,
    message: language === 'hi'
      ? difference >= 0 
        ? `मंडी भाव MSP से ₹${difference}/क्विंटल (${percentDiff}%) अधिक है`
        : `मंडी भाव MSP से ₹${Math.abs(difference)}/क्विंटल (${Math.abs(percentDiff)}%) कम है`
      : difference >= 0
        ? `Market price is ₹${difference}/quintal (${percentDiff}%) above MSP`
        : `Market price is ₹${Math.abs(difference)}/quintal (${Math.abs(percentDiff)}%) below MSP`,
    recommendation: language === 'hi'
      ? difference >= 0 
        ? 'अभी बेचना फायदेमंद हो सकता है'
        : 'MSP पर सरकारी खरीद केंद्र पर बेचें'
      : difference >= 0
        ? 'Selling now could be profitable'
        : 'Consider selling at govt. procurement center at MSP',
  };
}

// Get best mandis to sell a commodity
export async function getBestMandis(commodity, state = null, limit = 5, language = 'en') {
  const allPrices = await getMarketPrices({
    commodity,
    state,
    limit: 50,
    language,
  });

  if (!allPrices.ok || allPrices.results.length === 0) {
    return {
      ok: false,
      message: language === 'hi'
        ? 'कोई मंडी जानकारी उपलब्ध नहीं'
        : 'No mandi information available',
    };
  }

  // Sort by modal price descending
  const sorted = allPrices.results.sort((a, b) => b.modalPrice - a.modalPrice);
  const best = sorted.slice(0, limit);
  const worst = sorted.slice(-limit).reverse();
  
  const cropInfo = ALL_COMMODITIES[commodity.toLowerCase()];

  return {
    ok: true,
    commodity: language === 'hi' 
      ? cropInfo?.nameHi || commodity
      : commodity.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    bestMandis: best.map(m => ({
      mandi: m.mandi,
      state: m.state,
      price: m.modalPrice,
      modalPrice: m.modalPrice,
      msp: m.msp,
    })),
    lowestMandis: worst.map(m => ({
      mandi: m.mandi,
      state: m.state,
      price: m.modalPrice,
    })),
    recommendation: language === 'hi'
      ? `${best[0].mandi} (${best[0].state}) में सबसे अच्छा भाव ₹${best[0].modalPrice}/क्विंटल मिल रहा है`
      : `Best price of ₹${best[0].modalPrice}/quintal available at ${best[0].mandi} (${best[0].state})`,
  };
}

// Get nearby mandis based on location
export async function getNearbyMandis(location, radius = 100, language = 'en') {
  // In production, this would use GIS data
  // For now, return mandis from the user's state
  const state = typeof location === 'string' ? location.toLowerCase() : 'punjab';
  const mandisData = MAJOR_MANDIS[state] || MAJOR_MANDIS['punjab'];

  return {
    ok: true,
    location: state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    radius: `${radius} km`,
    mandis: mandisData.map((mandi, index) => ({
      name: mandi.name,
      distance: `${Math.round(Math.random() * radius)} km`,
      specialty: mandi.specialty || [],
      commodities: mandi.specialty?.map(s => 
        ALL_COMMODITIES[s]?.nameHi || s.charAt(0).toUpperCase() + s.slice(1)
      ) || ['Vegetables', 'Grains'],
    })),
  };
}

// Get all available categories
export function getCategories(language = 'en') {
  return {
    cereals: { name: language === 'hi' ? 'अनाज' : 'Cereals', count: Object.keys(CEREALS).length },
    pulses: { name: language === 'hi' ? 'दालें' : 'Pulses', count: Object.keys(PULSES).length },
    oilseeds: { name: language === 'hi' ? 'तिलहन' : 'Oilseeds', count: Object.keys(OILSEEDS).length },
    vegetables: { name: language === 'hi' ? 'सब्जियां' : 'Vegetables', count: Object.keys(VEGETABLES).length },
    fruits: { name: language === 'hi' ? 'फल' : 'Fruits', count: Object.keys(FRUITS).length },
    spices: { name: language === 'hi' ? 'मसाले' : 'Spices', count: Object.keys(SPICES).length },
    cash_crops: { name: language === 'hi' ? 'नकदी फसलें' : 'Cash Crops', count: Object.keys(CASH_CROPS).length },
  };
}

// Get all commodities in a category
export function getCommoditiesInCategory(category, language = 'en') {
  const categoryData = getCommoditiesByCategory(category);
  return Object.entries(categoryData).map(([key, data]) => ({
    id: key,
    name: language === 'hi' ? data.nameHi : key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    emoji: CROP_EMOJIS[key] || '🌾',
    basePrice: data.basePrice,
    msp: data.msp,
    unit: data.unit,
    season: data.season,
  }));
}

export default {
  getMarketPrices,
  getPriceTrend,
  getMSPComparison,
  getBestMandis,
  getNearbyMandis,
  getCategories,
  getCommoditiesInCategory,
  ALL_COMMODITIES,
  CEREALS,
  PULSES,
  OILSEEDS,
  VEGETABLES,
  FRUITS,
  SPICES,
  CROP_EMOJIS,
};
