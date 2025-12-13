// src/data/staticUpdates.js
// Static fallback updates / notices for demo and offline mode.
// Each update is shaped like your ingestion system expects.

export const updates = [
  {
    id: 1,
    text: "Advisory released for wheat farmers",
    severity: "LOW",
  },
  {
    id: 2,
    text: "Rain alert issued in north region",
    severity: "LOW",
  },
  {
    id: 3,
    text: "PMFBY enrollment window extended",
    severity: "LOW",
  },
];


export function getFallbackUpdates() {
  return [
    {
      id: 1,
      title: "PMFBY",
      en: "Extended enrollment window announced",
      hi: "नामांकन की समय सीमा बढ़ाई गई",
    },
    {
      id: 2,
      title: "Soil Advisory",
      en: "New crop-wise fertilizer guidelines released",
      hi: "नई फसल-वार उर्वरक दिशानिर्देश जारी",
    },
    {
      id: 3,
      title: "Weather Alert",
      en: "Heatwave warning in multiple districts",
      hi: "कई जिलों में लू की चेतावनी",
    },
  ];
}


export function getUpdatesForScheme(scheme_id) {
  return UPDATES.filter(u => u.scheme_id === scheme_id).map(u => ({ ...u }));
}

export default updates;
