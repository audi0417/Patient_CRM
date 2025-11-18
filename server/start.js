/**
 * Production Startup Script
 *
 * Ensures correct initialization order:
 * 1. Initialize database schema (includes all tables)
 * 2. Start server
 */

const { initialize } = require('./database/db');

async function start() {
  try {
    console.log('[Startup] Initializing database...');
    await initialize();

    console.log('[Startup] Starting server...');
    require('./index.js');

  } catch (error) {
    console.error('[Startup] Failed:', error);
    process.exit(1);
  }
}

start();
