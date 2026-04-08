const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.query(`
  CREATE TABLE IF NOT EXISTS submissions (
    id            SERIAL PRIMARY KEY,
    carrier_name  TEXT NOT NULL,
    company_name  TEXT NOT NULL,
    trucks_available INTEGER NOT NULL,
    truck_type    TEXT NOT NULL,
    city          TEXT NOT NULL,
    state         TEXT NOT NULL,
    available_from TEXT NOT NULL,
    notes         TEXT DEFAULT '',
    status        TEXT DEFAULT 'new',
    created_at    TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() => {
  console.log('Database ready.');
}).catch((err) => {
  console.error('DB init error:', err);
  process.exit(1);
});

module.exports = pool;
