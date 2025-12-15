import React, { useState } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import './Onboarding.css';

const CROPS = [
  { id: 'wheat', emoji: '🌾' },
  { id: 'rice', emoji: '🍚' },
  { id: 'cotton', emoji: '☁️' },
  { id: 'sugarcane', emoji: '🎋' },
  { id: 'maize', emoji: '🌽' },
  { id: 'soybean', emoji: '🫘' },
  { id: 'potato', emoji: '🥔' },
  { id: 'tomato', emoji: '🍅' },
  { id: 'onion', emoji: '🧅' },
  { id: 'mango', emoji: '🥭' },
];

const STATES = [
  'punjab', 'haryana', 'up', 'mp', 'maharashtra', 
  'gujarat', 'rajasthan', 'bihar', 'karnataka', 'ap', 
  'telangana', 'tn', 'wb', 'odisha'
];

const Onboarding = ({ onComplete, onSkip }) => {
  const { t, language, setLanguage } = useLanguage();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: '',
    location: '',
    state: '',
    crops: [],
    farmSize: '',
  });

  const totalSteps = 3;

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
  };

  const handleCropToggle = (cropId) => {
    setProfile(prev => ({
      ...prev,
      crops: prev.crops.includes(cropId)
        ? prev.crops.filter(c => c !== cropId)
        : [...prev.crops, cropId]
    }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-container">
        {/* Progress Bar */}
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        
        <div className="step-indicator">
          {t('onboarding.step')} {step} {t('onboarding.of')} {totalSteps}
        </div>

        {/* Step 1: Language Selection */}
        {step === 1 && (
          <div className="onboarding-step animate-fadeIn">
            <div className="step-header">
              <div className="step-icon">🌍</div>
              <h2>{t('onboarding.selectLanguage')}</h2>
            </div>
            
            <div className="language-grid">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={`language-card ${language === lang.code ? 'selected' : ''}`}
                  onClick={() => handleLanguageSelect(lang.code)}
                >
                  <span className="lang-flag">{lang.flag}</span>
                  <span className="lang-native">{lang.native}</span>
                  <span className="lang-name">{lang.name}</span>
                  {language === lang.code && (
                    <span className="check-icon">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Personal Details */}
        {step === 2 && (
          <div className="onboarding-step animate-fadeIn">
            <div className="step-header">
              <div className="step-icon">👨‍🌾</div>
              <h2>{t('onboarding.enterDetails')}</h2>
            </div>
            
            <div className="form-group">
              <input
                type="text"
                className="input"
                placeholder={t('onboarding.namePlaceholder')}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <input
                type="text"
                className="input"
                placeholder={t('onboarding.locationPlaceholder')}
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <select
                className="input"
                value={profile.state}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
              >
                <option value="">{t('onboarding.statePlaceholder')}</option>
                {STATES.map(state => (
                  <option key={state} value={state}>
                    {t(`states.${state}`)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <input
                type="number"
                className="input"
                placeholder={t('onboarding.farmSize')}
                value={profile.farmSize}
                onChange={(e) => setProfile({ ...profile, farmSize: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 3: Crop Selection */}
        {step === 3 && (
          <div className="onboarding-step animate-fadeIn">
            <div className="step-header">
              <div className="step-icon">🌱</div>
              <h2>{t('onboarding.cropTypes')}</h2>
            </div>
            
            <div className="crop-grid">
              {CROPS.map(crop => (
                <button
                  key={crop.id}
                  className={`crop-card ${profile.crops.includes(crop.id) ? 'selected' : ''}`}
                  onClick={() => handleCropToggle(crop.id)}
                >
                  <span className="crop-emoji">{crop.emoji}</span>
                  <span className="crop-name">{t(`crops.${crop.id}`)}</span>
                  {profile.crops.includes(crop.id) && (
                    <span className="check-icon">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="onboarding-nav">
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={handleBack}>
              ← {t('common.back')}
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={onSkip}>
              {t('onboarding.skip')}
            </button>
          )}
          
          <button className="btn btn-primary" onClick={handleNext}>
            {step === totalSteps ? t('onboarding.finish') : t('onboarding.continue')} →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
