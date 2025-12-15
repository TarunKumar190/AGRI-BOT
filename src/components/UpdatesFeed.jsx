import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './UpdatesFeed.css';

const MOCK_UPDATES = [
  {
    id: 1,
    title: 'PM-KISAN 16th Installment Released',
    titleHi: 'पीएम-किसान की 16वीं किस्त जारी',
    summary: '₹2000 has been transferred to eligible farmers\' bank accounts under the PM-KISAN scheme.',
    category: 'scheme',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isNew: true,
    source: 'PIB',
  },
  {
    id: 2,
    title: 'Heavy Rainfall Alert for Maharashtra',
    titleHi: 'महाराष्ट्र के लिए भारी वर्षा चेतावनी',
    summary: 'IMD has issued a yellow alert for heavy rainfall in several districts of Maharashtra for the next 3 days.',
    category: 'weather',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    isNew: true,
    source: 'IMD',
  },
  {
    id: 3,
    title: 'Wheat MSP Increased for Rabi 2024-25',
    titleHi: 'रबी 2024-25 के लिए गेहूं का MSP बढ़ा',
    summary: 'Government announces ₹150/quintal increase in Minimum Support Price for wheat.',
    category: 'market',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isNew: false,
    source: 'Ministry of Agriculture',
  },
  {
    id: 4,
    title: 'New Pest Alert: Fall Armyworm in Maize',
    titleHi: 'नई कीट चेतावनी: मक्के में फॉल आर्मीवर्म',
    summary: 'Fall armyworm infestation reported in maize crops. Farmers advised to take preventive measures.',
    category: 'advisory',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    isNew: false,
    source: 'ICAR',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📰' },
  { id: 'scheme', label: 'Schemes', icon: '📋' },
  { id: 'weather', label: 'Weather', icon: '🌤️' },
  { id: 'market', label: 'Market', icon: '📈' },
  { id: 'advisory', label: 'Advisory', icon: '💡' },
];

const UpdatesFeed = () => {
  const { t, language } = useLanguage();
  const [updates, setUpdates] = useState(MOCK_UPDATES);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch updates from API
    const fetchUpdates = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:4000/v1/updates');
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            setUpdates(data.results.map(u => ({
              ...u,
              timestamp: new Date(u.createdAt || u.timestamp),
              isNew: new Date(u.createdAt || u.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000),
            })));
          }
        }
      } catch (error) {
        console.log('Using mock updates data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdates();
    const interval = setInterval(fetchUpdates, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const filteredUpdates = updates.filter(update => 
    selectedCategory === 'all' || update.category === selectedCategory
  );

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="updates-feed">
      <div className="feed-header">
        <h2>{t('updates.title')}</h2>
        <p className="subtitle">{t('updates.subtitle')}</p>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Updates List */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      ) : (
        <div className="updates-list">
          {filteredUpdates.map(update => (
            <article key={update.id} className="update-card">
              <div className="update-header">
                <span className={`category-tag ${update.category}`}>
                  {CATEGORIES.find(c => c.id === update.category)?.icon}
                  {CATEGORIES.find(c => c.id === update.category)?.label}
                </span>
                {update.isNew && <span className="new-badge">{t('updates.new')}</span>}
              </div>
              
              <h3 className="update-title">
                {language === 'hi' && update.titleHi ? update.titleHi : update.title}
              </h3>
              
              <p className="update-summary">{update.summary}</p>
              
              <div className="update-footer">
                <div className="update-meta">
                  <span className="update-source">{update.source}</span>
                  <span className="meta-dot">•</span>
                  <span className="update-time">{formatTime(update.timestamp)}</span>
                </div>
                <button className="read-more-btn">
                  {t('updates.readMore')} →
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isLoading && filteredUpdates.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>No updates in this category</p>
        </div>
      )}
    </div>
  );
};

export default UpdatesFeed;
