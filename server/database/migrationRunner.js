/**
 * Database Migration Runner
 *
 * Scans migration files, tracks state in `migrations` table,
 * and executes pending migrations in order.
 *
 * Supports both SQLite and PostgreSQL via the database adapter.
 */

const fs = require('fs');
const path = require('path');
const { createDatabaseAdapter } = require('./adapters');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Get a database adapter instance
 * @returns {DatabaseAdapter}
 */
function getAdapter() {
  return createDatabaseAdapter();
}

/**
 * Ensure the migrations table exists
 * @param {DatabaseAdapter} adapter
 */
async function ensureMigrationsTable(adapter) {
  const dbType = (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
  const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

  const sql = isPostgres
    ? `CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    : `CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`;

  await adapter.execute(sql);
}

/**
 * Get list of all migration files sorted by name
 * @returns {string[]} Migration filenames (without path)
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js') && !f.startsWith('.'))
    .sort();
}

/**
 * Get list of already-executed migration names
 * @param {DatabaseAdapter} adapter
 * @returns {Promise<string[]>}
 */
async function getExecutedMigrations(adapter) {
  try {
    const rows = await adapter.query('SELECT name FROM migrations ORDER BY name');
    return rows.map(r => r.name);
  } catch {
    // Table might not exist yet
    return [];
  }
}

/**
 * Get pending (not yet executed) migrations
 * @param {DatabaseAdapter} [adapter]
 * @returns {Promise<string[]>} Migration filenames
 */
async function getPendingMigrations(adapter) {
  const dbAdapter = adapter || getAdapter();
  await ensureMigrationsTable(dbAdapter);

  const allFiles = getMigrationFiles();
  const executed = await getExecutedMigrations(dbAdapter);

  return allFiles.filter(f => !executed.includes(f));
}

/**
 * Run all pending migrations (up)
 * @param {DatabaseAdapter} [adapter] - Optional adapter (will create one if not provided)
 * @returns {Promise<string[]>} List of executed migration names
 */
async function runMigrations(adapter) {
  const dbAdapter = adapter || getAdapter();
  await ensureMigrationsTable(dbAdapter);

  const pending = await getPendingMigrations(dbAdapter);

  if (pending.length === 0) {
    console.log('[Migration] No pending migrations');
    return [];
  }

  console.log(`[Migration] ${pending.length} pending migration(s) found`);
  const executed = [];

  for (const file of pending) {
    const migrationPath = path.join(MIGRATIONS_DIR, file);
    const migration = require(migrationPath);

    if (typeof migration.up !== 'function') {
      console.warn(`[Migration] Skipping ${file} - no up() function`);
      continue;
    }

    console.log(`[Migration] Running: ${file}`);

    try {
      await dbAdapter.beginTransaction();

      // Execute the migration
      await migration.up(dbAdapter);

      // Record it
      await dbAdapter.execute(
        'INSERT INTO migrations (name) VALUES (?)',
        [file]
      );

      await dbAdapter.commit();
      executed.push(file);
      console.log(`[Migration] Completed: ${file}`);
    } catch (error) {
      console.error(`[Migration] Failed: ${file} - ${error.message}`);
      try {
        await dbAdapter.rollback();
      } catch (rollbackErr) {
        console.error(`[Migration] Rollback failed: ${rollbackErr.message}`);
      }
      throw error;
    }
  }

  console.log(`[Migration] ${executed.length} migration(s) executed successfully`);
  return executed;
}

/**
 * Rollback a specific migration (down)
 * @param {string} migrationName - Filename of the migration to rollback
 * @param {DatabaseAdapter} [adapter]
 * @returns {Promise<void>}
 */
async function rollbackMigration(migrationName, adapter) {
  const dbAdapter = adapter || getAdapter();
  await ensureMigrationsTable(dbAdapter);

  const executed = await getExecutedMigrations(dbAdapter);
  if (!executed.includes(migrationName)) {
    throw new Error(`Migration '${migrationName}' has not been executed`);
  }

  const migrationPath = path.join(MIGRATIONS_DIR, migrationName);
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file '${migrationName}' not found`);
  }

  const migration = require(migrationPath);
  if (typeof migration.down !== 'function') {
    throw new Error(`Migration '${migrationName}' has no down() function`);
  }

  console.log(`[Migration] Rolling back: ${migrationName}`);

  try {
    await dbAdapter.beginTransaction();

    await migration.down(dbAdapter);

    await dbAdapter.execute(
      'DELETE FROM migrations WHERE name = ?',
      [migrationName]
    );

    await dbAdapter.commit();
    console.log(`[Migration] Rolled back: ${migrationName}`);
  } catch (error) {
    console.error(`[Migration] Rollback failed: ${migrationName} - ${error.message}`);
    try {
      await dbAdapter.rollback();
    } catch (rollbackErr) {
      console.error(`[Migration] Transaction rollback failed: ${rollbackErr.message}`);
    }
    throw error;
  }
}

/**
 * Get migration status (for CLI display)
 * @param {DatabaseAdapter} [adapter]
 * @returns {Promise<Array<{name: string, status: string, executed_at: string|null}>>}
 */
async function getMigrationStatus(adapter) {
  const dbAdapter = adapter || getAdapter();
  await ensureMigrationsTable(dbAdapter);

  const allFiles = getMigrationFiles();
  const executedRows = await dbAdapter.query('SELECT name, executed_at FROM migrations ORDER BY name');
  const executedMap = new Map(executedRows.map(r => [r.name, r.executed_at]));

  return allFiles.map(f => ({
    name: f,
    status: executedMap.has(f) ? 'executed' : 'pending',
    executed_at: executedMap.get(f) || null
  }));
}

module.exports = {
  runMigrations,
  rollbackMigration,
  getPendingMigrations,
  getMigrationStatus
};
