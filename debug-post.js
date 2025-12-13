// debug-post.js - run this to test posting from node with same libs as fetcher
const axios = require('axios');
const API_INGEST = process.env.API_INGEST || 'http://localhost:4000/v1/ingest';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
console.log('DEBUG: will POST to', API_INGEST);
console.log('DEBUG: will send Authorization header length', (ADMIN_TOKEN||'').length);
axios.post(API_INGEST, { scheme_name:'debug', ministry:'x', sector:'x', description:'x', official_portal:'https://x', source:{source_id:'x', source_url:'https://x', fetched_at: new Date().toISOString(), raw:{}}, change:{change_type:'notice', summary:'debug', details:'d', effective_date:new Date().toISOString(), severity:'low'} }, { headers:{ Authorization: 'Bearer ' + ADMIN_TOKEN } })
.then(r => console.log('POST OK', r.status, r.data))
.catch(e => {
  console.error('POST ERR', e.response ? e.response.status : e.message);
  if(e.response && e.response.data) console.error('BODY', e.response.data);
});
// fetcher-mini.js (CommonJS)
const Parser = require('rss-parser');

const parser = new Parser();

if (!ADMIN_TOKEN) {
  console.error('ERROR: set ADMIN_TOKEN env var (admin JWT). Example: ADMIN_TOKEN=xxx node fetcher-mini.js');
  process.exit(1);
}

async function run() {
  console.log('Starting fetcher-mini...');
  const feedUrl = 'https://www.pib.gov.in/PressReleaseRSS.aspx?SectionId=6';
  try {
    const feed = await parser.parseURL(feedUrl);
    console.log('Feed title:', feed.title, 'items:', feed.items.length);
    for (const item of feed.items.slice(0, 5)) {
      console.log('Posting item:', item.title);
      const payload = {
        scheme_name: item.title,
        ministry: 'PIB',
        sector: 'Announcement',
        description: item.contentSnippet || item.content || '',
        official_portal: item.link,
        source: { source_id: 'pib', source_url: item.link, fetched_at: new Date().toISOString(), raw: item },
        change: { change_type: 'notice', summary: item.title, details: item.content || '', effective_date: item.pubDate, severity: 'medium' }
      };
      try {
        const res = await axios.post(API_INGEST, payload, { headers: { Authorization: 'Bearer ' + ADMIN_TOKEN } });
        console.log('Ingest response:', res.status, res.data && res.data.ok);
      } catch (err) {
        console.error('Ingest POST failed:', err.response ? err.response.status : err.message, err.response && err.response.data);
      }
    }
    console.log('Fetcher finished.');
  } catch (e) {
    console.error('Failed to fetch RSS:', e.message || e);
  }
}

run();
