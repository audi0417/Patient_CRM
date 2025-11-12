/**
 * Fix Existing Users - Assign organizations to existing users
 *
 * This script will:
 * 1. Assign all users without organizationId to default organization
 * 2. Ensure super admin is unaffected
 */

const { db } = require('../server/database/db');

console.log('[Fix Users] Starting user organization assignment...\n');

try {
  // 1. Check if default organization exists
  const defaultOrg = db.prepare('SELECT id FROM organizations WHERE slug = ?').get('default');

  if (!defaultOrg) {
    console.log('[Fix Users] Error: Default organization not found. Run migration first:');
    console.log('   node server/database/migrate.js up');
    process.exit(1);
  }

  console.log(`[Fix Users] Found default organization: ${defaultOrg.id}\n`);

  // 2. Find all users without organizationId (excluding super admin)
  const usersWithoutOrg = db.prepare(`
    SELECT id, username, role, name
    FROM users
    WHERE organizationId IS NULL AND role != 'super_admin'
  `).all();

  if (usersWithoutOrg.length === 0) {
    console.log('[Fix Users] All users already have organizations assigned!');
    process.exit(0);
  }

  console.log(`[Fix Users] Found ${usersWithoutOrg.length} users needing fixes:\n`);

  // 3. Assign default organization to these users
  const updateStmt = db.prepare(`
    UPDATE users
    SET organizationId = ?, updatedAt = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();

  for (const user of usersWithoutOrg) {
    updateStmt.run(defaultOrg.id, now, user.id);
    console.log(`[Fix Users] ${user.username} (${user.role}) - assigned to default organization`);
  }

  console.log(`\n[Fix Users] Successfully fixed ${usersWithoutOrg.length} users!`);
  console.log('\nAccounts ready to use:');

  const updatedUsers = db.prepare(`
    SELECT u.username, u.role, o.name as organizationName
    FROM users u
    LEFT JOIN organizations o ON u.organizationId = o.id
    WHERE u.role != 'super_admin'
  `).all();

  console.log('\nAccount list:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  updatedUsers.forEach(u => {
    console.log(`  ${u.username.padEnd(20)} | ${u.role.padEnd(10)} | ${u.organizationName || 'No org'}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. Check super admin
  const superAdmin = db.prepare(`
    SELECT username FROM users WHERE role = 'super_admin'
  `).get();

  if (superAdmin) {
    console.log('[Fix Users] Super admin account:');
    console.log(`   Username: ${superAdmin.username}`);
    console.log('   Password: SuperAdmin@2024 (please change)\n');
  }

} catch (error) {
  console.error('[Fix Users] Error:', error);
  process.exit(1);
}
