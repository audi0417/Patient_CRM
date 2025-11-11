/**
 * Fix Existing Users - 為現有用戶分配組織
 *
 * 此腳本會：
 * 1. 為所有沒有 organizationId 的用戶分配到預設組織
 * 2. 確保超級管理員不受影響
 */

const { db } = require('../server/database/db');

console.log('🔧 修復現有用戶...\n');

try {
  // 1. 檢查預設組織是否存在
  const defaultOrg = db.prepare('SELECT id FROM organizations WHERE slug = ?').get('default');

  if (!defaultOrg) {
    console.log('❌ 找不到預設組織，請先執行遷移：');
    console.log('   node server/database/migrate.js up');
    process.exit(1);
  }

  console.log(`✅ 找到預設組織: ${defaultOrg.id}\n`);

  // 2. 查找所有沒有 organizationId 的用戶（排除超級管理員）
  const usersWithoutOrg = db.prepare(`
    SELECT id, username, role, name
    FROM users
    WHERE organizationId IS NULL AND role != 'super_admin'
  `).all();

  if (usersWithoutOrg.length === 0) {
    console.log('✅ 所有用戶都已分配組織！');
    process.exit(0);
  }

  console.log(`找到 ${usersWithoutOrg.length} 個需要修復的用戶：\n`);

  // 3. 為這些用戶分配預設組織
  const updateStmt = db.prepare(`
    UPDATE users
    SET organizationId = ?, updatedAt = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();

  for (const user of usersWithoutOrg) {
    updateStmt.run(defaultOrg.id, now, user.id);
    console.log(`✅ ${user.username} (${user.role}) - 已分配到預設組織`);
  }

  console.log(`\n✅ 成功修復 ${usersWithoutOrg.length} 個用戶！`);
  console.log('\n現在可以使用這些帳號登入：');

  const updatedUsers = db.prepare(`
    SELECT u.username, u.role, o.name as organizationName
    FROM users u
    LEFT JOIN organizations o ON u.organizationId = o.id
    WHERE u.role != 'super_admin'
  `).all();

  console.log('\n帳號列表：');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  updatedUsers.forEach(u => {
    console.log(`  ${u.username.padEnd(20)} | ${u.role.padEnd(10)} | ${u.organizationName || '無組織'}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. 檢查超級管理員
  const superAdmin = db.prepare(`
    SELECT username FROM users WHERE role = 'super_admin'
  `).get();

  if (superAdmin) {
    console.log('🔐 超級管理員帳號：');
    console.log(`   帳號: ${superAdmin.username}`);
    console.log('   密碼: SuperAdmin@2024 (請修改)\n');
  }

} catch (error) {
  console.error('❌ 修復失敗:', error);
  process.exit(1);
}
