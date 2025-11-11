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
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    // 建立資料表
    console.log('📋 建立資料表結構...');
    const schemaSQL = getSchemaSQL(dbType);
    await dbAdapter.executeBatch(schemaSQL);

    // 建立索引
    console.log('⚡ 建立索引...');
    const indexesSQL = getIndexesSQL(dbType);
    await dbAdapter.executeBatch(indexesSQL);

    // 檢查是否需要創建超級管理員
    const superAdminExists = await dbAdapter.queryOne(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['super_admin']
    );

    if (superAdminExists && superAdminExists.count === 0) {
      console.log('👑 創建超級管理員帳號（系統控制台）...');

      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024';
      const hashedPassword = crypto.createHash('sha256').update(superAdminPassword).digest('hex');
      const now = new Date().toISOString();

      await dbAdapter.execute(
        `INSERT INTO users (id, username, password, name, email, role, "isActive", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'user_superadmin_001',
          'superadmin',
          hashedPassword,
          '系統超級管理員',
          'superadmin@system.com',
          'super_admin',
          true,
          now,
          now
        ]
      );

      console.log('✅ 超級管理員已創建');
      console.log('┌─────────────────────────────────────────┐');
      console.log('│  🔐 超級管理員帳號（請立即修改密碼）    │');
      console.log('├─────────────────────────────────────────┤');
      console.log('│  帳號: superadmin                       │');
      console.log(`│  密碼: ${superAdminPassword.padEnd(31)}│`);
      console.log('│  權限: 可管理所有組織和系統設定         │');
      console.log('└─────────────────────────────────────────┘');
      console.log('⚠️  重要：首次登入後請立即修改密碼！');
      console.log('');
    }

    // 檢查是否需要創建預設組織
    const orgsExist = await dbAdapter.queryOne('SELECT COUNT(*) as count FROM organizations');

    if (orgsExist && orgsExist.count === 0) {
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

      // 更新超級管理員的組織
      await dbAdapter.execute(
        'UPDATE users SET "organizationId" = ? WHERE role = ?',
        [defaultOrgId, 'super_admin']
      );

      console.log('✅ 預設組織已創建');
    }

    // 檢查是否需要創建預設服務類別
    const serviceTypesExist = await dbAdapter.queryOne('SELECT COUNT(*) as count FROM service_types');

    if (serviceTypesExist && serviceTypesExist.count === 0) {
      console.log('📝 創建預設服務類別...');
      const now = new Date().toISOString();
      const defaultOrgId = 'org_default_001';

      const defaultServiceTypes = [
        { name: '初診', color: '#6366f1', description: '首次就診評估', order: 0 },
        { name: '營養諮詢', color: '#22c55e', description: '營養評估與飲食建議', order: 1 },
        { name: '運動指導', color: '#f97316', description: '運動計畫與指導', order: 2 },
        { name: '複診', color: '#8b5cf6', description: '定期追蹤回診', order: 3 },
        { name: '健康評估', color: '#06b6d4', description: '綜合健康狀況評估', order: 4 },
      ];

      for (const type of defaultServiceTypes) {
        await dbAdapter.execute(
          `INSERT INTO service_types (id, name, description, color, "isActive", "displayOrder", "organizationId", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `service_type_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type.name,
            type.description,
            type.color,
            true,
            type.order,
            defaultOrgId,
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
