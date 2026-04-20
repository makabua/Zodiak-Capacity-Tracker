/**
 * Carrier notes — freeform timestamped log on each carrier record.
 *
 * GET/POST  /api/carriers/:carrierId/notes
 * DELETE    /api/notes/:id
 */

const express = require('express');
const db = require('../db');

const scoped = express.Router({ mergeParams: true });

scoped.get('/', (req, res) => {
  const carrierId = Number(req.params.carrierId);
  const rows = db.prepare(
    'SELECT * FROM carrier_notes WHERE carrier_id = ? ORDER BY created_at DESC, id DESC'
  ).all(carrierId);
  res.json(rows);
});

scoped.post('/', (req, res) => {
  const carrierId = Number(req.params.carrierId);
  const carrier = db.prepare('SELECT id FROM carriers WHERE id = ?').get(carrierId);
  if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

  const b = req.body || {};
  if (!b.note || !b.note.trim()) return res.status(400).json({ error: 'note is required' });

  const info = db.prepare(
    'INSERT INTO carrier_notes (carrier_id, note) VALUES (?, ?)'
  ).run(carrierId, b.note.trim());

  res.status(201).json(db.prepare('SELECT * FROM carrier_notes WHERE id = ?').get(info.lastInsertRowid));
});

const flat = express.Router();

flat.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM carrier_notes WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Note not found' });
  res.json({ ok: true });
});

module.exports = { scoped, flat };
