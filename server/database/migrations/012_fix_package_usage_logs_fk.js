/**
 * Migration: 修正 package_usage_logs 的外鍵約束
 *
 * 目的：移除 serviceItemId 的外鍵約束，因為它是療程方案內部的項目識別碼，
 *      而非對 service_items 表的引用
 * 影響範圍：package_usage_logs 表
 */

const { execute, queryAll } = require('../helpers');

/**
 * 取得資料庫類型
 */
function getDatabaseType() {
  return (process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
}

/**
 * 執行遷移
 */
async function up() {
  console.log('[Migration 012] 開始：修正 package_usage_logs 外鍵約束');
  const dbType = getDatabaseType();
  const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

  try {
    if (isPostgres) {
      // PostgreSQL: 可以直接刪除外鍵約束
      console.log('[Migration 012] PostgreSQL: 刪除 serviceItemId 外鍵約束');

      // 先查找外鍵約束名稱
      const fkResult = await queryAll(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'package_usage_logs'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%serviceItemId%'
      `);

      if (fkResult && fkResult.length > 0) {
        const constraintName = fkResult[0].constraint_name;
        await execute(`ALTER TABLE package_usage_logs DROP CONSTRAINT "${constraintName}"`);
        console.log(`[Migration 012] 已刪除約束: ${constraintName}`);
      } else {
        console.log('[Migration 012] 未找到 serviceItemId 外鍵約束，可能已被刪除');
      }

    } else {
      // SQLite: 需要重建表（因為 SQLite 不支援 DROP CONSTRAINT）
      console.log('[Migration 012] SQLite: 重建 package_usage_logs 表');

      // 1. 備份現有資料
      const existingLogs = await queryAll('SELECT * FROM package_usage_logs');
      console.log(`[Migration 012] 備份了 ${existingLogs.length} 筆使用記錄`);

      // 2. 刪除舊表
      await execute('DROP TABLE IF EXISTS package_usage_logs');

      // 3. 建立新表（移除 serviceItemId 的外鍵約束）
      await execute(`
        CREATE TABLE package_usage_logs (
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
          FOREIGN KEY (performedBy) REFERENCES users(id),
          FOREIGN KEY (appointmentId) REFERENCES appointments(id),
          FOREIGN KEY (createdBy) REFERENCES users(id)
        )
      `);

      console.log('[Migration 012] 已建立新的 package_usage_logs 表（無 serviceItemId 外鍵）');

      // 4. 重建索引
      await execute(`
        CREATE INDEX IF NOT EXISTS idx_package_usage_logs_package
        ON package_usage_logs(packageId)
      `);
      await execute(`
        CREATE INDEX IF NOT EXISTS idx_package_usage_logs_date
        ON package_usage_logs(usageDate)
      `);

      console.log('[Migration 012] 已重建索引');

      // 5. 還原資料（如果有的話）
      if (existingLogs.length > 0) {
        for (const log of existingLogs) {
          await execute(`
            INSERT INTO package_usage_logs
            (id, organizationId, packageId, serviceItemId, usageDate, quantity,
             performedBy, notes, appointmentId, createdBy, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            log.id,
            log.organizationId,
            log.packageId,
            log.serviceItemId,
            log.usageDate,
            log.quantity,
            log.performedBy,
            log.notes,
            log.appointmentId,
            log.createdBy,
            log.createdAt
          ]);
        }
        console.log(`[Migration 012] 已還原 ${existingLogs.length} 筆資料`);
      }
    }

    console.log('[Migration 012] 完成：package_usage_logs 外鍵約束已修正');
    console.log('[Migration 012] serviceItemId 現在是內部識別碼，不再強制引用 service_items 表');
    return true;
  } catch (error) {
    console.error('[Migration 012] 失敗:', error);
    throw error;
  }
}

/**
 * 回滾遷移
 */
async function down() {
  console.log('[Migration 012] 開始回滾：恢復 serviceItemId 外鍵約束');
  const dbType = getDatabaseType();
  const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

  try {
    if (isPostgres) {
      // PostgreSQL: 重新加入外鍵約束
      await execute(`
        ALTER TABLE package_usage_logs
        ADD CONSTRAINT fk_package_usage_logs_service_item
        FOREIGN KEY ("serviceItemId") REFERENCES service_items(id)
      `);
      console.log('[Migration 012] 已恢復 serviceItemId 外鍵約束');

    } else {
      // SQLite: 需要重建表
      console.log('[Migration 012] SQLite 回滾需要重建表，建議使用 migration 010');
    }

    console.log('[Migration 012] 完成回滾');
    return true;
  } catch (error) {
    console.error('[Migration 012] 回滾失敗:', error);
    throw error;
  }
}

module.exports = { up, down };
