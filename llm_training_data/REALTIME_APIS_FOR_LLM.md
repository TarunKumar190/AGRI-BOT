# 🔴 REAL-TIME APIs for LLM - KrishiMitra Chatbot

> **IMPORTANT:** Give this document to your friend working on the LLM. These APIs provide LIVE/CURRENT data for the chatbot.

---

## 📊 1. MANDI PRICES (Live Market Data)

### Primary API: data.gov.in (AGMARKNET)
```
Base URL: https://api.data.gov.in/resource
Resource ID: 9ef84268-d588-465a-a308-a864a43d0070

API Key (Free): 579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b
(Register at data.gov.in for your own key)

Example Request:
GET https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b&format=json&limit=100&filters[state]=Punjab

Response Fields:
- commodity: Crop name
- variety: Crop variety
- state: State name
- district: District name
- market: Mandi name
- min_price: Minimum price (₹/quintal)
- max_price: Maximum price (₹/quintal)
- modal_price: Most common price (₹/quintal)
- arrival_date: Date of price
```

### Secondary API: AGMARKNET Direct
```
URL: https://agmarknet.gov.in/api
(For real-time mandi arrivals and prices)
```

### eNAM API (National Agriculture Market)
```
URL: https://enam.gov.in/web/dashboard/trade-data
(Live trading data from electronic mandis)
```

---

## 🌤️ 2. WEATHER DATA (Real-Time)

### Primary: OpenWeatherMap API
```
API URL: https://api.openweathermap.org/data/2.5/weather
Forecast: https://api.openweathermap.org/data/2.5/forecast

Required: Get API key from https://openweathermap.org/api (Free tier available)

Example Request:
GET https://api.openweathermap.org/data/2.5/weather?lat=31.1471&lon=75.3412&appid=YOUR_API_KEY&units=metric

Response Fields:
- main.temp: Temperature (°C)
- main.humidity: Humidity (%)
- weather[0].description: Weather condition
- wind.speed: Wind speed (m/s)
- rain.1h: Rainfall in last hour (mm)
```

### Secondary: IMD (India Meteorological Department)
```
URL: https://mausam.imd.gov.in/api
(Official Indian government weather data)
```

---

## 🌱 3. DISEASE DETECTION (Image Analysis)

### Plant Disease API (ML Model)
```
API URL: https://plant-disease-api-yt7l.onrender.com

Endpoint: POST /predict
Content-Type: multipart/form-data
Body: image file (crop leaf photo)

Response:
{
  "disease": "Rice Blast",
  "confidence": 0.95,
  "treatment": "Apply Tricyclazole 75% WP @ 0.6g/L water"
}
```

---

## 🤖 4. AI CHATBOT (Backup/Enhancement)

### Grok AI API (X.AI) - For complex queries
```
API URL: https://api.x.ai/v1/chat/completions
Method: POST
Headers:
  - Content-Type: application/json
  - Authorization: Bearer YOUR_GROK_API_KEY

Body:
{
  "model": "grok-beta",
  "messages": [
    {"role": "system", "content": "You are KrishiMitra, an expert AI for Indian farmers..."},
    {"role": "user", "content": "User query here"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

---

## 📍 5. GEOCODING & LOCATION

### OpenStreetMap Nominatim (Free)
```
URL: https://nominatim.openstreetmap.org/reverse

Example:
GET https://nominatim.openstreetmap.org/reverse?lat=31.1471&lon=75.3412&format=json

Response Fields:
- address.state: State name
- address.district: District name
- address.city: City name
```

---

## 📋 SUMMARY TABLE FOR YOUR LLM FRIEND

| Data Type | API | Free Tier | Key Required |
|-----------|-----|-----------|--------------|
| Mandi Prices | data.gov.in | ✅ Yes | ✅ Free key |
| Weather | OpenWeatherMap | ✅ Yes (60 calls/min) | ✅ Free key |
| Disease Detection | Render ML API | ✅ Yes | ❌ No |
| AI Fallback | Grok/X.AI | ❌ Paid | ✅ API key |
| Location | Nominatim | ✅ Yes | ❌ No |

---

## 🔧 HOW LLM SHOULD USE THESE APIs

### Query: "What is wheat price in Punjab today?"
```
1. Detect intent: MANDI_PRICE
2. Extract: crop=wheat, state=Punjab
3. Call: data.gov.in API with filters[state]=Punjab
4. Return: Real-time modal_price
```

### Query: "Weather in Ludhiana"
```
1. Detect intent: WEATHER
2. Get coordinates: lat=30.9, lon=75.85
3. Call: OpenWeatherMap API
4. Return: Current temp, humidity, forecast
```

### Query: "My rice leaves have spots" + [image]
```
1. Detect intent: DISEASE_DETECTION
2. Send image to: plant-disease-api
3. Get: disease name, confidence, treatment
4. Return: Diagnosis + treatment advice
```

---

## 🔑 API KEYS TO OBTAIN

1. **data.gov.in** - Register at https://data.gov.in (Free)
2. **OpenWeatherMap** - Register at https://openweathermap.org/api (Free)
3. **Grok/X.AI** - Get from https://x.ai (Paid - optional)

---

## 📦 ENVIRONMENT VARIABLES (.env file)

```env
# Real-time Data APIs
DATA_GOV_API_KEY=your_data_gov_key
OPENWEATHER_API_KEY=your_openweather_key

# AI Enhancement (optional)
GROK_API_KEY=your_grok_key
USE_GROK_AI=false

# Disease Detection (no key needed)
DISEASE_API_URL=https://plant-disease-api-yt7l.onrender.com
```

---

**Give this file to your friend. These are the LIVE data sources the chatbot uses!** 🚀
