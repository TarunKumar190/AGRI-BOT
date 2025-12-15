import React from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import './Header.css';

const VIEW_TITLES = {
  home: 'nav.home',
  chat: 'nav.chat',
  disease: 'nav.disease',
  weather: 'nav.weather',
  market: 'nav.market',
  schemes: 'nav.schemes',
  updates: 'nav.updates',
  settings: 'nav.settings',
};

const Header = ({ onMenuClick, activeView }) => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="header-title">{t(VIEW_TITLES[activeView] || 'nav.home')}</h1>
      </div>
      
      <div className="header-right">
        <div className="language-selector">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="lang-select"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.native}
              </option>
            ))}
          </select>
        </div>
        
        <button className="notification-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="notification-badge">3</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
