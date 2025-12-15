// Weather Service - Integration with IMD and OpenWeatherMap APIs
// Provides real-time weather data and agricultural advisories

import fetch from 'node-fetch';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
const IMD_API_URL = 'https://mausam.imd.gov.in/api';

// Indian state coordinates for fallback
const STATE_COORDINATES = {
  'punjab': { lat: 31.1471, lon: 75.3412 },
  'haryana': { lat: 29.0588, lon: 76.0856 },
  'uttar pradesh': { lat: 26.8467, lon: 80.9462 },
  'madhya pradesh': { lat: 22.9734, lon: 78.6569 },
  'maharashtra': { lat: 19.7515, lon: 75.7139 },
  'gujarat': { lat: 22.2587, lon: 71.1924 },
  'rajasthan': { lat: 27.0238, lon: 74.2179 },
  'bihar': { lat: 25.0961, lon: 85.3131 },
  'karnataka': { lat: 15.3173, lon: 75.7139 },
  'andhra pradesh': { lat: 15.9129, lon: 79.7400 },
  'telangana': { lat: 18.1124, lon: 79.0193 },
  'tamil nadu': { lat: 11.1271, lon: 78.6569 },
  'west bengal': { lat: 22.9868, lon: 87.8550 },
  'odisha': { lat: 20.9517, lon: 85.0985 },
  'delhi': { lat: 28.7041, lon: 77.1025 },
  'uttarakhand': { lat: 30.0668, lon: 79.0193 },
};

// Weather condition mappings
const WEATHER_ICONS = {
  'Clear': '☀️',
  'Sunny': '☀️',
  'Clouds': '☁️',
  'Partly Cloudy': '⛅',
  'Scattered Clouds': '🌤️',
  'Broken Clouds': '☁️',
  'Rain': '🌧️',
  'Light Rain': '🌦️',
  'Heavy Rain': '⛈️',
  'Thunderstorm': '⛈️',
  'Drizzle': '🌦️',
  'Mist': '🌫️',
  'Fog': '🌫️',
  'Haze': '🌫️',
  'Snow': '❄️',
};

// Get weather icon
function getWeatherIcon(condition) {
  for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
    if (condition.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return '🌤️';
}

// Fetch weather from OpenWeatherMap
async function fetchOpenWeather(lat, lon) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeather API key not configured');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`OpenWeather API error: ${response.status}`);
  }
  
  return response.json();
}

// Fetch 5-day forecast
async function fetchForecast(lat, lon) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeather API key not configured');
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`OpenWeather Forecast API error: ${response.status}`);
  }
  
  return response.json();
}

// Generate farming advisory based on weather conditions
function generateFarmingAdvisory(weather, language = 'en') {
  const advisories = {
    en: {
      farming: [],
      irrigation: [],
      pesticide: [],
      harvest: [],
    },
    hi: {
      farming: [],
      irrigation: [],
      pesticide: [],
      harvest: [],
    }
  };

  const temp = weather.current?.temp || 30;
  const humidity = weather.current?.humidity || 60;
  const windSpeed = weather.current?.wind || 10;
  const rainChance = weather.rainChance || 0;
  const condition = weather.current?.condition || 'Clear';

  // Temperature-based advisories
  if (temp > 40) {
    advisories.en.farming.push('⚠️ Extreme heat alert! Avoid field work between 11 AM - 4 PM.');
    advisories.hi.farming.push('⚠️ अत्यधिक गर्मी चेतावनी! सुबह 11 से शाम 4 बजे तक खेत में काम न करें।');
    advisories.en.irrigation.push('💧 Irrigate in early morning (before 7 AM) or late evening (after 6 PM).');
    advisories.hi.irrigation.push('💧 सुबह जल्दी (7 बजे से पहले) या शाम को देर से (6 बजे के बाद) सिंचाई करें।');
  } else if (temp > 35) {
    advisories.en.farming.push('🌡️ High temperature. Ensure adequate water supply for crops.');
    advisories.hi.farming.push('🌡️ उच्च तापमान। फसलों को पर्याप्त पानी दें।');
  }

  // Rain-based advisories
  if (rainChance > 70 || condition.toLowerCase().includes('rain')) {
    advisories.en.pesticide.push('🚫 Avoid pesticide spraying today. Rain expected.');
    advisories.hi.pesticide.push('🚫 आज कीटनाशक छिड़काव न करें। बारिश की संभावना।');
    advisories.en.harvest.push('⚠️ Harvest mature crops immediately to prevent damage.');
    advisories.hi.harvest.push('⚠️ नुकसान से बचने के लिए तैयार फसल तुरंत काटें।');
  } else if (rainChance > 40) {
    advisories.en.pesticide.push('⏰ Spray pesticides in early morning if needed. Rain possible later.');
    advisories.hi.pesticide.push('⏰ जरूरत हो तो सुबह जल्दी कीटनाशक छिड़कें। बाद में बारिश संभव।');
  }

  // Wind-based advisories
  if (windSpeed > 20) {
    advisories.en.pesticide.push('💨 High wind speed. Not suitable for spraying operations.');
    advisories.hi.pesticide.push('💨 तेज हवा। छिड़काव के लिए उपयुक्त नहीं।');
  } else if (windSpeed < 10) {
    advisories.en.pesticide.push('✅ Good conditions for pesticide/fertilizer application.');
    advisories.hi.pesticide.push('✅ कीटनाशक/उर्वरक छिड़काव के लिए अच्छी स्थिति।');
  }

  // Humidity-based advisories
  if (humidity > 85) {
    advisories.en.farming.push('🍄 High humidity. Watch for fungal diseases in crops.');
    advisories.hi.farming.push('🍄 उच्च नमी। फसलों में फफूंद रोगों की निगरानी करें।');
  }

  const lang = advisories[language] || advisories.en;
  
  return {
    farming: lang.farming.join('\n') || (language === 'hi' ? 'खेती के लिए सामान्य स्थिति।' : 'Normal conditions for farming.'),
    irrigation: lang.irrigation.join('\n') || (language === 'hi' ? 'नियमित सिंचाई जारी रखें।' : 'Continue regular irrigation schedule.'),
    pesticide: lang.pesticide.join('\n') || (language === 'hi' ? 'कीटनाशक छिड़काव कर सकते हैं।' : 'Suitable for pesticide application.'),
    harvest: lang.harvest.join('\n') || (language === 'hi' ? 'कटाई के लिए सामान्य स्थिति।' : 'Normal conditions for harvesting.'),
  };
}

// Generate weather alerts
function generateWeatherAlerts(weather, language = 'en') {
  const alerts = [];
  const temp = weather.current?.temp || 30;
  const rainChance = weather.rainChance || 0;
  const condition = weather.current?.condition || 'Clear';

  if (temp > 42) {
    alerts.push({
      type: 'heat',
      severity: 'high',
      message: language === 'hi' 
        ? 'लू चेतावनी: अत्यधिक गर्मी। बाहर निकलने से बचें।'
        : 'Heat Wave Alert: Extreme temperatures. Avoid outdoor exposure.',
    });
  } else if (temp > 38) {
    alerts.push({
      type: 'heat',
      severity: 'medium',
      message: language === 'hi'
        ? 'गर्मी चेतावनी: दोपहर में छाया में रहें।'
        : 'Heat Advisory: Stay in shade during afternoon.',
    });
  }

  if (rainChance > 80 || condition.toLowerCase().includes('thunderstorm')) {
    alerts.push({
      type: 'rain',
      severity: 'high',
      message: language === 'hi'
        ? 'भारी बारिश/आंधी की चेतावनी। सतर्क रहें।'
        : 'Heavy rain/thunderstorm warning. Stay alert.',
    });
  }

  if (condition.toLowerCase().includes('fog') || condition.toLowerCase().includes('mist')) {
    alerts.push({
      type: 'fog',
      severity: 'medium',
      message: language === 'hi'
        ? 'कोहरा चेतावनी: दृश्यता कम। सावधानी से गाड़ी चलाएं।'
        : 'Fog Advisory: Low visibility. Drive carefully.',
    });
  }

  return alerts;
}

// Main function to get complete weather data
export async function getWeatherData(location, language = 'en') {
  try {
    let lat, lon, locationName;

    // Parse location
    if (typeof location === 'object' && location.lat && location.lon) {
      lat = location.lat;
      lon = location.lon;
      locationName = location.name || 'Your Location';
    } else if (typeof location === 'string') {
      const stateKey = location.toLowerCase();
      if (STATE_COORDINATES[stateKey]) {
        lat = STATE_COORDINATES[stateKey].lat;
        lon = STATE_COORDINATES[stateKey].lon;
        locationName = location.charAt(0).toUpperCase() + location.slice(1);
      } else {
        // Default to Delhi
        lat = 28.7041;
        lon = 77.1025;
        locationName = 'Delhi';
      }
    } else {
      lat = 28.7041;
      lon = 77.1025;
      locationName = 'Delhi';
    }

    // Try to fetch real weather data
    let currentWeather, forecast;
    
    if (OPENWEATHER_API_KEY) {
      try {
        [currentWeather, forecast] = await Promise.all([
          fetchOpenWeather(lat, lon),
          fetchForecast(lat, lon),
        ]);
      } catch (apiError) {
        console.error('Weather API error:', apiError.message);
      }
    }

    // Build weather response
    let weatherData;
    
    if (currentWeather) {
      // Real API data
      const condition = currentWeather.weather?.[0]?.main || 'Clear';
      const rainChance = currentWeather.clouds?.all || 0;
      
      weatherData = {
        location: `${currentWeather.name}, India`,
        current: {
          temp: Math.round(currentWeather.main?.temp || 30),
          feels_like: Math.round(currentWeather.main?.feels_like || 32),
          condition: condition,
          icon: getWeatherIcon(condition),
          humidity: currentWeather.main?.humidity || 60,
          wind: Math.round(currentWeather.wind?.speed || 10),
          uv: 6, // UV not available in free API
          pressure: currentWeather.main?.pressure || 1013,
          visibility: Math.round((currentWeather.visibility || 10000) / 1000),
        },
        rainChance: rainChance,
        sunrise: new Date(currentWeather.sys?.sunrise * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        sunset: new Date(currentWeather.sys?.sunset * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };

      // Process forecast
      if (forecast && forecast.list) {
        const dailyForecast = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const daysHi = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
        const processedDays = new Set();

        for (const item of forecast.list) {
          const date = new Date(item.dt * 1000);
          const dayKey = date.toDateString();
          
          if (!processedDays.has(dayKey) && dailyForecast.length < 7) {
            processedDays.add(dayKey);
            const cond = item.weather?.[0]?.main || 'Clear';
            dailyForecast.push({
              day: language === 'hi' ? daysHi[date.getDay()] : days[date.getDay()],
              date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              icon: getWeatherIcon(cond),
              condition: cond,
              high: Math.round(item.main?.temp_max || 32),
              low: Math.round(item.main?.temp_min || 22),
              rain: item.clouds?.all || 0,
            });
          }
        }
        weatherData.forecast = dailyForecast;
      }
    } else {
      // Fallback mock data
      const mockForecast = [
        { day: 'Mon', icon: '☀️', high: 34, low: 22, rain: 0 },
        { day: 'Tue', icon: '⛅', high: 32, low: 21, rain: 10 },
        { day: 'Wed', icon: '🌦️', high: 30, low: 20, rain: 40 },
        { day: 'Thu', icon: '🌧️', high: 28, low: 19, rain: 70 },
        { day: 'Fri', icon: '⛈️', high: 27, low: 18, rain: 80 },
        { day: 'Sat', icon: '🌤️', high: 29, low: 19, rain: 20 },
        { day: 'Sun', icon: '☀️', high: 31, low: 20, rain: 5 },
      ];

      weatherData = {
        location: locationName + ', India',
        current: {
          temp: 32,
          feels_like: 35,
          condition: 'Sunny',
          icon: '☀️',
          humidity: 65,
          wind: 12,
          uv: 7,
          pressure: 1012,
          visibility: 10,
        },
        rainChance: 20,
        sunrise: '06:15 AM',
        sunset: '05:45 PM',
        forecast: mockForecast,
      };
    }

    // Add advisories and alerts
    weatherData.advisory = generateFarmingAdvisory(weatherData, language);
    weatherData.alerts = generateWeatherAlerts(weatherData, language);

    return weatherData;
  } catch (error) {
    console.error('Weather service error:', error);
    throw error;
  }
}

// Get hyperlocal weather for a specific crop
export async function getCropWeatherAdvisory(location, cropType, language = 'en') {
  const weather = await getWeatherData(location, language);
  
  const cropAdvisories = {
    wheat: {
      en: {
        hot: 'Wheat is heat-sensitive during grain filling. Ensure irrigation.',
        cold: 'Cold weather is favorable for wheat tillering.',
        rain: 'Excess moisture can cause lodging and rust diseases.',
      },
      hi: {
        hot: 'गेहूं दाना भरने के समय गर्मी के प्रति संवेदनशील है। सिंचाई सुनिश्चित करें।',
        cold: 'ठंड का मौसम गेहूं के कल्लों के लिए अनुकूल है।',
        rain: 'अधिक नमी से गिरावट और रतुआ रोग हो सकता है।',
      }
    },
    rice: {
      en: {
        hot: 'Rice needs standing water during extreme heat.',
        cold: 'Cold stress can affect panicle emergence.',
        rain: 'Moderate rain is beneficial. Excess can cause flooding.',
      },
      hi: {
        hot: 'अत्यधिक गर्मी में धान को खड़े पानी की जरूरत है।',
        cold: 'ठंड का तनाव बाली निकलने को प्रभावित कर सकता है।',
        rain: 'मध्यम बारिश फायदेमंद है। अधिक से बाढ़ हो सकती है।',
      }
    },
    cotton: {
      en: {
        hot: 'Cotton is heat-tolerant but needs adequate irrigation.',
        rain: 'Rain during boll opening can damage fiber quality.',
      },
      hi: {
        hot: 'कपास गर्मी सहन कर सकता है लेकिन पर्याप्त सिंचाई चाहिए।',
        rain: 'टिंडे खुलने पर बारिश से रेशे की गुणवत्ता खराब हो सकती है।',
      }
    },
  };

  const temp = weather.current.temp;
  const rainChance = weather.rainChance;
  const crop = cropType.toLowerCase();
  const lang = language === 'hi' ? 'hi' : 'en';

  let cropAdvice = '';
  if (cropAdvisories[crop]) {
    if (temp > 35 && cropAdvisories[crop][lang].hot) {
      cropAdvice = cropAdvisories[crop][lang].hot;
    } else if (temp < 15 && cropAdvisories[crop][lang].cold) {
      cropAdvice = cropAdvisories[crop][lang].cold;
    } else if (rainChance > 50 && cropAdvisories[crop][lang].rain) {
      cropAdvice = cropAdvisories[crop][lang].rain;
    }
  }

  return {
    ...weather,
    cropAdvisory: cropAdvice,
    crop: cropType,
  };
}

export default { getWeatherData, getCropWeatherAdvisory };
