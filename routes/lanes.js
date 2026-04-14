/**
 * Lanes routes. Lanes are the origin->destination pairs a carrier covers.
 *
 * GET/POST /api/carriers/:carrierId/lanes
 * DELETE   /api/lanes/:id
 */

const express = require('express');
const db = require('../db');

const scoped = express.Router({ mergeParams: true });

scoped.get('/', (req, res) => {
  const carrierId = Number(req.params.carrierId);
  const rows = db.prepare('SELECT * FROM lanes WHERE carrier_id = ? ORDER BY id ASC').all(carrierId);
  res.json(rows);
});

scoped.post('/', (req, res) => {
  const carrierId = Number(req.params.carrierId);
  const carrier = db.prepare('SELECT id FROM carriers WHERE id = ?').get(carrierId);
  if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

  const b = req.body || {};
  if (!b.origin || !b.origin.trim() || !b.destination || !b.destination.trim()) {
    return res.status(400).json({ error: 'origin and destination are required' });
  }

  const info = db.prepare(`
    INSERT INTO lanes (carrier_id, origin, destination) VALUES (?, ?, ?)
  `).run(carrierId, b.origin.trim(), b.destination.trim());

  res.status(201).json(db.prepare('SELECT * FROM lanes WHERE id = ?').get(info.lastInsertRowid));
});

const flat = express.Router();

flat.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM lanes WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Lane not found' });
  res.json({ ok: true });
});

module.exports = { scoped, flat };
