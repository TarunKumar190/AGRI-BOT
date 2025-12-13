// debug_connectors.js
const fs = require('fs');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const parser = new Parser();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const API_INGEST = process.env.API_INGEST || 'http://localhost:4000/v1/ingest';

async function debug() {
  console.log('DEBUG: ADMIN_TOKEN length:', ADMIN_TOKEN ? ADMIN_TOKEN.length : 0);
  console.log('DEBUG: API_INGEST:', API_INGEST);
  if (!fs.existsSync('./sources.json')) {
    console.error('ERROR: sources.json not found in current directory.');
    process.exit(1);
  }
  const sources = JSON.parse(fs.readFileSync('./sources.json','utf8'));
  console.log('Loaded', sources.length, 'sources');
  for (const s of sources) {
    try {
      console.log('\n--- Source:', s.id, s.name, s.type, s.url);
      // quick HEAD
      try {
        const head = await axios.head(s.url, { timeout: 12000, headers: { 'User-Agent': 'AgriDebug/1.0' } });
        console.log('HEAD status', head.status, 'content-type:', head.headers['content-type'] || '(none)');
      } catch (he) {
        console.log('HEAD failed:', he.message);
      }
      if (s.type === 'rss') {
        try {
          const feed = await parser.parseURL(s.url);
          console.log('  RSS title:', feed.title || '(no title)', 'items:', (feed.items||[]).length);
          (feed.items || []).slice(0,3).forEach((it, i) => console.log('    #', i+1, it.title));
        } catch (err) {
          console.error('  RSS parse error:', err.message);
        }
      } else {
        try {
          const r = await axios.get(s.url, { timeout: 15000, headers: { 'User-Agent': 'AgriDebug/1.0' } });
          console.log('  GET status', r.status, 'len', (r.data || '').length);
          const snippet = (r.data || '').slice(0,1200).replace(/\s+/g,' ').trim();
          console.log('  snippet:', snippet.slice(0,400));
        } catch (err) {
          console.error('  GET error:', err.message);
        }
      }
    } catch(e) {
      console.error('Source loop error:', e.message);
    }
  }

  // Test ingest endpoint credentials with a dry POST
  if (!ADMIN_TOKEN) {
    console.log('\nSKIP: ADMIN_TOKEN not set; cannot test ingest POST auth.');
  } else {
    console.log('\nTesting POST to ingest endpoint (auth + route check)');
    try {
      const payload = { scheme_name: 'debug-post-test', ministry: 'debug', sector: 'debug', description: 'test', official_portal: 'https://example', source: { source_id: 'debug' }, change: { change_type: 'notice', summary: 'test', severity: 'low' } };
      const res = await axios.post(API_INGEST, payload, { headers: { Authorization: 'Bearer ' + ADMIN_TOKEN, 'Content-Type': 'application/json' }, timeout: 15000 });
      console.log('POST OK', res.status, res.data && (res.data.ok ? 'ok' : JSON.stringify(res.data).slice(0,200)));
      // try to clean up if created (optional) - skip for now
    } catch (err) {
      if (err.response) {
        console.error('POST response status', err.response.status, 'body:', JSON.stringify(err.response.data).slice(0,400));
      } else {
        console.error('POST error:', err.message);
      }
    }
  }

  console.log('\nDEBUG finished');
}
debug().catch(e => { console.error('Fatal debug error', e.message); process.exit(1); });
