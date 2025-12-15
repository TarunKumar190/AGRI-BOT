import React from "react";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
    >
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
    </select>
  );
}
