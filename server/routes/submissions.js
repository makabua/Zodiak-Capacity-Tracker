const express = require('express');
const nodemailer = require('nodemailer');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

function buildTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── Public: submit capacity ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { carrier_name, company_name, trucks_available, truck_type, city, state, available_from, notes } = req.body;

  if (!carrier_name || !company_name || !trucks_available || !truck_type || !city || !state || !available_from) {
    return res.status(400).json({ error: 'All required fields must be filled out.' });
  }
  if (!['open', 'enclosed'].includes(truck_type)) {
    return res.status(400).json({ error: 'Invalid truck type.' });
  }
  if (parseInt(trucks_available, 10) < 1) {
    return res.status(400).json({ error: 'Trucks available must be at least 1.' });
  }

  const result = db
    .prepare(
      `INSERT INTO submissions (carrier_name, company_name, trucks_available, truck_type, city, state, available_from, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(carrier_name, company_name, parseInt(trucks_available, 10), truck_type, city, state, available_from, notes || '');

  // Email notification (best-effort — never fails the request)
  const transporter = buildTransporter();
  if (transporter) {
    transporter
      .sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: 'jd@zodiaktls.com',
        subject: `New Capacity — ${company_name} (${trucks_available} ${truck_type} truck${trucks_available > 1 ? 's' : ''})`,
        html: `
          <div style="font-family:sans-serif;max-width:560px">
            <h2 style="color:#1d4ed8">New Capacity Submission</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Carrier Name</td><td style="padding:6px 12px">${carrier_name}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Company</td><td style="padding:6px 12px">${company_name}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Trucks Available</td><td style="padding:6px 12px">${trucks_available}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Truck Type</td><td style="padding:6px 12px" style="text-transform:capitalize">${truck_type}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Location</td><td style="padding:6px 12px">${city}, ${state}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Available From</td><td style="padding:6px 12px">${available_from}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Notes</td><td style="padding:6px 12px">${notes || '—'}</td></tr>
            </table>
          </div>`,
      })
      .catch((err) => console.error('[email] failed to send:', err.message));
  } else {
    console.warn('[email] SMTP not configured — skipping notification');
  }

  res.status(201).json({ id: result.lastInsertRowid, message: 'Submission received!' });
});

// ── Protected: list all submissions ─────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const { status, sort } = req.query;
  let query = 'SELECT * FROM submissions';
  const params = [];

  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += sort === 'location' ? ' ORDER BY state, city' : ' ORDER BY created_at DESC';

  res.json(db.prepare(query).all(...params));
});

// ── Protected: update status ─────────────────────────────────────────────────
router.patch('/:id/status', auth, (req, res) => {
  const { status } = req.body;
  if (!['new', 'contacted', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const info = db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ── Protected: delete submission ─────────────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM submissions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
