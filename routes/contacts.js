/**
 * Contacts routes.
 *
 * Mounted both under /api/carriers/:id/contacts (list + create — scoped to a carrier)
 * and under /api/contacts/:id (update + delete — addressable directly by contact id).
 */

const express = require('express');
const db = require('../db');

// Router scoped under /api/carriers/:carrierId/contacts
const scoped = express.Router({ mergeParams: true });

scoped.get('/', (req, res) => {
  const carrierId = Number(req.params.carrierId);
  const rows = db.prepare('SELECT * FROM contacts WHERE carrier_id = ? ORDER BY id ASC').all(carrierId);
  res.json(rows);
});

scoped.post('/', (req, res) => {
  const carrierId = Number(req.params.carrierId);
  const carrier = db.prepare('SELECT id FROM carriers WHERE id = ?').get(carrierId);
  if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

  const b = req.body || {};
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: 'name is required' });

  const info = db.prepare(`
    INSERT INTO contacts (carrier_id, name, role, phone, email)
    VALUES (?, ?, ?, ?, ?)
  `).run(carrierId, b.name.trim(), b.role || null, b.phone || null, b.email || null);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(contact);
});

// Router for direct contact access: /api/contacts/:id
const flat = express.Router();

flat.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const b = req.body || {};
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: 'name is required' });

  db.prepare(`
    UPDATE contacts SET name = ?, role = ?, phone = ?, email = ? WHERE id = ?
  `).run(b.name.trim(), b.role || null, b.phone || null, b.email || null, id);

  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id));
});

flat.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Contact not found' });
  res.json({ ok: true });
});

module.exports = { scoped, flat };
