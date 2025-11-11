#!/usr/bin/env node

/**
 * PostgreSQL 連線測試腳本
 *
 * 使用方式:
 * DATABASE_TYPE=postgres DATABASE_URL=your-connection-string node scripts/testPostgresConnection.js
 */

require('dotenv').config();
const { createDatabaseAdapter } = require('../server/database/adapters');

async function testConnection() {
  console.log('\n🔍 PostgreSQL 連線測試\n');
  console.log('=====================================\n');

  // 檢查環境變數
  console.log('📋 環境變數:');
  console.log(`   DATABASE_TYPE: ${process.env.DATABASE_TYPE || '未設定'}`);

  if (process.env.DATABASE_URL) {
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`); // 隱藏密碼
  } else {
    console.log(`   DATABASE_HOST: ${process.env.DATABASE_HOST || '未設定'}`);
    console.log(`   DATABASE_PORT: ${process.env.DATABASE_PORT || '未設定'}`);
    console.log(`   DATABASE_NAME: ${process.env.DATABASE_NAME || '未設定'}`);
    console.log(`   DATABASE_USER: ${process.env.DATABASE_USER || '未設定'}`);
    console.log(`   DATABASE_PASSWORD: ${process.env.DATABASE_PASSWORD ? '****' : '未設定'}`);
  }
  console.log('');

  try {
    // 建立資料庫適配器
    console.log('🔗 正在建立連線...');
    const adapter = createDatabaseAdapter();

    // 測試簡單查詢
    console.log('📊 執行測試查詢...');
    const result = await adapter.queryOne('SELECT 1 as test');

    if (result && result.test === 1) {
      console.log('✅ 連線成功！');
      console.log('');

      // 檢查資料庫版本
      console.log('🗄️  資料庫資訊:');
      try {
        const version = await adapter.queryOne('SELECT version()');
        console.log(`   版本: ${version.version}`);
      } catch (error) {
        console.log('   無法取得版本資訊');
      }

      // 列出現有資料表
      console.log('');
      console.log('📋 現有資料表:');
      try {
        const tables = await adapter.query(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename
        `);

        if (tables.length > 0) {
          tables.forEach(table => {
            console.log(`   - ${table.tablename}`);
          });
        } else {
          console.log('   （無資料表，資料庫為空）');
        }
      } catch (error) {
        console.log('   無法列出資料表:', error.message);
      }

      console.log('');
      console.log('=====================================');
      console.log('✅ 所有測試通過！');
      console.log('');
      console.log('下一步:');
      console.log('1. 執行資料庫初始化: npm run server');
      console.log('2. 或執行遷移: node server/database/migrate.js up');
      console.log('');

    } else {
      throw new Error('查詢結果不符預期');
    }

    // 關閉連線
    await adapter.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 連線失敗！');
    console.error('\n錯誤詳情:');
    console.error(`   ${error.message}`);
    console.error('');

    console.error('🔧 疑難排解:');
    console.error('1. 檢查 DATABASE_TYPE 是否設為 "postgres"');
    console.error('2. 檢查 DATABASE_URL 或連線參數是否正確');
    console.error('3. 確認 PostgreSQL 服務是否正在運行');
    console.error('4. 檢查防火牆設定是否允許連線');
    console.error('5. 確認資料庫使用者權限是否足夠');
    console.error('');

    if (error.code) {
      console.error(`錯誤代碼: ${error.code}`);
    }

    console.error('');
    process.exit(1);
  }
}

// 執行測試
testConnection();
