// src/data/staticUpdates.js
// Static fallback updates / notices for demo and offline mode.
// Each update is shaped like your ingestion system expects.

export const updates = [
  {
    id: "update-1",
    text: "Advisory released for wheat farmers",
    severity: "LOW",
  },
  {
    id: "update-2",
    text: "Rain alert issued in north region",
    severity: "LOW",
  },
  {
    id: "update-3",
    text: "PMFBY enrollment window extended",
    severity: "LOW",
  },
];


export function getFallbackUpdates() {
  return [
    {
      id: "fallback-1",
      title: "PM-KISAN Notice",
      en: "Prime Minister releases 16th installment of PM-KISAN benefiting over 9.4 crore farmers",
      hi: "प्रधानमंत्री ने 9.4 करोड़ से अधिक किसानों को पीएम-किसान की 16वीं किस्त जारी की",
      severity: "low",
      date: new Date().toISOString(),
    },
    {
      id: "fallback-2",
      title: "Soil Health Card Update",
      en: "New soil testing laboratories established in 50 districts across India",
      hi: "भारत भर के 50 जिलों में नई मृदा परीक्षण प्रयोगशालाएं स्थापित की गईं",
      severity: "low",
      date: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "fallback-3",
      title: "Weather Advisory",
      en: "IMD issues advisory for unseasonal rainfall in northern states - farmers advised to take precautions",
      hi: "आईएमडी ने उत्तरी राज्यों में बेमौसम बारिश की सलाह जारी की - किसानों को सावधानी बरतने की सलाह दी गई",
      severity: "medium",
      date: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "fallback-4",
      title: "PMFBY Enrollment",
      en: "Pradhan Mantri Fasal Bima Yojana enrollment extended till end of month",
      hi: "प्रधानमंत्री फसल बीमा योजना का नामांकन महीने के अंत तक बढ़ाया गया",
      severity: "low",
      date: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: "fallback-5",
      title: "KCC Interest Subsidy",
      en: "Interest subvention scheme for Kisan Credit Card holders extended for FY 2024-25",
      hi: "किसान क्रेडिट कार्ड धारकों के लिए ब्याज सबवेंशन योजना वित्त वर्ष 2024-25 के लिए बढ़ाई गई",
      severity: "low",
      date: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: "fallback-6",
      title: "PMKSY Update",
      en: "Pradhan Mantri Krishi Sinchayee Yojana coverage expanded to 100 new districts",
      hi: "प्रधानमंत्री कृषि सिंचाई योजना का विस्तार 100 नए जिलों में किया गया",
      severity: "low",
      date: new Date(Date.now() - 18000000).toISOString(),
    },
    {
      id: "fallback-7",
      title: "Agricultural Subsidy",
      en: "Direct Benefit Transfer of fertilizer subsidy to begin in pilot districts",
      hi: "पायलट जिलों में उर्वरक सब्सिडी का प्रत्यक्ष लाभ हस्तांतरण शुरू होगा",
      severity: "low",
      date: new Date(Date.now() - 21600000).toISOString(),
    },
    {
      id: "fallback-8",
      title: "MSP Announcement",
      en: "Minimum Support Price increased for Rabi crops - wheat MSP raised by Rs 150/quintal",
      hi: "रबी फसलों के लिए न्यूनतम समर्थन मूल्य में वृद्धि - गेहूं एमएसपी में 150 रुपये/क्विंटल की बढ़ोतरी",
      severity: "medium",
      date: new Date(Date.now() - 25200000).toISOString(),
    },
  ];
}


export function getUpdatesForScheme(scheme_id) {
  return UPDATES.filter(u => u.scheme_id === scheme_id).map(u => ({ ...u }));
}

export default updates;
