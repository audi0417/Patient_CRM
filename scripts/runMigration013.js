/**
 * 手動執行 Migration 013 - 新增 LINE 用戶表
 *
 * 使用方式：node scripts/runMigration013.js
 */

const path = require('path');

async function runMigration() {
  try {
    console.log('='.repeat(60));
    console.log('手動執行 Migration 013: 新增 LINE 用戶獨立表');
    console.log('='.repeat(60));
    console.log('');

    // 初始化資料庫
    const { initialize, dbAdapter } = require('../server/database/db');
    await initialize();

    // 取得資料庫類型
    const dbType = (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
    console.log(`資料庫類型: ${dbType}`);
    console.log('');

    // 載入遷移檔案
    const migration = require('../server/database/migrations/013_add_line_users_table.js');

    // 執行遷移
    console.log('開始執行遷移...');
    await migration.up(dbAdapter, dbType);

    // 標記遷移為已執行
    console.log('');
    console.log('標記遷移為已執行...');
    await dbAdapter.execute(
      'INSERT OR IGNORE INTO migrations (name) VALUES (?)',
      ['013_add_line_users_table']
    );

    console.log('');
    console.log('✅ Migration 013 執行成功！');
    console.log('');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Migration 013 執行失敗:');
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

runMigration();
