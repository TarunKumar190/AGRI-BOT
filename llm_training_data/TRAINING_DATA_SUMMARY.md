# 📚 LLM Training Data - Complete Summary

## KrishiMitra Agricultural Chatbot Training Dataset

This folder contains **comprehensive training data** for building an agricultural LLM/chatbot for Indian farmers.

---

## 📊 Dataset Statistics

| File | Category | Examples | Languages |
|------|----------|----------|-----------|
| MASSIVE_QA_PART1_MANDI.json | Mandi Prices & MSP | ~500 | EN, HI |
| MASSIVE_QA_PART2_CROP_ADVISORY.json | Crop Cultivation | ~600 | EN, HI |
| MASSIVE_QA_PART3_DISEASES.json | Disease & Pest Control | ~500 | EN, HI |
| MASSIVE_QA_PART4_SCHEMES.json | Government Schemes | ~400 | EN, HI |
| MASSIVE_QA_PART5_WEATHER.json | Weather Advisory | ~400 | EN, HI |
| MASSIVE_QA_PART6_FERTILIZER_PEST.json | Fertilizer & Organic | ~500 | EN, HI |
| MASSIVE_QA_PART7_CONVERSATIONS.json | Multi-turn Dialogues | ~300 | EN, HI |
| government_schemes.json | Scheme Details | 12 schemes | EN, HI |
| msp_mandi_prices.json | Price Data | All crops | EN |
| crop_advisory.json | Crop Guides | 8 crops | EN, HI |
| multilingual_translations.json | UI Translations | 100+ keys | EN, HI, TE, MR |
| query_patterns_intents.json | Intent Recognition | 7 intents | EN, HI |
| indian_locations.json | Location Data | 15 states | EN |
| DISEASE_PEST_DATABASE.json | Disease Database | 50+ diseases | EN, HI |
| CROP_CULTIVATION_GUIDE.json | Full Crop Guides | 15 crops | EN, HI |
| LLM_TRAINING_PROMPTS.json | Sample Prompts | ~200 | EN, HI |
| REALTIME_APIS_FOR_LLM.md | API Documentation | - | EN |

**Total Training Examples: ~4000+**

---

## 🏗️ Data Structure

### Query Variations Format
```json
{
  "variations": [
    "English query 1",
    "Hindi romanized query",
    "हिंदी में क्वेरी",
    "Alternative phrasing"
  ],
  "intent": "MANDI_PRICE",
  "entities": {
    "crop": "wheat",
    "location": "punjab"
  },
  "response": {
    "en": "English response with {placeholders}",
    "hi": "हिंदी में जवाब {placeholders} के साथ"
  }
}
```

### Multi-turn Dialogue Format
```json
{
  "scenario": "pest_identification",
  "turns": [
    {"user": "...", "assistant": "..."},
    {"user": "...", "assistant": "..."}
  ]
}
```

---

## 📂 File Descriptions

### Core Training Data (Massive Q&A Files)

1. **MASSIVE_QA_PART1_MANDI.json** - Mandi Prices
   - Crop-wise price queries (30+ crops)
   - Location-based queries (10+ states)
   - MSP queries
   - Price comparison queries

2. **MASSIVE_QA_PART2_CROP_ADVISORY.json** - Crop Cultivation
   - Complete cultivation guides (wheat, rice, maize, potato, etc.)
   - Sowing time queries
   - Irrigation schedules
   - Fertilizer doses
   - Variety recommendations

3. **MASSIVE_QA_PART3_DISEASES.json** - Disease Detection
   - Wheat diseases (rust, smut, etc.)
   - Rice diseases (blast, BLB, etc.)
   - Vegetable diseases
   - Pest control queries
   - Symptom-based identification

4. **MASSIVE_QA_PART4_SCHEMES.json** - Government Schemes
   - PM-KISAN (registration, status, e-KYC)
   - KCC (Kisan Credit Card)
   - PMFBY (Crop Insurance)
   - Soil Health Card
   - Farm machinery subsidies
   - Drip irrigation schemes

5. **MASSIVE_QA_PART5_WEATHER.json** - Weather Advisory
   - Weather forecast queries
   - Heavy rain advisory
   - Drought management
   - Frost protection
   - Heatwave advisory
   - Hailstorm recovery
   - Seasonal farming guides

6. **MASSIVE_QA_PART6_FERTILIZER_PEST.json** - Fertilizer & Organic
   - NPK guide
   - Urea application
   - DAP vs NPK comparison
   - Organic farming
   - Vermicompost making
   - Jeevamrut recipe
   - Natural pest control
   - Neem spray recipes
   - Weed control

7. **MASSIVE_QA_PART7_CONVERSATIONS.json** - Dialogues
   - Multi-turn conversations
   - Greeting responses
   - Fallback responses
   - Emergency queries
   - Location-based recommendations

---

## 🎯 Intent Categories

1. **MANDI_PRICE** - Market prices, MSP, selling advice
2. **CROP_ADVISORY** - Cultivation, varieties, sowing, harvesting
3. **DISEASE_DETECTION** - Symptoms, identification, treatment
4. **PEST_CONTROL** - Insects, biological control, pesticides
5. **WEATHER** - Forecast, climate advisory, seasonal
6. **GOVERNMENT_SCHEME** - PM-KISAN, KCC, PMFBY, subsidies
7. **FERTILIZER** - NPK, organic, application methods
8. **GENERAL** - Greetings, help, navigation

---

## 🌾 Crops Covered

| Cereals | Pulses | Oilseeds | Vegetables | Cash Crops |
|---------|--------|----------|------------|------------|
| Wheat | Gram | Soybean | Tomato | Cotton |
| Rice | Arhar/Tur | Groundnut | Potato | Sugarcane |
| Maize | Moong | Mustard | Onion | Jute |
| Bajra | Urad | Sunflower | Chilli | - |
| Jowar | Masoor | Castor | Cauliflower | - |

---

## 🗺️ Locations Covered

**States:** Punjab, Haryana, Uttar Pradesh, Madhya Pradesh, Maharashtra, Rajasthan, Gujarat, Karnataka, Andhra Pradesh, Telangana, Tamil Nadu, Bihar, West Bengal, Odisha, Chhattisgarh

**Major Mandis:** Azadpur (Delhi), Lasalgaon (Nashik), Vashi (Mumbai), Karnal, Ludhiana, Indore, Dewas, Rajkot, Guntur

---

## 🔧 How to Use This Data

### For Fine-tuning LLM:
```python
# Load training data
import json

with open('MASSIVE_QA_PART1_MANDI.json', 'r', encoding='utf-8') as f:
    mandi_data = json.load(f)

# Extract Q&A pairs
training_pairs = []
for query in mandi_data['crop_price_queries']:
    for variation in query['variations']:
        training_pairs.append({
            'input': variation,
            'output': query['response']['hi'],  # or 'en'
            'intent': query.get('intent', 'MANDI_PRICE')
        })
```

### For Intent Classification:
```python
# Use query_patterns_intents.json
intents = ['MANDI_PRICE', 'CROP_ADVISORY', 'DISEASE_DETECTION', ...]

# Create training dataset for classifier
X = [variation for pattern in patterns for variation in pattern['variations']]
y = [pattern['intent'] for pattern in patterns for _ in pattern['variations']]
```

### For Response Generation:
```python
# Use response templates with placeholders
template = "आज {location} में {crop} का भाव ₹{price}/क्विंटल है"
response = template.format(location="करनाल", crop="गेहूं", price="2200")
```

---

## 📌 Key Features

✅ **Bilingual**: English + Hindi responses for all queries
✅ **Romanized Hindi**: Includes "gehun" along with "गेहूं"
✅ **Multiple Variations**: 10-15 query variations per topic
✅ **Comprehensive Coverage**: All aspects of Indian farming
✅ **Practical Information**: Real MSP rates, actual schemes, working methods
✅ **Multi-turn Dialogues**: Realistic conversation flows
✅ **Emergency Responses**: Critical situation handling
✅ **Location-aware**: State and district specific advice

---

## 🚀 Training Recommendations

1. **Start with intent classification** using query_patterns_intents.json
2. **Fine-tune for domain** using MASSIVE_QA files
3. **Add conversation flow** using PART7_CONVERSATIONS
4. **Integrate real-time APIs** (see REALTIME_APIS_FOR_LLM.md)
5. **Test with regional languages** using multilingual_translations.json

---

## 📞 Data Sources

- Ministry of Agriculture, India
- data.gov.in (Mandi prices API)
- ICAR research publications
- State agriculture department guidelines
- PM-KISAN, PMFBY official portals
- IMD weather services

---

## ⚠️ Disclaimer

This training data is for educational purposes. Verify information from official sources before implementation. Pesticide recommendations should be confirmed with local agricultural authorities.

---

**Created for KrishiMitra Agri-Bot Project**
**Last Updated: 2024**
