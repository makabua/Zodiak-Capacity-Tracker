require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const submissionRoutes = require('./routes/submissions');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

if (!isProd) {
  app.use(cors({ origin: 'http://localhost:5173' }));
}

app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);

// Serve built frontend in production
if (isProd) {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Zodiak Capacity Tracker running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});
