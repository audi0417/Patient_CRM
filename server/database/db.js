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
  console.log('[Database] Initializing...');

  try {
    const dbType = (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();

    // PostgreSQL: test connection first
    if ((dbType === 'postgres' || dbType === 'postgresql') && dbAdapter.testConnection) {
      console.log('[Database] Testing PostgreSQL connection...');
      await dbAdapter.testConnection(5, 3000);
    }

    // Control initialization mode
    const initMode = (process.env.DB_INIT_MODE || 'auto').toLowerCase(); // auto | force | skip
    if (initMode === 'skip') {
      console.log('[Database] Skipping schema initialization (DB_INIT_MODE=skip)');
    } else {
      let needSchema = initMode === 'force';
      if (!needSchema) {
        try {
          if (dbType === 'postgres' || dbType === 'postgresql') {
            const t1 = await dbAdapter.queryOne(
              "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = ?",
              ['users']
            );
            const t2 = await dbAdapter.queryOne(
              "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = ?",
              ['organizations']
            );
            needSchema = !(t1 && t1.count > 0 && t2 && t2.count > 0);
          } else {
            const t1 = await dbAdapter.queryOne(
              "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name = ?",
              ['users']
            );
            const t2 = await dbAdapter.queryOne(
              "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name = ?",
              ['organizations']
            );
            needSchema = !(t1 && t1.count > 0 && t2 && t2.count > 0);
          }
        } catch (e) {
          console.warn('[Database] Unable to check existing tables, will create schema:', e.message);
          needSchema = true;
        }
      }

      if (needSchema) {
        console.log('[Database] Creating tables...');
        await dbAdapter.executeBatch(getSchemaSQL(dbType));
        console.log('[Database] Creating indexes...');
        await dbAdapter.executeBatch(getIndexesSQL(dbType));
      } else {
        console.log('[Database] Tables already exist, skipping creation');
      }
    }

    // Create default organization if not exists
    const orgCount = await dbAdapter.queryOne('SELECT COUNT(*) as count FROM organizations');
    if (orgCount && orgCount.count === 0) {
      console.log('[Database] Creating default organization...');
      const now = new Date().toISOString();
      const defaultOrgId = 'org_default_001';
      await dbAdapter.execute(
        `INSERT INTO organizations (
          id, name, slug, plan, "maxUsers", "maxPatients", "isActive",
          "subscriptionStartDate", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultOrgId,
          'default',
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
      console.log('[Database] Default organization created');
    }

    // Create super admin account if not exists
    const superAdminCount = await dbAdapter.queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['super_admin']);
    if (superAdminCount && superAdminCount.count === 0) {
      console.log('[Database] Creating super admin account...');
      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024';
      const hashedPassword = crypto.createHash('sha256').update(superAdminPassword).digest('hex');
      const now = new Date().toISOString();
      const targetOrg = await dbAdapter.queryOne('SELECT id FROM organizations ORDER BY createdAt ASC LIMIT 1');
      await dbAdapter.execute(
        `INSERT INTO users (id, username, password, name, email, role, "isActive", "isFirstLogin", "organizationId", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'user_superadmin_001',
          'superadmin',
          hashedPassword,
          '系統超級管理員',
          'superadmin@system.com',
          'super_admin',
          true,
          false, // 超級管理員不強制修改密碼（已經使用環境變數設定）
          targetOrg ? targetOrg.id : null,
          now,
          now
        ]
      );
      console.log(`[Database] Super admin created${targetOrg ? ' with organization ' + targetOrg.id : ''}`);
      console.log('[Database] Please change password after login');
    }

    // Fix orphan super admin without organization
    const orphanSuperAdmin = await dbAdapter.queryOne('SELECT id FROM users WHERE role = ? AND ("organizationId" IS NULL OR "organizationId" = \'\')', ['super_admin']);
    if (orphanSuperAdmin && orphanSuperAdmin.id) {
      const anyOrg = await dbAdapter.queryOne('SELECT id FROM organizations ORDER BY createdAt ASC LIMIT 1');
      if (anyOrg) {
        const nowFix = new Date().toISOString();
        await dbAdapter.execute('UPDATE users SET "organizationId" = ?, "updatedAt" = ? WHERE role = ?', [anyOrg.id, nowFix, 'super_admin']);
        console.log(`[Database] Fixed orphan super admin, assigned organization ${anyOrg.id}`);
      }
    }

    // Create default service types if not exists
    const serviceTypesCount = await dbAdapter.queryOne('SELECT COUNT(*) as count FROM service_types');
    if (serviceTypesCount && serviceTypesCount.count === 0) {
      console.log('[Database] Creating default service types...');
      const now = new Date().toISOString();
      const orgIdForTypes = 'org_default_001';
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
      console.log('[Database] Default service types created');
    }

    console.log('[Database] Initialization complete');
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
    throw error;
  }
}

module.exports = {
  db,
  dbAdapter,
  initialize
};
