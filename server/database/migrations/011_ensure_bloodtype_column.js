/**
 * Migration 011: 確保 patients 表有 bloodType 欄位
 *
 * 目的：修復 Zeabur 部署時可能遺漏的 bloodType 欄位
 * 原因：Migration 004 可能在某些環境下沒有成功執行
 */

const { execute, queryOne, queryAll } = require('../helpers');

/**
 * 取得資料庫類型
 */
function getDatabaseType() {
  return (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
}

/**
 * 執行遷移
 */
async function up() {
  console.log('[Migration 011] 開始：確保 patients 表有 bloodType 欄位');

  try {
    const dbType = getDatabaseType();
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
        const allColumns = await queryAll(`PRAGMA table_info(patients)`);
        columnExists = allColumns.some(col => col.name === 'bloodType');
      }
    } catch (e) {
      console.log('[Migration 011] 檢查欄位時發生錯誤，假設欄位不存在');
      columnExists = false;
    }

    if (columnExists) {
      console.log('[Migration 011] bloodType 欄位已存在，跳過');
      return true;
    }

    // 新增 bloodType 欄位
    console.log('[Migration 011] 新增 bloodType 欄位');
    if (isPostgres) {
      await execute(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS "bloodType" TEXT`);
    } else {
      await execute(`ALTER TABLE patients ADD COLUMN bloodType TEXT`);
    }

    console.log('[Migration 011] 完成：bloodType 欄位已新增');
    return true;
  } catch (error) {
    console.error('[Migration 011] 失敗:', error);
    // 如果失敗，檢查是否是因為欄位已存在
    if (error.message && error.message.includes('duplicate column')) {
      console.log('[Migration 011] bloodType 欄位已存在（從錯誤訊息判斷）');
      return true;
    }
    throw error;
  }
}

/**
 * 回滾遷移
 */
async function down() {
  console.log('[Migration 011] 此 migration 不需要回滾（由 migration 004 處理）');
  return true;
}

module.exports = {
  up,
  down
};
