#!/usr/bin/env node

/**
 * Database Migration CLI
 *
 * Usage:
 *   node bin/migrate.js up              - Apply all pending migrations
 *   node bin/migrate.js down <name>     - Rollback a specific migration
 *   node bin/migrate.js status          - Show migration status
 *   node bin/migrate.js create <name>   - Create a new migration file
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const {
  runMigrations,
  rollbackMigration,
  getMigrationStatus
} = require('../server/database/migrationRunner');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'server', 'database', 'migrations');

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  switch (command) {
    case 'up':
      await handleUp();
      break;
    case 'down':
      await handleDown(arg);
      break;
    case 'status':
      await handleStatus();
      break;
    case 'create':
      handleCreate(arg);
      break;
    default:
      printUsage();
      process.exit(1);
  }
}

async function handleUp() {
  console.log('[Migrate] Applying pending migrations...\n');
  const executed = await runMigrations();
  if (executed.length === 0) {
    console.log('\nAll migrations are up to date.');
  } else {
    console.log(`\nApplied ${executed.length} migration(s).`);
  }
}

async function handleDown(migrationName) {
  if (!migrationName) {
    console.error('Error: Please specify the migration name to rollback');
    console.error('Usage: node bin/migrate.js down <migration-name>');
    process.exit(1);
  }
  console.log(`[Migrate] Rolling back: ${migrationName}\n`);
  await rollbackMigration(migrationName);
  console.log('\nRollback complete.');
}

async function handleStatus() {
  const status = await getMigrationStatus();
  if (status.length === 0) {
    console.log('No migration files found.');
    return;
  }

  console.log('Migration Status:\n');
  console.log('  Status     | Executed At          | Name');
  console.log('  -----------|----------------------|-----');

  for (const m of status) {
    const statusIcon = m.status === 'executed' ? 'executed ' : 'pending  ';
    const date = m.executed_at || '                    ';
    console.log(`  ${statusIcon} | ${date} | ${m.name}`);
  }

  const pending = status.filter(m => m.status === 'pending');
  console.log(`\nTotal: ${status.length} | Pending: ${pending.length}`);
}

function handleCreate(name) {
  if (!name) {
    console.error('Error: Please specify a migration name');
    console.error('Usage: node bin/migrate.js create <name>');
    process.exit(1);
  }

  // Generate timestamp prefix: YYYYMMDDHHmmss
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);

  const filename = `${timestamp}-${name}.js`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  // Ensure directory exists
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  const template = `/**
 * Migration: ${name}
 * Created: ${now.toISOString().split('T')[0]}
 */

const { quoteIdentifier } = require('../sqlHelpers');

/**
 * Run the migration
 * @param {Object} db - Database adapter
 */
exports.up = async (db) => {
  // TODO: Implement migration
};

/**
 * Reverse the migration
 * @param {Object} db - Database adapter
 */
exports.down = async (db) => {
  // TODO: Implement rollback
};
`;

  fs.writeFileSync(filepath, template);
  console.log(`Created migration: ${filename}`);
  console.log(`Path: ${filepath}`);
}

function printUsage() {
  console.log(`
Database Migration CLI

Usage:
  node bin/migrate.js <command> [args]

Commands:
  up              Apply all pending migrations
  down <name>     Rollback a specific migration
  status          Show migration status
  create <name>   Create a new migration file

Examples:
  node bin/migrate.js up
  node bin/migrate.js status
  node bin/migrate.js create add-patient-tags
  node bin/migrate.js down 20260201120000-add-patient-tags.js
`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration error:', err.message);
    process.exit(1);
  });
