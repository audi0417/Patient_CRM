/**
 * Production Startup Script
 * 
 * Ensures correct initialization order:
 * 1. Initialize database schema (if needed)
 * 2. Run migrations
 * 3. Start server
 */

const { initialize } = require('./database/db');
const { spawn } = require('child_process');
const path = require('path');

async function start() {
  try {
    console.log('[Startup] Initializing database...');
    await initialize();
    
    console.log('[Startup] Running migrations...');
    const migrateProcess = spawn('node', [path.join(__dirname, 'database', 'migrate.js'), 'up'], {
      stdio: 'inherit',
      env: process.env
    });
    
    await new Promise((resolve, reject) => {
      migrateProcess.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Migration failed with code ${code}`));
        }
      });
      migrateProcess.on('error', reject);
    });
    
    console.log('[Startup] Starting server...');
    require('./index.js');
    
  } catch (error) {
    console.error('[Startup] Failed:', error);
    process.exit(1);
  }
}

start();
