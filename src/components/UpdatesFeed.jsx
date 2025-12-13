import React from "react";
import { useEffect, useRef } from "react";
import { getFallbackUpdates } from "../data/staticUpdates";
import { useLanguage } from "../context/LanguageContext";
import { timeAgo } from "../Utils/timeUtils";
import { cleanText } from "../Utils/textClean";
import updates from "../data/staticUpdates";


export default function UpdatesFeed() {
  const { language } = useLanguage();
  const listRef = useRef(null);

  const updates = getFallbackUpdates();

  // Auto scroll effect
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    let scrollAmount = 0;

    const scrollInterval = setInterval(() => {
      scrollAmount += 1;
      container.scrollTop = scrollAmount;

      // Reset scroll for infinite loop
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight
      ) {
        scrollAmount = 0;
      }
    }, 40); // speed (lower = faster)

    return () => clearInterval(scrollInterval);
  }, []);

return (
    <div className="card scroll-box">
      <h2>Live Updates</h2>

      <div className="scroll-content">
        {updates.map(u => (
          <div key={u.id} className="update-item">
            <span>{u.text}</span>
            <span className="badge">{u.severity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}