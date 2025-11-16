/**
 * Migration: 新增療程追蹤模組
 *
 * 目的：建立療程方案管理功能，用於追蹤病患購買的療程服務與使用次數
 * 影響範圍：
 * - 新增 service_items 表（服務項目庫）
 * - 新增 treatment_packages 表（療程方案）
 * - 新增 package_usage_logs 表（執行記錄）
 * - 組織設定 (organizations.settings.modules)
 */

const { queryAll, execute } = require('../helpers');

/**
 * 取得資料庫類型
 */
function getDatabaseType() {
  return (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
}

/**
 * 療程追蹤模組定義
 */
const TREATMENT_MODULE = {
  id: 'treatmentPackages',
  name: '療程追蹤管理',
  description: '管理病患療程方案，追蹤復健次數、注射劑量等服務使用狀況',
  defaultEnabled: true,
  features: ['treatment_tracking', 'usage_logging', 'package_management']
};

/**
 * 執行遷移
 */
async function up() {
  console.log('[Migration 009] 開始：新增療程追蹤模組');
  const dbType = getDatabaseType();

  try {
    // 1. 建立 service_items 表（服務項目庫）
    console.log('[Migration 009] 建立 service_items 表');

    if (dbType === 'postgres') {
      await execute(`
        CREATE TABLE IF NOT EXISTS service_items (
          id SERIAL PRIMARY KEY,
          "organizationId" INTEGER NOT NULL,

          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          unit VARCHAR(20) DEFAULT '次',

          description TEXT,
          "isActive" BOOLEAN DEFAULT true,
          "displayOrder" INTEGER DEFAULT 0,

          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
          UNIQUE("organizationId", code)
        )
      `);
    } else {
      await execute(`
        CREATE TABLE IF NOT EXISTS service_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          organizationId INTEGER NOT NULL,

          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          unit VARCHAR(20) DEFAULT '次',

          description TEXT,
          isActive BOOLEAN DEFAULT 1,
          displayOrder INTEGER DEFAULT 0,

          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
          UNIQUE(organizationId, code)
        )
      `);
    }

    // 2. 建立 treatment_packages 表（療程方案）
    console.log('[Migration 009] 建立 treatment_packages 表');

    if (dbType === 'postgres') {
      await execute(`
        CREATE TABLE IF NOT EXISTS treatment_packages (
          id SERIAL PRIMARY KEY,
          "organizationId" INTEGER NOT NULL,
          "patientId" INTEGER NOT NULL,

          "packageName" VARCHAR(255) NOT NULL,
          "packageNumber" VARCHAR(50),

          items JSONB NOT NULL,

          "startDate" DATE,
          "expiryDate" DATE,
          status VARCHAR(20) DEFAULT 'active',

          notes TEXT,

          "createdBy" INTEGER NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY ("createdBy") REFERENCES users(id),
          UNIQUE("organizationId", "packageNumber")
        )
      `);

      // 建立索引
      await execute(`
        CREATE INDEX IF NOT EXISTS idx_treatment_packages_patient
        ON treatment_packages("patientId")
      `);
      await execute(`
        CREATE INDEX IF NOT EXISTS idx_treatment_packages_status
        ON treatment_packages(status)
      `);
    } else {
      await execute(`
        CREATE TABLE IF NOT EXISTS treatment_packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          organizationId INTEGER NOT NULL,
          patientId INTEGER NOT NULL,

          packageName VARCHAR(255) NOT NULL,
          packageNumber VARCHAR(50),

          items TEXT NOT NULL,

          startDate DATE,
          expiryDate DATE,
          status VARCHAR(20) DEFAULT 'active',

          notes TEXT,

          createdBy INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY (createdBy) REFERENCES users(id),
          UNIQUE(organizationId, packageNumber)
        )
      `);

      await execute(`
        CREATE INDEX IF NOT EXISTS idx_treatment_packages_patient
        ON treatment_packages(patientId)
      `);
      await execute(`
        CREATE INDEX IF NOT EXISTS idx_treatment_packages_status
        ON treatment_packages(status)
      `);
    }

    // 3. 建立 package_usage_logs 表（執行記錄）
    console.log('[Migration 009] 建立 package_usage_logs 表');

    if (dbType === 'postgres') {
      await execute(`
        CREATE TABLE IF NOT EXISTS package_usage_logs (
          id SERIAL PRIMARY KEY,
          "organizationId" INTEGER NOT NULL,
          "packageId" INTEGER NOT NULL,
          "serviceItemId" INTEGER NOT NULL,

          "usageDate" DATE NOT NULL,
          quantity DECIMAL(10,2) DEFAULT 1,

          "performedBy" INTEGER,
          notes TEXT,

          "appointmentId" INTEGER,

          "createdBy" INTEGER NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY ("packageId") REFERENCES treatment_packages(id) ON DELETE CASCADE,
          FOREIGN KEY ("serviceItemId") REFERENCES service_items(id),
          FOREIGN KEY ("performedBy") REFERENCES users(id),
          FOREIGN KEY ("appointmentId") REFERENCES appointments(id),
          FOREIGN KEY ("createdBy") REFERENCES users(id)
        )
      `);

      await execute(`
        CREATE INDEX IF NOT EXISTS idx_package_usage_logs_package
        ON package_usage_logs("packageId")
      `);
      await execute(`
        CREATE INDEX IF NOT EXISTS idx_package_usage_logs_date
        ON package_usage_logs("usageDate")
      `);
    } else {
      await execute(`
        CREATE TABLE IF NOT EXISTS package_usage_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          organizationId INTEGER NOT NULL,
          packageId INTEGER NOT NULL,
          serviceItemId INTEGER NOT NULL,

          usageDate DATE NOT NULL,
          quantity DECIMAL(10,2) DEFAULT 1,

          performedBy INTEGER,
          notes TEXT,

          appointmentId INTEGER,

          createdBy INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (packageId) REFERENCES treatment_packages(id) ON DELETE CASCADE,
          FOREIGN KEY (serviceItemId) REFERENCES service_items(id),
          FOREIGN KEY (performedBy) REFERENCES users(id),
          FOREIGN KEY (appointmentId) REFERENCES appointments(id),
          FOREIGN KEY (createdBy) REFERENCES users(id)
        )
      `);

      await execute(`
        CREATE INDEX IF NOT EXISTS idx_package_usage_logs_package
        ON package_usage_logs(packageId)
      `);
      await execute(`
        CREATE INDEX IF NOT EXISTS idx_package_usage_logs_date
        ON package_usage_logs(usageDate)
      `);
    }

    // 4. 為所有組織新增療程追蹤模組設定
    console.log('[Migration 009] 更新組織模組設定');
    const organizations = await queryAll('SELECT id, settings FROM organizations');
    console.log(`[Migration 009] 找到 ${organizations.length} 個組織`);

    for (const org of organizations) {
      let settings = {};

      if (org.settings) {
        try {
          settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
        } catch (e) {
          console.warn(`[Migration 009] 組織 ${org.id} 的 settings 解析失敗，使用空物件`);
        }
      }

      if (!settings.modules) {
        settings.modules = {};
      }

      if (!settings.modules.treatmentPackages) {
        settings.modules.treatmentPackages = {
          enabled: TREATMENT_MODULE.defaultEnabled,
          name: TREATMENT_MODULE.name,
          description: TREATMENT_MODULE.description,
          features: TREATMENT_MODULE.features
        };

        const settingsJson = JSON.stringify(settings);
        await execute('UPDATE organizations SET settings = ? WHERE id = ?', [settingsJson, org.id]);

        console.log(`[Migration 009] 已為組織 ${org.id} 新增療程追蹤模組`);
      } else {
        console.log(`[Migration 009] 組織 ${org.id} 已有療程追蹤模組設定，跳過`);
      }
    }

    console.log('[Migration 009] 完成：療程追蹤模組已新增');
    return true;
  } catch (error) {
    console.error('[Migration 009] 失敗:', error);
    throw error;
  }
}

/**
 * 回滾遷移
 */
async function down() {
  console.log('[Migration 009] 開始回滾：移除療程追蹤模組');

  try {
    // 1. 刪除表格（順序很重要，先刪除有外鍵依賴的表）
    console.log('[Migration 009] 刪除 package_usage_logs 表');
    await execute('DROP TABLE IF EXISTS package_usage_logs');

    console.log('[Migration 009] 刪除 treatment_packages 表');
    await execute('DROP TABLE IF EXISTS treatment_packages');

    console.log('[Migration 009] 刪除 service_items 表');
    await execute('DROP TABLE IF EXISTS service_items');

    // 2. 移除組織模組設定
    console.log('[Migration 009] 移除組織模組設定');
    const organizations = await queryAll('SELECT id, settings FROM organizations');

    for (const org of organizations) {
      if (org.settings) {
        try {
          const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;

          if (settings.modules && settings.modules.treatmentPackages) {
            delete settings.modules.treatmentPackages;
            const settingsJson = JSON.stringify(settings);
            await execute('UPDATE organizations SET settings = ? WHERE id = ?', [settingsJson, org.id]);
            console.log(`[Migration 009] 已移除組織 ${org.id} 的療程追蹤模組設定`);
          }
        } catch (e) {
          console.warn(`[Migration 009] 組織 ${org.id} 的設定處理失敗`);
        }
      }
    }

    console.log('[Migration 009] 完成回滾');
    return true;
  } catch (error) {
    console.error('[Migration 009] 回滾失敗:', error);
    throw error;
  }
}

module.exports = {
  up,
  down,
  TREATMENT_MODULE
};
