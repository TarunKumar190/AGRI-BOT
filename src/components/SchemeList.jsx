import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './SchemeList.css';

const MOCK_SCHEMES = [
  {
    id: 1,
    name: 'PM-KISAN',
    nameHi: 'पीएम-किसान',
    ministry: 'Ministry of Agriculture',
    description: 'Direct income support of ₹6,000 per year to all farmer families across the country.',
    eligibility: 'All landholding farmer families with cultivable land',
    benefits: '₹6,000 per year in three equal installments',
    status: 'ongoing',
    deadline: null,
    portal: 'https://pmkisan.gov.in',
  },
  {
    id: 2,
    name: 'PM Fasal Bima Yojana',
    nameHi: 'पीएम फसल बीमा योजना',
    ministry: 'Ministry of Agriculture',
    description: 'Crop insurance scheme to provide financial support to farmers in case of crop failure.',
    eligibility: 'All farmers growing notified crops',
    benefits: 'Insurance coverage for crop loss due to natural calamities',
    status: 'ongoing',
    deadline: 'Before sowing season',
    portal: 'https://pmfby.gov.in',
  },
  {
    id: 3,
    name: 'Kisan Credit Card',
    nameHi: 'किसान क्रेडिट कार्ड',
    ministry: 'Ministry of Finance',
    description: 'Credit facility for farmers to meet their agricultural needs at concessional interest rates.',
    eligibility: 'All farmers, including tenant farmers and sharecroppers',
    benefits: 'Credit up to ₹3 lakh at 4% interest (with subsidy)',
    status: 'ongoing',
    deadline: null,
    portal: 'https://www.nabard.org',
  },
  {
    id: 4,
    name: 'Soil Health Card Scheme',
    nameHi: 'मृदा स्वास्थ्य कार्ड योजना',
    ministry: 'Ministry of Agriculture',
    description: 'Provides soil health cards to farmers with crop-wise recommendations for nutrients.',
    eligibility: 'All farmers',
    benefits: 'Free soil testing and nutrient recommendations',
    status: 'ongoing',
    deadline: null,
    portal: 'https://soilhealth.dac.gov.in',
  },
  {
    id: 5,
    name: 'PM Krishi Sinchai Yojana',
    nameHi: 'पीएम कृषि सिंचाई योजना',
    ministry: 'Ministry of Agriculture',
    description: 'Improving irrigation facilities through micro-irrigation and water management.',
    eligibility: 'Farmers with irrigated/cultivable land',
    benefits: '55-90% subsidy on micro-irrigation systems',
    status: 'ongoing',
    deadline: null,
    portal: 'https://pmksy.gov.in',
  },
];

const SchemeList = () => {
  const { t, language } = useLanguage();
  const [schemes, setSchemes] = useState(MOCK_SCHEMES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedScheme, setExpandedScheme] = useState(null);

  useEffect(() => {
    // Fetch schemes from API
    const fetchSchemes = async () => {
      try {
        const response = await fetch('http://localhost:4000/v1/schemes');
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            // Map API response to component format
            const mappedSchemes = data.results.map((s, idx) => ({
              id: s._id || idx,
              name: s.scheme_name || s.name,
              nameHi: s.scheme_name, // Contains Hindi in parentheses
              ministry: s.ministry,
              description: s.description,
              eligibility: s.eligibility,
              benefits: s.benefits,
              status: s.application_status || 'ongoing',
              deadline: s.last_date_to_apply,
              portal: s.official_portal,
              howToApply: s.how_to_apply,
              documents: s.documents_required,
              helpline: s.helpline,
              lastUpdated: s.last_updated_from_source
            }));
            setSchemes(mappedSchemes);
          }
        }
      } catch (error) {
        console.log('Using mock schemes data');
      }
    };

    fetchSchemes();
  }, []);

  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (scheme.description && scheme.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === 'all' || scheme.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleExpand = (id) => {
    setExpandedScheme(expandedScheme === id ? null : id);
  };

  return (
    <div className="scheme-list">
      <div className="scheme-header">
        <h2>{t('schemes.title')}</h2>
        <p className="subtitle">{t('schemes.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="scheme-filters">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={t('schemes.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="status-filter">
          <button
            className={`filter-btn ${selectedStatus === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${selectedStatus === 'ongoing' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('ongoing')}
          >
            {t('schemes.ongoing')}
          </button>
          <button
            className={`filter-btn ${selectedStatus === 'upcoming' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('upcoming')}
          >
            {t('schemes.upcoming')}
          </button>
        </div>
      </div>

      {/* Schemes List */}
      <div className="schemes-grid">
        {filteredSchemes.map(scheme => (
          <div 
            key={scheme.id} 
            className={`scheme-card ${expandedScheme === scheme.id ? 'expanded' : ''}`}
          >
            <div className="card-main" onClick={() => toggleExpand(scheme.id)}>
              <div className="scheme-info">
                <div className="scheme-title-row">
                  <h3>{language === 'hi' && scheme.nameHi ? scheme.nameHi : scheme.name}</h3>
                  <span className={`status-badge ${scheme.status}`}>
                    {t(`schemes.${scheme.status}`)}
                  </span>
                </div>
                <p className="scheme-ministry">{scheme.ministry}</p>
                <p className="scheme-description">{scheme.description}</p>
              </div>
              <span className="expand-icon">{expandedScheme === scheme.id ? '▼' : '▶'}</span>
            </div>

            {expandedScheme === scheme.id && (
              <div className="card-details">
                <div className="detail-section">
                  <h4>✓ {t('schemes.eligibility')}</h4>
                  <p>{scheme.eligibility}</p>
                </div>
                
                <div className="detail-section">
                  <h4>💰 {t('schemes.benefits')}</h4>
                  <p>{scheme.benefits}</p>
                </div>

                {scheme.deadline && (
                  <div className="detail-section deadline-section">
                    <h4>⏰ {t('schemes.deadline')}</h4>
                    <p className="deadline-text">{scheme.deadline}</p>
                  </div>
                )}

                {scheme.howToApply && (
                  <div className="detail-section">
                    <h4>📋 How to Apply</h4>
                    <p className="how-to-apply">{scheme.howToApply}</p>
                  </div>
                )}

                {scheme.documents && scheme.documents.length > 0 && (
                  <div className="detail-section">
                    <h4>📄 Documents Required</h4>
                    <ul className="documents-list">
                      {scheme.documents.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {scheme.helpline && (
                  <div className="detail-section">
                    <h4>📞 Helpline</h4>
                    <p className="helpline">{scheme.helpline}</p>
                  </div>
                )}

                {scheme.portal && (
                  <div className="detail-section portal-section">
                    <h4>🌐 {language === 'hi' ? 'आधिकारिक पोर्टल' : 'Official Portal'}</h4>
                    <a 
                      href={scheme.portal} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="portal-url"
                    >
                      {scheme.portal}
                    </a>
                  </div>
                )}

                <div className="card-actions">
                  {scheme.portal && (
                    <a 
                      href={scheme.portal} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary apply-btn"
                    >
                      <span>🚀</span> {language === 'hi' ? 'आवेदन करें' : 'Apply Now'} →
                    </a>
                  )}
                  <button className="btn btn-secondary">
                    <span>📤</span> {t('common.share')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSchemes.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No schemes found matching your search</p>
        </div>
      )}
    </div>
  );
};

export default SchemeList;
