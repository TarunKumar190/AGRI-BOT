import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import useLocation from '../hooks/useLocation';
import './MarketPrices.css';

// MSP Prices 2024-25
const MSP_PRICES = {
  wheat: 2275, rice: 2300, maize: 2225, bajra: 2625, jowar: 3371, barley: 1850,
  cotton: 7121, soybean: 4892, groundnut: 6783, mustard: 5950, sunflower: 6760,
  chana: 5440, tur: 7550, moong: 8682, urad: 7400, masoor: 6700,
  sugarcane: 315,
};

// Categories with Hindi names
const CATEGORIES = {
  all: { en: 'All', hi: 'सभी', icon: '📊' },
  vegetables: { en: 'Vegetables', hi: 'सब्जियां', icon: '🥬' },
  fruits: { en: 'Fruits', hi: 'फल', icon: '🍎' },
  cereals: { en: 'Cereals', hi: 'अनाज', icon: '🌾' },
  pulses: { en: 'Pulses', hi: 'दालें', icon: '🫘' },
  oilseeds: { en: 'Oilseeds', hi: 'तिलहन', icon: '🥜' },
  spices: { en: 'Spices', hi: 'मसाले', icon: '🌶️' },
};

const MarketPrices = () => {
  const { t, language } = useLanguage();
  const { location, state: userState, district, nearbyMandis, getCurrentLocation, loading: locationLoading } = useLocation();
  
  const [prices, setPrices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showMSP, setShowMSP] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [bestMandis, setBestMandis] = useState([]);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'nearby', 'best'
  const [loading, setLoading] = useState(true);
  const [locationInfo, setLocationInfo] = useState(null);

  // Monitor online status
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

  // Auto-detect location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Fetch prices from API with location
  const fetchPrices = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        category: selectedCategory !== 'all' ? selectedCategory : '',
        lang: language,
        limit: 40,
      });
      
      // Add location parameters
      if (location?.lat && location?.lng) {
        params.append('lat', location.lat);
        params.append('lng', location.lng);
      } else if (userState) {
        params.append('state', userState);
      }
      
      const response = await fetch(`http://localhost:4000/v1/market/prices?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          setPrices(data.results);
          setLastUpdated(new Date());
          if (data.location) {
            setLocationInfo(data.location);
          }
        }
      }
    } catch (error) {
      console.log('Using cached market data');
    } finally {
      setLoading(false);
    }
  }, [location, userState, language, selectedCategory]);

  // Fetch best mandis for a commodity
  const fetchBestMandis = useCallback(async (commodity) => {
    if (!commodity) return;
    
    try {
      const params = new URLSearchParams({
        commodity: commodity.toLowerCase(),
        state: userState || '',
      });
      
      const response = await fetch(`http://localhost:4000/v1/market/best-mandis?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBestMandis(data.bestMandis || []);
      }
    } catch (error) {
      console.log('Could not fetch best mandis');
    }
  }, [userState]);

  useEffect(() => {
    setLoading(true);
    fetchPrices();
    const interval = setInterval(fetchPrices, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchPrices, selectedCategory]);

  // Get MSP comparison
  const getMSPStatus = (commodity, price) => {
    const key = commodity?.toLowerCase()?.replace(/ /g, '_');
    const msp = MSP_PRICES[key];
    if (!msp) return null;
    
    const diff = ((price - msp) / msp * 100).toFixed(1);
    return {
      msp,
      diff: parseFloat(diff),
      isBelowMSP: price < msp,
    };
  };

  const filteredPrices = prices.filter(item => {
    const itemName = item.commodityName || item.crop || '';
    const matchesSearch = itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.mandi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.state?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by nearby mandis if in nearby mode
    if (viewMode === 'nearby' && nearbyMandis.length > 0) {
      const isNearby = nearbyMandis.some(m => 
        item.mandi?.toLowerCase().includes(m.name.toLowerCase())
      );
      return matchesSearch && isNearby;
    }
    
    return matchesSearch;
  });

  // Group prices by category for display
  const groupedPrices = filteredPrices.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="market-prices">
      {/* Offline Banner */}
      {isOffline && (
        <div className="offline-banner">
          <span>📴</span>
          <span>{language === 'hi' ? 'ऑफ़लाइन - कैश्ड भाव दिखा रहे हैं' : 'Offline - Showing cached prices'}</span>
        </div>
      )}

      <div className="market-header">
        <div className="header-info">
          <h2>{t('market.title')}</h2>
          <p className="subtitle">{language === 'hi' ? 'फसलों, सब्जियों और फलों के रीयल-टाइम भाव' : 'Real-time prices for crops, vegetables & fruits'}</p>
        </div>
        <div className="header-actions">
          <label className="msp-toggle">
            <input 
              type="checkbox" 
              checked={showMSP} 
              onChange={(e) => setShowMSP(e.target.checked)} 
            />
            <span>{language === 'hi' ? 'MSP तुलना' : 'Show MSP'}</span>
          </label>
          <div className="last-updated">
            <span className="update-dot" />
            {t('market.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(key)}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-name">{language === 'hi' ? cat.hi : cat.en}</span>
          </button>
        ))}
      </div>

      {/* View Mode Tabs */}
      <div className="view-tabs">
        <button 
          className={`view-tab ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => setViewMode('all')}
        >
          {language === 'hi' ? '🏪 सभी मंडी' : '🏪 All Mandis'}
        </button>
        <button 
          className={`view-tab ${viewMode === 'nearby' ? 'active' : ''}`}
          onClick={() => { setViewMode('nearby'); getCurrentLocation(); }}
        >
          {language === 'hi' ? '📍 नजदीकी' : '📍 Nearby'}
        </button>
      </div>

      {/* Filters */}
      <div className="market-filters">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={language === 'hi' ? 'फसल या मंडी खोजें...' : 'Search crop or mandi...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="results-count">
          {language === 'hi' 
            ? `${filteredPrices.length} परिणाम`
            : `${filteredPrices.length} results`}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>{language === 'hi' ? 'भाव लोड हो रहे हैं...' : 'Loading prices...'}</p>
        </div>
      )}

      {/* Price Cards */}
      {!loading && (
        <div className="price-grid">
          {filteredPrices.map(item => {
            const mspStatus = showMSP ? getMSPStatus(item.commodity, item.modalPrice) : null;
          
            return (
              <div key={item.id} className={`price-card ${mspStatus?.isBelowMSP ? 'below-msp' : ''} category-${item.category}`}>
                <div className="card-header">
                  <div className="crop-info">
                    <span className="crop-emoji">{item.emoji}</span>
                    <div>
                      <h4 className="crop-name">{item.commodityName || item.crop}</h4>
                      <span className="mandi-name">{item.mandi}, {item.state}</span>
                    </div>
                  </div>
                  <div className={`price-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                    {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change).toFixed(1)}%
                  </div>
                </div>
                
                <div className="price-details">
                  <div className="price-row">
                    <span className="price-label">{language === 'hi' ? 'मोडल भाव' : 'Modal Price'}</span>
                    <span className="price-value main">₹{item.modalPrice?.toLocaleString()}</span>
                  </div>
                  
                  {/* MSP Comparison */}
                  {mspStatus && (
                    <div className={`msp-comparison ${mspStatus.isBelowMSP ? 'below' : 'above'}`}>
                      <span className="msp-label">MSP: ₹{mspStatus.msp.toLocaleString()}</span>
                      <span className={`msp-diff ${mspStatus.diff >= 0 ? 'positive' : 'negative'}`}>
                        {mspStatus.diff >= 0 ? '+' : ''}{mspStatus.diff}%
                      </span>
                    </div>
                  )}
                  
                  <div className="price-range">
                    <div className="range-item">
                      <span className="range-label">{language === 'hi' ? 'न्यूनतम' : 'Min'}</span>
                      <span className="range-value">₹{item.minPrice?.toLocaleString()}</span>
                    </div>
                    <div className="range-divider">—</div>
                    <div className="range-item">
                      <span className="range-label">{language === 'hi' ? 'अधिकतम' : 'Max'}</span>
                      <span className="range-value">₹{item.maxPrice?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="card-footer">
                  <span className={`category-badge ${item.category}`}>
                    {CATEGORIES[item.category]?.icon} {CATEGORIES[item.category]?.[language === 'hi' ? 'hi' : 'en'] || item.category}
                  </span>
                  <span className="unit">/{item.unit || 'qtl'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredPrices.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>{language === 'hi' ? 'कोई भाव नहीं मिला' : 'No prices found for your search'}</p>
        </div>
      )}
    </div>
  );
};

export default MarketPrices;
