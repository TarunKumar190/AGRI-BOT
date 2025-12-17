import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ChatSidebar.css';

// Direct function to stop all audio - guaranteed to work
const forceStopAllAudio = () => {
  console.log('[ChatSidebar] 🛑 FORCE STOPPING ALL AUDIO');
  
  if (typeof window === 'undefined') return;
  
  // Set stop flags FIRST
  window.ttsShouldStop = true;
  window.currentTTSSession = null;
  
  // Clear ALL timeouts
  if (window.ttsTimeoutId) {
    clearTimeout(window.ttsTimeoutId);
    window.ttsTimeoutId = null;
  }
  
  // Stop ALL tracked audio instances
  if (window.ttsAudioInstances && Array.isArray(window.ttsAudioInstances)) {
    console.log('[ChatSidebar] Stopping', window.ttsAudioInstances.length, 'tracked audio instances');
    window.ttsAudioInstances.forEach((audio, i) => {
      try {
        audio.pause();
        audio.src = '';
        audio.load(); // Force reload to release resources
        console.log('[ChatSidebar] Stopped audio instance', i);
      } catch(e) { console.log('Error stopping audio', i, e); }
    });
    window.ttsAudioInstances = [];
  }
  
  // Stop current audio
  if (window.currentTTSAudio) {
    try {
      window.currentTTSAudio.pause();
      window.currentTTSAudio.src = '';
      window.currentTTSAudio.load();
      window.currentTTSAudio = null;
    } catch(e) {}
  }
  
  // Stop browser speech synthesis
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  
  // Stop ALL audio elements on the entire page
  const allAudios = document.querySelectorAll('audio');
  console.log('[ChatSidebar] Found', allAudios.length, 'audio elements on page');
  allAudios.forEach((audio, i) => {
    try {
      audio.pause();
      audio.src = '';
      audio.load();
    } catch(e) {}
  });
  
  // Call global stop if exists
  if (window.stopAllTTS) {
    window.stopAllTTS();
  }
  
  console.log('[ChatSidebar] ✅ All audio stopped');
};

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
];

const ChatSidebar = ({
  isOpen = true,
  onToggle = () => {},
  conversations = [],
  activeConversation = null,
  onNewChat = () => {},
  onSelectConversation = () => {},
  onDeleteConversation = () => {},
  onQuickAction = () => {},
  userProfile = null,
  user = null,
  isGuest = false,
  onLogout = () => {}
}) => {
  const { language, setLanguage } = useLanguage();
  const [hoveredConv, setHoveredConv] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const quickActions = [
    { id: 'disease', icon: '🔬', label: language === 'hi' ? 'रोग पहचान' : 'Disease Detection', command: '/disease' },
    { id: 'prices', icon: '💰', label: language === 'hi' ? 'मंडी भाव' : 'Market Prices', command: '/prices' },
    { id: 'schemes', icon: '📋', label: language === 'hi' ? 'योजनाएं' : 'Schemes', command: '/schemes' },
  ];

  const groupConversations = () => {
    const groups = { today: [], yesterday: [], week: [], older: [] };
    if (!conversations || conversations.length === 0) return groups;
    
    const now = new Date();
    conversations.forEach(conv => {
      if (!conv) return;
      const date = new Date(conv.updatedAt || conv.createdAt || now);
      const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diff === 0) groups.today.push(conv);
      else if (diff === 1) groups.yesterday.push(conv);
      else if (diff < 7) groups.week.push(conv);
      else groups.older.push(conv);
    });
    return groups;
  };

  const groups = groupConversations();
  const hasConversations = conversations && conversations.length > 0;

  return (
    <>
      <aside className={`chat-sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🌾</span>
            <span className="logo-text">KrishiMitra</span>
          </div>
          <button className="close-btn" onClick={onToggle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        <button className="new-chat-btn" onClick={onNewChat}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>{language === 'hi' ? 'नई चैट' : 'New Chat'}</span>
        </button>

        <div className="quick-actions">
          <div className="section-title">{language === 'hi' ? 'त्वरित कार्य' : 'Quick Actions'}</div>
          <div className="actions-grid">
            {quickActions.map(action => (
              <button 
                key={action.id} 
                className="action-btn"
                onClick={() => onQuickAction(action.id, action.command)}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="conversations-list">
          {groups.today.length > 0 && (
            <div className="conv-group">
              <div className="group-title">{language === 'hi' ? 'आज' : 'Today'}</div>
              {groups.today.map(conv => (
                <div 
                  key={conv.id}
                  className={`conv-item ${activeConversation === conv.id ? 'active' : ''}`}
                  onClick={() => { forceStopAllAudio(); onSelectConversation(conv.id); }}
                  onMouseEnter={() => setHoveredConv(conv.id)}
                  onMouseLeave={() => setHoveredConv(null)}
                >
                  <span className="conv-icon">💬</span>
                  <span className="conv-title">{conv.title || 'New Chat'}</span>
                  {(activeConversation === conv.id || hoveredConv === conv.id) && (
                    <button className="delete-btn" onClick={(e) => { 
                      e.stopPropagation(); 
                      forceStopAllAudio(); // Stop audio FIRST
                      onDeleteConversation(conv.id); 
                    }}>🗑️</button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {groups.yesterday.length > 0 && (
            <div className="conv-group">
              <div className="group-title">{language === 'hi' ? 'कल' : 'Yesterday'}</div>
              {groups.yesterday.map(conv => (
                <div 
                  key={conv.id}
                  className={`conv-item ${activeConversation === conv.id ? 'active' : ''}`}
                  onClick={() => { forceStopAllAudio(); onSelectConversation(conv.id); }}
                >
                  <span className="conv-icon">💬</span>
                  <span className="conv-title">{conv.title || 'Chat'}</span>
                </div>
              ))}
            </div>
          )}

          {groups.week.length > 0 && (
            <div className="conv-group">
              <div className="group-title">{language === 'hi' ? 'इस सप्ताह' : 'This Week'}</div>
              {groups.week.map(conv => (
                <div 
                  key={conv.id}
                  className={`conv-item ${activeConversation === conv.id ? 'active' : ''}`}
                  onClick={() => { forceStopAllAudio(); onSelectConversation(conv.id); }}
                >
                  <span className="conv-icon">💬</span>
                  <span className="conv-title">{conv.title || 'Chat'}</span>
                </div>
              ))}
            </div>
          )}

          {!hasConversations && (
            <div className="no-conversations">
              <span className="empty-icon">💬</span>
              <p>{language === 'hi' ? 'कोई बातचीत नहीं' : 'No conversations yet'}</p>
              <p className="hint">{language === 'hi' ? 'नई चैट शुरू करें' : 'Start a new chat'}</p>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          {/* User Menu - ChatGPT Style */}
          <div className="user-menu-container">
            <button 
              className="user-menu-trigger"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.name} />
                ) : user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : userProfile?.name ? (
                  userProfile.name.charAt(0).toUpperCase()
                ) : '👤'}
              </div>
              <div className="user-info">
                <span className="user-name">
                  {user?.name || userProfile?.name || (isGuest ? (language === 'hi' ? 'अतिथि' : 'Guest') : (language === 'hi' ? 'किसान' : 'Farmer'))}
                </span>
                {user?.email && <span className="user-email">{user.email}</span>}
              </div>
              <svg className={`menu-chevron ${showUserMenu ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div className="user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
                <div className="user-menu-dropdown">
                  {/* User Info Header */}
                  <div className="menu-user-header">
                    <div className="menu-avatar">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt={user.name} />
                      ) : user?.name ? (
                        user.name.charAt(0).toUpperCase()
                      ) : '👤'}
                    </div>
                    <div className="menu-user-details">
                      <span className="menu-user-name">{user?.name || userProfile?.name || 'User'}</span>
                      <span className="menu-user-email">{user?.email || ''}</span>
                    </div>
                  </div>

                  <div className="menu-divider" />

                  {/* Menu Items */}
                  <button className="menu-item" onClick={() => { setShowUserMenu(false); setShowSettings(true); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>{language === 'hi' ? 'सेटिंग्स' : 'Settings'}</span>
                  </button>

                  <button className="menu-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>{language === 'hi' ? 'मदद' : 'Help'}</span>
                    <svg className="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>

                  <div className="menu-divider" />

                  <button className="menu-item logout" onClick={() => { setShowUserMenu(false); onLogout(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>{language === 'hi' ? 'लॉग आउट' : 'Log out'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="settings-header">
                <h2>{language === 'hi' ? 'सेटिंग्स' : 'Settings'}</h2>
                <button className="close-settings" onClick={() => setShowSettings(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="settings-content">
                <div className="settings-section">
                  <h3>{language === 'hi' ? 'भाषा' : 'Language'}</h3>
                  <div className="language-options">
                    {LANGUAGES.map(lang => (
                      <button 
                        key={lang.code}
                        className={`lang-option ${language === lang.code ? 'active' : ''}`}
                        onClick={() => setLanguage(lang.code)}
                      >
                        <span className="lang-flag">{lang.flag}</span>
                        <span className="lang-name">{lang.name}</span>
                        {language === lang.code && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-section">
                  <h3>{language === 'hi' ? 'खाता' : 'Account'}</h3>
                  <div className="account-info">
                    <div className="account-row">
                      <span className="account-label">{language === 'hi' ? 'नाम' : 'Name'}</span>
                      <span className="account-value">{user?.name || userProfile?.name || 'User'}</span>
                    </div>
                    <div className="account-row">
                      <span className="account-label">{language === 'hi' ? 'ईमेल' : 'Email'}</span>
                      <span className="account-value">{user?.email || 'Not set'}</span>
                    </div>
                    <div className="account-row">
                      <span className="account-label">{language === 'hi' ? 'खाता प्रकार' : 'Account Type'}</span>
                      <span className="account-value">{isGuest ? 'Guest' : user?.provider === 'google' ? 'Google' : 'Email'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  );
};

export default ChatSidebar;
