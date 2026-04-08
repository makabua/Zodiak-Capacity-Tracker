require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

if (isProd) {
  const distPath = path.join(__dirname, '../client/dist');
  const indexPath = path.join(distPath, 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.error(`ERROR: Frontend not found at ${indexPath} — did the build run?`);
  } else {
    console.log(`Serving frontend from ${distPath}`);
  }

  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send('Frontend not built. Check Railway build logs.');
    }
  });
}

app.listen(PORT, () => {
  console.log(`Zodiak Capacity Tracker running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});
