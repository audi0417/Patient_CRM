/**
 * 密碼遷移腳本
 * 將舊的 SHA-256 密碼遷移到 bcrypt
 *
 * 執行方式: node scripts/migratePasswords.js
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const { db, initialize } = require('../server/database/db');
const { queryAll, execute } = require('../server/database/helpers');

// 已知的測試密碼（用於遷移）
const KNOWN_PASSWORDS = {
  'superadmin': 'Admin123',  // 超級管理員預設密碼
  'admin': 'Admin123',       // 一般管理員預設密碼
  'user': 'User123'          // 一般用戶預設密碼
};

async function migratePasswords() {
  console.log('[Migration] Starting password migration from SHA-256 to bcrypt...');

  try {
    await initialize();

    // 獲取所有用戶
    const users = await queryAll('SELECT id, username, password FROM users');

    console.log(`[Migration] Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        // 檢查是否已經是 bcrypt hash（bcrypt hash 以 $2a$, $2b$, $2y$ 開頭）
        if (user.password && user.password.startsWith('$2')) {
          console.log(`[Migration] User ${user.username} already using bcrypt, skipping`);
          skippedCount++;
          continue;
        }

        // 嘗試從已知密碼遷移
        let newHash = null;

        // 檢查是否匹配已知密碼
        for (const [type, plainPassword] of Object.entries(KNOWN_PASSWORDS)) {
          const sha256Hash = crypto.createHash('sha256').update(plainPassword).digest('hex');

          if (user.password === sha256Hash) {
            // 找到匹配的明文密碼，生成 bcrypt hash
            newHash = await bcrypt.hash(plainPassword, 10);
            console.log(`[Migration] Migrating user ${user.username} (matched ${type} password)`);
            break;
          }
        }

        if (newHash) {
          // 更新密碼
          await execute('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
          migratedCount++;
          console.log(`[Migration] ✓ Successfully migrated user: ${user.username}`);
        } else {
          // 無法遷移此用戶（未知密碼）
          console.log(`[Migration] ⚠ Cannot migrate user ${user.username} - unknown password`);
          console.log(`[Migration]   This user will need to reset their password`);
          failedCount++;
        }

      } catch (error) {
        console.error(`[Migration] ✗ Error migrating user ${user.username}:`, error.message);
        failedCount++;
      }
    }

    console.log('\n[Migration] ========== Migration Summary ==========');
    console.log(`[Migration] Total users: ${users.length}`);
    console.log(`[Migration] Successfully migrated: ${migratedCount}`);
    console.log(`[Migration] Already using bcrypt: ${skippedCount}`);
    console.log(`[Migration] Failed/Unknown: ${failedCount}`);
    console.log('[Migration] ==========================================\n');

    if (failedCount > 0) {
      console.log('[Migration] ⚠ WARNING: Some users could not be migrated');
      console.log('[Migration] These users will need to reset their password');
      console.log('[Migration] You can use the password reset functionality or run:');
      console.log('[Migration]   node scripts/createSuperAdmin.js');
    }

    if (migratedCount > 0) {
      console.log('[Migration] ✓ Migration completed successfully!');
      console.log('[Migration] All migrated users can login with their original passwords');
    }

  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// 運行遷移
migratePasswords();
