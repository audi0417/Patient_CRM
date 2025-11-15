/**
 * Database Schema Definitions
 *
 * 定義資料庫結構，支援 SQLite 和 PostgreSQL
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
    text: isPostgres ? 'TEXT' : 'TEXT',
    integer: isPostgres ? 'INTEGER' : 'INTEGER',
    real: isPostgres ? 'REAL' : 'REAL',
    boolean: isPostgres ? 'BOOLEAN' : 'INTEGER',
    timestamp: isPostgres ? 'TIMESTAMP' : 'TEXT',
    primaryKey: isPostgres ? 'TEXT PRIMARY KEY' : 'TEXT PRIMARY KEY',
    autoIncrement: isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'
  };

  // Boolean 預設值
  const boolTrue = isPostgres ? 'TRUE' : '1';
  const boolFalse = isPostgres ? 'FALSE' : '0';

  // 如果是 PostgreSQL，使用 IF NOT EXISTS 替代方案
  const createTablePrefix = isPostgres ? 'CREATE TABLE IF NOT EXISTS' : 'CREATE TABLE IF NOT EXISTS';

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
      "updatedAt" ${types.timestamp} NOT NULL
    );

    -- 患者表
    ${createTablePrefix} patients (
      id ${types.primaryKey},
      name ${types.text} NOT NULL,
      gender ${types.text} CHECK(gender IN ('male', 'female', 'other')),
      "birthDate" ${types.text},
      phone ${types.text},
      email ${types.text},
      address ${types.text},
      "emergencyContact" ${types.text},
      "emergencyPhone" ${types.text},
      notes ${types.text},
      tags ${types.text},
      groups ${types.text},
      "healthProfile" ${types.text},
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL
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
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE
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
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE
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
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE
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
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE
    );

    -- 標籤表
    ${createTablePrefix} tags (
      id ${types.primaryKey},
      name ${types.text} UNIQUE NOT NULL,
      color ${types.text} NOT NULL,
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL
    );

    -- 群組表
    ${createTablePrefix} groups (
      id ${types.primaryKey},
      name ${types.text} UNIQUE NOT NULL,
      description ${types.text},
      color ${types.text} NOT NULL,
      "patientIds" ${types.text},
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL
    );

    -- 服務類別表
    ${createTablePrefix} service_types (
      id ${types.primaryKey},
      name ${types.text} UNIQUE NOT NULL,
      description ${types.text},
      color ${types.text} NOT NULL,
      "isActive" ${types.boolean} DEFAULT ${boolTrue},
      "displayOrder" ${types.integer} DEFAULT 0,
      "organizationId" ${types.text},
      "createdAt" ${types.timestamp} NOT NULL,
      "updatedAt" ${types.timestamp} NOT NULL
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
      FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE
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
    CREATE INDEX IF NOT EXISTS idx_body_composition_patient ON body_composition("patientId", date);
    CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs("patientId", date);
    CREATE INDEX IF NOT EXISTS idx_goals_patient ON goals("patientId", status);
    CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments("patientId", date);
    CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations("patientId", date);

    -- 多租戶複合索引
    CREATE INDEX IF NOT EXISTS idx_users_org ON users("organizationId", "isActive");
    CREATE INDEX IF NOT EXISTS idx_users_org_username ON users("organizationId", username);
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
    CREATE INDEX IF NOT EXISTS idx_tags_org ON tags("organizationId");
    CREATE INDEX IF NOT EXISTS idx_groups_org ON groups("organizationId");
  `;
}

module.exports = {
  getSchemaSQL,
  getIndexesSQL
};
