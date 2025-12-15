import React, { useEffect, useState } from "react";
export default function AgriLiveInterface() {
  const [updates, setUpdates] = useState([]);
}
  // fetching logic here ✅

/**
 * AgriLiveInterface.jsx
 * Upgraded:
 * - left column lists canonical schemes with fields (scheme_id, benefits, eligibility)
 * - clicking a scheme opens a details pane with full canonical data (copyable JSON)
 * - live updates show change summary and details; attempts to show related scheme_name when present
 * - no external libs required; works with current Vite setup
 */

const resolveApiBase = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta && import.meta.env && import.meta.env.VITE_API_BASE) {
      return String(import.meta.env.VITE_API_BASE).replace(/\/$/, "");
    }
  } catch (e) {}
  try {
    if (typeof process !== "undefined" && process.env) {
      const v = process.env.REACT_APP_API_BASE || process.env.VITE_API_BASE || process.env.API_BASE;
      if (v) return String(v).replace(/\/$/, "");
    }
  } catch (e) {}
  try {
    if (typeof window !== "undefined" && window.__ENV && window.__ENV.VITE_API_BASE) {
      return String(window.__ENV.VITE_API_BASE).replace(/\/$/, "");
    }
  } catch (e) {}
  return "http://localhost:4000/v1";
};

export default function AgriLiveInterface() {
  const API_BASE = resolveApiBase();

  const [schemes, setSchemes] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null); // object
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    fetchSchemes();
    fetchUpdates();
    const t = setInterval(fetchUpdates, 30000);
    return () => clearInterval(t);
  }, []);

  async function fetchSchemes() {
    try {
      const res = await fetch(`${API_BASE}/schemes`);
      if (!res.ok) throw new Error("schemes fetch " + res.status);
      const j = await res.json();
      // j.results OR j (depends on server)
      const got = j.results || j || [];
      // normalize: ensure fields exist to avoid undefined
      const norm = (got || []).map(s => ({
        scheme_id: s.scheme_id || s._id || s.schemeId || "",
        scheme_name: s.scheme_name || s.schemeName || s.name || "—",
        ministry: s.ministry || s.agency || "",
        sector: s.sector || "",
        description: s.description || "",
        eligibility: s.eligibility || "",
        benefits: s.benefits || "",
        official_portal: s.official_port || s.official_portal || s.official || s.official_portal || "",
        sources: s.sources || s.source || [],
        ...s
      }));
      setSchemes(norm);
    } catch (e) {
      console.error(e);
      setStatusMsg("Could not load schemes");
    }
  }

  async function fetchUpdates() {
    try {
      const res = await fetch(`${API_BASE}/updates`);
      if (!res.ok) throw new Error("updates fetch " + res.status);
      const j = await res.json();
      const got = j.results || j || [];
      // normalize updates: ensure change fields are used
      const norm = (got || []).map(u => {
        // connector might post update object directly or wrapped inside fields
        const summary = u.summary || (u.change && u.change.summary) || "";
        const details = u.details || (u.change && u.change.details) || "";
        const severity = u.severity || (u.change && u.change.severity) || "low";
        const scheme_name = u.scheme_name || u.scheme?.scheme_name || (u.scheme && u.scheme.scheme_name) || (u.scheme && u.scheme_name) || "";
        const source = u.source || (u.change && u.change.source) || u.source || {};
        return {
          _id: u._id || (u.change && u.change.id) || Math.random().toString(36).slice(2, 9),
          scheme_id: u.scheme_id || u.scheme?.scheme_id || "",
          scheme_name,
          summary,
          details,
          severity,
          source,
          approved: u.approved === true,
          raw: u
        };
      });
      setUpdates(norm);
    } catch (e) {
      console.error(e);
      setStatusMsg("Could not load updates");
    }
  }

  async function handleSearch() {
    if (!q) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch(`${API_BASE}/chatbot?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("search fail " + res.status);
      const j = await res.json();
      setSearchResults(j);
    } catch (e) {
      console.error(e);
      setStatusMsg("Search failed");
    } finally {
      setLoading(false);
    }
  }

  // helper: open scheme details in side panel
  function openSchemeDetails(s) {
    setSelectedScheme(s);
  }
  function closeSchemeDetails() {
    setSelectedScheme(null);
  }

  // small utility to copy canonical JSON for the chatbot
  function copySchemeJson(s) {
    const payload = {
      scheme_id: s.scheme_id,
      scheme_name: s.scheme_name,
      ministry: s.ministry,
      sector: s.sector,
      description: s.description,
      eligibility: s.eligibility,
      benefits: s.benefits,
      official_portal: s.official_portal,
      sources: s.sources || []
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setStatusMsg("Canonical scheme JSON copied to clipboard");
    setTimeout(() => setStatusMsg(""), 2500);
  }
  function StatusBadge({scheme}) {
  const now = Date.now();
  const start = scheme.start_date ? Date.parse(scheme.start_date) : null;
  const end = scheme.end_date ? Date.parse(scheme.end_date) : null;
  if (start && now - start < 7*24*3600*1000) return <span className="badge new">New</span>;
  if (scheme.status === 'ongoing') return <span className="badge ongoing">Ongoing</span>;
  if (end && end - now < 14*24*3600*1000) return <span className="badge ending">Ending soon</span>;
  return null;
}


  return (
    <div style={{ minHeight: "100vh", padding: 18, fontFamily: "Inter, system-ui, Arial" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>AgriLive — Schemes & Live Updates</h1>
          <div style={{ color: "#6b7280" }}>Use search to pull scheme + latest approved updates for chatbot</div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
          {/* Left column: Schemes */}
          <aside>
            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  placeholder="Search (e.g. PM-KISAN)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ flex: 1, padding: 8, border: "1px solid #e5e7eb", borderRadius: 6 }}
                />
                <button onClick={handleSearch} disabled={loading} style={{ padding: "8px 12px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 6 }}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>

              <div style={{ color: "#6b7280", marginBottom: 8 }}>Canonical schemes</div>
              <div style={{ maxHeight: "68vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {schemes.length ? (
                  schemes.map((s) => (
                    <div key={s.scheme_id || s._id || Math.random()} style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{s.scheme_name}</div>
                          <div style={{ color: "#6b7280", fontSize: 13 }}>{s.ministry}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{s.sector}</div>
                          <button onClick={() => openSchemeDetails(s)} style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6 }}>Details</button>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, color: "#333" }}>{s.description?.slice(0, 140)}</div>
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <a href={s.official_portal || "#"} target="_blank" rel="noreferrer">Official portal</a>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{(s.sources && s.sources.length) ? `${s.sources.length} source(s)` : ""}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#6b7280" }}>No canonical schemes</div>
                )}
              </div>
            </div>
          </aside>

          {/* Main: search result + updates */}
          <main>
            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Search Results</h2>
              {!searchResults && <div style={{ color: "#6b7280", marginTop: 8 }}>Type a query and click Search</div>}
              {searchResults && (
                <div style={{ marginTop: 10 }}>
                  {searchResults.results && searchResults.results.length ? (
                    searchResults.results.map((r, i) => {
                      const scheme = r.scheme || r;
                      const updatesList = r.updates || [];
                      return (
                        <div key={i} style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 6, marginTop: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>{scheme.scheme_name}</div>
                              <div style={{ color: "#6b7280" }}>{scheme.ministry}</div>
                            </div>
                            <div style={{ color: "#6b7280" }}>{updatesList.length} updates</div>
                          </div>

                          <div style={{ marginTop: 8 }}>{scheme.description}</div>

                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontWeight: 600 }}>Eligibility</div>
                            <div style={{ color: "#333" }}>{scheme.eligibility || "—"}</div>
                            <div style={{ fontWeight: 600, marginTop: 8 }}>Benefits</div>
                            <div style={{ color: "#333" }}>{scheme.benefits || "—"}</div>
                            <div style={{ marginTop: 8 }}><a href={scheme.official_portal} target="_blank" rel="noreferrer">Official portal</a></div>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontWeight: 600 }}>Latest updates</div>
                            {updatesList.length ? updatesList.map((u) => (
                              <div key={u._id || Math.random()} style={{ marginTop: 8, padding: 8, background: "#fafafa", borderRadius: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <div style={{ fontWeight: 600 }}>{u.summary}</div>
                                  <div style={{ color: "#6b7280" }}>{u.severity || "low"}</div>
                                </div>
                                <div style={{ marginTop: 6 }}>{(u.details || u.change?.details || "").slice(0, 400)}</div>
                                <div style={{ marginTop: 6 }}><a href={(u.source && u.source.source_url) || (u.change && u.change.source_url)} target="_blank" rel="noreferrer">Official source</a></div>
                              </div>
                            )) : <div style={{ color: "#6b7280" }}>No recent updates</div>}
                          </div>
                        </div>
                      );
                    })
                  ) : <div style={{ color: "#6b7280" }}>No results</div>}
                </div>
              )}
            </div>

            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Live Updates Feed</h3>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Auto-refreshes every 30s</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <UpdatesFeed updates={updates} />
  return (
    <div>
      {/* other sections */}

      <UpdatesFeed updates={updates} />

    </div>
  );
              </div>
            </div>

            {statusMsg && <div style={{ marginTop: 12, padding: 8, background: "#fff7ed", border: "1px solid #fcd34d", borderRadius: 6, color: "#92400e" }}>{statusMsg}</div>}
          </main>
        </div>

        {/* Scheme details modal/panel */}
        {selectedScheme && (
          <div style={{
            position: "fixed", right: 20, top: 80, width: 420, maxHeight: "70vh", overflow: "auto",
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>{selectedScheme.scheme_name}</div>
              <div>
                <button onClick={() => copySchemeJson(selectedScheme)} style={{ marginRight: 8, padding: "6px 8px", borderRadius: 6 }}>Copy JSON</button>
                <button onClick={closeSchemeDetails} style={{ padding: "6px 8px", borderRadius: 6 }}>Close</button>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Scheme ID</div>
              <div style={{ marginTop: 4 }}>{selectedScheme.scheme_id}</div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Ministry</div>
              <div style={{ marginTop: 4 }}>{selectedScheme.ministry}</div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Sector</div>
              <div style={{ marginTop: 4 }}>{selectedScheme.sector}</div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Description</div>
              <div style={{ marginTop: 4 }}>{selectedScheme.description}</div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Eligibility</div>
              <div style={{ marginTop: 4 }}>{selectedScheme.eligibility || "—"}</div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Benefits</div>
              <div style={{ marginTop: 4 }}>{selectedScheme.benefits || "—"}</div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Official portal</div>
              <div style={{ marginTop: 4 }}><a href={selectedScheme.official_portal} target="_blank" rel="noreferrer">{selectedScheme.official_portal}</a></div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Sources (raw)</div>
              <pre style={{ maxHeight: 160, overflow: "auto", background: "#f7f7f9", padding: 8, borderRadius: 6 }}>{JSON.stringify(selectedScheme.sources || [], null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
