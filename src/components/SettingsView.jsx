import React, { useState } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import './SettingsView.css';

const SettingsView = ({ userProfile }) => {
  const { t, language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    offlineMode: false,
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetProfile = () => {
    if (confirm('Are you sure you want to reset your profile? This will clear all your preferences.')) {
      localStorage.removeItem('agribot_user_profile');
      localStorage.removeItem('agribot_onboarded');
      window.location.reload();
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear all cached data?')) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
      alert('Cache cleared successfully!');
    }
  };

  return (
    <div className="settings-view">
      <div className="settings-header">
        <h2>{t('settings.title')}</h2>
      </div>

      {/* Profile Section */}
      {userProfile && (
        <section className="settings-section">
          <div className="profile-card">
            <div className="profile-avatar">
              👨‍🌾
            </div>
            <div className="profile-info">
              <h3>{userProfile.name || 'Farmer'}</h3>
              <p>{userProfile.location || 'Location not set'}</p>
            </div>
            <button className="edit-btn">✏️</button>
          </div>
        </section>
      )}

      {/* Language Section */}
      <section className="settings-section">
        <h3 className="section-title">{t('settings.language')}</h3>
        <div className="language-options">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`language-option ${language === lang.code ? 'active' : ''}`}
              onClick={() => setLanguage(lang.code)}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span className="lang-name">{lang.native}</span>
              {language === lang.code && <span className="check">✓</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Preferences Section */}
      <section className="settings-section">
        <h3 className="section-title">Preferences</h3>
        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon">🔔</span>
              <div>
                <h4>{t('settings.notifications')}</h4>
                <p>Receive alerts for weather, schemes, and market prices</p>
              </div>
            </div>
            <button 
              className={`toggle ${settings.notifications ? 'active' : ''}`}
              onClick={() => toggleSetting('notifications')}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon">🌙</span>
              <div>
                <h4>{t('settings.darkMode')}</h4>
                <p>Reduce eye strain in low light</p>
              </div>
            </div>
            <button 
              className={`toggle ${settings.darkMode ? 'active' : ''}`}
              onClick={() => toggleSetting('darkMode')}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon">📶</span>
              <div>
                <h4>{t('settings.offline')}</h4>
                <p>Save content for use without internet</p>
              </div>
            </div>
            <button 
              className={`toggle ${settings.offlineMode ? 'active' : ''}`}
              onClick={() => toggleSetting('offlineMode')}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>
        </div>
      </section>

      {/* Data Section */}
      <section className="settings-section">
        <h3 className="section-title">Data & Storage</h3>
        <div className="settings-list">
          <button className="setting-item clickable" onClick={handleClearCache}>
            <div className="setting-info">
              <span className="setting-icon">🗑️</span>
              <div>
                <h4>{t('settings.clearCache')}</h4>
                <p>Free up storage space</p>
              </div>
            </div>
            <span className="chevron">›</span>
          </button>
        </div>
      </section>

      {/* About Section */}
      <section className="settings-section">
        <h3 className="section-title">{t('settings.about')}</h3>
        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon">ℹ️</span>
              <div>
                <h4>{t('settings.version')}</h4>
                <p>1.0.0 (Build 2024.12)</p>
              </div>
            </div>
          </div>

          <button className="setting-item clickable">
            <div className="setting-info">
              <span className="setting-icon">💬</span>
              <div>
                <h4>{t('settings.feedback')}</h4>
                <p>Help us improve KrishiMitra</p>
              </div>
            </div>
            <span className="chevron">›</span>
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="settings-section danger">
        <button className="danger-btn" onClick={handleResetProfile}>
          <span className="setting-icon">⚠️</span>
          {t('settings.logout')}
        </button>
      </section>

      {/* Footer */}
      <footer className="settings-footer">
        <p>Made with ❤️ for Indian Farmers</p>
        <p className="copyright">© 2024 KrishiMitra. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SettingsView;
