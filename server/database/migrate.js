/**
 * Database Migration Runner with Migration Tracking
 *
 * Execute database migration scripts with proper tracking to prevent re-running
 *
 * Usage:
 * node server/database/migrate.js up     # Run migration
 * node server/database/migrate.js down   # Rollback migration
 */

const path = require('path');
const fs = require('fs');
const { dbAdapter } = require('./db');

// Get migration direction
const direction = process.argv[2] || 'up';

if (!['up', 'down'].includes(direction)) {
  console.error('[Migration] Error: specify "up" or "down"');
  console.log('Usage: node migrate.js up|down');
  process.exit(1);
}

/**
 * Create migrations tracking table if not exists
 */
async function ensureMigrationsTable() {
  const dbType = (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
  const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

  const sql = isPostgres
    ? `CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    : `CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`;

  await dbAdapter.execute(sql);
}

/**
 * Check if migration has been executed
 */
async function isMigrationExecuted(migrationName) {
  try {
    const result = await dbAdapter.queryOne(
      'SELECT COUNT(*) as count FROM migrations WHERE name = ?',
      [migrationName]
    );
    return result && result.count > 0;
  } catch (error) {
    console.warn(`[Migration] Unable to check if ${migrationName} was executed:`, error.message);
    return false;
  }
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(migrationName) {
  await dbAdapter.execute(
    'INSERT INTO migrations (name) VALUES (?)',
    [migrationName]
  );
}

/**
 * Remove migration from executed list
 */
async function unmarkMigrationExecuted(migrationName) {
  await dbAdapter.execute(
    'DELETE FROM migrations WHERE name = ?',
    [migrationName]
  );
}

// Main execution function
async function runMigrations() {
  // Ensure migrations tracking table exists
  await ensureMigrationsTable();

  // Load migration files
  const migrationsDir = path.join(__dirname, 'migrations');

  console.log(`[Migration] Loading from: ${migrationsDir}`);

  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    if (files.length === 0) {
      console.log('[Migration] No migration files found');
      process.exit(0);
    }

    console.log(`[Migration] Found ${files.length} migration files`);
    console.log('');

    let executedCount = 0;
    let skippedCount = 0;

    // Execute migrations
    for (const file of files) {
      const migrationName = file.replace('.js', '');
      const migrationPath = path.join(migrationsDir, file);

      // Check if already executed (for 'up' direction)
      if (direction === 'up') {
        const alreadyExecuted = await isMigrationExecuted(migrationName);
        if (alreadyExecuted) {
          console.log(`[Migration] Skipping ${file} (already executed)`);
          skippedCount++;
          continue;
        }
      }

      console.log(`[Migration] Executing: ${file}`);

      const migration = require(migrationPath);

      if (typeof migration[direction] !== 'function') {
        console.error(`[Migration] File ${file} missing ${direction} function`);
        continue;
      }

      try {
        // Get database type for migration
        const dbType = (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();

        // Execute migration (supports async) with db and dbType parameters
        await migration[direction](dbAdapter, dbType);

        // Update migration tracking
        if (direction === 'up') {
          await markMigrationExecuted(migrationName);
        } else {
          await unmarkMigrationExecuted(migrationName);
        }

        console.log(`[Migration] ${file} ${direction === 'up' ? 'migration' : 'rollback'} completed`);
        executedCount++;
      } catch (error) {
        console.error(`[Migration] ${file} failed:`, error);
        throw error;
      }

      console.log('');
    }

    console.log(`[Migration] Summary: ${executedCount} executed, ${skippedCount} skipped`);
    console.log('[Migration] All migrations completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('[Migration] Failed:', error);
    process.exit(1);
  }
}

// Execute migrations
runMigrations().catch(error => {
  console.error('[Migration] Error:', error);
  process.exit(1);
});
