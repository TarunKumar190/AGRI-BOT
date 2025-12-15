import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './SplashScreen.css';

const SplashScreen = () => {
  const { t } = useLanguage();

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="url(#grad1)" />
              <path d="M50 20 C30 35 30 55 50 75 C70 55 70 35 50 20Z" fill="#22c55e" opacity="0.8"/>
              <path d="M35 45 C25 55 30 70 50 80 C45 65 45 50 50 40 C40 42 35 45 35 45Z" fill="#16a34a"/>
              <path d="M65 45 C75 55 70 70 50 80 C55 65 55 50 50 40 C60 42 65 45 65 45Z" fill="#16a34a"/>
              <path d="M50 25 L50 75" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ecfdf5"/>
                  <stop offset="100%" stopColor="#d1fae5"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="logo-text">{t('app.name')}</h1>
          <p className="logo-tagline">{t('app.tagline')}</p>
        </div>
        
        <div className="splash-loader">
          <div className="loader-bar">
            <div className="loader-progress"></div>
          </div>
          <p className="loader-text">{t('splash.preparing')}</p>
        </div>

        <div className="splash-features">
          <div className="feature-dot" style={{ animationDelay: '0s' }}>
            <span>🌾</span>
          </div>
          <div className="feature-dot" style={{ animationDelay: '0.2s' }}>
            <span>☀️</span>
          </div>
          <div className="feature-dot" style={{ animationDelay: '0.4s' }}>
            <span>💧</span>
          </div>
          <div className="feature-dot" style={{ animationDelay: '0.6s' }}>
            <span>🤖</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
