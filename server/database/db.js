/**
 * Database Connection Manager
 *
 * 統一的資料庫介面，支援 SQLite 和 PostgreSQL
 */

const crypto = require('crypto');
const { createDatabaseAdapter } = require('./adapters');
const { getSchemaSQL, getIndexesSQL } = require('./schema');

// 建立資料庫適配器實例
const dbAdapter = createDatabaseAdapter();

// 為了向後相容，提供類似 better-sqlite3 的介面
const db = {
  /**
   * 執行查詢並返回所有結果
   */
  prepare: (sql) => ({
    all: async (...params) => {
      return await dbAdapter.query(sql, params);
    },
    get: async (...params) => {
      return await dbAdapter.queryOne(sql, params);
    },
    run: async (...params) => {
      return await dbAdapter.execute(sql, params);
    }
  }),

  /**
   * 執行多個 SQL 語句
   */
  exec: async (sql) => {
    return await dbAdapter.executeBatch(sql);
  }
};

/**
 * 初始化資料庫
 */
async function initialize() {
  console.log('🗄️  初始化數據庫...');

  try {
    const dbType = (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();

    // PostgreSQL: 先測試連線
    if ((dbType === 'postgres' || dbType === 'postgresql') && dbAdapter.testConnection) {
      console.log('🔌 測試 PostgreSQL 連線...');
      await dbAdapter.testConnection(5, 3000);
    }

    // 建立資料表 & 索引
    console.log('📋 建立資料表結構...');
    await dbAdapter.executeBatch(getSchemaSQL(dbType));
    console.log('⚡ 建立索引...');
    await dbAdapter.executeBatch(getIndexesSQL(dbType));

    // 建立預設組織（如不存在）
    const orgCount = await dbAdapter.queryOne('SELECT COUNT(*) as count FROM organizations');
    if (orgCount && orgCount.count === 0) {
      console.log('🏢 創建預設組織...');
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
      console.log('✅ 預設組織已創建');
    }

    // 建立超級管理員（如不存在，並嘗試指派組織）
    const superAdminCount = await dbAdapter.queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['super_admin']);
    if (superAdminCount && superAdminCount.count === 0) {
      console.log('👑 創建超級管理員帳號...');
      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024';
      const hashedPassword = crypto.createHash('sha256').update(superAdminPassword).digest('hex');
      const now = new Date().toISOString();
      const targetOrg = await dbAdapter.queryOne('SELECT id FROM organizations ORDER BY createdAt ASC LIMIT 1');
      await dbAdapter.execute(
        `INSERT INTO users (id, username, password, name, email, role, "isActive", "organizationId", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'user_superadmin_001',
          'superadmin',
          hashedPassword,
          '系統超級管理員',
          'superadmin@system.com',
          'super_admin',
          true,
          targetOrg ? targetOrg.id : null,
          now,
          now
        ]
      );
      console.log(`✅ 超級管理員已創建${targetOrg ? ' 並指派組織 ' + targetOrg.id : '（暫無組織可指派）'}`);
      console.log('⚠️  登入後請立即修改密碼');
    }

    // 修復：已有超級管理員但缺組織 → 指派第一個組織
  const orphanSuperAdmin = await dbAdapter.queryOne('SELECT id FROM users WHERE role = ? AND ("organizationId" IS NULL OR "organizationId" = \'\')', ['super_admin']);
    if (orphanSuperAdmin && orphanSuperAdmin.id) {
      const anyOrg = await dbAdapter.queryOne('SELECT id FROM organizations ORDER BY createdAt ASC LIMIT 1');
      if (anyOrg) {
        const nowFix = new Date().toISOString();
        await dbAdapter.execute('UPDATE users SET "organizationId" = ?, "updatedAt" = ? WHERE role = ?', [anyOrg.id, nowFix, 'super_admin']);
        console.log(`� 已修復超級管理員缺少組織 → 指派 ${anyOrg.id}`);
      }
    }

    // 建立預設服務類別（如不存在）
    const serviceTypesCount = await dbAdapter.queryOne('SELECT COUNT(*) as count FROM service_types');
    if (serviceTypesCount && serviceTypesCount.count === 0) {
      console.log('📝 創建預設服務類別...');
      const now = new Date().toISOString();
      const targetOrg = await dbAdapter.queryOne('SELECT id FROM organizations ORDER BY createdAt ASC LIMIT 1');
      const orgIdForTypes = targetOrg ? targetOrg.id : 'org_default_001';
      const defaultServiceTypes = [
        { name: '初診', color: '#6366f1', description: '首次就診評估', order: 0 },
        { name: '營養諮詢', color: '#22c55e', description: '營養評估與飲食建議', order: 1 },
        { name: '運動指導', color: '#f97316', description: '運動計畫與指導', order: 2 },
        { name: '複診', color: '#8b5cf6', description: '定期追蹤回診', order: 3 },
        { name: '健康評估', color: '#06b6d4', description: '綜合健康狀況評估', order: 4 }
      ];
      for (const type of defaultServiceTypes) {
        await dbAdapter.execute(
          `INSERT INTO service_types (id, name, description, color, "isActive", "displayOrder", "organizationId", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `service_type_${Date.now()}_${Math.random().toString(36).substring(2,11)}`,
            type.name,
            type.description,
            type.color,
            true,
            type.order,
            orgIdForTypes,
            now,
            now
          ]
        );
      }
      console.log('✅ 預設服務類別已創建');
    }

    console.log('✅ 數據庫初始化完成');
  } catch (error) {
    console.error('❌ 數據庫初始化失敗:', error);
    throw error;
  }
}

module.exports = {
  db,
  dbAdapter,
  initialize
};
