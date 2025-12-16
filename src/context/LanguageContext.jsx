import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('agribot_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('agribot_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key, fallback = '') => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (value === undefined) {
      // Fallback to English
      value = translations['en'];
      for (const k of keys) {
        value = value?.[k];
      }
    }
    
    return value || fallback || key;
  };

  const changeLanguage = (lang) => {
    if (SUPPORTED_LANGUAGES.find(l => l.code === lang)) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return safe defaults if not inside provider (during initial render)
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key) => key,
      SUPPORTED_LANGUAGES: []
    };
  }
  return context;
}

export default LanguageContext;

