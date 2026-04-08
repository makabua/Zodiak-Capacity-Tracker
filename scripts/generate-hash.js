#!/usr/bin/env node
/**
 * Generate a bcrypt hash for the dashboard password.
 * Usage: node scripts/generate-hash.js yourpassword
 *    or: npm run hash -- yourpassword
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/generate-hash.js <password>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nAdd this to your .env file:\n');
console.log(`DASHBOARD_PASSWORD_HASH=${hash}\n`);
