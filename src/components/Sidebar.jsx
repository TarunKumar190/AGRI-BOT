import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'home', icon: '🏠', label: 'nav.home' },
  { id: 'chat', icon: '💬', label: 'nav.chat' },
  { id: 'disease', icon: '🔬', label: 'nav.disease' },
  { id: 'weather', icon: '☀️', label: 'nav.weather' },
  { id: 'market', icon: '📈', label: 'nav.market' },
  { id: 'schemes', icon: '📋', label: 'nav.schemes' },
  { id: 'updates', icon: '📰', label: 'nav.updates' },
  { id: 'settings', icon: '⚙️', label: 'nav.settings' },
];

const Sidebar = ({ isOpen, onClose, activeView, onNavigate }) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon-small">
              <svg viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" fill="url(#sidebarGrad)" />
                <path d="M20 8 C12 16 12 24 20 32 C28 24 28 16 20 8Z" fill="#22c55e" opacity="0.8"/>
                <defs>
                  <linearGradient id="sidebarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ecfdf5"/>
                    <stop offset="100%" stopColor="#d1fae5"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="logo-text-small">
              <span className="app-name">{t('app.name')}</span>
              <span className="app-tagline">AI Farming Assistant</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="item-icon">{item.icon}</span>
              <span className="item-label">{t(item.label)}</span>
              {activeView === item.id && <span className="active-indicator" />}
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <div className="offline-status">
            <span className="status-dot online" />
            <span>Online</span>
          </div>
          <div className="version-info">v1.0.0</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
