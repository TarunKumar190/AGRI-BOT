import React from "react";
import { useEffect, useRef, useState } from "react";
import { getFallbackUpdates } from "../data/staticUpdates";
import { useLanguage } from "../context/LanguageContext";
import { timeAgo } from "../Utils/timeUtils";
import { cleanText } from "../Utils/textClean";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function UpdatesFeed() {
  const { language } = useLanguage();
  const listRef = useRef(null);
  const [updates, setUpdates] = useState(getFallbackUpdates());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch live updates from backend
  useEffect(() => {
    const fetchUpdates = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/v1/updates`);
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            // Transform backend data to match component format
            const transformed = data.results.slice(0, 30).map((u, idx) => {
              // Clean the summary text
              const cleanSummary = cleanText(u.summary || u.change_type || 'Update');
              const cleanDetails = u.details ? cleanText(u.details).substring(0, 200) : '';
              
              return {
                id: u._id || `update-${idx}`,
                title: u.change_type || 'Notice',
                en: cleanSummary,
                hi: cleanSummary, // For real data, use same text
                severity: u.severity || 'low',
                date: u.createdAt || u.effective_date,
                scheme_id: u.scheme_id,
                details: cleanDetails
              };
            });
            setUpdates(transformed);
            setError(null);
          } else {
            console.log('No updates from backend, using fallback');
          }
        } else {
          console.log('Backend unavailable, using fallback');
        }
      } catch (err) {
        console.error('Failed to fetch updates:', err);
        setError('Using cached updates');
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
    // Refresh every 2 minutes
    const interval = setInterval(fetchUpdates, 120000);
    return () => clearInterval(interval);
  }, []);

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
      <h2>
        <span>📢 Live Updates</span>
        {loading && <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal', marginLeft: '12px' }}>🔄 Updating...</span>}
      </h2>

      <div className="scroll-content" ref={listRef}>
        {updates.map(u => {
          const text = language === 'hi' ? u.hi : u.en;
          const badge = u.severity ? (
            <span className={`badge badge-${u.severity}`} style={{ marginLeft: '8px' }}>{u.severity}</span>
          ) : null;
          
          return (
            <div key={u.id} className="update-item">
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#059669', display: 'block', marginBottom: '4px' }}>
                  {u.title}
                </strong>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#374151' }}>
                  {text}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                {u.date && (
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {timeAgo(u.date)}
                  </span>
                )}
                {badge}
              </div>
            </div>
          );
        })}
      </div>
      {error && <div style={{ fontSize: '11px', color: '#ef4444', padding: '8px', marginTop: '8px' }}>{error}</div>}
    </div>
  );
}