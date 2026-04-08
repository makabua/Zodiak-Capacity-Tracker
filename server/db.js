const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'submissions.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    carrier_name      TEXT NOT NULL,
    company_name      TEXT NOT NULL,
    trucks_available  INTEGER NOT NULL,
    truck_type        TEXT NOT NULL CHECK(truck_type IN ('open', 'enclosed')),
    city              TEXT NOT NULL,
    state             TEXT NOT NULL,
    available_from    TEXT NOT NULL,
    notes             TEXT DEFAULT '',
    status            TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'archived')),
    created_at        TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
