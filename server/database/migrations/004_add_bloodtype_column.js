/**
 * Migration: 新增患者血型欄位
 *
 * 目的：在 patients 表中新增 bloodType 欄位
 * 影響範圍：patients 表
 */

const { execute, queryOne } = require('../helpers');

/**
 * 執行遷移
 */
async function up() {
  console.log('[Migration 004] 開始：新增患者血型欄位');

  try {
    // 檢查資料庫類型
    const dbType = (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
    const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

    // 檢查欄位是否已存在
    let columnExists = false;
    try {
      if (isPostgres) {
        const result = await queryOne(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'patients' AND column_name = 'bloodType'`
        );
        columnExists = !!result;
      } else {
        // SQLite: 使用 PRAGMA table_info 檢查
        const { queryAll } = require('../helpers');
        const allColumns = await queryAll(`PRAGMA table_info(patients)`);
        columnExists = allColumns.some(col => col.name === 'bloodType');
      }
    } catch (e) {
      console.log('[Migration 004] 無法檢查欄位，假設不存在');
      columnExists = false;
    }

    if (columnExists) {
      console.log('[Migration 004] bloodType 欄位已存在，跳過');
      return true;
    }

    // 新增 bloodType 欄位
    const alterSQL = isPostgres
      ? `ALTER TABLE patients ADD COLUMN "bloodType" TEXT`
      : `ALTER TABLE patients ADD COLUMN bloodType TEXT`;

    await execute(alterSQL);
    console.log('[Migration 004] ✓ 已新增 bloodType 欄位');

    console.log('[Migration 004] 完成：血型欄位已新增');
    return true;
  } catch (error) {
    console.error('[Migration 004] 失敗:', error);
    throw error;
  }
}

/**
 * 回滾遷移
 */
async function down() {
  console.log('[Migration 004] 開始回滾：移除血型欄位');

  try {
    const dbType = (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
    const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

    if (isPostgres) {
      await execute(`ALTER TABLE patients DROP COLUMN IF EXISTS "bloodType"`);
    } else {
      // SQLite 不支援 DROP COLUMN，需要重建表
      console.log('[Migration 004] SQLite 不支援 DROP COLUMN，需要手動處理');
    }

    console.log('[Migration 004] 完成回滾');
    return true;
  } catch (error) {
    console.error('[Migration 004] 回滾失敗:', error);
    throw error;
  }
}

module.exports = { up, down };
