/**
 * SQLite connection + schema initialization.
 *
 * Uses better-sqlite3 (synchronous, fast, no callbacks).
 * The DB file path is configurable via DB_PATH so we can mount a
 * persistent volume in production (e.g. Railway volume at /data).
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'carriers.db');

// Ensure parent directory exists — better-sqlite3 will not create it for us.
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// WAL gives better concurrent-read behavior and crash safety.
// Foreign keys must be enabled per-connection in SQLite.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS carriers (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT NOT NULL,
      mc_number         TEXT,
      dot_number        TEXT,
      equipment_type    TEXT CHECK (equipment_type IN ('Enclosed','Open','Flatbed','Hotshot','Other')),
      price_per_mile    REAL,
      status            TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Watch','Blocked')),
      insurance_expiry  TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      carrier_id  INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      role        TEXT,
      phone       TEXT,
      email       TEXT
    );

    CREATE TABLE IF NOT EXISTS lanes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      carrier_id   INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      origin       TEXT NOT NULL,
      destination  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loads (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      carrier_id   INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      load_number  TEXT,
      date         TEXT,
      origin       TEXT,
      destination  TEXT,
      outcome      TEXT CHECK (outcome IN ('Completed','TONU','Issue')),
      notes        TEXT
    );

    CREATE TABLE IF NOT EXISTS carrier_notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      carrier_id  INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      note        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_carrier_id      ON contacts(carrier_id);
    CREATE INDEX IF NOT EXISTS idx_lanes_carrier_id         ON lanes(carrier_id);
    CREATE INDEX IF NOT EXISTS idx_loads_carrier_id         ON loads(carrier_id);
    CREATE INDEX IF NOT EXISTS idx_carrier_notes_carrier_id ON carrier_notes(carrier_id);
    CREATE INDEX IF NOT EXISTS idx_carriers_status          ON carriers(status);
    CREATE INDEX IF NOT EXISTS idx_carriers_equipment_type  ON carriers(equipment_type);
  `);
}

initDb();

console.log(`[db] SQLite ready at ${DB_PATH}`);

module.exports = db;
