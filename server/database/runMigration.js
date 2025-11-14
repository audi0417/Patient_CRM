/**
 * 手動執行資料庫遷移腳本
 */

const path = require('path');

// 設定環境變數（如果需要）
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = require('./db');

async function runMigration(migrationName) {
  try {
    console.log(`開始執行遷移: ${migrationName}`);

    // 初始化資料庫
    await db.initialize();

    // 載入遷移檔案
    const migration = require(`./migrations/${migrationName}`);

    // 執行遷移
    await migration.up();

    console.log(`遷移完成: ${migrationName}`);
    process.exit(0);
  } catch (error) {
    console.error(`遷移失敗: ${migrationName}`, error);
    process.exit(1);
  }
}

// 從命令列參數取得遷移名稱
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('請指定遷移檔案名稱');
  console.log('用法: node runMigration.js <migration-name>');
  console.log('範例: node runMigration.js 002_add_module_settings');
  process.exit(1);
}

runMigration(migrationName);
