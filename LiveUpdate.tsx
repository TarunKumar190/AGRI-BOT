
import React, {useEffect, useState} from 'react';

// Type declarations for global window.__ENV
declare global {
  interface Window {
    __ENV?: { VITE_API_BASE?: string };
  }
}

interface Scheme {
  _id: string;
  scheme_name: string;
  ministry: string;
  description?: string;
  official_portal?: string;
}

interface Update {
  _id: string;
  summary: string;
  severity: string;
  details?: string;
  source?: { source_url?: string };
  approved?: boolean;
}

interface SearchResult {
  scheme?: Scheme;
  updates?: Update[];
}

// AgriLiveInterface.jsx
// Single-file React component (default export) suitable for Vite / create-react-app.
// - Shows live Schemes (left pane)
// - Shows Live Updates feed (right pane)
// - Has a search box (top) which queries /v1/chatbot?q=term for combined results
// - Optional admin token input to approve updates from the UI (for demo only)
// Usage: place this file under src/components/AgriLiveInterface.jsx and import into your app.

// Robust API base detection to avoid runtime errors in environments where
// `import.meta` or `import.meta.env` may be undefined (sandboxed runners).
const resolveApiBase = () => {
  try {
    // Vite-style: import.meta.env.VITE_API_BASE
    if ((import.meta as any).env && (import.meta as any).env.VITE_API_BASE) {
      return String((import.meta as any).env.VITE_API_BASE).replace(/\/$/, '');
    }
  } catch (e) {
    // ignore
  }

  try {
    // CRA-style or other build tools: process.env.REACT_APP_API_BASE
    if (typeof process !== 'undefined' && process.env) {
      const v = process.env.REACT_APP_API_BASE || process.env.VITE_API_BASE || process.env.API_BASE;
      if (v) return String(v).replace(/\/$/, '');
    }
  } catch (e) {
    // ignore
  }

  try {
    // Server-injected global (optional): window.__ENV.VITE_API_BASE
    if (typeof window !== 'undefined' && window.__ENV && window.__ENV.VITE_API_BASE) {
      return String(window.__ENV.VITE_API_BASE).replace(/\/$/, '');
    }
  } catch (e) {
    // ignore
  }

  // final fallback to local dev server
  return 'http://localhost:4000/v1';
};


export default function AgriLiveInterface(){
  const API_BASE = resolveApiBase();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ results: SearchResult[] } | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(()=>{
    // load canonical schemes and public updates on mount
    fetchSchemes();
    fetchUpdates();
    // poll updates every 30s
    const t = setInterval(fetchUpdates, 30000);
    return ()=>clearInterval(t);
  },[]);

  async function fetchSchemes(){
    try{
      const res = await fetch(`${API_BASE}/schemes`);
      if (!res.ok) throw new Error('Failed to fetch schemes: ' + res.status);
      const j = await res.json();
      setSchemes(j.results || j || []);
    }catch(e){ console.error('schemes load', e); setStatusMsg('Could not load schemes'); }
  }

  async function fetchUpdates(){
    try{
      const res = await fetch(`${API_BASE}/updates`);
      if (!res.ok) throw new Error('Failed to fetch updates: ' + res.status);
      const j = await res.json();
      setUpdates(j.results || j || []);
    }catch(e){ console.error('updates load', e); setStatusMsg('Could not load updates'); }
  }

  async function handleSearch(){
    if(!q) return setSearchResults(null);
    setLoading(true);
    setStatusMsg('');
    try{
      const url = `${API_BASE}/chatbot?q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed: ' + res.status);
      const j = await res.json();
      setSearchResults(j);
    }catch(e){ console.error('search', e); setStatusMsg('Search failed'); }
    setLoading(false);
  }

  async function approveUpdate(id: string){
    if(!adminToken){ setStatusMsg('Paste admin token to approve'); return; }
    try{
      const res = await fetch(`${API_BASE}/approve/${id}`, { method:'POST', headers: { Authorization: 'Bearer ' + adminToken } });
      if(!res.ok) throw new Error('approve failed ' + res.status);
      setStatusMsg('Approved ' + id);
      // refresh feeds
      fetchUpdates();
    }catch(e){ console.error(e); setStatusMsg(String(e)); }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        <header className="col-span-12 flex items-center justify-between">
          <h1 className="text-2xl font-bold">AgriLive — Schemes & Live Updates</h1>
          <div className="flex items-center gap-3">
            <input value={adminToken} onChange={e=>setAdminToken(e.target.value)} placeholder="Admin JWT (paste to enable approve)" className="border px-3 py-1 rounded w-96 text-sm" />
            <div className="text-sm text-gray-600">Demo mode: low-severity auto-approved</div>
          </div>
        </header>

        {/* Left column: schemes list + search */}
        <aside className="col-span-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex gap-2">
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search scheme or topic (e.g. PM-KISAN)" className="flex-1 border rounded px-3 py-2" />
              <button onClick={handleSearch} className="bg-blue-600 text-white px-4 rounded">{loading? 'Searching...' : 'Search'}</button>
            </div>
            <div className="mt-4 text-sm text-gray-600">Quick list of canonical schemes</div>
            <div className="mt-3 space-y-2 max-h-[60vh] overflow-auto">
              {schemes.map((s: Scheme) => (
                <div key={s._id} className="p-3 border rounded hover:shadow">
                  <div className="font-semibold">{s.scheme_name}</div>
                  <div className="text-xs text-gray-600">{s.ministry}</div>
                  <div className="mt-1 text-sm text-gray-700">{s.description?.slice(0,120)}</div>
                  <div className="mt-2 text-xs"><a href={s.official_portal} target="_blank" rel="noreferrer" className="text-blue-600">Official portal</a></div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main: search/result + updates feed */}
        <main className="col-span-8">
          <div className="bg-white p-4 rounded shadow-sm mb-4">
            <h2 className="font-semibold">Search Results</h2>
            {!searchResults && <div className="text-sm text-gray-600 mt-2">Type a query and click Search to fetch scheme + recent updates.</div>}
            {searchResults && (
              <div className="mt-3">
                {searchResults.results && searchResults.results.length ? searchResults.results.map((r: SearchResult, i: number)=> (
                  <div key={i} className="p-3 border rounded mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-lg font-bold">{r.scheme?.scheme_name || '—'}</div>
                        <div className="text-sm text-gray-600">{r.scheme?.ministry}</div>
                      </div>
                      <div className="text-xs text-gray-500">{r.updates?.length || 0} updates</div>
                    </div>
                    <div className="mt-2 text-gray-700">{r.scheme?.description}</div>

                    <div className="mt-3">
                      <div className="font-semibold">Latest approved updates</div>
                      {r.updates?.length ? r.updates.map((u: Update)=> (
                        <div key={u._id} className="mt-2 p-2 bg-gray-50 rounded">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{u.summary}</div>
                            <div className="text-xs text-gray-500">{u.severity}</div>
                          </div>
                          <div className="text-sm text-gray-700 mt-1">{u.details?.slice(0,300)}</div>
                          <div className="mt-2 text-xs"><a href={u.source?.source_url} target="_blank" rel="noreferrer" className="text-blue-600">Source</a></div>
                          {!u.approved && adminToken && (
                            <div className="mt-2"><button onClick={()=>approveUpdate(u._id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button></div>
                          )}
                        </div>
                      )) : <div className="text-sm text-gray-600 mt-2">No approved updates</div>}
                    </div>
                  </div>
                )) : <div className="text-sm text-gray-600">No results</div>}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Live Updates Feed</h3>
              <div className="text-sm text-gray-500">Auto-refreshes every 30s</div>
            </div>
            <div className="mt-3 space-y-3 max-h-[50vh] overflow-auto">
              {updates.length ? updates.map((u: Update) => (
                <div key={u._id} className="p-3 border rounded bg-white">
                  <div className="flex justify-between">
                    <div className="font-medium">{u.summary}</div>
                    <div className="text-xs text-gray-500">{u.severity}</div>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{u.details?.slice(0,300)}</div>
                  <div className="mt-2 text-xs"><a href={u.source?.source_url} target="_blank" rel="noreferrer" className="text-blue-600">Official source</a></div>
                  {!u.approved && adminToken && (
                    <div className="mt-2"><button onClick={()=>approveUpdate(u._id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button></div>
                  )}
                </div>
              )) : <div className="text-sm text-gray-600">No live updates yet</div>}
            </div>
          </div>

          {statusMsg && <div className="mt-3 text-sm text-yellow-700">{statusMsg}</div>}
        </main>
      </div>
    </div>
  );
}
