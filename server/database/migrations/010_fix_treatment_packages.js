/**
 * Migration Fix: 強制重建 treatment_packages 相關表
 *
 * 目的：修正 patientId 型別錯誤問題
 * 原因：先前的 migration 009 因為 patientId 使用 INTEGER 型別但 patients.id 是 VARCHAR
 *       導致外鍵約束失敗，只建立了 service_items 表
 */

const { queryAll, execute } = require('../helpers');

/**
 * 取得資料庫類型
 */
function getDatabaseType() {
  return (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
}

async function up() {
  console.log('[Migration 009-fix] 開始：修正 treatment_packages 表');
  const dbType = getDatabaseType();

  try {
    // 1. 先刪除可能存在的舊表（如果存在的話）
    console.log('[Migration 009-fix] 清理舊表');
    try {
      await execute('DROP TABLE IF EXISTS package_usage_logs');
      await execute('DROP TABLE IF EXISTS treatment_packages');
    } catch (e) {
      console.log('[Migration 009-fix] 清理舊表時發生錯誤（可能不存在）:', e.message);
    }

    // 2. 重新建立 treatment_packages 表（使用正確的 patientId 型別）
    console.log('[Migration 009-fix] 建立 treatment_packages 表');

    if (dbType === 'postgres') {
      await execute(`
        CREATE TABLE IF NOT EXISTS treatment_packages (
          id SERIAL PRIMARY KEY,
          "organizationId" INTEGER NOT NULL,
          "patientId" VARCHAR(255) NOT NULL,

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
          patientId VARCHAR(255) NOT NULL,

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

    // 3. 建立 package_usage_logs 表
    console.log('[Migration 009-fix] 建立 package_usage_logs 表');

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

    console.log('[Migration 009-fix] 完成：表已成功建立');
    return true;
  } catch (error) {
    console.error('[Migration 009-fix] 失敗:', error);
    throw error;
  }
}

async function down() {
  console.log('[Migration 009-fix] 開始回滾');

  try {
    await execute('DROP TABLE IF EXISTS package_usage_logs');
    await execute('DROP TABLE IF EXISTS treatment_packages');

    console.log('[Migration 009-fix] 完成回滾');
    return true;
  } catch (error) {
    console.error('[Migration 009-fix] 回滾失敗:', error);
    throw error;
  }
}

module.exports = {
  up,
  down
};
