#!/usr/bin/env node
/**
 * Reset SQLite Database Script
 *
 * 用途：清空現有 SQLite 資料庫檔案並重新初始化 schema 與種子資料。
 * 使用方式：
 *   node scripts/resetSqlite.js
 *
 * 可選環境變數：
 *   DATABASE_PATH 指定資料庫檔案路徑（預設 data/patient_crm.db）
 */

const fs = require('fs');
const path = require('path');

const dbFile = process.env.DATABASE_PATH || path.join(__dirname, '../data/patient_crm.db');

console.log('🧹 重置 SQLite 資料庫...');
console.log('📁 目標檔案:', dbFile);

try {
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
    console.log('🗑️ 已刪除舊資料庫檔案');
  } else {
    console.log('ℹ️ 資料庫檔案不存在，無需刪除');
  }
} catch (err) {
  console.error('❌ 刪除資料庫檔案失敗:', err.message);
  process.exit(1);
}

// 重新初始化
console.log('🔄 重新初始化資料庫 schema 與索引...');
const { initialize } = require('../server/database/db');
initialize()
  .then(() => {
    console.log('✅ 重置完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 重置失敗:', err);
    process.exit(1);
  });
