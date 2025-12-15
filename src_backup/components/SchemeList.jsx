import React from "react";
import { schemes } from "../data/staticSchemes";
import { useLanguage } from "../context/LanguageContext";

export default function SchemeList() {
  const { language } = useLanguage();

  // simple translator
  const t = (en, hi) => (language === "hi" ? hi : en);

  // safety check (prevents crash)
  if (!Array.isArray(schemes)) {
    return <p>Scheme data not available</p>;
  }

return (
    <div className="card scroll-box">
      <h2>🌾 {t('Government Schemes', 'सरकारी योजनाएं')}</h2>

      <div className="scroll-content">
        {schemes.map((s, idx) => (
          <div key={s.scheme_id || idx} className="scheme-item">
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <strong style={{ fontSize: '16px', color: '#059669', flex: 1 }}>{s.scheme_name}</strong>
              {s.status && (
                <span className="badge" style={{ marginLeft: '12px', flexShrink: 0 }}>
                  {s.status}
                </span>
              )}
            </div>

            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px 0' }}>{s.ministry}</p>
            
            {s.description && (
              <p style={{ fontSize: '14px', margin: '0 0 10px 0', lineHeight: '1.6' }}>{s.description}</p>
            )}
            
            {s.benefits && (
              <p style={{ fontSize: '13px', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                <strong style={{ color: '#047857' }}>💰 {t('Benefits', 'लाभ')}:</strong> {s.benefits}
              </p>
            )}
            
            {s.eligibility && (
              <p style={{ fontSize: '13px', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                <strong style={{ color: '#047857' }}>✓ {t('Eligibility', 'पात्रता')}:</strong> {s.eligibility}
              </p>
            )}

            {s.official_portal && (
              <a 
                href={s.official_portal} 
                target="_blank" 
                rel="noopener noreferrer"
                className="scheme-link"
                style={{ 
                  fontSize: '13px', 
                  color: '#2563eb', 
                  textDecoration: 'none',
                  display: 'inline-block',
                  marginTop: '4px',
                  fontWeight: '500'
                }}
              >
                🔗 {t('Official Website', 'आधिकारिक वेबसाइट')} →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}