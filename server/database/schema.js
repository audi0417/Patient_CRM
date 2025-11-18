/**
 * Database Schema Definitions
 *
 * 定義資料庫結構，支援 SQLite 和 PostgreSQL
 * 包含所有功能的完整 Schema
 */

/**
 * 取得資料庫 Schema SQL
 * @param {string} dbType - 'sqlite' 或 'postgres'
 * @returns {string} SQL 語句
 */
function getSchemaSQL(dbType = 'sqlite') {
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
    date: isPostgres ? 'DATE' : 'TEXT',
    autoIncrement: isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'
  };

  // Boolean 預設值
  const boolTrue = isPostgres ? 'TRUE' : '1';
  const boolFalse = isPostgres ? 'FALSE' : '0';

  const createTablePrefix = 'CREATE TABLE IF NOT EXISTS';

  return `
    -- 組織表
    ${createTablePrefix} organizations (
      id ${types.primaryKey},
      name ${types.text} NOT NULL,
      slug ${types.text} UNIQUE NOT NULL,
      domain ${types.text},
      plan ${types.text} NOT NULL DEFAULT 'basic' CHECK(plan IN ('basic', 'professional', 'enterprise')),
      "maxUsers" ${types.integer} DEFAULT 5,
      "maxPatients" ${types.integer} DEFAULT 100,
      "isActive" ${types.boolean} DEFAULT ${boolTrue},
      settings ${types.text},
      "subscriptionStartDate" ${types.timestamp},
      "subscriptionEndDate" ${types.timestamp},
      "billingEmail" ${types.text},
      "contactName" ${types.text},
      "contactPhone" ${types.text},
      "contactEmail" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL
    );

    -- 使用者表
    ${createTablePrefix} users (
      id ${types.primaryKey},
      username ${types.text} UNIQUE NOT NULL,
      password ${types.text} NOT NULL,
      name ${types.text} NOT NULL,
      email ${types.text} UNIQUE NOT NULL,
      role ${types.text} NOT NULL CHECK(role IN ('super_admin', 'admin', 'user')),
      "isActive" ${types.boolean} DEFAULT ${boolTrue},
      "isFirstLogin" ${types.boolean} DEFAULT ${boolTrue},
      "lastLogin" ${types.timestamp},
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 模組設定表
    ${createTablePrefix} module_settings (
      id ${types.primaryKey},
      "organizationId" ${types.text} NOT NULL,
      "moduleName" ${types.text} NOT NULL,
      "isEnabled" ${types.boolean} DEFAULT ${boolFalse},
      settings ${types.json},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE("organizationId", "moduleName")
    );

    -- 患者表
    ${createTablePrefix} patients (
      id ${types.primaryKey},
      name ${types.text} NOT NULL,
      phone ${types.varchar50},
      email ${types.varcharLong},
      "birthDate" ${types.date},
      gender ${types.varchar20} CHECK(gender IN ('male', 'female', 'other')),
      "bloodType" ${types.varchar10},
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
    );

    -- 體組成記錄表
    ${createTablePrefix} body_composition (
      id ${types.primaryKey},
      "patientId" ${types.text} NOT NULL,
      date ${types.text} NOT NULL,
      weight ${types.real},
      height ${types.real},
      "bodyFat" ${types.real},
      "muscleMass" ${types.real},
      bmi ${types.real},
      "visceralFat" ${types.real},
      "boneMass" ${types.real},
      "bodyWater" ${types.real},
      bmr ${types.real},
      notes ${types.text},
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 生命徵象記錄表
    ${createTablePrefix} vital_signs (
      id ${types.primaryKey},
      "patientId" ${types.text} NOT NULL,
      date ${types.text} NOT NULL,
      "bloodPressureSystolic" ${types.integer},
      "bloodPressureDiastolic" ${types.integer},
      "heartRate" ${types.integer},
      temperature ${types.real},
      "respiratoryRate" ${types.integer},
      "oxygenSaturation" ${types.real},
      "bloodGlucose" ${types.real},
      notes ${types.text},
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 健康目標表
    ${createTablePrefix} goals (
      id ${types.primaryKey},
      "patientId" ${types.text} NOT NULL,
      category ${types.text} NOT NULL,
      title ${types.text} NOT NULL,
      description ${types.text},
      "currentValue" ${types.real},
      "targetValue" ${types.real} NOT NULL,
      unit ${types.text},
      "startDate" ${types.text} NOT NULL,
      "targetDate" ${types.text},
      status ${types.text} NOT NULL CHECK(status IN ('active', 'completed', 'cancelled', 'overdue')),
      progress ${types.integer} DEFAULT 0,
      milestones ${types.text},
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 預約表
    ${createTablePrefix} appointments (
      id ${types.primaryKey},
      "patientId" ${types.text} NOT NULL,
      date ${types.text} NOT NULL,
      time ${types.text} NOT NULL,
      type ${types.text} NOT NULL,
      notes ${types.text},
      status ${types.text} NOT NULL CHECK(status IN ('scheduled', 'completed', 'cancelled')),
      "reminderSent" ${types.boolean} DEFAULT ${boolFalse},
      "isRecurring" ${types.boolean} DEFAULT ${boolFalse},
      "recurringPattern" ${types.text},
      "recurringEndDate" ${types.text},
      "parentAppointmentId" ${types.text},
      "reminderDays" ${types.integer} DEFAULT 1,
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 標籤表
    ${createTablePrefix} tags (
      id ${types.primaryKey},
      name ${types.text} NOT NULL,
      color ${types.text} NOT NULL,
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 群組表
    ${createTablePrefix} groups (
      id ${types.primaryKey},
      name ${types.text} NOT NULL,
      description ${types.text},
      color ${types.text} NOT NULL,
      "patientIds" ${types.text},
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 服務類別表
    ${createTablePrefix} service_types (
      id ${types.primaryKey},
      name ${types.text} NOT NULL,
      description ${types.text},
      color ${types.text} NOT NULL,
      "isActive" ${types.boolean} DEFAULT ${boolTrue},
      "displayOrder" ${types.integer} DEFAULT 0,
      "organizationId" ${types.text} NOT NULL,
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE("organizationId", name)
    );

    -- 服務項目表
    ${createTablePrefix} service_items (
      id ${types.primaryKey},
      "serviceTypeId" ${types.text} NOT NULL,
      name ${types.text} NOT NULL,
      description ${types.text},
      price ${types.real} NOT NULL,
      duration ${types.integer},
      "isActive" ${types.boolean} DEFAULT ${boolTrue},
      "displayOrder" ${types.integer} DEFAULT 0,
      "organizationId" ${types.text} NOT NULL,
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("serviceTypeId") REFERENCES service_types(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 療程套裝表
    ${createTablePrefix} treatment_packages (
      id ${types.primaryKey},
      "patientId" ${types.text} NOT NULL,
      "packageName" ${types.text} NOT NULL,
      "totalSessions" ${types.integer} NOT NULL,
      "usedSessions" ${types.integer} DEFAULT 0,
      price ${types.real} NOT NULL,
      "purchaseDate" ${types.date} NOT NULL,
      "expiryDate" ${types.date},
      status ${types.varchar50} DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
      notes ${types.text},
      "organizationId" ${types.text} NOT NULL,
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 套裝使用記錄表
    ${createTablePrefix} package_usage_logs (
      id ${types.primaryKey},
      "packageId" ${types.text} NOT NULL,
      "patientId" ${types.text} NOT NULL,
      "usedAt" ${types.timestamp} NOT NULL,
      "sessionsUsed" ${types.integer} DEFAULT 1,
      notes ${types.text},
      "performedBy" ${types.text},
      "organizationId" ${types.text} NOT NULL,
      "createdAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("packageId") REFERENCES treatment_packages(id) ON DELETE CASCADE,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 諮詢記錄表
    ${createTablePrefix} consultations (
      id ${types.primaryKey},
      "patientId" ${types.text} NOT NULL,
      date ${types.text} NOT NULL,
      type ${types.text},
      "chiefComplaint" ${types.text},
      assessment ${types.text},
      plan ${types.text},
      notes ${types.text},
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- LINE 配置表
    ${createTablePrefix} line_configs (
      id ${types.primaryKey},
      "organizationId" ${types.text} NOT NULL,
      "channelId" ${types.text} NOT NULL,
      "channelSecret" ${types.text} NOT NULL,
      "accessToken" ${types.text} NOT NULL,
      "webhookUrl" ${types.text},
      "isActive" ${types.boolean} DEFAULT ${boolTrue},
      "autoReply" ${types.boolean} DEFAULT ${boolFalse},
      "autoReplyMessage" ${types.text},
      "welcomeMessage" ${types.text},
      "totalMessagesReceived" ${types.integer} DEFAULT 0,
      "totalMessagesSent" ${types.integer} DEFAULT 0,
      "lastActivityAt" ${types.timestamp},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE("organizationId")
    );

    -- LINE 用戶表（獨立於患者）
    ${createTablePrefix} line_users (
      id ${types.primaryKey},
      "lineUserId" ${types.varcharLong} NOT NULL UNIQUE,
      "organizationId" ${types.varcharLong} NOT NULL,
      "displayName" ${types.varcharLong},
      "pictureUrl" ${types.text},
      "statusMessage" ${types.text},
      "language" ${types.varchar50},
      "patientId" ${types.varcharLong},
      "isActive" ${types.boolean} DEFAULT ${boolTrue},
      "followedAt" ${types.timestamp},
      "unfollowedAt" ${types.timestamp},
      "lastInteractionAt" ${types.timestamp},
      tags ${types.json},
      notes ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE SET NULL
    );

    -- 對話管理表
    ${createTablePrefix} conversations (
      id ${types.primaryKey},
      "lineUserId" ${types.varcharLong},
      "patientId" ${types.varcharLong},
      "organizationId" ${types.varcharLong} NOT NULL,
      status ${types.varchar50} DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ARCHIVED', 'CLOSED')),
      priority ${types.varchar50} DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
      "lastMessageAt" ${types.timestamp},
      "lastMessagePreview" ${types.text},
      "unreadCount" ${types.integer} DEFAULT 0,
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("lineUserId") REFERENCES line_users(id) ON DELETE CASCADE,
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- LINE 訊息記錄表
    ${createTablePrefix} line_messages (
      id ${types.primaryKey},
      "conversationId" ${types.text},
      "organizationId" ${types.text} NOT NULL,
      "messageType" ${types.text} NOT NULL CHECK("messageType" IN ('TEXT', 'STICKER', 'IMAGE', 'SYSTEM')),
      "messageContent" ${types.text} NOT NULL,
      "senderId" ${types.text},
      "recipientId" ${types.text},
      "senderType" ${types.text} NOT NULL CHECK("senderType" IN ('PATIENT', 'ADMIN', 'SYSTEM')),
      "recipientType" ${types.text} CHECK("recipientType" IN ('PATIENT', 'ADMIN')),
      "lineMessageId" ${types.text},
      "replyToken" ${types.text},
      status ${types.text} NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED')),
      "errorMessage" ${types.text},
      metadata ${types.json},
      "isReply" ${types.boolean} DEFAULT ${boolFalse},
      "readAt" ${types.timestamp},
      "sentAt" ${types.timestamp},
      "createdAt" ${types.timestamp} NOT NULL,
      FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- 遷移追蹤表
    ${createTablePrefix} migrations (
      id ${types.autoIncrement},
      name ${types.text} NOT NULL UNIQUE,
      executed_at ${types.timestamp} DEFAULT CURRENT_TIMESTAMP
    );
  `;
}

/**
 * 取得索引 SQL
 * @param {string} dbType - 'sqlite' 或 'postgres'
 * @returns {string} SQL 語句
 */
function getIndexesSQL(dbType = 'sqlite') {
  return `
    -- 基本索引
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_body_composition_patient ON body_composition("patientId", date);
    CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs("patientId", date);
    CREATE INDEX IF NOT EXISTS idx_goals_patient ON goals("patientId", status);
    CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments("patientId", date);
    CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations("patientId", date);

    -- 多租戶複合索引
    CREATE INDEX IF NOT EXISTS idx_users_org ON users("organizationId", "isActive");
    CREATE INDEX IF NOT EXISTS idx_users_org_username ON users("organizationId", username);
    CREATE INDEX IF NOT EXISTS idx_module_settings_org ON module_settings("organizationId", "moduleName");
    CREATE INDEX IF NOT EXISTS idx_patients_org ON patients("organizationId");
    CREATE INDEX IF NOT EXISTS idx_patients_org_name ON patients("organizationId", name);
    CREATE INDEX IF NOT EXISTS idx_patients_org_updated ON patients("organizationId", "updatedAt" DESC);
    CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments("organizationId");
    CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments("organizationId", date, time);
    CREATE INDEX IF NOT EXISTS idx_appointments_org_patient ON appointments("organizationId", "patientId");
    CREATE INDEX IF NOT EXISTS idx_appointments_org_status ON appointments("organizationId", status);
    CREATE INDEX IF NOT EXISTS idx_body_composition_org ON body_composition("organizationId");
    CREATE INDEX IF NOT EXISTS idx_body_composition_org_patient ON body_composition("organizationId", "patientId", date DESC);
    CREATE INDEX IF NOT EXISTS idx_vital_signs_org ON vital_signs("organizationId");
    CREATE INDEX IF NOT EXISTS idx_vital_signs_org_patient ON vital_signs("organizationId", "patientId", date DESC);
    CREATE INDEX IF NOT EXISTS idx_goals_org ON goals("organizationId");
    CREATE INDEX IF NOT EXISTS idx_goals_org_patient ON goals("organizationId", "patientId", status);
    CREATE INDEX IF NOT EXISTS idx_consultations_org ON consultations("organizationId");
    CREATE INDEX IF NOT EXISTS idx_consultations_org_patient ON consultations("organizationId", "patientId", date DESC);
    CREATE INDEX IF NOT EXISTS idx_service_types_org ON service_types("organizationId", "isActive");
    CREATE INDEX IF NOT EXISTS idx_service_items_org ON service_items("organizationId", "isActive");
    CREATE INDEX IF NOT EXISTS idx_service_items_type ON service_items("serviceTypeId");
    CREATE INDEX IF NOT EXISTS idx_treatment_packages_patient ON treatment_packages("patientId", status);
    CREATE INDEX IF NOT EXISTS idx_treatment_packages_org ON treatment_packages("organizationId", status);
    CREATE INDEX IF NOT EXISTS idx_treatment_packages_org_patient ON treatment_packages("organizationId", "patientId");
    CREATE INDEX IF NOT EXISTS idx_package_usage_logs_package ON package_usage_logs("packageId", "usedAt" DESC);
    CREATE INDEX IF NOT EXISTS idx_package_usage_logs_patient ON package_usage_logs("patientId", "usedAt" DESC);
    CREATE INDEX IF NOT EXISTS idx_package_usage_logs_org ON package_usage_logs("organizationId");
    CREATE INDEX IF NOT EXISTS idx_tags_org ON tags("organizationId");
    CREATE INDEX IF NOT EXISTS idx_groups_org ON groups("organizationId");

    -- LINE 整合索引
    CREATE INDEX IF NOT EXISTS idx_line_configs_org ON line_configs("organizationId", "isActive");
    CREATE INDEX IF NOT EXISTS idx_line_users_line_user_id ON line_users("lineUserId");
    CREATE INDEX IF NOT EXISTS idx_line_users_organization ON line_users("organizationId");
    CREATE INDEX IF NOT EXISTS idx_line_users_patient ON line_users("patientId");
    CREATE INDEX IF NOT EXISTS idx_conversations_line_user ON conversations("lineUserId");
    CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations("patientId");
    CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations("organizationId");
    CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
    CREATE INDEX IF NOT EXISTS idx_conversations_org_status ON conversations("organizationId", status);
    CREATE INDEX IF NOT EXISTS idx_line_messages_conversation ON line_messages("conversationId", "createdAt" DESC);
    CREATE INDEX IF NOT EXISTS idx_line_messages_org ON line_messages("organizationId");
    CREATE INDEX IF NOT EXISTS idx_line_messages_line_id ON line_messages("lineMessageId");
  `;
}

module.exports = {
  getSchemaSQL,
  getIndexesSQL
};
