/**
 * Database Migration Runner
 *
 * Execute database migration scripts
 *
 * Usage:
 * node server/database/migrate.js up     # Run migration
 * node server/database/migrate.js down   # Rollback migration
 */

const path = require('path');
const fs = require('fs');

// Get migration direction
const direction = process.argv[2] || 'up';

if (!['up', 'down'].includes(direction)) {
  console.error('[Migration] Error: specify "up" or "down"');
  console.log('Usage: node migrate.js up|down');
  process.exit(1);
}

// Main execution function
async function runMigrations() {
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

    // Execute migrations
    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      console.log(`[Migration] Executing: ${file}`);

      const migration = require(migrationPath);

      if (typeof migration[direction] !== 'function') {
        console.error(`[Migration] File ${file} missing ${direction} function`);
        continue;
      }

      // Execute migration (supports async)
      await migration[direction]();
      console.log(`[Migration] ${file} ${direction === 'up' ? 'migration' : 'rollback'} completed`);
      console.log('');
    }

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
