# KrishiMitra Agricultural LLM Training Data

This folder contains all the data extracted from the KrishiMitra Agri-Bot project for training your custom LLM.

## 📁 Files Overview

### 1. `government_schemes.json`
Complete data about Indian government schemes for farmers including:
- **12 major schemes**: PM-KISAN, PMFBY, PMKSY, KCC, Soil Health Card, PM-KMY, e-NAM, PM-KUSUM, Agriculture Infrastructure Fund, NFSM, RKVY, PKVY
- Fields: scheme_id, scheme_name, ministry, sector, description, eligibility, benefits, how_to_apply, documents_required, helpline, official_portal
- Keywords in Hindi and English for query matching

### 2. `msp_mandi_prices.json`
Market price data including:
- **MSP Rates 2024-25** for all Kharif and Rabi crops
- State-specific mandi information with major mandis
- Crop calendar (sowing/harvest times) by state
- Price trends and factors affecting prices
- Query patterns for market price detection

### 3. `crop_advisory.json`
Comprehensive farming guidance for major crops:
- **Crops covered**: Wheat, Rice, Maize, Potato, Sugarcane, Mandua (Ragi), Cotton, Mustard
- For each crop:
  - Names in 4 languages (English, Hindi, Telugu, Marathi)
  - Optimal conditions (temperature, rainfall, soil)
  - Sowing details with seed rate and spacing
  - Recommended varieties
  - Fertilizer recommendations with timing
  - Disease information with symptoms, treatment, prevention
  - Pest management
  - Weather-based advice
  - Harvest information

### 4. `multilingual_translations.json`
Complete UI translations for:
- **4 languages**: English, Hindi, Telugu, Marathi
- All app sections: navigation, chat, disease detection, weather, market, schemes, settings
- Crop names in all languages
- State names in all languages
- Chatbot response templates

### 5. `query_patterns_intents.json`
Intent classification data:
- **7 intent categories**: market_price, crop_advisory, disease_pest, government_scheme, weather, fertilizer_irrigation, general_greeting
- Keywords for each intent in Hindi and English
- Sample queries with intent labels and extracted entities
- Entity extraction patterns for crops, locations, diseases, pests
- Response generation templates

### 6. `indian_locations.json`
Location data for geocoding:
- **15 major states** with all districts
- District names in Hindi (and Telugu for AP/Telangana)
- Major cities and mandis
- State codes

## 🎯 Use Cases for LLM Training

### Intent Classification
Train your model to classify queries into:
- Market price queries (भाव, मंडी, rate, price, sell)
- Crop advisory queries (खेती, उगाना, farming, how to grow)
- Disease/pest queries (रोग, कीट, disease, treatment)
- Scheme queries (योजना, सब्सिडी, pm kisan)
- Weather queries (मौसम, बारिश, forecast)

### Entity Extraction
Extract entities from queries:
- **Crops**: गेहूं, धान, मक्का, wheat, rice, maize
- **Locations**: मुरादाबाद, lucknow, पंजाब
- **Diseases**: झुलसा, रतुआ, blast, rust
- **Pests**: माहू, तना छेदक, aphids

### Response Generation
Use templates for generating responses:
- Market prices with MSP comparison
- Crop advisory with weather-based recommendations
- Scheme information with eligibility and how-to-apply

### Multilingual Support
- Respond in user's preferred language
- Translate technical terms appropriately
- Use language-specific greetings and phrases

## 📊 Data Statistics

| Category | Count |
|----------|-------|
| Government Schemes | 12 |
| Crops with detailed advisory | 8 |
| MSP Crops | 25+ |
| States with location data | 15 |
| Districts covered | 200+ |
| Languages supported | 4 |
| Sample queries | 50+ |
| Intent categories | 7 |

## 🔗 API Endpoints Reference

The chatbot uses these internal endpoints:
- `POST /v1/chatbot` - Main chatbot query handler
- `POST /v1/crop-advice` - Crop-specific advisory
- `GET /v1/market/prices` - Mandi prices
- `GET /v1/schemes` - Government schemes
- `GET /v1/weather` - Weather forecast

## 💡 Tips for LLM Training

1. **Query Detection Priority**:
   - Check market keywords FIRST (भाव, price, mandi)
   - Then check crop advisory patterns (खेती, farming)
   - Then scheme keywords (योजना, scheme)

2. **Hindi Query Handling**:
   - Handle genitive forms: मक्के (of maize), गेहूं (of wheat)
   - Detect patterns like "में.*खेती" (farming in...)
   - Support mixed Hindi-English queries

3. **Location Extraction**:
   - Check known place names FIRST before pattern matching
   - Geocode to get actual state (don't assume from user profile)
   - Support Hindi place names (मुरादाबाद, लखनऊ)

4. **Response Formatting**:
   - Use emojis for visual appeal (🌾, 💰, 📍, 🌡️)
   - Include MSP comparison for market prices
   - Add disclaimers for AI responses

## 📝 License

This data is extracted from the KrishiMitra project for educational and development purposes.
