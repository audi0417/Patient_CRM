#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * 資料庫遷移工具，支援 up/down 遷移
 *
 * 使用方式：
 *   node server/database/migrate.js up     # 執行所有待執行的遷移
 *   node server/database/migrate.js down   # 回滾最後一次遷移
 *   node server/database/migrate.js status # 顯示遷移狀態
 *   node server/database/migrate.js create <name> # 創建新的遷移檔案
 */

const fs = require('fs');
const path = require('path');
const { dbAdapter } = require('./db');
const { quoteIdentifier } = require('./sqlHelpers');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * 確保遷移表存在
 */
async function ensureMigrationsTable() {
  try {
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(MIGRATIONS_TABLE)} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Migrations] Migrations table ready');
  } catch (error) {
    console.error('[Migrations] Failed to create migrations table:', error);
    throw error;
  }
}

/**
 * 獲取已執行的遷移列表
 */
async function getExecutedMigrations() {
  try {
    const result = await dbAdapter.query(`
      SELECT name FROM ${quoteIdentifier(MIGRATIONS_TABLE)} ORDER BY id ASC
    `);
    return result.map(row => row.name);
  } catch (error) {
    console.error('[Migrations] Failed to get executed migrations:', error);
    return [];
  }
}

/**
 * 獲取所有遷移檔案
 */
function getAllMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn('[Migrations] Migrations directory does not exist');
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.js'))
    .sort();
}

/**
 * 獲取待執行的遷移
 */
async function getPendingMigrations() {
  const allMigrations = getAllMigrationFiles();
  const executedMigrations = await getExecutedMigrations();

  return allMigrations.filter(migration => !executedMigrations.includes(migration));
}

/**
 * 執行單個遷移（up）
 */
async function executeMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);

  console.log(`[Migrations] Executing: ${filename}`);

  try {
    const migration = require(filepath);

    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${filename} does not export an 'up' function`);
    }

    // 執行遷移
    await migration.up(dbAdapter);

    // 記錄到遷移表
    await dbAdapter.execute(`
      INSERT INTO ${quoteIdentifier(MIGRATIONS_TABLE)} (name) VALUES (?)
    `, [filename]);

    console.log(`[Migrations] ✓ ${filename} executed successfully`);
  } catch (error) {
    console.error(`[Migrations] ✗ ${filename} failed:`, error.message);
    throw error;
  }
}

/**
 * 回滾單個遷移（down）
 */
async function rollbackMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);

  console.log(`[Migrations] Rolling back: ${filename}`);

  try {
    const migration = require(filepath);

    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${filename} does not export a 'down' function`);
    }

    // 執行回滾
    await migration.down(dbAdapter);

    // 從遷移表移除記錄
    await dbAdapter.execute(`
      DELETE FROM ${quoteIdentifier(MIGRATIONS_TABLE)} WHERE name = ?
    `, [filename]);

    console.log(`[Migrations] ✓ ${filename} rolled back successfully`);
  } catch (error) {
    console.error(`[Migrations] ✗ ${filename} rollback failed:`, error.message);
    throw error;
  }
}

/**
 * 執行所有待執行的遷移
 */
async function migrateUp() {
  console.log('[Migrations] Running migrations...\n');

  await ensureMigrationsTable();
  const pending = await getPendingMigrations();

  if (pending.length === 0) {
    console.log('[Migrations] No pending migrations');
    return;
  }

  console.log(`[Migrations] Found ${pending.length} pending migration(s):\n`);
  pending.forEach(m => console.log(`  - ${m}`));
  console.log('');

  for (const migration of pending) {
    await executeMigration(migration);
  }

  console.log('\n[Migrations] ✅ All migrations completed');
}

/**
 * 回滾最後一次遷移
 */
async function migrateDown() {
  console.log('[Migrations] Rolling back last migration...\n');

  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();

  if (executed.length === 0) {
    console.log('[Migrations] No migrations to roll back');
    return;
  }

  const lastMigration = executed[executed.length - 1];
  await rollbackMigration(lastMigration);

  console.log('\n[Migrations] ✅ Rollback completed');
}

/**
 * 顯示遷移狀態
 */
async function showStatus() {
  console.log('[Migrations] Migration Status\n');
  console.log('='.repeat(60));

  await ensureMigrationsTable();

  const allMigrations = getAllMigrationFiles();
  const executedMigrations = await getExecutedMigrations();

  if (allMigrations.length === 0) {
    console.log('No migration files found');
    return;
  }

  console.log(`Total migrations: ${allMigrations.length}`);
  console.log(`Executed: ${executedMigrations.length}`);
  console.log(`Pending: ${allMigrations.length - executedMigrations.length}`);
  console.log('');

  allMigrations.forEach(migration => {
    const isExecuted = executedMigrations.includes(migration);
    const status = isExecuted ? '✓' : '○';
    const label = isExecuted ? 'executed' : 'pending';
    console.log(`${status} ${migration} (${label})`);
  });

  console.log('='.repeat(60));
}

/**
 * 創建新的遷移檔案
 */
function createMigration(name) {
  if (!name) {
    console.error('Error: Migration name is required');
    console.log('Usage: node server/database/migrate.js create <name>');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const filename = `${timestamp}-${name}.js`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  // 確保目錄存在
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

/**
 * Run the migration
 * @param {Object} db - Database adapter
 */
exports.up = async (db) => {
  // Add your migration logic here
  // Example:
  // await db.execute(\`
  //   ALTER TABLE users ADD COLUMN new_field VARCHAR(255)
  // \`);

  console.log('[Migration] ${name}: up completed');
};

/**
 * Reverse the migration
 * @param {Object} db - Database adapter
 */
exports.down = async (db) => {
  // Add your rollback logic here
  // Example:
  // await db.execute(\`
  //   ALTER TABLE users DROP COLUMN new_field
  // \`);

  console.log('[Migration] ${name}: down completed');
};
`;

  fs.writeFileSync(filepath, template);
  console.log(`[Migrations] Created migration: ${filename}`);
  console.log(`[Migrations] Path: ${filepath}`);
}

/**
 * 主函數
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'up':
        await migrateUp();
        break;

      case 'down':
        await migrateDown();
        break;

      case 'status':
        await showStatus();
        break;

      case 'create':
        createMigration(arg);
        break;

      default:
        console.log('Database Migration Tool');
        console.log('');
        console.log('Usage:');
        console.log('  node server/database/migrate.js up          # Run pending migrations');
        console.log('  node server/database/migrate.js down        # Rollback last migration');
        console.log('  node server/database/migrate.js status      # Show migration status');
        console.log('  node server/database/migrate.js create <name>  # Create new migration');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n[Migrations] Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 執行主函數
if (require.main === module) {
  main();
}

module.exports = {
  migrateUp,
  migrateDown,
  showStatus,
  createMigration
};
