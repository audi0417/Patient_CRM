/**
 * Migration: Example Migration
 * Created: 2026-01-31
 *
 * This is an example migration file demonstrating the structure.
 * You can delete this file or use it as a template.
 */

const { quoteIdentifier } = require('../sqlHelpers');

/**
 * Run the migration
 * @param {Object} db - Database adapter
 */
exports.up = async (db) => {
  console.log('[Migration] Running example migration (up)');

  // Example: Add a column to a table
  // await db.execute(`
  //   ALTER TABLE users
  //   ADD COLUMN ${quoteIdentifier('lastActivity')} TIMESTAMP
  // `);

  // Example: Create an index
  // await db.execute(`
  //   CREATE INDEX IF NOT EXISTS idx_users_last_activity
  //   ON users (${quoteIdentifier('lastActivity')})
  // `);

  console.log('[Migration] Example migration completed');
};

/**
 * Reverse the migration
 * @param {Object} db - Database adapter
 */
exports.down = async (db) => {
  console.log('[Migration] Rolling back example migration (down)');

  // Example: Remove the column
  // await db.execute(`
  //   ALTER TABLE users
  //   DROP COLUMN ${quoteIdentifier('lastActivity')}
  // `);

  // Example: Drop the index
  // await db.execute(`
  //   DROP INDEX IF EXISTS idx_users_last_activity
  // `);

  console.log('[Migration] Example migration rollback completed');
};
