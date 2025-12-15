// debug-post.js - run this to test posting from node with same libs as fetcher
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_INGEST = process.env.API_INGEST || 'http://localhost:4000/v1/ingest';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

console.log('DEBUG: will POST to', API_INGEST);
console.log('DEBUG: will send Authorization header length', (ADMIN_TOKEN||'').length);

if (!ADMIN_TOKEN) {
  console.error('ERROR: set ADMIN_TOKEN env var (admin JWT). Example: ADMIN_TOKEN=xxx node debug-post.js');
  process.exit(1);
}

axios.post(API_INGEST, { 
  scheme_name:'debug', 
  ministry:'x', 
  sector:'x', 
  description:'x', 
  official_portal:'https://x', 
  source:{
    source_id:'x', 
    source_url:'https://x', 
    fetched_at: new Date().toISOString(), 
    raw:{}
  }, 
  change:{
    change_type:'notice', 
    summary:'debug', 
    details:'d', 
    effective_date:new Date().toISOString(), 
    severity:'low'
  } 
}, { 
  headers:{ Authorization: 'Bearer ' + ADMIN_TOKEN } 
})
.then(r => console.log('POST OK', r.status, r.data))
.catch(e => {
  console.error('POST ERR', e.response ? e.response.status : e.message);
  if(e.response && e.response.data) console.error('BODY', e.response.data);
});

}

run();
