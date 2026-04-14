/**
 * Loads routes — historical loads the carrier has hauled.
 *
 * GET/POST       /api/carriers/:carrierId/loads
 * PUT/DELETE     /api/loads/:id
 */

const express = require('express');
const db = require('../db');

const OUTCOMES = ['Completed', 'TONU', 'Issue'];

const scoped = express.Router({ mergeParams: true });

scoped.get('/', (req, res) => {
  const carrierId = Number(req.params.carrierId);
  const rows = db.prepare(
    'SELECT * FROM loads WHERE carrier_id = ? ORDER BY date DESC, id DESC'
  ).all(carrierId);
  res.json(rows);
});

scoped.post('/', (req, res) => {
  const carrierId = Number(req.params.carrierId);
  const carrier = db.prepare('SELECT id FROM carriers WHERE id = ?').get(carrierId);
  if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

  const b = req.body || {};
  if (b.outcome && !OUTCOMES.includes(b.outcome)) {
    return res.status(400).json({ error: `outcome must be one of ${OUTCOMES.join(', ')}` });
  }

  const info = db.prepare(`
    INSERT INTO loads (carrier_id, load_number, date, origin, destination, outcome, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    carrierId,
    b.load_number || null,
    b.date || null,
    b.origin || null,
    b.destination || null,
    b.outcome || null,
    b.notes || null,
  );

  res.status(201).json(db.prepare('SELECT * FROM loads WHERE id = ?').get(info.lastInsertRowid));
});

const flat = express.Router();

flat.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM loads WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Load not found' });

  const b = req.body || {};
  if (b.outcome && !OUTCOMES.includes(b.outcome)) {
    return res.status(400).json({ error: `outcome must be one of ${OUTCOMES.join(', ')}` });
  }

  db.prepare(`
    UPDATE loads SET
      load_number = ?,
      date = ?,
      origin = ?,
      destination = ?,
      outcome = ?,
      notes = ?
    WHERE id = ?
  `).run(
    b.load_number || null,
    b.date || null,
    b.origin || null,
    b.destination || null,
    b.outcome || null,
    b.notes || null,
    id,
  );

  res.json(db.prepare('SELECT * FROM loads WHERE id = ?').get(id));
});

flat.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM loads WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Load not found' });
  res.json({ ok: true });
});

module.exports = { scoped, flat };
