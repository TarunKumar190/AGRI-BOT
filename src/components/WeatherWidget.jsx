import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import useLocation from '../hooks/useLocation';
import './WeatherWidget.css';

const MOCK_FORECAST = [
  { day: 'Mon', icon: '☀️', high: 34, low: 22, rain: 0 },
  { day: 'Tue', icon: '⛅', high: 32, low: 21, rain: 10 },
  { day: 'Wed', icon: '🌦️', high: 30, low: 20, rain: 40 },
  { day: 'Thu', icon: '🌧️', high: 28, low: 19, rain: 70 },
  { day: 'Fri', icon: '⛈️', high: 27, low: 18, rain: 80 },
  { day: 'Sat', icon: '🌤️', high: 29, low: 19, rain: 20 },
  { day: 'Sun', icon: '☀️', high: 31, low: 20, rain: 5 },
];

const WeatherWidget = ({ expanded = false }) => {
  const { t, language } = useLanguage();
  const { 
    location, 
    state, 
    district, 
    loading: locationLoading, 
    error: locationError,
    getCurrentLocation,
    setManualLocation,
    getAllStates,
    permissionStatus 
  } = useLocation();
  
  const [weather, setWeather] = useState({
    current: {
      temp: 32,
      feels_like: 35,
      condition: 'Sunny',
      icon: '☀️',
      humidity: 65,
      wind: 12,
      uv: 7,
    },
    location: 'Detecting location...',
    forecast: MOCK_FORECAST,
    alerts: [],
    advisory: {
      farming: 'Loading farming advisory...',
      irrigation: 'Loading irrigation advisory...',
    },
  });
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('wheat');

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch weather data based on location
  const fetchWeather = useCallback(async (lat, lng, stateName) => {
    try {
      const params = new URLSearchParams({
        lat: lat?.toString() || '',
        lng: lng?.toString() || '',
        state: stateName || '',
        crop: selectedCrop,
        lang: language,
      });
      
      const response = await fetch(`http://localhost:4000/v1/weather?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if response is offline fallback
        const isOfflineResponse = response.headers.get('X-Offline') === 'true';
        
        setWeather(prev => ({ 
          ...prev, 
          ...data,
          location: district && stateName ? `${district}, ${stateName}` : stateName || prev.location,
          isOffline: isOfflineResponse,
        }));
      }
    } catch (error) {
      console.log('Using cached/fallback weather data');
      setWeather(prev => ({ 
        ...prev, 
        location: state || 'India',
        isOffline: true,
      }));
    }
  }, [selectedCrop, language, district, state]);

  // Auto-detect location on mount
  useEffect(() => {
    const initLocation = async () => {
      try {
        const locData = await getCurrentLocation();
        if (locData) {
          fetchWeather(locData.coordinates.lat, locData.coordinates.lng, locData.state);
        }
      } catch (err) {
        // If GPS fails, show location picker
        setShowLocationPicker(true);
      }
    };
    
    initLocation();
  }, []);

  // Refetch weather when location or crop changes
  useEffect(() => {
    if (location && state) {
      fetchWeather(location.lat, location.lng, state);
    }
  }, [location, state, selectedCrop, fetchWeather]);

  // Handle manual state selection
  const handleStateSelect = (stateName) => {
    setManualLocation(stateName);
    setShowLocationPicker(false);
  };

  // Retry location detection
  const handleRetryLocation = async () => {
    try {
      const locData = await getCurrentLocation();
      if (locData) {
        fetchWeather(locData.coordinates.lat, locData.coordinates.lng, locData.state);
        setShowLocationPicker(false);
      }
    } catch (err) {
      console.log('Location retry failed');
    }
  };

  const CROP_OPTIONS = [
    { value: 'wheat', label: '🌾 Wheat', labelHi: '🌾 गेहूं' },
    { value: 'rice', label: '🍚 Rice', labelHi: '🍚 चावल' },
    { value: 'cotton', label: '☁️ Cotton', labelHi: '☁️ कपास' },
    { value: 'sugarcane', label: '🌿 Sugarcane', labelHi: '🌿 गन्ना' },
    { value: 'maize', label: '🌽 Maize', labelHi: '🌽 मक्का' },
    { value: 'soybean', label: '🫘 Soybean', labelHi: '🫘 सोयाबीन' },
  ];

  return (
    <div className={`weather-widget ${expanded ? 'expanded' : ''}`}>
      {/* Offline Banner */}
      {(isOffline || weather.isOffline) && (
        <div className="offline-banner">
          <span>📴</span>
          <span>{language === 'hi' ? 'ऑफ़लाइन मोड - कैश्ड डेटा दिखा रहे हैं' : 'Offline Mode - Showing cached data'}</span>
        </div>
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="location-picker-overlay">
          <div className="location-picker">
            <h3>{language === 'hi' ? '📍 अपना राज्य चुनें' : '📍 Select Your State'}</h3>
            <p className="picker-hint">
              {language === 'hi' 
                ? 'स्थानीय मौसम और मंडी जानकारी के लिए'
                : 'For local weather and mandi information'}
            </p>
            
            <button className="gps-btn" onClick={handleRetryLocation} disabled={locationLoading}>
              {locationLoading ? '...' : '🎯'} 
              {language === 'hi' ? ' GPS से पता लगाएं' : ' Detect via GPS'}
            </button>
            
            <div className="state-grid">
              {getAllStates().map(stateName => (
                <button 
                  key={stateName}
                  className="state-btn"
                  onClick={() => handleStateSelect(stateName)}
                >
                  {stateName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Weather */}
      <div className="current-weather">
        <div className="weather-location">
          <button 
            className="location-btn"
            onClick={() => setShowLocationPicker(true)}
            title={language === 'hi' ? 'स्थान बदलें' : 'Change location'}
          >
            <span className="location-icon">📍</span>
            <span>{weather.location}</span>
            <span className="edit-icon">✏️</span>
          </button>
        </div>

        {/* Crop Selector for Advisory */}
        <div className="crop-selector">
          <label>{language === 'hi' ? 'फसल:' : 'Crop:'}</label>
          <select 
            value={selectedCrop} 
            onChange={(e) => setSelectedCrop(e.target.value)}
          >
            {CROP_OPTIONS.map(crop => (
              <option key={crop.value} value={crop.value}>
                {language === 'hi' ? crop.labelHi : crop.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="weather-main-info">
          <span className="weather-icon-large">{weather.current.icon}</span>
          <div className="weather-temp-info">
            <span className="current-temp">{weather.current.temp}°C</span>
            <span className="feels-like">
              {language === 'hi' ? `महसूस ${weather.current.feels_like}°C` : `Feels like ${weather.current.feels_like}°C`}
            </span>
            <span className="condition">{weather.current.condition}</span>
          </div>
        </div>

        <div className="weather-stats">
          <div className="stat">
            <span className="stat-icon">💧</span>
            <span className="stat-value">{weather.current.humidity}%</span>
            <span className="stat-label">{t('weather.humidity')}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">💨</span>
            <span className="stat-value">{weather.current.wind} km/h</span>
            <span className="stat-label">{t('weather.wind')}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">☀️</span>
            <span className="stat-value">{weather.current.uv}</span>
            <span className="stat-label">UV Index</span>
          </div>
        </div>
      </div>

      {/* Weather Alerts */}
      {weather.alerts && weather.alerts.length > 0 && (
        <div className="weather-alerts">
          <h3>⚠️ {t('weather.alerts')}</h3>
          {weather.alerts.map((alert, index) => (
            <div key={index} className={`alert-item alert-${alert.type}`}>
              <span className="alert-text">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 7-Day Forecast */}
      <div className="forecast-section">
        <h3>{t('weather.weekly')}</h3>
        <div className="forecast-grid">
          {weather.forecast.map((day, index) => (
            <div key={index} className="forecast-day">
              <span className="day-name">{day.day}</span>
              <span className="day-icon">{day.icon}</span>
              <div className="day-temps">
                <span className="high">{day.high}°</span>
                <span className="low">{day.low}°</span>
              </div>
              <div className="rain-chance">
                <span className="rain-icon">💧</span>
                <span>{day.rain}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Farm Advisory */}
      <div className="advisory-section">
        <h3>🌾 {t('weather.advisory')}</h3>
        <div className="advisory-cards">
          <div className="advisory-card">
            <span className="advisory-icon">🚜</span>
            <div className="advisory-content">
              <h4>Farming</h4>
              <p>{weather.advisory.farming}</p>
            </div>
          </div>
          <div className="advisory-card">
            <span className="advisory-icon">💧</span>
            <div className="advisory-content">
              <h4>Irrigation</h4>
              <p>{weather.advisory.irrigation}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
