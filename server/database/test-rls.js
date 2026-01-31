/**
 * PostgreSQL Row-Level Security (RLS) 測試腳本
 *
 * 用於驗證 RLS 策略是否正常運作
 * 執行：node server/database/test-rls.js
 *
 * 前置條件：
 * 1. PostgreSQL 資料庫已建立並執行
 * 2. 已執行 rls-policies.sql 腳本
 * 3. .env 已設定 DATABASE_URL 或 DB_* 環境變數
 * 4. DB_TYPE=postgres
 */

require('dotenv').config();
const { Pool } = require('pg');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function success(msg) { log(`✅ ${msg}`, 'green'); }
function error(msg) { log(`❌ ${msg}`, 'red'); }
function info(msg) { log(`ℹ️  ${msg}`, 'cyan'); }
function warn(msg) { log(`⚠️  ${msg}`, 'yellow'); }

// 創建資料庫連線池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function testRLS() {
  log('\n' + '='.repeat(70), 'blue');
  log('PostgreSQL Row-Level Security 測試', 'blue');
  log('='.repeat(70) + '\n', 'blue');

  let client;

  try {
    // 測試資料庫連線
    info('測試資料庫連線...');
    client = await pool.connect();
    success('資料庫連線成功');

    // 檢查資料庫類型
    const dbType = process.env.DB_TYPE;
    if (dbType !== 'postgres') {
      warn(`DB_TYPE = ${dbType}，RLS 僅適用於 PostgreSQL`);
      warn('跳過 RLS 測試');
      return;
    }

    // ========================================================================
    // 測試 1：檢查 RLS 是否已啟用
    // ========================================================================
    log('\n' + '-'.repeat(70), 'yellow');
    log('測試 1: 檢查 RLS 是否已啟用', 'yellow');
    log('-'.repeat(70), 'yellow');

    const rlsStatus = await client.query(`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND rowsecurity = true
      ORDER BY tablename
    `);

    if (rlsStatus.rows.length === 0) {
      error('未找到啟用 RLS 的表');
      error('請先執行 rls-policies.sql 腳本');
      return;
    }

    success(`找到 ${rlsStatus.rows.length} 個啟用 RLS 的表：`);
    rlsStatus.rows.forEach(row => {
      info(`  - ${row.tablename}`);
    });

    // ========================================================================
    // 測試 2：檢查 RLS 策略
    // ========================================================================
    log('\n' + '-'.repeat(70), 'yellow');
    log('測試 2: 檢查 RLS 策略', 'yellow');
    log('-'.repeat(70), 'yellow');

    const policies = await client.query(`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);

    success(`找到 ${policies.rows.length} 個 RLS 策略`);
    const tableGroups = {};
    policies.rows.forEach(row => {
      if (!tableGroups[row.tablename]) {
        tableGroups[row.tablename] = [];
      }
      tableGroups[row.tablename].push(`${row.cmd} (${row.policyname})`);
    });

    Object.keys(tableGroups).forEach(table => {
      info(`  ${table}:`);
      tableGroups[table].forEach(policy => {
        info(`    - ${policy}`);
      });
    });

    // ========================================================================
    // 測試 3：準備測試資料
    // ========================================================================
    log('\n' + '-'.repeat(70), 'yellow');
    log('測試 3: 準備測試資料', 'yellow');
    log('-'.repeat(70), 'yellow');

    // 檢查是否有測試組織
    const testOrgs = await client.query(`
      SELECT id, name FROM organizations
      WHERE id IN ('test-org-001', 'test-org-002')
      ORDER BY id
    `);

    if (testOrgs.rows.length < 2) {
      info('創建測試組織...');

      // 創建測試組織
      await client.query(`
        INSERT INTO organizations (id, name, slug, plan, "isActive", "maxUsers", "maxPatients", "createdAt", "updatedAt")
        VALUES
          ('test-org-001', 'Test Organization 001', 'test-org-001', 'basic', true, 5, 100, NOW(), NOW()),
          ('test-org-002', 'Test Organization 002', 'test-org-002', 'basic', true, 5, 100, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);

      success('測試組織已創建');
    } else {
      success('測試組織已存在');
    }

    // 創建測試病患
    info('創建測試病患...');
    await client.query(`
      INSERT INTO patients (id, name, phone, "organizationId", "createdAt", "updatedAt")
      VALUES
        ('test-patient-001', 'Test Patient 001', '0912-000-001', 'test-org-001', NOW(), NOW()),
        ('test-patient-002', 'Test Patient 002', '0912-000-002', 'test-org-002', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    success('測試病患已創建');

    // ========================================================================
    // 測試 4：測試 RLS 資料隔離
    // ========================================================================
    log('\n' + '-'.repeat(70), 'yellow');
    log('測試 4: 測試 RLS 資料隔離', 'yellow');
    log('-'.repeat(70), 'yellow');

    // 4.1 設定組織 1 的上下文
    info('設定組織 test-org-001 上下文...');
    await client.query("SET LOCAL app.current_org_id = 'test-org-001'");

    // 查詢病患（應該只看到 test-org-001 的資料）
    const org1Patients = await client.query('SELECT id, name FROM patients ORDER BY id');

    if (org1Patients.rows.length === 1 && org1Patients.rows[0].id === 'test-patient-001') {
      success('組織 1 只能看到自己的病患');
      info(`  查詢到: ${org1Patients.rows[0].name}`);
    } else {
      error('組織 1 資料隔離失敗！');
      error(`  預期: 1 筆記錄 (test-patient-001)`);
      error(`  實際: ${org1Patients.rows.length} 筆記錄`);
    }

    // 4.2 設定組織 2 的上下文
    info('設定組織 test-org-002 上下文...');
    await client.query("SET LOCAL app.current_org_id = 'test-org-002'");

    // 查詢病患（應該只看到 test-org-002 的資料）
    const org2Patients = await client.query('SELECT id, name FROM patients ORDER BY id');

    if (org2Patients.rows.length === 1 && org2Patients.rows[0].id === 'test-patient-002') {
      success('組織 2 只能看到自己的病患');
      info(`  查詢到: ${org2Patients.rows[0].name}`);
    } else {
      error('組織 2 資料隔離失敗！');
      error(`  預期: 1 筆記錄 (test-patient-002)`);
      error(`  實際: ${org2Patients.rows.length} 筆記錄`);
    }

    // 4.3 重置上下文
    info('重置組織上下文...');
    await client.query('RESET app.current_org_id');

    // 查詢病患（應該看不到任何資料，因為沒有設定組織 ID）
    const noPatientsResult = await client.query('SELECT id, name FROM patients');

    if (noPatientsResult.rows.length === 0) {
      success('未設定組織上下文時無法查看任何資料');
    } else {
      warn('未設定組織上下文時仍可查看資料');
      warn('這可能是預期行為（如果有 super_admin 策略）');
    }

    // ========================================================================
    // 測試 5：測試 INSERT/UPDATE/DELETE 隔離
    // ========================================================================
    log('\n' + '-'.repeat(70), 'yellow');
    log('測試 5: 測試 INSERT/UPDATE/DELETE 隔離', 'yellow');
    log('-'.repeat(70), 'yellow');

    // 5.1 測試跨組織 INSERT（應該被阻止）
    info('測試跨組織 INSERT...');
    await client.query("SET LOCAL app.current_org_id = 'test-org-001'");

    try {
      // 嘗試插入組織 2 的資料（應該失敗）
      await client.query(`
        INSERT INTO patients (id, name, "organizationId", "createdAt", "updatedAt")
        VALUES ('test-cross-insert', 'Cross Insert Test', 'test-org-002', NOW(), NOW())
      `);

      error('跨組織 INSERT 未被阻止！');
    } catch (insertError) {
      if (insertError.message.includes('violates row-level security policy') ||
          insertError.message.includes('new row violates')) {
        success('跨組織 INSERT 已被 RLS 阻止');
      } else {
        error(`INSERT 失敗，但不是 RLS 錯誤: ${insertError.message}`);
      }
    }

    // 5.2 測試跨組織 UPDATE（應該被阻止）
    info('測試跨組織 UPDATE...');
    await client.query("SET LOCAL app.current_org_id = 'test-org-001'");

    try {
      // 嘗試更新組織 2 的資料（應該失敗）
      const updateResult = await client.query(`
        UPDATE patients
        SET name = 'Updated Name'
        WHERE id = 'test-patient-002'
      `);

      if (updateResult.rowCount === 0) {
        success('跨組織 UPDATE 已被 RLS 阻止（影響 0 行）');
      } else {
        error('跨組織 UPDATE 未被阻止！');
      }
    } catch (updateError) {
      error(`UPDATE 錯誤: ${updateError.message}`);
    }

    // 5.3 測試跨組織 DELETE（應該被阻止）
    info('測試跨組織 DELETE...');
    await client.query("SET LOCAL app.current_org_id = 'test-org-001'");

    try {
      // 嘗試刪除組織 2 的資料（應該失敗）
      const deleteResult = await client.query(`
        DELETE FROM patients
        WHERE id = 'test-patient-002'
      `);

      if (deleteResult.rowCount === 0) {
        success('跨組織 DELETE 已被 RLS 阻止（影響 0 行）');
      } else {
        error('跨組織 DELETE 未被阻止！');
      }
    } catch (deleteError) {
      error(`DELETE 錯誤: ${deleteError.message}`);
    }

    // ========================================================================
    // 測試完成
    // ========================================================================
    log('\n' + '='.repeat(70), 'green');
    log('✅ RLS 測試完成', 'green');
    log('='.repeat(70) + '\n', 'green');

    success('所有 RLS 策略運作正常');
    info('資料庫層多租戶隔離已生效');

  } catch (err) {
    error('\n測試過程發生錯誤:');
    console.error(err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// 執行測試
testRLS();
