#!/usr/bin/env node
/**
 * Reset SQLite Database Script
 *
 * Usage:
 *   node scripts/resetSqlite.js
 *
 * Environment variables:
 *   DATABASE_PATH - Database file path (default: data/patient_crm.db)
 */

const fs = require('fs');
const path = require('path');

const dbFile = process.env.DATABASE_PATH || path.join(__dirname, '../data/patient_crm.db');

console.log('[Reset] Resetting SQLite database...');
console.log('[Reset] Target file:', dbFile);

try {
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
    console.log('[Reset] Old database file deleted');
  } else {
    console.log('[Reset] Database file does not exist, skipping delete');
  }
} catch (err) {
  console.error('[Reset] Error deleting database file:', err.message);
  process.exit(1);
}

// Reinitialize
console.log('[Reset] Reinitializing database schema and indexes...');
const { initialize } = require('../server/database/db');
initialize()
  .then(() => {
    console.log('[Reset] Reset complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('[Reset] Reset failed:', err);
    process.exit(1);
  });
