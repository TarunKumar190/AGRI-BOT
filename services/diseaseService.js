// Disease Detection Service - Crop disease diagnosis using image analysis
// Integrates with ML models for pest/disease detection

import fs from 'fs';
import path from 'path';

// Disease database with treatments (scientifically validated)
const DISEASE_DATABASE = {
  // Rice diseases
  'rice_blast': {
    name: 'Rice Blast',
    nameHi: 'धान का झुलसा रोग',
    crop: 'Rice',
    cropHi: 'धान',
    scientificName: 'Magnaporthe oryzae',
    symptoms: [
      'Diamond-shaped lesions on leaves',
      'Grayish center with brown margins',
      'Lesions may coalesce causing leaf death',
    ],
    symptomsHi: [
      'पत्तियों पर हीरे के आकार के धब्बे',
      'भूरे किनारों के साथ धूसर केंद्र',
      'धब्बे मिलकर पत्ती को मार सकते हैं',
    ],
    treatment: [
      'Apply Tricyclazole 75% WP @ 0.6g/L water',
      'Spray Carbendazim 50% WP @ 1g/L',
      'Use Isoprothiolane 40% EC @ 1.5ml/L',
      'Remove and destroy infected plant debris',
    ],
    treatmentHi: [
      'ट्राइसाइक्लाजोल 75% WP @ 0.6 ग्राम/लीटर पानी में छिड़काव',
      'कार्बेन्डाजिम 50% WP @ 1 ग्राम/लीटर छिड़काव',
      'आइसोप्रोथियोलेन 40% EC @ 1.5 मिली/लीटर प्रयोग करें',
      'संक्रमित पौधों के अवशेष हटाकर नष्ट करें',
    ],
    prevention: [
      'Use blast-resistant varieties (Pusa Basmati 1121, PR-126)',
      'Avoid excessive nitrogen fertilization',
      'Maintain proper spacing (20x15 cm)',
      'Treat seeds with fungicide before sowing',
    ],
    preventionHi: [
      'रोग प्रतिरोधी किस्में उगाएं (पूसा बासमती 1121, PR-126)',
      'अत्यधिक नाइट्रोजन उर्वरक से बचें',
      'उचित दूरी रखें (20x15 सेमी)',
      'बुवाई से पहले बीज उपचार करें',
    ],
    severity: 'high',
    spreadRate: 'fast',
    economicImpact: 'Can cause 30-50% yield loss if untreated',
  },

  'rice_brown_spot': {
    name: 'Brown Spot',
    nameHi: 'भूरा धब्बा रोग',
    crop: 'Rice',
    cropHi: 'धान',
    scientificName: 'Bipolaris oryzae',
    symptoms: [
      'Oval brown spots on leaves',
      'Spots have yellow halo',
      'Seeds may become discolored',
    ],
    symptomsHi: [
      'पत्तियों पर अंडाकार भूरे धब्बे',
      'धब्बों के चारों ओर पीला घेरा',
      'दाने भी रंगहीन हो सकते हैं',
    ],
    treatment: [
      'Spray Mancozeb 75% WP @ 2.5g/L',
      'Apply Propiconazole 25% EC @ 1ml/L',
      'Use Copper Oxychloride 50% WP @ 3g/L',
    ],
    treatmentHi: [
      'मैंकोज़ेब 75% WP @ 2.5 ग्राम/लीटर छिड़काव',
      'प्रोपिकोनाज़ोल 25% EC @ 1 मिली/लीटर प्रयोग',
      'कॉपर ऑक्सीक्लोराइड 50% WP @ 3 ग्राम/लीटर',
    ],
    prevention: [
      'Use certified disease-free seeds',
      'Apply balanced fertilization',
      'Avoid water stress during crop growth',
    ],
    preventionHi: [
      'प्रमाणित रोगमुक्त बीज का प्रयोग करें',
      'संतुलित उर्वरक प्रयोग करें',
      'फसल वृद्धि के दौरान पानी की कमी न होने दें',
    ],
    severity: 'moderate',
    spreadRate: 'moderate',
    economicImpact: 'Can cause 10-30% yield loss',
  },

  // Wheat diseases
  'wheat_rust': {
    name: 'Yellow Rust (Stripe Rust)',
    nameHi: 'पीला रतुआ (धारीदार रतुआ)',
    crop: 'Wheat',
    cropHi: 'गेहूं',
    scientificName: 'Puccinia striiformis',
    symptoms: [
      'Yellow-orange pustules in stripes on leaves',
      'Pustules arranged parallel to leaf veins',
      'Severe infection causes leaf drying',
    ],
    symptomsHi: [
      'पत्तियों पर पीले-नारंगी धारियों में फुंसियां',
      'फुंसियां पत्ती की नसों के समानांतर',
      'गंभीर संक्रमण से पत्तियां सूख जाती हैं',
    ],
    treatment: [
      'Spray Propiconazole 25% EC @ 1ml/L immediately',
      'Apply Tebuconazole 25.9% EC @ 1ml/L',
      'Use Triadimefon 25% WP @ 1g/L',
      'Repeat spray after 15 days if needed',
    ],
    treatmentHi: [
      'तुरंत प्रोपिकोनाज़ोल 25% EC @ 1 मिली/लीटर छिड़काव',
      'टेबुकोनाज़ोल 25.9% EC @ 1 मिली/लीटर प्रयोग',
      'ट्राइडीमेफॉन 25% WP @ 1 ग्राम/लीटर',
      'जरूरत हो तो 15 दिन बाद दोहराएं',
    ],
    prevention: [
      'Grow resistant varieties (HD-3086, PBW-725)',
      'Avoid late sowing (after Nov 15)',
      'Do not apply excess nitrogen',
      'Remove volunteer wheat plants',
    ],
    preventionHi: [
      'प्रतिरोधी किस्में उगाएं (HD-3086, PBW-725)',
      '15 नवंबर के बाद बुवाई से बचें',
      'अधिक नाइट्रोजन न दें',
      'स्वयंसेवी गेहूं पौधे हटाएं',
    ],
    severity: 'high',
    spreadRate: 'very fast',
    economicImpact: 'Can cause 40-100% loss if untreated',
  },

  'wheat_leaf_blight': {
    name: 'Leaf Blight',
    nameHi: 'पत्ती झुलसा रोग',
    crop: 'Wheat',
    cropHi: 'गेहूं',
    scientificName: 'Alternaria triticina / Bipolaris sorokiniana',
    symptoms: [
      'Irregular brown lesions on leaves',
      'Lesions may have concentric rings',
      'Severe infection causes premature leaf senescence',
    ],
    symptomsHi: [
      'पत्तियों पर अनियमित भूरे धब्बे',
      'धब्बों में संकेंद्रित वलय हो सकते हैं',
      'गंभीर संक्रमण से पत्तियां जल्दी सूखती हैं',
    ],
    treatment: [
      'Apply Mancozeb 75% WP @ 2.5g/L',
      'Spray Propiconazole 25% EC @ 1ml/L',
      'Use Tebuconazole + Trifloxystrobin (Nativo) @ 0.4g/L',
    ],
    treatmentHi: [
      'मैंकोज़ेब 75% WP @ 2.5 ग्राम/लीटर',
      'प्रोपिकोनाज़ोल 25% EC @ 1 मिली/लीटर छिड़काव',
      'टेबुकोनाज़ोल + ट्राइफ्लॉक्सीस्ट्रोबिन (नैटिवो) @ 0.4 ग्राम/लीटर',
    ],
    prevention: [
      'Use disease-free certified seeds',
      'Treat seeds with Carboxin + Thiram',
      'Practice crop rotation',
      'Remove crop residues after harvest',
    ],
    preventionHi: [
      'प्रमाणित रोगमुक्त बीज प्रयोग करें',
      'कार्बोक्सिन + थीरम से बीज उपचार',
      'फसल चक्र अपनाएं',
      'कटाई के बाद फसल अवशेष हटाएं',
    ],
    severity: 'moderate',
    spreadRate: 'moderate',
    economicImpact: 'Can cause 15-25% yield reduction',
  },

  // Cotton diseases
  'cotton_leaf_curl': {
    name: 'Cotton Leaf Curl Virus',
    nameHi: 'कपास पत्ती मरोड़ रोग',
    crop: 'Cotton',
    cropHi: 'कपास',
    scientificName: 'Cotton Leaf Curl Virus (CLCuV)',
    symptoms: [
      'Upward or downward curling of leaves',
      'Thickening of leaf veins',
      'Enation (leaf-like outgrowths) on lower surface',
      'Stunted plant growth',
    ],
    symptomsHi: [
      'पत्तियों का ऊपर या नीचे की ओर मुड़ना',
      'पत्ती की नसों का मोटा होना',
      'पत्ती की निचली सतह पर उभार',
      'पौधे की वृद्धि रुकना',
    ],
    treatment: [
      'Control whitefly vector with Imidacloprid 17.8 SL @ 0.3ml/L',
      'Spray Thiamethoxam 25% WG @ 0.3g/L',
      'Apply Diafenthiuron 50% WP @ 1g/L for whitefly',
      'Uproot and destroy severely infected plants',
    ],
    treatmentHi: [
      'इमिडाक्लोप्रिड 17.8 SL @ 0.3 मिली/लीटर से सफेद मक्खी नियंत्रण',
      'थियामेथोक्सम 25% WG @ 0.3 ग्राम/लीटर छिड़काव',
      'डायफेंथ्यूरॉन 50% WP @ 1 ग्राम/लीटर',
      'गंभीर रूप से संक्रमित पौधे उखाड़कर नष्ट करें',
    ],
    prevention: [
      'Grow resistant varieties (Bt cotton hybrids)',
      'Use yellow sticky traps for whitefly monitoring',
      'Avoid ratoon cotton cultivation',
      'Sow border crops like maize to repel whitefly',
    ],
    preventionHi: [
      'प्रतिरोधी किस्में उगाएं (बीटी कपास संकर)',
      'सफेद मक्खी निगरानी के लिए पीले चिपचिपे जाल',
      'रटून कपास की खेती से बचें',
      'सफेद मक्खी भगाने के लिए मक्का बॉर्डर लगाएं',
    ],
    severity: 'very high',
    spreadRate: 'fast',
    economicImpact: 'Can cause 50-80% yield loss',
  },

  // Vegetable diseases
  'tomato_late_blight': {
    name: 'Late Blight',
    nameHi: 'झुलसा रोग (लेट ब्लाइट)',
    crop: 'Tomato/Potato',
    cropHi: 'टमाटर/आलू',
    scientificName: 'Phytophthora infestans',
    symptoms: [
      'Water-soaked lesions on leaves',
      'White fungal growth on leaf underside',
      'Dark brown lesions on stems',
      'Rapid plant death in humid conditions',
    ],
    symptomsHi: [
      'पत्तियों पर पानी भरे धब्बे',
      'पत्ती के नीचे सफेद फफूंद',
      'तनों पर गहरे भूरे धब्बे',
      'नम मौसम में पौधे जल्दी मरते हैं',
    ],
    treatment: [
      'Spray Mancozeb 75% WP @ 2.5g/L immediately',
      'Apply Cymoxanil + Mancozeb (Curzate M8) @ 3g/L',
      'Use Metalaxyl + Mancozeb (Ridomil Gold) @ 2.5g/L',
      'Spray every 7 days during disease spread',
    ],
    treatmentHi: [
      'तुरंत मैंकोज़ेब 75% WP @ 2.5 ग्राम/लीटर छिड़काव',
      'साइमोक्सानिल + मैंकोज़ेब (कर्ज़ेट M8) @ 3 ग्राम/लीटर',
      'मेटालैक्सिल + मैंकोज़ेब (रिडोमिल गोल्ड) @ 2.5 ग्राम/लीटर',
      'रोग फैलने पर हर 7 दिन छिड़काव',
    ],
    prevention: [
      'Use disease-free seedlings',
      'Avoid overhead irrigation',
      'Maintain proper plant spacing for air circulation',
      'Remove infected plant parts immediately',
    ],
    preventionHi: [
      'रोगमुक्त पौध का प्रयोग करें',
      'ऊपर से सिंचाई से बचें',
      'हवा के आवागमन के लिए उचित दूरी रखें',
      'संक्रमित भागों को तुरंत हटाएं',
    ],
    severity: 'very high',
    spreadRate: 'very fast',
    economicImpact: 'Can destroy entire crop within days',
  },

  // Generic healthy plant response
  'healthy': {
    name: 'Healthy Plant',
    nameHi: 'स्वस्थ पौधा',
    crop: 'General',
    cropHi: 'सामान्य',
    message: 'No disease detected. Your plant appears healthy!',
    messageHi: 'कोई रोग नहीं पाया गया। आपका पौधा स्वस्थ दिखता है!',
    tips: [
      'Continue regular monitoring',
      'Maintain proper irrigation schedule',
      'Apply balanced fertilizers',
      'Watch for any new symptoms',
    ],
    tipsHi: [
      'नियमित निगरानी जारी रखें',
      'उचित सिंचाई अनुसूची बनाए रखें',
      'संतुलित उर्वरक दें',
      'किसी भी नए लक्षण पर नजर रखें',
    ],
  },
};

// Simulated disease detection (would be replaced with actual ML model)
function simulateDiseaseDetection(imageBuffer, cropType) {
  // In production, this would:
  // 1. Preprocess image (resize, normalize)
  // 2. Run through trained model (YOLO/ResNet)
  // 3. Return predictions with confidence scores

  // For demo, return a disease based on crop type with random confidence
  const cropDiseases = {
    'rice': ['rice_blast', 'rice_brown_spot', 'healthy'],
    'wheat': ['wheat_rust', 'wheat_leaf_blight', 'healthy'],
    'cotton': ['cotton_leaf_curl', 'healthy'],
    'tomato': ['tomato_late_blight', 'healthy'],
    'potato': ['tomato_late_blight', 'healthy'],
  };

  const diseases = cropDiseases[cropType?.toLowerCase()] || ['healthy'];
  const detectedDisease = diseases[Math.floor(Math.random() * diseases.length)];
  const confidence = 75 + Math.random() * 20; // 75-95% confidence

  return {
    disease: detectedDisease,
    confidence: parseFloat(confidence.toFixed(1)),
    allPredictions: diseases.map(d => ({
      disease: d,
      confidence: d === detectedDisease ? confidence : Math.random() * 30,
    })).sort((a, b) => b.confidence - a.confidence),
  };
}

// Main disease detection function
export async function detectDisease(imageData, options = {}) {
  const {
    cropType = null,
    language = 'en',
  } = options;

  try {
    // Simulate ML model prediction
    const prediction = simulateDiseaseDetection(imageData, cropType);
    const diseaseKey = prediction.disease;
    const diseaseInfo = DISEASE_DATABASE[diseaseKey];

    if (!diseaseInfo) {
      return {
        ok: false,
        error: 'Unknown disease detected',
      };
    }

    const isHealthy = diseaseKey === 'healthy';
    const lang = language === 'hi' ? 'Hi' : '';

    if (isHealthy) {
      return {
        ok: true,
        detected: false,
        disease: null,
        message: diseaseInfo[`message${lang}`] || diseaseInfo.message,
        tips: diseaseInfo[`tips${lang}`] || diseaseInfo.tips,
        confidence: prediction.confidence,
      };
    }

    return {
      ok: true,
      detected: true,
      disease: diseaseInfo[`name${lang}`] || diseaseInfo.name,
      scientificName: diseaseInfo.scientificName,
      crop: diseaseInfo[`crop${lang}`] || diseaseInfo.crop,
      confidence: prediction.confidence,
      severity: diseaseInfo.severity,
      spreadRate: diseaseInfo.spreadRate,
      symptoms: diseaseInfo[`symptoms${lang}`] || diseaseInfo.symptoms,
      treatment: diseaseInfo[`treatment${lang}`] || diseaseInfo.treatment,
      prevention: diseaseInfo[`prevention${lang}`] || diseaseInfo.prevention,
      economicImpact: diseaseInfo.economicImpact,
      allPredictions: prediction.allPredictions.slice(0, 3),
    };
  } catch (error) {
    console.error('Disease detection error:', error);
    throw error;
  }
}

// Get disease information by name
export function getDiseaseInfo(diseaseName, language = 'en') {
  const lang = language === 'hi' ? 'Hi' : '';
  
  for (const [key, info] of Object.entries(DISEASE_DATABASE)) {
    if (key === diseaseName || 
        info.name.toLowerCase().includes(diseaseName.toLowerCase()) ||
        info.nameHi?.includes(diseaseName)) {
      return {
        ok: true,
        disease: info[`name${lang}`] || info.name,
        scientificName: info.scientificName,
        crop: info[`crop${lang}`] || info.crop,
        severity: info.severity,
        symptoms: info[`symptoms${lang}`] || info.symptoms,
        treatment: info[`treatment${lang}`] || info.treatment,
        prevention: info[`prevention${lang}`] || info.prevention,
      };
    }
  }

  return {
    ok: false,
    error: language === 'hi' 
      ? 'रोग की जानकारी नहीं मिली'
      : 'Disease information not found',
  };
}

// Get all diseases for a crop
export function getCropDiseases(cropName, language = 'en') {
  const lang = language === 'hi' ? 'Hi' : '';
  const diseases = [];

  for (const [key, info] of Object.entries(DISEASE_DATABASE)) {
    if (key === 'healthy') continue;
    
    if (info.crop.toLowerCase().includes(cropName.toLowerCase()) ||
        info.cropHi?.includes(cropName)) {
      diseases.push({
        id: key,
        name: info[`name${lang}`] || info.name,
        severity: info.severity,
        symptoms: (info[`symptoms${lang}`] || info.symptoms).slice(0, 2),
      });
    }
  }

  return {
    ok: true,
    crop: cropName,
    totalDiseases: diseases.length,
    diseases,
  };
}

export default {
  detectDisease,
  getDiseaseInfo,
  getCropDiseases,
  DISEASE_DATABASE,
};
