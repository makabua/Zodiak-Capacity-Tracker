const express = require('express');
const nodemailer = require('nodemailer');
const pool = require('../db');
const auth = require('../middleware/auth');
const { getCoordinates } = require('../geocode');

const router = express.Router();

function buildTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// ── Public: submit capacity ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { carrier_name, company_name, phone, email, trucks_available, truck_type, city, state, available_from, rate_per_mile, notes, drivers } = req.body;

  if (!carrier_name || !company_name || !phone || !email || !trucks_available || !city || !state || !available_from) {
    return res.status(400).json({ error: 'All required fields must be filled out.' });
  }

  // Validate drivers array
  const driverList = Array.isArray(drivers) ? drivers : [];
  for (let i = 0; i < driverList.length; i++) {
    const d = driverList[i];
    if (!d.name || !d.name.trim()) {
      return res.status(400).json({ error: `Driver ${i + 1}: Name is required.` });
    }
    if (!Array.isArray(d.states) || d.states.length === 0) {
      return res.status(400).json({ error: `Driver ${i + 1} (${d.name}): At least one operating state is required.` });
    }
    if (d.truck_type && !['open', 'enclosed'].includes(d.truck_type)) {
      return res.status(400).json({ error: `Driver ${i + 1} (${d.name}): Invalid truck type.` });
    }
  }

  // Determine overall truck_type from first driver or fallback
  const effectiveTruckType = driverList.length > 0 ? driverList[0].truck_type || 'open' : (truck_type || 'open');

  try {
    const rate = rate_per_mile ? parseFloat(rate_per_mile) : null;
    const sanitizedDrivers = driverList.map((d) => ({
      name: d.name.trim(),
      truck_type: d.truck_type || 'open',
      states: d.states,
      rate_per_mile: d.rate_per_mile ? parseFloat(d.rate_per_mile) : null,
    }));

    const { rows } = await pool.query(
      `INSERT INTO submissions (carrier_name, company_name, phone, email, trucks_available, truck_type, city, state, available_from, rate_per_mile, notes, drivers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [carrier_name, company_name, phone || '', email || '', parseInt(trucks_available, 10), effectiveTruckType, city, state, available_from, rate, notes || '', JSON.stringify(sanitizedDrivers)]
    );

    // Geocode in background — don't block the response
    getCoordinates(city, state).then((coords) => {
      if (coords) {
        pool.query('UPDATE submissions SET latitude = $1, longitude = $2 WHERE id = $3',
          [coords.lat, coords.lng, rows[0].id]).catch(() => {});
      }
    }).catch(() => {});

    // Email notification (best-effort)
    const transporter = buildTransporter();
    if (transporter) {
      const driverRows = sanitizedDrivers.map((d, i) => `
        <tr><td colspan="2" style="padding:8px 12px;font-weight:bold;background:#dbeafe;color:#1e40af">Driver ${i + 1}: ${d.name}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Truck Type</td><td style="padding:6px 12px">${d.truck_type}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Operating States</td><td style="padding:6px 12px">${d.states.join(', ')}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Preferred Rate</td><td style="padding:6px 12px">${d.rate_per_mile ? `$${d.rate_per_mile}/mile` : '—'}</td></tr>
      `).join('');

      transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: 'jd@zodiaktls.com',
        subject: `New Capacity — ${company_name} (${trucks_available} truck${trucks_available > 1 ? 's' : ''}, ${sanitizedDrivers.length} driver${sanitizedDrivers.length > 1 ? 's' : ''})`,
        html: `
          <div style="font-family:sans-serif;max-width:560px">
            <h2 style="color:#1d4ed8">New Capacity Submission</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Carrier Name</td><td style="padding:6px 12px">${carrier_name}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Company</td><td style="padding:6px 12px">${company_name}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Phone</td><td style="padding:6px 12px">${phone || '—'}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Email</td><td style="padding:6px 12px">${email || '—'}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Trucks Available</td><td style="padding:6px 12px">${trucks_available}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Home Base</td><td style="padding:6px 12px">${city}, ${state}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Available From</td><td style="padding:6px 12px">${available_from}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f1f5f9">Notes</td><td style="padding:6px 12px">${notes || '—'}</td></tr>
              ${driverRows}
            </table>
          </div>`,
      }).catch((err) => console.error('[email] failed:', err.message));
    }

    res.status(201).json({ id: rows[0].id, message: 'Submission received!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save submission.' });
  }
});

// ── Protected: list all submissions ─────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const { status, sort } = req.query;
  const orderBy = sort === 'location' ? 'ORDER BY state, city' : 'ORDER BY created_at DESC';

  try {
    let result;
    if (status && status !== 'all') {
      result = await pool.query(`SELECT * FROM submissions WHERE status = $1 ${orderBy}`, [status]);
    } else {
      result = await pool.query(`SELECT * FROM submissions ${orderBy}`);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

// ── Protected: update status ─────────────────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  if (!['new', 'contacted', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const { rowCount } = await pool.query(
      'UPDATE submissions SET status = $1 WHERE id = $2',
      [status, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// ── Protected: delete submission ─────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM submissions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete submission.' });
  }
});

// ── Protected: backfill geocoding for entries missing coordinates ────────────
router.post('/geocode-backfill', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, city, state FROM submissions WHERE latitude IS NULL OR longitude IS NULL'
    );

    let updated = 0;
    for (const row of rows) {
      const coords = await getCoordinates(row.city, row.state).catch(() => null);
      if (coords) {
        await pool.query(
          'UPDATE submissions SET latitude = $1, longitude = $2 WHERE id = $3',
          [coords.lat, coords.lng, row.id]
        );
        updated++;
      }
      // Respect Nominatim's 1 req/sec rate limit
      if (rows.indexOf(row) < rows.length - 1) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    res.json({ success: true, total: rows.length, updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Geocoding backfill failed.' });
  }
});

module.exports = router;
