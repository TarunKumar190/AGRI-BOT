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
      <h2>Government Schemes</h2>

      <div className="scroll-content">
        {schemes.map(s => (
          <div key={s.id} className="scheme-item">
            <div className="scheme-header">
              <strong>{s.name}</strong>
              <span className="status">{s.status}</span>
            </div>

            <p>{s.ministry}</p>
            <p><b>Benefit:</b> {s.benefit}</p>
            <p><b>Eligibility:</b> {s.eligibility}</p>
            <p><b>How to Apply:</b> {s.apply}</p>

            <a href={s.link} target="_blank">Official Website</a>
          </div>
        ))}
      </div>
    </div>
  );
}