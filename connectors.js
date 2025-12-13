/**
 * connectors.js - robust connector runner (Windows-ready)
 * - axios retries, browser-like headers
 * - safeGet with header/url variants
 * - uses p-limit@2 (const pLimit = require('p-limit'))
 * - special handling for PIB 'pib-agri' source
 * - auto-approves items (severity: 'low') for demo
 *
 * Save: connectors.js
 */

const fs = require('fs-extra');
const Parser = require('rss-parser');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const cheerio = require('cheerio');
const pLimit = require('p-limit'); // p-limit@2 is required
const path = require('path');
require('dotenv').config();

const parser = new Parser();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const API_INGEST = process.env.API_INGEST || 'http://localhost:4000/v1/ingest';
const SEEN_FILE = path.resolve('./seen_connectors.json');
const seen = fs.existsSync(SEEN_FILE) ? fs.readJsonSync(SEEN_FILE) : { urls: {} };

if (!ADMIN_TOKEN) {
  console.error('ERROR: ADMIN_TOKEN env is not set. Set $env:ADMIN_TOKEN in PowerShell and retry.');
  process.exit(1);
}

// axios defaults: act like a browser & increase timeout
axios.defaults.timeout = 60000;
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgriFetcher/1.0';
axios.defaults.headers.common['Accept-Language'] = 'en-US,en;q=0.9';

// automatic retries for transient failures
axiosRetry(axios, {
  retries: 5,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error) || (error.code === 'ECONNRESET') || (error.code === 'ETIMEDOUT');
  }
});

// improved safeGet: tries header/url variants and gives up gracefully
// improved safeGet with extra header try, failure counts and skip-after-N
const _failedHosts = {}; // in-memory tracker for noisy hosts

async function safeGet(url, opts = {}) {
  // quick host name
  let host = null;
  try { host = new URL(url).hostname; } catch(e) {}

  // if this host has failed many times recently, skip further attempts quickly
  if (host && _failedHosts[host] && _failedHosts[host].skipUntil && Date.now() < _failedHosts[host].skipUntil) {
    console.warn(`safeGet skipping host temporarily due to repeated failures: ${host}`);
    return null;
  }

  const tries = [];
  let urlVariants = [url];
  try { urlVariants.push(encodeURI(url)); } catch(e) {}

  // header combos to try (added Accept-Encoding + sec-fetch keys)
  const headerVariants = [
    { 'User-Agent': axios.defaults.headers.common['User-Agent'], 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
    { 'User-Agent': axios.defaults.headers.common['User-Agent'], 'Referer': (new URL(url)).origin, 'Accept': 'text/html' },
    { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': '*/*', 'Accept-Encoding': 'gzip, deflate, br', 'Connection': 'keep-alive' },
    { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept':'text/html', 'Sec-Fetch-Mode':'navigate', 'Sec-Fetch-Site':'none' }
  ];

  for (const u of urlVariants) {
    for (const hdrs of headerVariants) {
      tries.push({ url: u, headers: hdrs });
    }
  }
  tries.push({ url, headers: {} }); // last-ditch bare attempt

  let attemptCount = 0;
  for (const attempt of tries) {
    attemptCount++;
    try {
      // try HEAD (non-fatal) then GET
      try { await axios.head(attempt.url, { timeout: 8000, headers: attempt.headers }); } catch(_) { /* ignore */ }
      const res = await axios.get(attempt.url, Object.assign({ timeout: 60000, headers: attempt.headers }, opts));
      // reset any failure count for host on success
      if (host && _failedHosts[host]) delete _failedHosts[host];
      return res;
    } catch (err) {
      const code = err.code || (err.response && err.response.status) || 'unknown';
      // throttle noisy logs: only log the first 2 attempts for a given url + once per host
      const hostKey = host || attempt.url;
      _failedHosts[hostKey] = _failedHosts[hostKey] || { count: 0, lastLog: 0 };
      _failedHosts[hostKey].count++;

      const now = Date.now();
      const logOnce = (_failedHosts[hostKey].count <= 2) || (now - (_failedHosts[hostKey].lastLog || 0) > 60*1000);
      if (logOnce) {
        console.warn(`safeGet attempt failed for ${attempt.url} -> ${String(code)}`);
        _failedHosts[hostKey].lastLog = now;
      }

      // If we see many failures for this host, set a temporary skip window (e.g., 10 minutes)
      if (_failedHosts[hostKey].count >= 8) {
        _failedHosts[hostKey].skipUntil = Date.now() + 10 * 60 * 1000; // skip for 10 minutes
        console.warn(`safeGet: host ${hostKey} marked as temporarily skipped due to repeated failures`);
        break;
      }

      // otherwise try the next header/url variant
      continue;
    }
  }

  console.warn('safeGet giving up for', url);
  return null;
}


async function saveSeen(){ await fs.writeJson(SEEN_FILE, seen, { spaces: 2 }); }

async function postToIngest(payload){
  try {
    const res = await axios.post(API_INGEST, payload, { headers: { Authorization: 'Bearer ' + ADMIN_TOKEN }});
    console.log('INGEST OK:', payload.scheme_name.slice(0,80));
    return res.data;
  } catch (e) {
    console.error('INGEST ERR', e.response ? e.response.status : e.message, payload.scheme_name.slice(0,80));
    if(e.response && e.response.data) console.error(' BODY:', JSON.stringify(e.response.data).slice(0,400));
  }
}

/* Normalizer from RSS */
// connectors.js - add/replace normalizeFromRSS / normalizeFromHtml item creation with this helper
function normalizeSchemeFromSource(rawItem, sourceMeta = {}) {
  // rawItem: rss item or scraped page object
  // sourceMeta: { id, name, url }
  const scheme_id = rawItem.scheme_id || rawItem.id || rawItem.guid || `${sourceMeta.id}:${(rawItem.title||'').slice(0,40)}`.replace(/\s+/g,'-').toLowerCase();
  const scheme_name = rawItem.title || rawItem.scheme_name || rawItem.name || '';
  const description = (rawItem.content || rawItem.summary || rawItem.description || '').trim();
  // naive heuristics to extract eligibility/benefits/how_to_apply from content
  const eligibility = (rawItem.eligibility || extractSection(description, ['eligibility', 'who can apply', 'who is eligible', 'applicants']) ) || '';
  const benefits = (rawItem.benefits || extractSection(description, ['benefit', 'benefits', 'what you get', 'amount'])) || '';
  const how_to_apply = (rawItem.how_to_apply || extractSection(description, ['how to apply', 'application', 'apply'])) || '';
  const tags = rawItem.tags || (rawItem.categories || rawItem.categories || []).slice(0,8) || [];
  // status heuristics (you can refine later)
  let status = 'ongoing';
  const lower = description.toLowerCase();
  if (lower.includes('launch') || lower.includes('launched on') || lower.includes('starts on') || lower.includes('from')) status = 'ongoing';
  if (lower.includes('apply by') || lower.includes('last date') || lower.includes('ends on') || lower.includes('deadline')) status = 'ongoing';
  // start/end date extraction (very basic)
  const start_date = rawItem.start_date || findDate(description, ['start', 'from']) || null;
  const end_date = rawItem.end_date || findDate(description, ['end', 'ends on', 'last date', 'deadline']) || null;

  const payload = {
    scheme_id,
    scheme_name,
    ministry: sourceMeta.name || rawItem.ministry || '',
    sector: rawItem.sector || '',
    description,
    eligibility,
    benefits,
    how_to_apply,
    official_portal: rawItem.link || rawItem.url || sourceMeta.url || '',
    sources: [{ source_id: sourceMeta.id || 'unknown', source_url: rawItem.link || rawItem.url || sourceMeta.url, fetched_at: new Date().toISOString() }],
    status,
    start_date,
    end_date,
    tags,
    // also include the raw change object for update-specific info
    change: {
      change_type: rawItem.change_type || 'notice',
      summary: rawItem.title || rawItem.summary || '',
      details: description,
      effective_date: rawItem.pubDate || new Date().toISOString(),
      severity: rawItem.severity || 'low'
    }
  };
  return payload;
}

// helper: very simple section extraction — finds sentences that contain keywords
function extractSection(text = '', keywords = []) {
  if (!text) return '';
  const sentences = text.split(/\\.|\\n|;|\\r/).map(s => s.trim()).filter(Boolean);
  for (const s of sentences) {
    for (const k of keywords) {
      if (s.toLowerCase().includes(k)) return s;
    }
  }
  return '';
}

// helper: attempt to parse first date-like string near keywords (very coarse)
function findDate(text = '', keywords = []) {
  try {
    const lower = text.toLowerCase();
    for (const k of keywords) {
      const idx = lower.indexOf(k);
      if (idx >= 0) {
        // find up to 80 chars after keyword
        const sub = text.substr(idx, 120);
        // match common date patterns: DD Month YYYY, Month DD, YYYY-MM-DD
        const m = sub.match(/(\\b\\d{1,2}\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s*\\d{2,4})/i)
               || sub.match(/(\\b(january|february|march|april|may|june|july|august|september|october|november|december)\\s+\\d{1,2}(,?\\s*\\d{2,4})?)/i)
               || sub.match(/(\\b\\d{4}-\\d{2}-\\d{2}\\b)/);
        if (m) return new Date(m[0]).toISOString();
      }
    }
  } catch (e) {}
  return null;
}

/* RSS fetch */
async function fetchRss(source){
  console.log('Fetching RSS', source.url);
  try {
    const feed = await parser.parseURL(source.url);
    console.log('  RSS items:', (feed.items||[]).length);
    const limit = pLimit(6);
    await Promise.all((feed.items||[]).slice(0,40).map(it => limit(async ()=>{
      const key = it.link || it.guid || it.title;
      if (seen.urls[key]) return;
      const payload = normalizeFromRSS(it, source);
      await postToIngest(payload);
      seen.urls[key] = { seen_at: new Date().toISOString() };
      await saveSeen();
    })));
  } catch (err) {
    console.error('Source fetch failed', source.id, 'Error:', err.message);
  }
}

/* Generic HTML list fetcher (robust) */
async function fetchHtmlList(source){
  console.log('Fetching HTML list', source.url);
  try {
    const rr = await safeGet(source.url, { headers: { 'User-Agent': axios.defaults.headers.common['User-Agent'] }});
    if (!rr) { console.warn('  skip source (unreachable):', source.id); return; }
    const $ = cheerio.load(rr.data);
    const anchors = new Map();
    const candidateSelectors = [
      'a[href*="PressRelease"]',
      'a[href*="PressRelease.aspx"]',
      'a[href*="PressRelese"]',
      'a[href*="/press-release/"]',
      'a[href$=".pdf"]',
      'a'
    ];
    for (const sel of candidateSelectors) {
      $(sel).each((i,el) => {
        const href = $(el).attr('href');
        const txt = $(el).text().trim();
        if (!href) return;
        const url = href.startsWith('http') ? href : new URL(href, source.url).href;
        if (!anchors.has(url)) anchors.set(url, { url, title: txt || url });
      });
      if (anchors.size > 0) break;
    }
    const list = Array.from(anchors.values()).slice(0, 80);
    console.log('  anchors found', list.length);
    const limit = pLimit(6);
    await Promise.all(list.map(a => limit(async () => {
      if (seen.urls[a.url]) return;
      try {
        const res = await safeGet(a.url, { responseType: 'text' });
        if (!res) { seen.urls[a.url] = { seen_at: new Date().toISOString(), skipped: true }; await saveSeen(); return; }
        const ctype = (res.headers['content-type']||'').toLowerCase();
        let details = '';
        if (ctype.includes('pdf')) {
          details = 'PDF link: ' + a.url;
        } else {
          const $p = cheerio.load(res.data);
          details = $p('div#content, div.article, .news, #ctl00_ContentPlaceHolder1_divContent, .press-release, .page-content').text().trim();
          if (!details) details = $p('body').text().trim().slice(0,4000);
        }
        const payload = {
          scheme_name: `${source.name}: ${a.title || 'Notice'}`,
          ministry: source.name,
          sector: 'Announcement',
          description: a.title || '',
          eligibility: '',
          benefits: '',
          official_portal: a.url,
          source: { source_id: source.id, source_url: a.url, fetched_at: new Date().toISOString(), raw: { excerpt: details.slice(0,2000) } },
          change: { change_type:'notice', summary: a.title || '', details: details.slice(0,4000), effective_date: new Date().toISOString(), severity:'low' } // demo auto-approve
        };
        await postToIngest(payload);
        seen.urls[a.url] = { seen_at: new Date().toISOString() };
        await saveSeen();
      } catch (e) {
        console.warn('fetch item failed', a.url, e.message);
      }
    })));
  } catch (e) {
    console.error('Source fetch failed', source.id, 'Status/Err:', e.message);
  }
}

/* Special PIB handler: tries list pages and PRID detail pages */
async function fetchPibAgriculture(source){
  console.log('Fetching PIB agriculture (special) ', source.url);
  // try RSS first
  try {
    const feed = await parser.parseURL(source.url);
    if (feed && feed.items && feed.items.length) {
      console.log('  PIB RSS items:', feed.items.length);
      const limit = pLimit(6);
      await Promise.all(feed.items.slice(0,40).map(it => limit(async () => {
        const key = it.link || it.guid || it.title;
        if (seen.urls[key]) return;
        const payload = normalizeFromRSS(it, source);
        await postToIngest(payload);
        seen.urls[key] = { seen_at: new Date().toISOString() };
        await saveSeen();
      })));
      return;
    }
  } catch (e) {
    // continue to HTML fallback below
  }

  // fallback: attempt PIB press list page(s)
  const listPages = [
    'https://pib.gov.in/PressRelese.aspx?MenuId=6',
    'https://pib.gov.in/pressreleasepage.aspx?PRID=1' // fallback - try generic
  ];
  for (const lp of listPages) {
    const rr = await safeGet(lp);
    if (!rr) continue;
    const $ = cheerio.load(rr.data);
    const anchors = [];
    $('a').each((i,el) => {
      const href = $(el).attr('href');
      const txt = $(el).text().trim();
      if (!href) return;
      if (href.includes('PressReleseDetail.aspx') || href.includes('PressRelease') || href.includes('/press-release/')) {
        const url = href.startsWith('http') ? href : new URL(href, lp).href;
        anchors.push({ url, title: txt || url });
      }
    });
    console.log('  PIB anchors found on', lp, anchors.length);
    const limit = pLimit(6);
    await Promise.all(anchors.slice(0,40).map(a => limit(async ()=>{
      if (seen.urls[a.url]) return;
      try {
        const res = await safeGet(a.url);
        if (!res) { seen.urls[a.url] = { seen_at: new Date().toISOString(), skipped:true }; await saveSeen(); return; }
        const $p = cheerio.load(res.data || '');
        const title = a.title || $p('h1').text() || $p('title').text();
        const body = $p('div#content, .press-release, .news').text().trim() || $p('body').text().trim().slice(0,4000);
        const payload = {
          scheme_name: `PIB: ${title ? title.trim().slice(0,120) : 'Press Release'}`,
          ministry: 'PIB',
          sector: 'Announcement',
          description: title || '',
          eligibility: '',
          benefits: '',
          official_portal: a.url,
          source: { source_id: source.id, source_url: a.url, fetched_at: new Date().toISOString(), raw: { excerpt: body.slice(0,2000) } },
          change: { change_type:'notice', summary: title || a.title, details: body.slice(0,4000), effective_date: new Date().toISOString(), severity: 'low' }
        };
        await postToIngest(payload);
        seen.urls[a.url] = { seen_at: new Date().toISOString() };
        await saveSeen();
      } catch (e) {
        console.warn('PIB item fetch failed', a.url, e.message);
      }
    })));
    // if we found anchors on this page, stop after processing first successful list page
    if (anchors.length) return;
  }
  console.warn('PIB fallback exhausted - no anchors processed');
}

/* Runner */
async function runAll(){
  const sources = await fs.readJson('./sources.json');
  for (const s of sources) {
    try {
      if (s.id === 'pib-agri') {
        await fetchPibAgriculture(s);
      } else if (s.type === 'rss') {
        await fetchRss(s);
      } else if (s.type === 'html') {
        await fetchHtmlList(s);
      } else {
        console.log('Unknown source type', s.type);
      }
    } catch (e) {
      console.error('Source run failed', s.id, e.message);
    }
  }
  console.log('All done');
}

runAll().catch(e => { console.error('Fatal connectors error', e.message); process.exit(1); });
