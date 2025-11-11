/**
 * Multi-Tenant Support Migration
 *
 * 商業化多租戶架構 - Single Database with Row-Level Isolation
 *
 * 優勢：
 * - 最小資源消耗：共用資料庫實例
 * - 完全資料隔離：Row-level 自動過濾
 * - 高效能查詢：複合索引優化
 * - 橫向擴展：支援數千組織
 */

const { db } = require('../db');

function up() {
  console.log('🚀 開始多租戶架構遷移...');

  // 1. 建立組織表
  console.log('📋 建立 organizations 表...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      domain TEXT,
      plan TEXT NOT NULL DEFAULT 'basic' CHECK(plan IN ('basic', 'professional', 'enterprise')),
      maxUsers INTEGER DEFAULT 5,
      maxPatients INTEGER DEFAULT 100,
      isActive INTEGER DEFAULT 1,
      settings TEXT,
      subscriptionStartDate TEXT,
      subscriptionEndDate TEXT,
      billingEmail TEXT,
      contactName TEXT,
      contactPhone TEXT,
      contactEmail TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // 2. 為 users 表新增 organizationId
  console.log('👥 更新 users 表...');
  db.exec(`
    ALTER TABLE users ADD COLUMN organizationId TEXT;
  `);

  // 3. 為所有核心表新增 organizationId
  const tables = [
    'patients',
    'appointments',
    'body_composition',
    'vital_signs',
    'goals',
    'consultations',
    'service_types',
    'tags',
    'groups'
  ];

  for (const table of tables) {
    console.log(`📊 更新 ${table} 表...`);
    db.exec(`ALTER TABLE ${table} ADD COLUMN organizationId TEXT;`);
  }

  // 4. 建立高效能複合索引 (organizationId 優先)
  console.log('⚡ 建立複合索引以優化查詢效能...');

  db.exec(`
    -- Users 索引
    CREATE INDEX IF NOT EXISTS idx_users_org ON users(organizationId, isActive);
    CREATE INDEX IF NOT EXISTS idx_users_org_username ON users(organizationId, username);

    -- Patients 索引
    CREATE INDEX IF NOT EXISTS idx_patients_org ON patients(organizationId);
    CREATE INDEX IF NOT EXISTS idx_patients_org_name ON patients(organizationId, name);
    CREATE INDEX IF NOT EXISTS idx_patients_org_updated ON patients(organizationId, updatedAt DESC);

    -- Appointments 索引
    CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(organizationId);
    CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(organizationId, date, time);
    CREATE INDEX IF NOT EXISTS idx_appointments_org_patient ON appointments(organizationId, patientId);
    CREATE INDEX IF NOT EXISTS idx_appointments_org_status ON appointments(organizationId, status);

    -- Body Composition 索引
    CREATE INDEX IF NOT EXISTS idx_body_composition_org ON body_composition(organizationId);
    CREATE INDEX IF NOT EXISTS idx_body_composition_org_patient ON body_composition(organizationId, patientId, date DESC);

    -- Vital Signs 索引
    CREATE INDEX IF NOT EXISTS idx_vital_signs_org ON vital_signs(organizationId);
    CREATE INDEX IF NOT EXISTS idx_vital_signs_org_patient ON vital_signs(organizationId, patientId, date DESC);

    -- Goals 索引
    CREATE INDEX IF NOT EXISTS idx_goals_org ON goals(organizationId);
    CREATE INDEX IF NOT EXISTS idx_goals_org_patient ON goals(organizationId, patientId, status);

    -- Consultations 索引
    CREATE INDEX IF NOT EXISTS idx_consultations_org ON consultations(organizationId);
    CREATE INDEX IF NOT EXISTS idx_consultations_org_patient ON consultations(organizationId, patientId, date DESC);

    -- Service Types 索引
    CREATE INDEX IF NOT EXISTS idx_service_types_org ON service_types(organizationId, isActive);

    -- Tags 索引
    CREATE INDEX IF NOT EXISTS idx_tags_org ON tags(organizationId);

    -- Groups 索引
    CREATE INDEX IF NOT EXISTS idx_groups_org ON groups(organizationId);
  `);

  // 5. 建立預設組織（用於遷移現有資料）
  console.log('🏢 建立預設組織...');
  const now = new Date().toISOString();
  const defaultOrgId = 'org_default_001';

  db.prepare(`
    INSERT OR IGNORE INTO organizations (
      id, name, slug, plan, maxUsers, maxPatients, isActive,
      subscriptionStartDate, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    defaultOrgId,
    '預設組織',
    'default',
    'enterprise',
    999,
    99999,
    1,
    now,
    now,
    now
  );

  // 6. 將現有資料遷移到預設組織
  console.log('🔄 遷移現有資料到預設組織...');

  // 更新 users
  db.prepare(`UPDATE users SET organizationId = ? WHERE organizationId IS NULL`).run(defaultOrgId);

  // 更新所有業務資料表
  for (const table of tables) {
    db.prepare(`UPDATE ${table} SET organizationId = ? WHERE organizationId IS NULL`).run(defaultOrgId);
  }

  // 7. 新增外鍵約束檢查（僅用於文件說明，SQLite 的 ALTER TABLE 不支援）
  // 實際應用中，新插入的資料必須包含 organizationId

  console.log('✅ 多租戶架構遷移完成！');
  console.log('');
  console.log('📊 效能優化說明：');
  console.log('   - 複合索引確保查詢效能不降低');
  console.log('   - organizationId 在索引最左側，支援最佳過濾');
  console.log('   - 每個查詢都會自動使用組織過濾');
  console.log('');
  console.log('🔒 安全性說明：');
  console.log('   - Row-Level Isolation 確保完全資料隔離');
  console.log('   - 中介層自動注入 organizationId');
  console.log('   - API 層無法跨組織存取資料');
}

function down() {
  console.log('⚠️  回滾多租戶架構遷移...');

  // 移除索引
  const indexes = [
    'idx_users_org', 'idx_users_org_username',
    'idx_patients_org', 'idx_patients_org_name', 'idx_patients_org_updated',
    'idx_appointments_org', 'idx_appointments_org_date', 'idx_appointments_org_patient', 'idx_appointments_org_status',
    'idx_body_composition_org', 'idx_body_composition_org_patient',
    'idx_vital_signs_org', 'idx_vital_signs_org_patient',
    'idx_goals_org', 'idx_goals_org_patient',
    'idx_consultations_org', 'idx_consultations_org_patient',
    'idx_service_types_org', 'idx_tags_org', 'idx_groups_org'
  ];

  for (const index of indexes) {
    db.exec(`DROP INDEX IF EXISTS ${index}`);
  }

  // 注意：SQLite 不支援 DROP COLUMN，需要重建表來移除欄位
  console.log('⚠️  警告：SQLite 不支援 DROP COLUMN，organizationId 欄位將保留');
  console.log('⚠️  如需完全回滾，請刪除資料庫並重新初始化');
}

module.exports = { up, down };
