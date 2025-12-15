import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ChatSidebar.css';

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
  userProfile = null
}) => {
  const { language, setLanguage } = useLanguage();
  const [hoveredConv, setHoveredConv] = useState(null);

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
                  onClick={() => onSelectConversation(conv.id)}
                  onMouseEnter={() => setHoveredConv(conv.id)}
                  onMouseLeave={() => setHoveredConv(null)}
                >
                  <span className="conv-icon">💬</span>
                  <span className="conv-title">{conv.title || 'New Chat'}</span>
                  {(activeConversation === conv.id || hoveredConv === conv.id) && (
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}>🗑️</button>
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
                  onClick={() => onSelectConversation(conv.id)}
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
                  onClick={() => onSelectConversation(conv.id)}
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
          <div className="language-selector">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="lang-select"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="user-section">
            <div className="user-avatar">
              {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : '👤'}
            </div>
            <div className="user-info">
              <span className="user-name">{userProfile?.name || (language === 'hi' ? 'किसान' : 'Farmer')}</span>
            </div>
          </div>
        </div>
      </aside>

      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  );
};

export default ChatSidebar;
