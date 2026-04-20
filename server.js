/**
 * Carrier Management — Express entry point.
 *
 * Wires up routes, serves the single-page frontend from /public,
 * and exposes /health for Railway (and any future load balancer).
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const carriersRouter = require('./routes/carriers');
const contactsRoutes = require('./routes/contacts');
const lanesRoutes    = require('./routes/lanes');
const loadsRoutes    = require('./routes/loads');
const notesRoutes    = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check — kept minimal and dependency-free so probes stay cheap.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'carrier-management', time: new Date().toISOString() });
});

// --- API ---
app.use('/api/carriers', carriersRouter);

// Nested (carrier-scoped) children
app.use('/api/carriers/:carrierId/contacts', contactsRoutes.scoped);
app.use('/api/carriers/:carrierId/lanes',    lanesRoutes.scoped);
app.use('/api/carriers/:carrierId/loads',    loadsRoutes.scoped);
app.use('/api/carriers/:carrierId/notes',    notesRoutes.scoped);

// Flat (id-addressable) child resources
app.use('/api/contacts', contactsRoutes.flat);
app.use('/api/lanes',    lanesRoutes.flat);
app.use('/api/loads',    loadsRoutes.flat);
app.use('/api/notes',    notesRoutes.flat);

// --- Static frontend (single HTML file SPA) ---
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback so deep links (e.g. #/carrier/42) still land on index.html
app.get(/^\/(?!api|health).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Error handler (last) ---
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Carrier Management listening on :${PORT}`);
});
