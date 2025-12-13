// server.js (CommonJS) - patched for hackathon:
// - auto-approve low severity
// - keep medium/high in admin review queue
// - admin endpoints: list pending, approve, reject
// - logs requests and auth header to help debug

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_demo';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_quick';
const PORT = process.env.PORT || 4000;

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  // request logger
  app.use((req, res, next) => {
    console.log('[REQ]', new Date().toISOString(), req.method, req.originalUrl);
    next();
  });

  // Schemas (flexible)
  const Schema = mongoose.Schema;
  const SchemeSchema = new Schema({
    scheme_id: String, scheme_name: String, ministry: String, sector: String,
    description: String, eligibility: String, benefits: String, official_portal: String, sources: Array
  }, { timestamps: true });
  const UpdateSchema = new Schema({
    scheme_id: String, change_type: String, summary: String, details: String,
    effective_date: Date, severity: String, source: Object,
    approved: { type: Boolean, default: false },
    reviewed_by: String, reviewed_at: Date, rejected: Boolean, rejection_reason: String
  }, { timestamps: true });

  const Scheme = mongoose.model('Scheme', SchemeSchema);
  const Update = mongoose.model('Update', UpdateSchema);

  // health
  app.get('/v1/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

  // public endpoints
// server.js (express) pseudo
app.get('/v1/schemes', async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status) filter.status = status; // 'ongoing'|'upcoming'|'archived'
  if (q) filter.$text = { $search: q }; // or use scheme_name regex
  const schemes = await db.collection('schemes').find(filter).sort({ updatedAt: -1 }).limit(200).toArray();
  return res.json({ ok: true, results: schemes });
});

  app.get('/v1/schemes/:id', async (req, res) => {
    const s = await Scheme.findById(req.params.id).lean();
    res.json(s || null);
  });

  // public approved updates
  app.get('/v1/updates', async (req, res) => {
    const results = await Update.find({ approved: true }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ total: results.length, results });
  });

  // simple auth middleware
  function requireAuth(req, res, next) {
    if (process.env.IGNORE_AUTH === '1') { req.user = { role: 'dev', user: 'dev' }; return next(); }
    const header = req.headers.authorization || '';
    console.log('AUTH HEADER:', header);
    if (!header) return res.status(401).json({ error: 'missing auth' });
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      next();
    } catch (e) {
      console.error('JWT verify error:', e.message);
      return res.status(403).json({ error: 'invalid token', message: e.message });
    }
  }

  // ingest endpoint (protected)
  app.post('/v1/ingest', requireAuth, async (req, res) => {
    try {
      const p = req.body;
      if (!p || !p.scheme_name) return res.status(400).json({ error: 'invalid payload' });

      // upsert scheme by scheme_id or name
      const schemeId = p.scheme_id || (p.scheme_name || '').toLowerCase().replace(/\s+/g, '-');
      let scheme = await Scheme.findOne({ scheme_id: schemeId });
      if (!scheme) {
        scheme = new Scheme({
          scheme_id: schemeId,
          scheme_name: p.scheme_name,
          ministry: p.ministry || '',
          sector: p.sector || '',
          description: p.description || '',
          eligibility: p.eligibility || '',
          benefits: p.benefits || '',
          official_portal: p.official_portal || '',
          sources: p.source ? [p.source] : []
        });
        await scheme.save();
      } else {
        // update some fields if provided
        scheme.description = p.description || scheme.description;
        scheme.eligibility = p.eligibility || scheme.eligibility;
        scheme.benefits = p.benefits || scheme.benefits;
        scheme.sources = (scheme.sources || []).concat(p.source || {});
        scheme.last_fetched_at = new Date();
        await scheme.save();
      }

      // create update (diff logic can be extended later)
      const upd = new Update({
        scheme_id: scheme.scheme_id,
        change_type: (p.change && p.change.change_type) || 'notice',
        summary: (p.change && p.change.summary) || p.scheme_name,
        details: (p.change && p.change.details) || '',
        effective_date: (p.change && p.change.effective_date) || null,
        severity: (p.change && p.change.severity) || 'medium',
        source: p.source || {}
      });

      // AUTO-APPROVE rule for hackathon/demo:
      // auto-approve 'low' severity so your front-end has visible content.
      // keep medium/high as unapproved so admins can review.
      if (upd.severity === 'low') {
        upd.approved = true;
        upd.reviewed_by = 'auto';
        upd.reviewed_at = new Date();
      } else {
        upd.approved = false;
        console.log('Queued for review: updateId=', upd._id, 'severity=', upd.severity);
      }

      await upd.save();

      // response
      res.json({
        ok: true,
        scheme: { id: scheme._id, scheme_name: scheme.scheme_name, scheme_id: scheme.scheme_id },
        update: { id: upd._id, approved: upd.approved, severity: upd.severity }
      });
    } catch (e) {
      console.error('Ingest error', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // ADMIN: list pending updates
  app.get('/v1/admin/updates', requireAuth, async (req, res) => {
    const updates = await Update.find({ approved: false, rejected: { $ne: true } }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ total: updates.length, results: updates });
  });

  // ADMIN: approve
  app.post('/v1/approve/:id', requireAuth, async (req, res) => {
    const id = req.params.id;
    const u = await Update.findById(id);
    if (!u) return res.status(404).json({ error: 'update not found' });
    u.approved = true;
    u.rejected = false;
    u.reviewed_by = req.user?.user || 'admin';
    u.reviewed_at = new Date();
    await u.save();
    res.json({ ok: true, update: u });
  });

  // ADMIN: reject
  app.post('/v1/reject/:id', requireAuth, async (req, res) => {
    const id = req.params.id;
    const u = await Update.findById(id);
    if (!u) return res.status(404).json({ error: 'update not found' });
    u.approved = false;
    u.rejected = true;
    u.rejection_reason = req.body.reason || 'rejected by admin';
    u.reviewed_by = req.user?.user || 'admin';
    u.reviewed_at = new Date();
    await u.save();
    res.json({ ok: true, update: u });
  });
// chatbot helper: search schemes and attach latest updates
app.get('/v1/chatbot', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'missing q query parameter' });

    // naive match: scheme name or description match
    const schemes = await Scheme.find({ $or: [{ scheme_name: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }] }).limit(6).lean();

    // fallback: if no scheme found, show top updates that mention the query
    let results = [];
    if (schemes.length) {
      for (const s of schemes) {
        const updates = await Update.find({ scheme_id: s.scheme_id, approved: true }).sort({ createdAt:-1 }).limit(6).lean();
        results.push({ scheme: s, updates });
      }
    } else {
      // search updates text
      const updates = await Update.find({ approved: true, $or: [{summary: new RegExp(q,'i')}, {details: new RegExp(q,'i')}] }).sort({ createdAt:-1 }).limit(8).lean();
      results = updates.map(u => ({ update: u }));
    }

    res.json({ ok: true, query: q, results });
  } catch (e) {
    console.error('chatbot error', e);
    res.status(500).json({ error: 'internal' });
  }
});

  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Server start failed:', err);
  process.exit(1);
});
