import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './HomeView.css';

const QUICK_ACTIONS = [
  { id: 'chat', icon: '💬', label: 'nav.chat', color: '#16a34a' },
  { id: 'disease', icon: '🔬', label: 'nav.disease', color: '#f97316' },
  { id: 'weather', icon: '☀️', label: 'nav.weather', color: '#3b82f6' },
  { id: 'market', icon: '📈', label: 'nav.market', color: '#8b5cf6' },
];

const HomeView = ({ userProfile, onNavigate }) => {
  const { t } = useLanguage();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.morning');
    if (hour < 17) return t('home.afternoon');
    return t('home.evening');
  };

  const userName = userProfile?.name || 'Farmer';

  return (
    <div className="home-view">
      {/* Greeting Section */}
      <div className="greeting-section">
        <h2 className="greeting-text">
          {t('home.greeting')} {getGreeting()}, <span className="user-name">{userName}!</span>
        </h2>
        <p className="greeting-subtitle">How can I help you today?</p>
      </div>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h3 className="section-title">{t('home.quickActions')}</h3>
        <div className="quick-actions-grid">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              className="quick-action-card"
              onClick={() => onNavigate(action.id)}
              style={{ '--action-color': action.color }}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{t(action.label)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Weather Preview */}
      <section className="preview-section">
        <div className="section-header">
          <h3 className="section-title">{t('home.todayWeather')}</h3>
          <button className="view-all-btn" onClick={() => onNavigate('weather')}>
            View Details →
          </button>
        </div>
        <div className="weather-preview-card">
          <div className="weather-main">
            <span className="weather-icon">☀️</span>
            <div className="weather-temp">
              <span className="temp-value">32°C</span>
              <span className="temp-desc">Sunny</span>
            </div>
          </div>
          <div className="weather-details">
            <div className="weather-detail">
              <span className="detail-icon">💧</span>
              <span className="detail-value">65%</span>
              <span className="detail-label">{t('weather.humidity')}</span>
            </div>
            <div className="weather-detail">
              <span className="detail-icon">💨</span>
              <span className="detail-value">12 km/h</span>
              <span className="detail-label">{t('weather.wind')}</span>
            </div>
            <div className="weather-detail">
              <span className="detail-icon">🌧️</span>
              <span className="detail-value">20%</span>
              <span className="detail-label">{t('weather.rain')}</span>
            </div>
          </div>
          <div className="weather-advisory">
            <span className="advisory-icon">💡</span>
            <span className="advisory-text">Good day for pesticide application. Avoid irrigation in afternoon.</span>
          </div>
        </div>
      </section>

      {/* Market Prices Preview */}
      <section className="preview-section">
        <div className="section-header">
          <h3 className="section-title">{t('home.latestPrices')}</h3>
          <button className="view-all-btn" onClick={() => onNavigate('market')}>
            View All →
          </button>
        </div>
        <div className="market-preview-grid">
          <div className="market-item">
            <span className="market-crop">🌾 Wheat</span>
            <span className="market-price">₹2,150/qtl</span>
            <span className="market-change positive">↑ 2.3%</span>
          </div>
          <div className="market-item">
            <span className="market-crop">🍚 Rice</span>
            <span className="market-price">₹1,940/qtl</span>
            <span className="market-change negative">↓ 0.8%</span>
          </div>
          <div className="market-item">
            <span className="market-crop">🧅 Onion</span>
            <span className="market-price">₹18/kg</span>
            <span className="market-change positive">↑ 5.2%</span>
          </div>
          <div className="market-item">
            <span className="market-crop">🍅 Tomato</span>
            <span className="market-price">₹25/kg</span>
            <span className="market-change positive">↑ 3.1%</span>
          </div>
        </div>
      </section>

      {/* Recent Updates Preview */}
      <section className="preview-section">
        <div className="section-header">
          <h3 className="section-title">{t('home.recentUpdates')}</h3>
          <button className="view-all-btn" onClick={() => onNavigate('updates')}>
            View All →
          </button>
        </div>
        <div className="updates-preview-list">
          <div className="update-item">
            <span className="update-badge new">New</span>
            <div className="update-content">
              <h4>PM-KISAN 16th Installment Released</h4>
              <p>₹2000 transferred to eligible farmers' accounts</p>
            </div>
            <span className="update-time">2h ago</span>
          </div>
          <div className="update-item">
            <span className="update-badge">Weather</span>
            <div className="update-content">
              <h4>Heavy Rain Alert for Maharashtra</h4>
              <p>IMD issues yellow alert for next 3 days</p>
            </div>
            <span className="update-time">5h ago</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeView;
