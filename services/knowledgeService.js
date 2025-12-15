// Agriculture Knowledge Base Service - RAG-based retrieval for farming advice
// Provides scientifically validated agricultural information

// Comprehensive Agriculture Knowledge Base
const KNOWLEDGE_BASE = {
  // Crop-specific knowledge
  crops: {
    wheat: {
      nameHi: 'गेहूं',
      season: 'Rabi (October-November sowing)',
      seasonHi: 'रबी (अक्टूबर-नवंबर बुवाई)',
      varieties: {
        irrigated: ['HD-3086', 'PBW-725', 'WH-1105', 'HD-3226', 'DBW-187'],
        rainfed: ['C-306', 'PBW-644', 'HD-2987'],
      },
      seedRate: '100 kg/ha (irrigated), 125 kg/ha (rainfed)',
      seedRateHi: '100 किग्रा/हेक्टेयर (सिंचित), 125 किग्रा/हेक्टेयर (असिंचित)',
      spacing: 'Row to row: 20-22.5 cm',
      spacingHi: 'कतार से कतार: 20-22.5 सेमी',
      fertilizer: {
        npk: 'N:P:K = 120:60:40 kg/ha',
        application: [
          'Full P & K + 1/2 N at sowing',
          '1/4 N at first irrigation (21 days)',
          '1/4 N at second irrigation (45 days)',
        ],
      },
      fertilizerHi: {
        npk: 'N:P:K = 120:60:40 किग्रा/हेक्टेयर',
        application: [
          'बुवाई पर पूरा P और K + आधा N',
          'पहली सिंचाई पर 1/4 N (21 दिन)',
          'दूसरी सिंचाई पर 1/4 N (45 दिन)',
        ],
      },
      irrigation: {
        critical_stages: [
          { stage: 'Crown Root Initiation (CRI)', days: 21 },
          { stage: 'Tillering', days: 45 },
          { stage: 'Late Jointing', days: 65 },
          { stage: 'Flowering', days: 85 },
          { stage: 'Milk Stage', days: 100 },
          { stage: 'Dough Stage', days: 110 },
        ],
        water_requirement: '400-450 mm total',
      },
      harvest: {
        time: 'When grain moisture is 12-14%',
        indicators: 'Golden yellow color, hard grain',
      },
      yield: {
        average: '45-55 quintals/ha (irrigated)',
        potential: '65-70 quintals/ha with best practices',
      },
    },

    rice: {
      nameHi: 'धान',
      season: 'Kharif (June-July transplanting)',
      seasonHi: 'खरीफ (जून-जुलाई रोपाई)',
      varieties: {
        basmati: ['Pusa Basmati 1121', 'Pusa Basmati 1509', 'Pusa Basmati 1718'],
        non_basmati: ['PR-126', 'PR-127', 'Pusa-44', 'HKR-47'],
      },
      seedRate: '20-25 kg/ha for nursery (transplanting)',
      seedRateHi: '20-25 किग्रा/हेक्टेयर नर्सरी के लिए (रोपाई)',
      spacing: '20x15 cm (row x plant)',
      spacingHi: '20x15 सेमी (कतार x पौधा)',
      fertilizer: {
        npk: 'N:P:K = 100:50:50 kg/ha (Basmati: 60:30:30)',
        application: [
          '1/2 N + Full P & K at transplanting',
          '1/4 N at active tillering (21 days)',
          '1/4 N at panicle initiation (45 days)',
        ],
      },
      fertilizerHi: {
        npk: 'N:P:K = 100:50:50 किग्रा/हेक्टेयर (बासमती: 60:30:30)',
        application: [
          'रोपाई पर 1/2 N + पूरा P और K',
          'सक्रिय कल्ले निकलने पर 1/4 N (21 दिन)',
          'बाली निकलने पर 1/4 N (45 दिन)',
        ],
      },
      irrigation: {
        method: 'Maintain 5 cm standing water during vegetative phase',
        critical_stages: ['Transplanting to tillering', 'Flowering', 'Grain filling'],
        water_requirement: '1200-1400 mm',
      },
      harvest: {
        time: '25-30 days after flowering when 80% grains are mature',
        indicators: 'Panicle drooping, straw turning golden',
      },
      yield: {
        basmati: '35-40 quintals/ha',
        non_basmati: '60-70 quintals/ha',
      },
    },

    cotton: {
      nameHi: 'कपास',
      season: 'Kharif (April-May sowing)',
      seasonHi: 'खरीफ (अप्रैल-मई बुवाई)',
      varieties: {
        bt_hybrids: ['RCH-2', 'MRC-7351', 'Ankur-651', 'Brahma'],
        desi: ['LRA-5166', 'LD-694'],
      },
      seedRate: '2.5 kg/ha (Bt hybrid), 15-20 kg/ha (Desi)',
      seedRateHi: '2.5 किग्रा/हेक्टेयर (बीटी हाइब्रिड), 15-20 किग्रा/हेक्टेयर (देसी)',
      spacing: '90-100 cm x 60 cm',
      spacingHi: '90-100 सेमी x 60 सेमी',
      fertilizer: {
        npk: 'N:P:K = 150:60:60 kg/ha (Bt cotton)',
        application: [
          '1/3 N + Full P & K at sowing',
          '1/3 N at squaring (45 days)',
          '1/3 N at flowering (75 days)',
        ],
      },
      irrigation: {
        critical_stages: ['Squaring', 'Flowering', 'Boll formation'],
        interval: 'Every 15-20 days depending on soil type',
        water_requirement: '700-1200 mm',
      },
      harvest: {
        time: 'When bolls burst open fully',
        picking: '3-4 pickings at 15-20 day intervals',
      },
      yield: {
        bt_cotton: '20-25 quintals/ha lint',
        desi: '8-12 quintals/ha lint',
      },
    },

    sugarcane: {
      nameHi: 'गन्ना',
      season: 'Autumn (October) or Spring (February-March)',
      varieties: ['Co-0238', 'CoJ-64', 'CoS-767', 'CoS-8436', 'Co-0118'],
      seedRate: '60-75 quintals/ha setts (3-bud)',
      spacing: '75-90 cm row spacing',
      fertilizer: {
        npk: 'N:P:K = 250:60:60 kg/ha',
        application: [
          'Full P & K + 1/3 N at planting',
          '1/3 N at tillering (45 days)',
          '1/3 N at grand growth (90 days)',
        ],
      },
      irrigation: {
        critical_stages: ['Germination', 'Tillering', 'Grand growth', 'Maturity'],
        interval: '10-15 days in summer, 20-25 days in winter',
        water_requirement: '1500-2500 mm',
      },
      harvest: {
        time: '10-12 months after planting',
        indicators: 'Brix reading 18-20%',
      },
      yield: '800-1000 quintals/ha',
    },

    potato: {
      nameHi: 'आलू',
      season: 'Rabi (October-November planting)',
      varieties: ['Kufri Pukhraj', 'Kufri Jyoti', 'Kufri Bahar', 'Kufri Chipsona-1'],
      seedRate: '25-30 quintals/ha tubers',
      spacing: '60 cm x 20 cm',
      fertilizer: {
        npk: 'N:P:K = 180:80:100 kg/ha',
        application: [
          'Full P & K + 1/2 N at planting',
          '1/2 N at earthing up (30 days)',
        ],
      },
      irrigation: {
        method: 'Light and frequent irrigations',
        interval: '7-10 days',
        critical_stages: ['Stolon initiation', 'Tuber bulking'],
        water_requirement: '500-600 mm',
      },
      harvest: {
        time: '90-120 days after planting',
        indicators: 'Leaves turn yellow, tuber skin hardens',
      },
      yield: '250-300 quintals/ha',
    },

    onion: {
      nameHi: 'प्याज',
      season: 'Kharif (June-July) or Rabi (October-November)',
      varieties: {
        kharif: ['Agrifound Dark Red', 'N-53', 'Bhima Super'],
        rabi: ['Pusa Red', 'Agrifound Light Red', 'Bhima Shakti'],
      },
      seedRate: '8-10 kg/ha',
      spacing: '15 cm x 10 cm',
      fertilizer: {
        npk: 'N:P:K = 100:50:50 kg/ha',
        application: [
          '1/2 N + Full P & K at transplanting',
          '1/4 N at 30 days',
          '1/4 N at 45 days',
        ],
      },
      irrigation: {
        interval: '7-10 days',
        critical_stages: ['Establishment', 'Bulb formation'],
        stop: 'Stop irrigation 15 days before harvest',
        water_requirement: '350-550 mm',
      },
      harvest: {
        time: '120-150 days after transplanting',
        indicators: 'Neck fall (50-75% tops fallen)',
      },
      yield: '200-300 quintals/ha',
    },
  },

  // Soil health management
  soil: {
    testing: {
      importance: 'Test soil every 2-3 years',
      importanceHi: 'हर 2-3 साल में मिट्टी परीक्षण करें',
      parameters: ['pH', 'EC', 'Organic Carbon', 'N', 'P', 'K', 'S', 'Zn', 'Fe', 'Mn', 'Cu', 'B'],
      collection: {
        depth: '0-15 cm for most crops, 15-30 cm for deep-rooted crops',
        samples: 'Collect 10-15 samples from one field, mix to make composite sample',
        time: 'After harvest, before next crop sowing',
      },
    },
    health_card: {
      scheme: 'Soil Health Card Scheme',
      portal: 'https://soilhealth.dac.gov.in',
      benefits: [
        'Free soil testing',
        'Crop-wise fertilizer recommendations',
        'Nutrient management guidance',
      ],
    },
    improvement: {
      organic_matter: [
        'Add 5-10 tonnes FYM/ha',
        'Green manuring with dhaincha/sunhemp',
        'Incorporate crop residues',
        'Apply vermicompost 2-3 tonnes/ha',
      ],
      acidic_soil: 'Apply lime 2-4 tonnes/ha based on pH',
      alkaline_soil: 'Apply gypsum 2-5 tonnes/ha, use acidifying fertilizers',
      saline_soil: 'Leaching with good quality water, grow salt-tolerant crops',
    },
  },

  // Irrigation and water management
  irrigation: {
    methods: {
      flood: {
        efficiency: '40-50%',
        suitable: 'Rice, sugarcane (traditional)',
        issues: 'High water wastage, waterlogging',
      },
      furrow: {
        efficiency: '50-60%',
        suitable: 'Row crops like cotton, maize, vegetables',
      },
      drip: {
        efficiency: '85-95%',
        suitable: 'All crops especially fruits, vegetables, cotton',
        benefits: [
          '40-60% water saving',
          '20-50% yield increase',
          'Fertigation possible',
          'Reduced weed growth',
        ],
        subsidy: '55-90% under PMKSY',
      },
      sprinkler: {
        efficiency: '70-80%',
        suitable: 'Wheat, pulses, groundnut, vegetables',
        benefits: [
          '30-40% water saving',
          'Uniform water distribution',
          'Suitable for undulating land',
        ],
        subsidy: '55-90% under PMKSY',
      },
    },
    scheduling: {
      indicators: [
        'Visual observation of crop stress',
        'Soil moisture feel',
        'Tensiometer readings',
        'ET-based scheduling',
      ],
      critical_stages: 'Never skip irrigation at flowering and grain filling stages',
    },
    water_saving: [
      'Laser land leveling',
      'Raised bed planting',
      'Mulching',
      'Direct seeded rice (DSR)',
      'Alternate wetting and drying in rice',
    ],
  },

  // Integrated Pest Management
  ipm: {
    principles: [
      'Prevention through resistant varieties',
      'Cultural practices (crop rotation, intercropping)',
      'Mechanical control (traps, hand picking)',
      'Biological control (bioagents, natural enemies)',
      'Chemical control as last resort',
    ],
    principlesHi: [
      'प्रतिरोधी किस्मों द्वारा रोकथाम',
      'सांस्कृतिक विधियां (फसल चक्र, अंतरफसल)',
      'यांत्रिक नियंत्रण (जाल, हाथ से चुनना)',
      'जैविक नियंत्रण (जैव कारक, प्राकृतिक शत्रु)',
      'रासायनिक नियंत्रण अंतिम उपाय',
    ],
    bioagents: {
      trichogramma: 'Effective against stem borers, fruit borers (50,000 eggs/ha)',
      trichoderma: 'Effective against soil-borne diseases (2.5 kg/ha with FYM)',
      pseudomonas: 'Against bacterial diseases (seed treatment + soil application)',
      beauveria: 'Against soft-bodied insects like whitefly, aphids',
      neem: 'Neem oil 3% or Azadirachtin 0.03% EC as general insecticide',
    },
    etl: {
      definition: 'Economic Threshold Level - pest density at which control measures become economical',
      examples: {
        'Rice stem borer': '5% dead hearts or 2% white ears',
        'Wheat aphids': '10-15 aphids per ear',
        'Cotton bollworm': '1 larva per plant at squaring',
      },
    },
  },

  // Government Schemes
  schemes: {
    'pm-kisan': {
      name: 'PM-KISAN',
      nameHi: 'पीएम-किसान',
      fullName: 'Pradhan Mantri Kisan Samman Nidhi',
      benefit: '₹6,000 per year in 3 installments of ₹2,000',
      benefitHi: '₹6,000 प्रति वर्ष, 3 किस्तों में ₹2,000',
      eligibility: [
        'All landholding farmer families',
        'Land should be in farmer\'s name',
        'Not applicable for income tax payers',
      ],
      eligibilityHi: [
        'सभी भूमिधारक किसान परिवार',
        'जमीन किसान के नाम होनी चाहिए',
        'आयकर दाताओं के लिए लागू नहीं',
      ],
      documents: ['Aadhaar Card', 'Land records', 'Bank account'],
      portal: 'https://pmkisan.gov.in',
    },
    'pmfby': {
      name: 'PM Fasal Bima Yojana',
      nameHi: 'पीएम फसल बीमा योजना',
      benefit: 'Crop insurance at nominal premium',
      premium: {
        kharif: '2% of sum insured',
        rabi: '1.5% of sum insured',
        horticulture: '5% of sum insured',
      },
      coverage: [
        'Natural calamities (drought, flood, hailstorm)',
        'Pests and diseases',
        'Post-harvest losses (14 days)',
        'Localized calamities',
      ],
      portal: 'https://pmfby.gov.in',
    },
    'kcc': {
      name: 'Kisan Credit Card',
      nameHi: 'किसान क्रेडिट कार्ड',
      benefit: 'Credit up to ₹3 lakh at 4% interest (with subvention)',
      features: [
        'Single credit limit for all agricultural needs',
        'Flexible drawl and repayment',
        'Personal accident insurance cover',
        'Coverage extended to PM-KISAN beneficiaries',
      ],
      interestSubvention: '2% by GOI + 3% for timely repayment = 4% effective',
      portal: 'Apply through any bank',
    },
    'pmksy': {
      name: 'PM Krishi Sinchai Yojana',
      nameHi: 'पीएम कृषि सिंचाई योजना',
      components: [
        'Accelerated Irrigation Benefits Programme (AIBP)',
        'Per Drop More Crop (micro-irrigation)',
        'Watershed Development',
      ],
      subsidy: {
        general: '55% of system cost',
        sc_st_sf_mf: '90% of system cost',
      },
      portal: 'https://pmksy.gov.in',
    },
    'soil_health_card': {
      name: 'Soil Health Card Scheme',
      nameHi: 'मृदा स्वास्थ्य कार्ड योजना',
      benefit: 'Free soil testing and nutrient recommendations',
      frequency: 'Card issued every 2 years',
      portal: 'https://soilhealth.dac.gov.in',
    },
  },

  // Organic farming
  organic: {
    certification: {
      process: [
        'Apply to accredited certification body',
        'Conversion period: 2-3 years',
        'Annual inspection',
        'Maintain records of all inputs and practices',
      ],
      bodies: ['APEDA', 'State organic certification agencies'],
      markets: ['India Organic (Jaivik Bharat)', 'Export markets'],
    },
    inputs: {
      fertilizers: [
        'FYM (10-15 tonnes/ha)',
        'Vermicompost (2-3 tonnes/ha)',
        'Green manure (dhaincha, sunhemp)',
        'Biofertilizers (Rhizobium, Azotobacter, PSB)',
      ],
      pesticides: [
        'Neem-based preparations',
        'Panchagavya',
        'Dasagavya',
        'Jeevamrut',
        'Trichoderma, Beauveria',
      ],
    },
    benefits: [
      '10-30% premium price',
      'Lower input costs after initial years',
      'Better soil health',
      'Environment friendly',
    ],
  },
};

// Search knowledge base
export function searchKnowledge(query, language = 'en') {
  const results = [];
  const queryLower = query.toLowerCase();
  const isHindi = language === 'hi';

  // Search in crops
  for (const [cropName, cropData] of Object.entries(KNOWLEDGE_BASE.crops)) {
    if (queryLower.includes(cropName) || 
        queryLower.includes(cropData.nameHi) ||
        (cropData.varieties && JSON.stringify(cropData.varieties).toLowerCase().includes(queryLower))) {
      results.push({
        type: 'crop',
        name: isHindi ? cropData.nameHi : cropName.charAt(0).toUpperCase() + cropName.slice(1),
        data: cropData,
        relevance: 'high',
      });
    }
  }

  // Search in schemes
  for (const [schemeId, schemeData] of Object.entries(KNOWLEDGE_BASE.schemes)) {
    if (queryLower.includes(schemeId) || 
        queryLower.includes(schemeData.name.toLowerCase()) ||
        queryLower.includes(schemeData.nameHi || '')) {
      results.push({
        type: 'scheme',
        name: isHindi ? schemeData.nameHi : schemeData.name,
        data: schemeData,
        relevance: 'high',
      });
    }
  }

  // Search for specific topics
  const topics = {
    'fertilizer|खाद|urea|npk': 'fertilizer',
    'irrigation|सिंचाई|water|पानी': 'irrigation',
    'pest|कीट|insect|disease|रोग': 'ipm',
    'soil|मिट्टी|health': 'soil',
    'organic|जैविक': 'organic',
  };

  for (const [pattern, topic] of Object.entries(topics)) {
    if (new RegExp(pattern, 'i').test(query)) {
      if (KNOWLEDGE_BASE[topic]) {
        results.push({
          type: 'topic',
          name: topic,
          data: KNOWLEDGE_BASE[topic],
          relevance: 'medium',
        });
      }
    }
  }

  return results;
}

// Generate response from knowledge base (RAG-style)
export function generateKnowledgeResponse(query, language = 'en') {
  const isHindi = language === 'hi';
  const searchResults = searchKnowledge(query, language);
  
  if (searchResults.length === 0) {
    return {
      found: false,
      response: isHindi 
        ? 'इस विषय पर विशिष्ट जानकारी नहीं मिली। कृपया फसल या योजना का नाम बताएं।'
        : 'No specific information found. Please mention the crop or scheme name.',
    };
  }

  let response = '';
  const sources = [];

  for (const result of searchResults.slice(0, 3)) {
    if (result.type === 'crop') {
      const crop = result.data;
      const name = result.name;
      
      response += `\n\n🌾 **${name}**\n`;
      response += isHindi 
        ? `मौसम: ${crop.seasonHi || crop.season}\n`
        : `Season: ${crop.season}\n`;
      
      if (crop.varieties) {
        const varieties = Object.values(crop.varieties).flat().slice(0, 5);
        response += isHindi 
          ? `किस्में: ${varieties.join(', ')}\n`
          : `Varieties: ${varieties.join(', ')}\n`;
      }
      
      response += isHindi 
        ? `बीज दर: ${crop.seedRateHi || crop.seedRate}\n`
        : `Seed Rate: ${crop.seedRate}\n`;
      
      if (crop.fertilizer) {
        response += isHindi 
          ? `उर्वरक: ${crop.fertilizerHi?.npk || crop.fertilizer.npk}\n`
          : `Fertilizer: ${crop.fertilizer.npk}\n`;
      }
      
      if (crop.yield) {
        const yieldVal = typeof crop.yield === 'object' 
          ? Object.values(crop.yield)[0] 
          : crop.yield;
        response += isHindi 
          ? `उपज: ${yieldVal}\n`
          : `Expected Yield: ${yieldVal}\n`;
      }

      sources.push({ type: 'ICAR', topic: name });
    }
    
    else if (result.type === 'scheme') {
      const scheme = result.data;
      const name = isHindi ? scheme.nameHi : scheme.name;
      
      response += `\n\n📋 **${name}**\n`;
      response += isHindi 
        ? `लाभ: ${scheme.benefitHi || scheme.benefit}\n`
        : `Benefit: ${scheme.benefit}\n`;
      
      if (scheme.eligibility) {
        const elig = isHindi ? scheme.eligibilityHi : scheme.eligibility;
        response += isHindi ? `पात्रता:\n` : `Eligibility:\n`;
        elig.slice(0, 3).forEach(e => {
          response += `• ${e}\n`;
        });
      }
      
      if (scheme.portal) {
        response += isHindi 
          ? `पोर्टल: ${scheme.portal}\n`
          : `Portal: ${scheme.portal}\n`;
      }

      sources.push({ type: 'Government', topic: scheme.name });
    }
    
    else if (result.type === 'topic') {
      if (result.name === 'irrigation') {
        const irr = result.data.methods;
        response += isHindi 
          ? `\n\n💧 **सिंचाई विधियां**\n`
          : `\n\n💧 **Irrigation Methods**\n`;
        
        if (irr.drip) {
          response += isHindi 
            ? `ड्रिप सिंचाई: ${irr.drip.efficiency} दक्षता, ${irr.drip.subsidy} सब्सिडी\n`
            : `Drip Irrigation: ${irr.drip.efficiency} efficiency, ${irr.drip.subsidy} subsidy\n`;
        }
        if (irr.sprinkler) {
          response += isHindi 
            ? `स्प्रिंकलर: ${irr.sprinkler.efficiency} दक्षता\n`
            : `Sprinkler: ${irr.sprinkler.efficiency} efficiency\n`;
        }
      }
      
      else if (result.name === 'ipm') {
        response += isHindi 
          ? `\n\n🐛 **एकीकृत कीट प्रबंधन (IPM)**\n`
          : `\n\n🐛 **Integrated Pest Management (IPM)**\n`;
        
        const principles = isHindi ? result.data.principlesHi : result.data.principles;
        principles.slice(0, 4).forEach(p => {
          response += `• ${p}\n`;
        });
      }
      
      else if (result.name === 'soil') {
        response += isHindi 
          ? `\n\n🌱 **मृदा स्वास्थ्य**\n`
          : `\n\n🌱 **Soil Health**\n`;
        
        response += isHindi 
          ? `${result.data.testing.importanceHi}\n`
          : `${result.data.testing.importance}\n`;
        
        response += isHindi 
          ? `परीक्षण पैरामीटर: ${result.data.testing.parameters.slice(0, 6).join(', ')}\n`
          : `Test Parameters: ${result.data.testing.parameters.slice(0, 6).join(', ')}\n`;
      }

      sources.push({ type: 'Agricultural Knowledge Base', topic: result.name });
    }
  }

  return {
    found: true,
    response: response.trim(),
    sources,
    resultCount: searchResults.length,
  };
}

// Get crop-specific advice
export function getCropAdvice(cropName, topic, language = 'en') {
  const crop = KNOWLEDGE_BASE.crops[cropName.toLowerCase()];
  if (!crop) {
    return null;
  }

  const isHindi = language === 'hi';
  const topics = {
    'sowing': { en: 'Season', hi: 'मौसम' },
    'fertilizer': { en: 'Fertilizer', hi: 'उर्वरक' },
    'irrigation': { en: 'Irrigation', hi: 'सिंचाई' },
    'harvest': { en: 'Harvest', hi: 'कटाई' },
    'varieties': { en: 'Varieties', hi: 'किस्में' },
  };

  return {
    crop: isHindi ? crop.nameHi : cropName,
    topic: topics[topic]?.[language] || topic,
    data: crop[topic] || crop,
  };
}

// Get scheme details
export function getSchemeDetails(schemeId, language = 'en') {
  const scheme = KNOWLEDGE_BASE.schemes[schemeId.toLowerCase().replace(/-/g, '_')];
  if (!scheme) {
    return null;
  }

  const isHindi = language === 'hi';
  return {
    name: isHindi ? scheme.nameHi : scheme.name,
    fullName: scheme.fullName,
    benefit: isHindi ? (scheme.benefitHi || scheme.benefit) : scheme.benefit,
    eligibility: isHindi ? (scheme.eligibilityHi || scheme.eligibility) : scheme.eligibility,
    documents: scheme.documents,
    portal: scheme.portal,
  };
}

// Named exports
export { KNOWLEDGE_BASE };

export default {
  searchKnowledge,
  generateKnowledgeResponse,
  getCropAdvice,
  getSchemeDetails,
  KNOWLEDGE_BASE,
};
