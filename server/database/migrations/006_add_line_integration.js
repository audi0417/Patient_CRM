/**
 * Migration: 新增 Line 整合功能
 *
 * 目的：為每個組織提供 Line@ 整合能力
 * 影響範圍：
 * - 新增 line_configs 表（組織級 Line 配置）
 * - 新增 line_messages 表（Line 訊息記錄）
 * - 新增 conversations 表（對話管理）
 * - 修改 patients 表（新增 lineUserId 欄位）
 */

const { queryAll, execute } = require('../helpers');

/**
 * 執行遷移
 */
async function up(db, dbType) {
  console.log('[Migration 006] 開始：新增 Line 整合功能');

  const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

  // 資料類型映射
  const types = {
    text: 'TEXT',
    integer: 'INTEGER',
    real: 'REAL',
    boolean: isPostgres ? 'BOOLEAN' : 'INTEGER',
    timestamp: isPostgres ? 'TIMESTAMP' : 'TEXT',
    primaryKey: 'TEXT PRIMARY KEY'
  };

  const boolTrue = isPostgres ? 'TRUE' : '1';
  const boolFalse = isPostgres ? 'FALSE' : '0';
  const createTablePrefix = 'CREATE TABLE IF NOT EXISTS';

  try {
    // 1. 建立 line_configs 表（組織級 Line 配置）
    await execute(`
      ${createTablePrefix} line_configs (
        id ${types.primaryKey},
        "organizationId" ${types.text} UNIQUE NOT NULL,

        -- Line Channel 認證資料（加密儲存）
        "channelId" ${types.text} NOT NULL,
        "channelSecret" ${types.text} NOT NULL,
        "accessToken" ${types.text} NOT NULL,

        -- Webhook 設定
        "webhookUrl" ${types.text},

        -- 狀態
        "isActive" ${types.boolean} DEFAULT ${boolTrue},
        "isVerified" ${types.boolean} DEFAULT ${boolFalse},
        "lastVerifiedAt" ${types.timestamp},

        -- 功能設定（JSON 格式）
        "enabledFeatures" ${types.text},

        -- 訊息統計
        "messagesSentToday" ${types.integer} DEFAULT 0,
        "messagesSentThisMonth" ${types.integer} DEFAULT 0,
        "totalMessagesSent" ${types.integer} DEFAULT 0,
        "totalMessagesReceived" ${types.integer} DEFAULT 0,

        -- 訊息限制
        "dailyMessageLimit" ${types.integer} DEFAULT 1000,
        "monthlyMessageLimit" ${types.integer} DEFAULT 30000,

        -- 監控
        "lastActivityAt" ${types.timestamp},
        "lastError" ${types.text},
        "errorCount" ${types.integer} DEFAULT 0,
        "lastErrorAt" ${types.timestamp},

        -- 追蹤
        "configuredById" ${types.text},
        "configuredAt" ${types.timestamp},
        "createdAt" ${types.timestamp} NOT NULL,
        "updatedAt" ${types.timestamp} NOT NULL,

        FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 006] ✓ line_configs 表已建立');

    // 2. 建立 conversations 表（對話管理）
    await execute(`
      ${createTablePrefix} conversations (
        id ${types.primaryKey},
        "patientId" ${types.text} NOT NULL,
        "organizationId" ${types.text} NOT NULL,

        -- 對話狀態
        status ${types.text} DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ARCHIVED', 'CLOSED')),
        priority ${types.text} DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),

        -- 訊息統計
        "unreadCount" ${types.integer} DEFAULT 0,
        "lastMessageAt" ${types.timestamp},
        "lastMessagePreview" ${types.text},

        -- 追蹤
        "createdAt" ${types.timestamp} NOT NULL,
        "updatedAt" ${types.timestamp} NOT NULL,

        FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 006] ✓ conversations 表已建立');

    // 3. 建立 line_messages 表（訊息記錄）
    await execute(`
      ${createTablePrefix} line_messages (
        id ${types.primaryKey},
        "conversationId" ${types.text},
        "organizationId" ${types.text} NOT NULL,

        -- 訊息類型
        "messageType" ${types.text} NOT NULL CHECK("messageType" IN ('TEXT', 'STICKER', 'IMAGE', 'SYSTEM')),
        "messageContent" ${types.text} NOT NULL,

        -- 發送者和接收者
        "senderId" ${types.text},
        "recipientId" ${types.text},
        "senderType" ${types.text} NOT NULL CHECK("senderType" IN ('PATIENT', 'ADMIN', 'SYSTEM')),
        "recipientType" ${types.text} CHECK("recipientType" IN ('PATIENT', 'ADMIN')),

        -- Line 訊息追蹤
        "lineMessageId" ${types.text},
        "replyToken" ${types.text},

        -- 狀態
        status ${types.text} DEFAULT 'SENT' CHECK(status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),

        -- 時間戳記
        "sentAt" ${types.timestamp} NOT NULL,
        "deliveredAt" ${types.timestamp},
        "readAt" ${types.timestamp},

        -- 引用和回覆
        "isReply" ${types.boolean} DEFAULT ${boolFalse},
        "quotedMessageId" ${types.text},

        -- 後設資料（JSON 格式，如貼圖資訊）
        metadata ${types.text},

        -- 錯誤處理
        "retryCount" ${types.integer} DEFAULT 0,
        "errorMessage" ${types.text},

        "createdAt" ${types.timestamp} NOT NULL,

        FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 006] ✓ line_messages 表已建立');

    // 4. 修改 patients 表，新增 lineUserId 欄位
    // 首先檢查欄位是否已存在
    const checkColumnSql = isPostgres
      ? `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'patients' AND column_name = 'lineUserId'`
      : `PRAGMA table_info(patients)`;

    const columns = await queryAll(checkColumnSql);

    let columnExists = false;
    if (isPostgres) {
      columnExists = columns.length > 0;
    } else {
      columnExists = columns.some(col => col.name === 'lineUserId');
    }

    if (!columnExists) {
      await execute(`ALTER TABLE patients ADD COLUMN "lineUserId" ${types.text}`);
      console.log('[Migration 006] ✓ patients 表已新增 lineUserId 欄位');
    } else {
      console.log('[Migration 006] ⊙ patients.lineUserId 欄位已存在，跳過');
    }

    // 5. 建立索引
    await execute(`CREATE INDEX IF NOT EXISTS idx_line_configs_org ON line_configs("organizationId")`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations("patientId")`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations("organizationId", status)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_line_messages_conversation ON line_messages("conversationId", "sentAt" DESC)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_line_messages_org ON line_messages("organizationId")`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_line_messages_line_id ON line_messages("lineMessageId")`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_patients_line_user ON patients("lineUserId")`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_patients_org_line ON patients("organizationId", "lineUserId")`);
    console.log('[Migration 006] ✓ 索引已建立');

    console.log('[Migration 006] 完成：Line 整合功能已新增');
    return true;
  } catch (error) {
    console.error('[Migration 006] 失敗:', error);
    throw error;
  }
}

/**
 * 回滾遷移
 */
async function down(db, dbType) {
  console.log('[Migration 006] 開始回滾：移除 Line 整合功能');

  const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

  try {
    // 刪除索引
    await execute(`DROP INDEX IF EXISTS idx_line_configs_org`);
    await execute(`DROP INDEX IF EXISTS idx_conversations_patient`);
    await execute(`DROP INDEX IF EXISTS idx_conversations_org`);
    await execute(`DROP INDEX IF EXISTS idx_line_messages_conversation`);
    await execute(`DROP INDEX IF EXISTS idx_line_messages_org`);
    await execute(`DROP INDEX IF EXISTS idx_line_messages_line_id`);
    await execute(`DROP INDEX IF EXISTS idx_patients_line_user`);
    await execute(`DROP INDEX IF EXISTS idx_patients_org_line`);

    // 刪除表
    await execute(`DROP TABLE IF EXISTS line_messages`);
    await execute(`DROP TABLE IF EXISTS conversations`);
    await execute(`DROP TABLE IF EXISTS line_configs`);

    // 移除 patients.lineUserId 欄位（SQLite 不支援 DROP COLUMN，PostgreSQL 支援）
    if (isPostgres) {
      await execute(`ALTER TABLE patients DROP COLUMN IF EXISTS "lineUserId"`);
    } else {
      console.log('[Migration 006] ⚠ SQLite 不支援 DROP COLUMN，請手動處理 patients.lineUserId');
    }

    console.log('[Migration 006] 完成回滾');
    return true;
  } catch (error) {
    console.error('[Migration 006] 回滾失敗:', error);
    throw error;
  }
}

module.exports = {
  up,
  down
};
