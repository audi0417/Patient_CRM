/**
 * Add First Login Flag Migration
 *
 * Adds isFirstLogin flag to users table to track if user needs to change password
 */

const { dbAdapter } = require('../db');

async function up() {
  console.log('[Migration] Adding first login flag to users table...');

  try {
    // Check if isFirstLogin field already exists
    try {
      await dbAdapter.queryOne(`SELECT "isFirstLogin" FROM users LIMIT 1`);
      console.log('[Migration] isFirstLogin field already exists');
      return;
    } catch (error) {
      // Field doesn't exist, need to add
      console.log('[Migration] Adding isFirstLogin field to users table...');

      // For SQLite and PostgreSQL
      await dbAdapter.executeBatch(`ALTER TABLE users ADD COLUMN "isFirstLogin" BOOLEAN DEFAULT TRUE`);

      // Set existing users to FALSE (they've already logged in before)
      await dbAdapter.execute(`UPDATE users SET "isFirstLogin" = FALSE WHERE "lastLogin" IS NOT NULL`);

      console.log('[Migration] First login flag migration completed successfully!');
    }
  } catch (error) {
    console.error('[Migration] Failed:', error);
    throw error;
  }
}

async function down() {
  console.log('[Migration] Rolling back first login flag...');

  try {
    console.log('[Migration] Warning: Cannot remove isFirstLogin field (requires table rebuild)');
    console.log('[Migration] For complete rollback, delete database and reinitialize');
  } catch (error) {
    console.error('[Migration] Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
