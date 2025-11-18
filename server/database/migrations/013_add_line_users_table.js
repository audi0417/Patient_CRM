/**
 * Migration: 新增 LINE 用戶獨立表
 *
 * 目的：
 * - 將 LINE 好友與患者資料分離
 * - LINE 用戶可以選擇性綁定到患者
 * - 保留 LINE 個人資料（顯示名稱、頭像、狀態訊息）
 * - 支援未來擴充功能（標籤、備註等）
 */

const { queryAll, execute } = require('../helpers');

async function up(db, dbType) {
  console.log('[Migration 013] 開始：新增 LINE 用戶獨立表');

  const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

  // 資料類型映射
  const types = {
    text: 'TEXT',
    integer: 'INTEGER',
    real: 'REAL',
    boolean: isPostgres ? 'BOOLEAN' : 'INTEGER',
    timestamp: isPostgres ? 'TIMESTAMP' : 'TEXT',
    primaryKey: 'TEXT PRIMARY KEY',
    varcharLong: isPostgres ? 'VARCHAR(500)' : 'TEXT',
    varchar50: isPostgres ? 'VARCHAR(50)' : 'TEXT',
    varchar20: isPostgres ? 'VARCHAR(20)' : 'TEXT',
    varchar10: isPostgres ? 'VARCHAR(10)' : 'TEXT',
    json: isPostgres ? 'JSONB' : 'TEXT',
    date: isPostgres ? 'DATE' : 'TEXT'
  };

  // SQLite 需要特殊處理（不支援某些 ALTER TABLE 操作）
  const isSQLite = dbType === 'sqlite';

  const sqlStatements = [
    // 1. 建立 line_users 表
      `CREATE TABLE IF NOT EXISTS line_users (
        id ${types.primaryKey},
        "lineUserId" ${types.varcharLong} NOT NULL UNIQUE,
        "organizationId" ${types.varcharLong} NOT NULL,
        "displayName" ${types.varcharLong},
        "pictureUrl" ${types.text},
        "statusMessage" ${types.text},
        "language" ${types.varchar50},
        "patientId" ${types.varcharLong},
        "isActive" ${types.boolean} DEFAULT 1,
        "followedAt" ${types.timestamp},
        "unfollowedAt" ${types.timestamp},
        "lastInteractionAt" ${types.timestamp},
        tags ${types.json},
        notes ${types.text},
        "createdAt" ${types.timestamp} NOT NULL,
        "updatedAt" ${types.timestamp} NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE SET NULL
      )`,

      // 2. 建立索引
      `CREATE INDEX IF NOT EXISTS idx_line_users_line_user_id ON line_users("lineUserId")`,
      `CREATE INDEX IF NOT EXISTS idx_line_users_organization ON line_users("organizationId")`,
      `CREATE INDEX IF NOT EXISTS idx_line_users_patient ON line_users("patientId")`,

      // 3. 修改 conversations 表，關聯到 line_users 而非 patients
      // SQLite: 需要重建表
      isSQLite ? `
        -- SQLite: 建立臨時表
        CREATE TABLE conversations_new (
          id ${types.primaryKey},
          "lineUserId" ${types.varcharLong},
          "patientId" ${types.varcharLong},
          "organizationId" ${types.varcharLong} NOT NULL,
          status ${types.varchar50} DEFAULT 'ACTIVE',
          priority ${types.varchar50} DEFAULT 'MEDIUM',
          "lastMessageAt" ${types.timestamp},
          "lastMessagePreview" ${types.text},
          "unreadCount" ${types.integer} DEFAULT 0,
          "createdAt" ${types.timestamp} NOT NULL,
          "updatedAt" ${types.timestamp} NOT NULL,
          FOREIGN KEY ("lineUserId") REFERENCES line_users(id) ON DELETE CASCADE,
          FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
        )
      ` : '',

      // PostgreSQL: 直接 ALTER TABLE
      !isSQLite ? `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "lineUserId" ${types.varcharLong}` : '',
      !isSQLite ? `ALTER TABLE conversations ADD CONSTRAINT fk_conversations_line_user
                   FOREIGN KEY ("lineUserId") REFERENCES line_users(id) ON DELETE CASCADE` : '',

      // SQLite: 複製資料
      isSQLite ? `
        INSERT INTO conversations_new
        SELECT id, NULL as "lineUserId", "patientId", "organizationId", status, priority,
               "lastMessageAt", "lastMessagePreview", "unreadCount",
               "createdAt", "updatedAt"
        FROM conversations
      ` : '',

      // SQLite: 替換表
      isSQLite ? `DROP TABLE conversations` : '',
      isSQLite ? `ALTER TABLE conversations_new RENAME TO conversations` : '',

      // 4. 建立 conversations 索引（SQLite 需要重建）
      isSQLite ? `CREATE INDEX IF NOT EXISTS idx_conversations_line_user ON conversations("lineUserId")` : '',
      isSQLite ? `CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations("patientId")` : '',
      isSQLite ? `CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations("organizationId")` : '',
      isSQLite ? `CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status)` : '',

      // 5. 移除 patients 表的 lineUserId 欄位（已不需要）
      // SQLite: 建立臨時表
      isSQLite ? `
        CREATE TABLE patients_new (
          id ${types.primaryKey},
          name ${types.varcharLong} NOT NULL,
          phone ${types.varchar50},
          email ${types.varcharLong},
          birthDate ${types.date},
          gender ${types.varchar20},
          bloodType ${types.varchar10},
          address ${types.text},
          "emergencyContact" ${types.varcharLong},
          "emergencyPhone" ${types.varchar50},
          "medicalHistory" ${types.text},
          allergies ${types.text},
          notes ${types.text},
          "organizationId" ${types.varcharLong} NOT NULL,
          "createdAt" ${types.timestamp} NOT NULL,
          "updatedAt" ${types.timestamp} NOT NULL,
          FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
        )
      ` : '',

      // PostgreSQL: 直接 DROP COLUMN
      !isSQLite ? `ALTER TABLE patients DROP COLUMN IF EXISTS "lineUserId"` : '',

      // SQLite: 複製資料（排除 lineUserId）
      isSQLite ? `
        INSERT INTO patients_new
        SELECT id, name, phone, email, birthDate, gender, bloodType, address,
               "emergencyContact", "emergencyPhone", "medicalHistory", allergies, notes,
               "organizationId", "createdAt", "updatedAt"
        FROM patients
      ` : '',

      // SQLite: 替換表
      isSQLite ? `DROP TABLE patients` : '',
      isSQLite ? `ALTER TABLE patients_new RENAME TO patients` : '',

      // 6. 重建 patients 索引（SQLite）
      isSQLite ? `CREATE INDEX IF NOT EXISTS idx_patients_organization ON patients("organizationId")` : '',
      isSQLite ? `CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name)` : '',
      isSQLite ? `CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)` : '',
    ].filter(sql => sql); // 過濾空字串

  // 執行 SQL 語句
  for (const sql of sqlStatements) {
    if (sql.trim()) {
      await execute(sql);
    }
  }

  console.log('[Migration 013] 完成：LINE 用戶表已建立');
}

async function down(db, dbType) {
  console.log('[Migration 013] 回滾：移除 LINE 用戶表');

  const isPostgres = dbType === 'postgres' || dbType === 'postgresql';
  const isSQLite = dbType === 'sqlite';

  const types = {
    varcharLong: isPostgres ? 'VARCHAR(500)' : 'TEXT',
  };

  const sqlStatements = [
    // 回滾：恢復 patients 的 lineUserId 欄位
    !isSQLite ? `ALTER TABLE patients ADD COLUMN IF NOT EXISTS "lineUserId" ${types.varcharLong}` : '',

    // 移除 conversations 的 lineUserId 欄位
    !isSQLite ? `ALTER TABLE conversations DROP COLUMN IF EXISTS "lineUserId"` : '',

    // 刪除 line_users 表
    `DROP TABLE IF EXISTS line_users`,
  ].filter(sql => sql);

  // 執行 SQL 語句
  for (const sql of sqlStatements) {
    if (sql.trim()) {
      await execute(sql);
    }
  }

  console.log('[Migration 013] 回滾完成');
}

module.exports = { up, down };
