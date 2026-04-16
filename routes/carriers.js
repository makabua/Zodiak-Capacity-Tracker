/**
 * /api/carriers — carriers CRUD + list search/filter.
 *
 * GET    /api/carriers            List (supports ?q=, ?status=, ?equipment=)
 * POST   /api/carriers            Create carrier
 * GET    /api/carriers/:id        Get carrier (with nested contacts, lanes, loads, notes)
 * PUT    /api/carriers/:id        Update carrier
 * DELETE /api/carriers/:id        Delete carrier (cascades to children)
 */

const express = require('express');
const db = require('../db');

const router = express.Router();

const EQUIPMENT_TYPES = ['Enclosed', 'Open', 'Flatbed', 'Hotshot', 'Other'];
const STATUSES = ['Active', 'Watch', 'Blocked'];

/** Coerce empty string -> null so NULLable columns stay clean. */
function nullable(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
}

function validateCarrier(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      errors.push('name is required');
    }
  }
  if (body.equipment_type && !EQUIPMENT_TYPES.includes(body.equipment_type)) {
    errors.push(`equipment_type must be one of ${EQUIPMENT_TYPES.join(', ')}`);
  }
  if (body.status && !STATUSES.includes(body.status)) {
    errors.push(`status must be one of ${STATUSES.join(', ')}`);
  }
  if (body.price_per_mile !== undefined && body.price_per_mile !== null && body.price_per_mile !== '') {
    if (isNaN(Number(body.price_per_mile))) errors.push('price_per_mile must be a number');
  }
  return errors;
}

// GET /api/carriers — list with search & filter, includes lane_count + load_count + primary contact name
router.get('/', (req, res) => {
  const { q, status, equipment } = req.query;

  // Base query joins aggregated counts and the first contact name so the list view is single-fetch.
  let sql = `
    SELECT
      c.*,
      (SELECT COUNT(*) FROM lanes l WHERE l.carrier_id = c.id)  AS lane_count,
      (SELECT COUNT(*) FROM loads ld WHERE ld.carrier_id = c.id) AS load_count,
      (SELECT COUNT(*) FROM contacts ct WHERE ct.carrier_id = c.id) AS contact_count
    FROM carriers c
    WHERE 1=1
  `;
  const params = [];

  if (status && STATUSES.includes(status)) {
    sql += ` AND c.status = ?`;
    params.push(status);
  }
  if (equipment && EQUIPMENT_TYPES.includes(equipment)) {
    sql += ` AND c.equipment_type = ?`;
    params.push(equipment);
  }
  if (q && q.trim()) {
    // Search hits name, MC#, and any contact name on the carrier.
    sql += ` AND (
      c.name LIKE ?
      OR c.mc_number LIKE ?
      OR EXISTS (SELECT 1 FROM contacts ct WHERE ct.carrier_id = c.id AND ct.name LIKE ?)
    )`;
    const like = `%${q.trim()}%`;
    params.push(like, like, like);
  }

  sql += ` ORDER BY c.name COLLATE NOCASE ASC`;

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/carriers — create
router.post('/', (req, res) => {
  const b = req.body || {};
  const errors = validateCarrier(b);
  if (errors.length) return res.status(400).json({ errors });

  const stmt = db.prepare(`
    INSERT INTO carriers (name, mc_number, dot_number, equipment_type, price_per_mile, status, insurance_expiry)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    b.name.trim(),
    nullable(b.mc_number),
    nullable(b.dot_number),
    nullable(b.equipment_type),
    b.price_per_mile === '' || b.price_per_mile == null ? null : Number(b.price_per_mile),
    b.status || 'Active',
    nullable(b.insurance_expiry),
  );
  const carrier = db.prepare('SELECT * FROM carriers WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(carrier);
});

// GET /api/carriers/:id — full detail with nested children
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const carrier = db.prepare('SELECT * FROM carriers WHERE id = ?').get(id);
  if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

  carrier.contacts = db.prepare('SELECT * FROM contacts WHERE carrier_id = ? ORDER BY id ASC').all(id);
  carrier.lanes    = db.prepare('SELECT * FROM lanes WHERE carrier_id = ? ORDER BY id ASC').all(id);
  carrier.loads    = db.prepare('SELECT * FROM loads WHERE carrier_id = ? ORDER BY date DESC, id DESC').all(id);
  carrier.notes    = db.prepare('SELECT * FROM carrier_notes WHERE carrier_id = ? ORDER BY created_at DESC, id DESC').all(id);

  res.json(carrier);
});

// PUT /api/carriers/:id — full update (all carrier fields)
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM carriers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Carrier not found' });

  const b = req.body || {};
  const errors = validateCarrier(b);
  if (errors.length) return res.status(400).json({ errors });

  db.prepare(`
    UPDATE carriers SET
      name = ?,
      mc_number = ?,
      dot_number = ?,
      equipment_type = ?,
      price_per_mile = ?,
      status = ?,
      insurance_expiry = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    b.name.trim(),
    nullable(b.mc_number),
    nullable(b.dot_number),
    nullable(b.equipment_type),
    b.price_per_mile === '' || b.price_per_mile == null ? null : Number(b.price_per_mile),
    b.status || 'Active',
    nullable(b.insurance_expiry),
    id,
  );

  const updated = db.prepare('SELECT * FROM carriers WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/carriers/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM carriers WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Carrier not found' });
  res.json({ ok: true });
});

module.exports = router;
