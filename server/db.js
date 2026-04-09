const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
const isPrivateNetwork = dbUrl.includes('.railway.internal');

const poolConfig = {
  connectionString: dbUrl,
  connectionTimeoutMillis: 10000,
};

// Railway private network doesn't use SSL — explicitly disable to prevent
// the pg driver from attempting an SSL handshake that hangs and times out
if (isPrivateNetwork) {
  poolConfig.ssl = false;
} else if (!dbUrl.includes('sslmode=disable')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

console.log(`DB config: private_network=${isPrivateNetwork}, ssl=${JSON.stringify(poolConfig.ssl)}, timeout=${poolConfig.connectionTimeoutMillis}ms`);

const pool = new Pool(poolConfig);

async function initDb(retries = 10, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS submissions (
          id            SERIAL PRIMARY KEY,
          carrier_name  TEXT NOT NULL,
          company_name  TEXT NOT NULL,
          phone         TEXT DEFAULT '',
          email         TEXT DEFAULT '',
          trucks_available INTEGER NOT NULL,
          truck_type    TEXT NOT NULL,
          city          TEXT NOT NULL,
          state         TEXT NOT NULL,
          available_from TEXT NOT NULL,
          notes         TEXT DEFAULT '',
          status        TEXT DEFAULT 'new',
          latitude      DOUBLE PRECISION,
          longitude     DOUBLE PRECISION,
          created_at    TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Add columns if they don't exist (for existing databases)
      await pool.query("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''").catch(() => {});
      await pool.query("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS email TEXT DEFAULT ''").catch(() => {});
      await pool.query('ALTER TABLE submissions ADD COLUMN IF NOT EXISTS rate_per_mile NUMERIC(10,2)').catch(() => {});
      await pool.query('ALTER TABLE submissions ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION').catch(() => {});
      await pool.query('ALTER TABLE submissions ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION').catch(() => {});

      console.log(`Database ready (connected on attempt ${attempt}).`);
      return;
    } catch (err) {
      console.error(`DB init attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, 15000);
      }
    }
  }
  console.error('Could not connect to database after all retries. Server will continue — DB queries will fail until connection recovers.');
}

initDb();

module.exports = pool;
