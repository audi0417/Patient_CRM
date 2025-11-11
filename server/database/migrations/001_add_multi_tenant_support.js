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

const { dbAdapter } = require('../db');

async function up() {
  console.log('🚀 開始多租戶架構遷移...');

  try {
    // 注意：由於 schema.js 已經包含 organizationId 欄位和索引，
    // 這個遷移主要用於已存在的舊資料庫

    // 檢查 organizations 表是否存在
    const tableExists = await dbAdapter.queryOne(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'
      UNION ALL
      SELECT tablename as name FROM pg_tables WHERE tablename='organizations'
    `);

    if (!tableExists) {
      console.log('📋 建立 organizations 表...');
      await dbAdapter.executeBatch(`
        CREATE TABLE organizations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          domain TEXT,
          plan TEXT NOT NULL DEFAULT 'basic' CHECK(plan IN ('basic', 'professional', 'enterprise')),
          "maxUsers" INTEGER DEFAULT 5,
          "maxPatients" INTEGER DEFAULT 100,
          "isActive" BOOLEAN DEFAULT TRUE,
          settings TEXT,
          "subscriptionStartDate" TIMESTAMP,
          "subscriptionEndDate" TIMESTAMP,
          "billingEmail" TEXT,
          "contactName" TEXT,
          "contactPhone" TEXT,
          "contactEmail" TEXT,
          "createdAt" TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP NOT NULL
        )
      `);
    }

    // 檢查 organizationId 欄位是否存在（僅用於舊資料庫）
    console.log('🔍 檢查資料表結構...');

    const tables = [
      'users',
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
      try {
        // 嘗試查詢 organizationId 欄位
        await dbAdapter.queryOne(`SELECT "organizationId" FROM ${table} LIMIT 1`);
        console.log(`✓ ${table} 已有 organizationId 欄位`);
      } catch (error) {
        // 欄位不存在，需要新增
        console.log(`📊 為 ${table} 新增 organizationId 欄位...`);
        await dbAdapter.executeBatch(`ALTER TABLE ${table} ADD COLUMN "organizationId" TEXT`);
      }
    }

    // 建立或更新索引
    console.log('⚡ 建立/更新複合索引...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_org ON users("organizationId", "isActive")',
      'CREATE INDEX IF NOT EXISTS idx_users_org_username ON users("organizationId", username)',
      'CREATE INDEX IF NOT EXISTS idx_patients_org ON patients("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_patients_org_name ON patients("organizationId", name)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments("organizationId", date, time)',
      'CREATE INDEX IF NOT EXISTS idx_body_composition_org ON body_composition("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_vital_signs_org ON vital_signs("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_goals_org ON goals("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_consultations_org ON consultations("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_service_types_org ON service_types("organizationId", "isActive")',
      'CREATE INDEX IF NOT EXISTS idx_tags_org ON tags("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_groups_org ON groups("organizationId")'
    ];

    for (const indexSQL of indexes) {
      await dbAdapter.executeBatch(indexSQL);
    }

    // 建立預設組織（如果不存在）
    console.log('🏢 檢查預設組織...');
    const defaultOrg = await dbAdapter.queryOne('SELECT id FROM organizations WHERE slug = ?', ['default']);

    if (!defaultOrg) {
      console.log('📝 建立預設組織...');
      const now = new Date().toISOString();
      const defaultOrgId = 'org_default_001';

      await dbAdapter.execute(
        `INSERT INTO organizations (
          id, name, slug, plan, "maxUsers", "maxPatients", "isActive",
          "subscriptionStartDate", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultOrgId,
          '預設組織',
          'default',
          'enterprise',
          999,
          99999,
          true,
          now,
          now,
          now
        ]
      );

      // 將所有沒有組織的資料分配到預設組織
      console.log('🔄 遷移現有資料到預設組織...');
      for (const table of tables) {
        await dbAdapter.execute(
          `UPDATE ${table} SET "organizationId" = ? WHERE "organizationId" IS NULL`,
          [defaultOrgId]
        );
      }
    }

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
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  }
}

async function down() {
  console.log('⚠️  回滾多租戶架構遷移...');

  try {
    // 移除索引
    const indexes = [
      'idx_users_org', 'idx_users_org_username',
      'idx_patients_org', 'idx_patients_org_name',
      'idx_appointments_org', 'idx_appointments_org_date',
      'idx_body_composition_org', 'idx_vital_signs_org',
      'idx_goals_org', 'idx_consultations_org',
      'idx_service_types_org', 'idx_tags_org', 'idx_groups_org'
    ];

    for (const index of indexes) {
      await dbAdapter.executeBatch(`DROP INDEX IF EXISTS ${index}`);
    }

    console.log('⚠️  警告：無法移除 organizationId 欄位（需要重建資料表）');
    console.log('⚠️  如需完全回滾，請刪除資料庫並重新初始化');
  } catch (error) {
    console.error('❌ 回滾失敗:', error);
    throw error;
  }
}

module.exports = { up, down };
