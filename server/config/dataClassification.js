/**
 * 資料分類配置
 *
 * 定義系統中所有資料的敏感度分類層級
 * 用於存取控制、審計日誌和合規報告
 *
 * 分類層級：
 * - PUBLIC: 公開資料，任何人都可以存取
 * - INTERNAL: 內部資料，僅限組織內部人員
 * - CONFIDENTIAL: 機密資料，需要特定權限
 * - RESTRICTED: 高度機密，僅限授權人員，需要審計追蹤
 */

/**
 * 資料分類層級定義
 */
const DataClassification = {
  PUBLIC: 'PUBLIC',           // 公開資料
  INTERNAL: 'INTERNAL',       // 內部資料
  CONFIDENTIAL: 'CONFIDENTIAL', // 機密資料
  RESTRICTED: 'RESTRICTED'    // 高度機密
};

/**
 * 資料分類層級優先級（數字越大越敏感）
 */
const ClassificationPriority = {
  [DataClassification.PUBLIC]: 1,
  [DataClassification.INTERNAL]: 2,
  [DataClassification.CONFIDENTIAL]: 3,
  [DataClassification.RESTRICTED]: 4
};

/**
 * 資料表分類
 * 定義每個資料表的整體敏感度分類
 */
const TableClassification = {
  // PUBLIC - 公開或低敏感度資料
  organizations: DataClassification.PUBLIC,
  service_types: DataClassification.PUBLIC,
  module_settings: DataClassification.INTERNAL,

  // INTERNAL - 組織內部資料
  users: DataClassification.INTERNAL,
  appointments: DataClassification.INTERNAL,
  tags: DataClassification.INTERNAL,
  groups: DataClassification.INTERNAL,
  service_items: DataClassification.INTERNAL,
  treatment_packages: DataClassification.INTERNAL,

  // CONFIDENTIAL - 機密資料（病患身份資訊）
  patients: DataClassification.CONFIDENTIAL,

  // RESTRICTED - 高度機密（醫療紀錄）
  consultations: DataClassification.RESTRICTED,
  body_composition: DataClassification.RESTRICTED,
  vital_signs: DataClassification.RESTRICTED,
  goals: DataClassification.RESTRICTED,

  // 審計與系統資料
  audit_logs: DataClassification.RESTRICTED,
  refresh_tokens: DataClassification.RESTRICTED,
  token_blacklist: DataClassification.RESTRICTED
};

/**
 * 欄位級分類
 * 定義每個欄位的具體敏感度（可能高於或等於資料表分類）
 */
const FieldClassification = {
  // ========================================================================
  // PATIENTS 表 - 病患資料
  // ========================================================================
  patients: {
    // 基本欄位 - PUBLIC/INTERNAL
    id: DataClassification.PUBLIC,
    organizationId: DataClassification.INTERNAL,
    createdAt: DataClassification.INTERNAL,
    updatedAt: DataClassification.INTERNAL,

    // 個人身份資訊 - CONFIDENTIAL
    name: DataClassification.CONFIDENTIAL,
    phone: DataClassification.CONFIDENTIAL,
    email: DataClassification.CONFIDENTIAL,
    birthDate: DataClassification.CONFIDENTIAL,
    gender: DataClassification.CONFIDENTIAL,
    address: DataClassification.CONFIDENTIAL,
    emergencyPhone: DataClassification.CONFIDENTIAL,

    // 敏感醫療資訊 - RESTRICTED
    bloodType: DataClassification.RESTRICTED,
    emergencyContact: DataClassification.RESTRICTED,
    medicalHistory: DataClassification.RESTRICTED,
    allergies: DataClassification.RESTRICTED,
    notes: DataClassification.RESTRICTED,
    healthProfile: DataClassification.RESTRICTED,

    // 分類標籤 - INTERNAL
    tags: DataClassification.INTERNAL,
    groups: DataClassification.INTERNAL,

    // 加密標記 - INTERNAL
    _encrypted: DataClassification.INTERNAL
  },

  // ========================================================================
  // CONSULTATIONS 表 - 諮詢記錄
  // ========================================================================
  consultations: {
    // 基本欄位
    id: DataClassification.PUBLIC,
    patientId: DataClassification.CONFIDENTIAL,
    organizationId: DataClassification.INTERNAL,
    date: DataClassification.CONFIDENTIAL,
    type: DataClassification.CONFIDENTIAL,
    createdAt: DataClassification.INTERNAL,
    updatedAt: DataClassification.INTERNAL,

    // 臨床資訊 - 全部 RESTRICTED
    chiefComplaint: DataClassification.RESTRICTED,
    assessment: DataClassification.RESTRICTED,
    plan: DataClassification.RESTRICTED,
    notes: DataClassification.RESTRICTED,

    // 加密標記
    _encrypted: DataClassification.INTERNAL
  },

  // ========================================================================
  // BODY_COMPOSITION 表 - 體組成記錄
  // ========================================================================
  body_composition: {
    id: DataClassification.PUBLIC,
    patientId: DataClassification.CONFIDENTIAL,
    organizationId: DataClassification.INTERNAL,
    date: DataClassification.CONFIDENTIAL,
    createdAt: DataClassification.INTERNAL,

    // 健康數據 - RESTRICTED
    weight: DataClassification.RESTRICTED,
    height: DataClassification.RESTRICTED,
    bmi: DataClassification.RESTRICTED,
    bodyFat: DataClassification.RESTRICTED,
    muscleMass: DataClassification.RESTRICTED,
    boneMass: DataClassification.RESTRICTED,
    bodyWater: DataClassification.RESTRICTED,
    bmr: DataClassification.RESTRICTED,
    visceralFat: DataClassification.RESTRICTED,
    notes: DataClassification.RESTRICTED
  },

  // ========================================================================
  // VITAL_SIGNS 表 - 生命徵象記錄
  // ========================================================================
  vital_signs: {
    id: DataClassification.PUBLIC,
    patientId: DataClassification.CONFIDENTIAL,
    organizationId: DataClassification.INTERNAL,
    date: DataClassification.CONFIDENTIAL,
    createdAt: DataClassification.INTERNAL,

    // 生命徵象 - RESTRICTED
    systolic: DataClassification.RESTRICTED,
    diastolic: DataClassification.RESTRICTED,
    heartRate: DataClassification.RESTRICTED,
    temperature: DataClassification.RESTRICTED,
    respiratoryRate: DataClassification.RESTRICTED,
    oxygenSaturation: DataClassification.RESTRICTED,
    bloodGlucose: DataClassification.RESTRICTED,
    notes: DataClassification.RESTRICTED
  },

  // ========================================================================
  // GOALS 表 - 健康目標
  // ========================================================================
  goals: {
    id: DataClassification.PUBLIC,
    patientId: DataClassification.CONFIDENTIAL,
    organizationId: DataClassification.INTERNAL,
    createdAt: DataClassification.INTERNAL,
    updatedAt: DataClassification.INTERNAL,

    // 目標資訊 - RESTRICTED
    type: DataClassification.RESTRICTED,
    description: DataClassification.RESTRICTED,
    targetValue: DataClassification.RESTRICTED,
    currentValue: DataClassification.RESTRICTED,
    unit: DataClassification.RESTRICTED,
    deadline: DataClassification.RESTRICTED,
    status: DataClassification.RESTRICTED,
    progress: DataClassification.RESTRICTED,
    milestones: DataClassification.RESTRICTED
  },

  // ========================================================================
  // APPOINTMENTS 表 - 預約記錄
  // ========================================================================
  appointments: {
    id: DataClassification.PUBLIC,
    patientId: DataClassification.CONFIDENTIAL,
    organizationId: DataClassification.INTERNAL,
    createdAt: DataClassification.INTERNAL,
    updatedAt: DataClassification.INTERNAL,

    // 預約資訊 - INTERNAL
    date: DataClassification.INTERNAL,
    time: DataClassification.INTERNAL,
    type: DataClassification.INTERNAL,
    status: DataClassification.INTERNAL,
    notes: DataClassification.CONFIDENTIAL,
    serviceTypeId: DataClassification.INTERNAL
  },

  // ========================================================================
  // USERS 表 - 使用者
  // ========================================================================
  users: {
    id: DataClassification.PUBLIC,
    organizationId: DataClassification.INTERNAL,
    createdAt: DataClassification.INTERNAL,
    updatedAt: DataClassification.INTERNAL,
    lastLogin: DataClassification.INTERNAL,

    // 使用者資訊 - INTERNAL
    username: DataClassification.INTERNAL,
    name: DataClassification.INTERNAL,
    email: DataClassification.INTERNAL,
    role: DataClassification.INTERNAL,
    isActive: DataClassification.INTERNAL,
    isFirstLogin: DataClassification.INTERNAL,

    // 敏感資訊 - RESTRICTED
    password: DataClassification.RESTRICTED, // 永不返回給前端
    createdBy: DataClassification.INTERNAL
  },

  // ========================================================================
  // AUDIT_LOGS 表 - 審計日誌
  // ========================================================================
  audit_logs: {
    // 審計日誌全部為 RESTRICTED
    id: DataClassification.RESTRICTED,
    timestamp: DataClassification.RESTRICTED,
    userId: DataClassification.RESTRICTED,
    username: DataClassification.RESTRICTED,
    userRole: DataClassification.RESTRICTED,
    organizationId: DataClassification.RESTRICTED,
    action: DataClassification.RESTRICTED,
    resource: DataClassification.RESTRICTED,
    resourceId: DataClassification.RESTRICTED,
    details: DataClassification.RESTRICTED,
    ipAddress: DataClassification.RESTRICTED,
    userAgent: DataClassification.RESTRICTED,
    status: DataClassification.RESTRICTED,
    errorMessage: DataClassification.RESTRICTED
  }
};

/**
 * 欄位用途說明（用於合規文檔）
 */
const FieldPurpose = {
  patients: {
    name: '識別病患身份',
    phone: '聯繫病患',
    email: '電子郵件通知',
    birthDate: '年齡計算、未成年判定',
    medicalHistory: '臨床診斷參考',
    allergies: '用藥安全',
    emergencyContact: '緊急情況聯繫',
    bloodType: '緊急醫療參考'
  },
  consultations: {
    chiefComplaint: '診斷依據',
    assessment: '臨床評估',
    plan: '治療計劃',
    notes: '診療記錄'
  }
};

/**
 * 取得資料表的分類層級
 * @param {string} tableName - 資料表名稱
 * @returns {string} 分類層級
 */
function getTableClassification(tableName) {
  return TableClassification[tableName] || DataClassification.INTERNAL;
}

/**
 * 取得欄位的分類層級
 * @param {string} tableName - 資料表名稱
 * @param {string} fieldName - 欄位名稱
 * @returns {string} 分類層級
 */
function getFieldClassification(tableName, fieldName) {
  if (FieldClassification[tableName] && FieldClassification[tableName][fieldName]) {
    return FieldClassification[tableName][fieldName];
  }

  // 如果欄位沒有明確分類，使用資料表的分類
  return getTableClassification(tableName);
}

/**
 * 比較兩個分類層級的敏感度
 * @param {string} level1 - 分類層級 1
 * @param {string} level2 - 分類層級 2
 * @returns {number} -1: level1 < level2, 0: 相等, 1: level1 > level2
 */
function compareClassification(level1, level2) {
  const priority1 = ClassificationPriority[level1] || 0;
  const priority2 = ClassificationPriority[level2] || 0;

  if (priority1 < priority2) return -1;
  if (priority1 > priority2) return 1;
  return 0;
}

/**
 * 取得資料表的所有欄位及其分類
 * @param {string} tableName - 資料表名稱
 * @returns {Object} { fieldName: classification }
 */
function getTableFieldClassifications(tableName) {
  return FieldClassification[tableName] || {};
}

/**
 * 取得特定分類層級的所有欄位
 * @param {string} tableName - 資料表名稱
 * @param {string} classification - 分類層級
 * @returns {string[]} 欄位名稱陣列
 */
function getFieldsByClassification(tableName, classification) {
  const fields = FieldClassification[tableName] || {};
  return Object.keys(fields).filter(field => fields[field] === classification);
}

/**
 * 檢查欄位是否為敏感欄位（CONFIDENTIAL 或 RESTRICTED）
 * @param {string} tableName - 資料表名稱
 * @param {string} fieldName - 欄位名稱
 * @returns {boolean}
 */
function isSensitiveField(tableName, fieldName) {
  const classification = getFieldClassification(tableName, fieldName);
  return classification === DataClassification.CONFIDENTIAL ||
         classification === DataClassification.RESTRICTED;
}

/**
 * 取得欄位用途說明
 * @param {string} tableName - 資料表名稱
 * @param {string} fieldName - 欄位名稱
 * @returns {string|null} 用途說明
 */
function getFieldPurpose(tableName, fieldName) {
  if (FieldPurpose[tableName] && FieldPurpose[tableName][fieldName]) {
    return FieldPurpose[tableName][fieldName];
  }
  return null;
}

module.exports = {
  DataClassification,
  ClassificationPriority,
  TableClassification,
  FieldClassification,
  FieldPurpose,

  // 輔助函式
  getTableClassification,
  getFieldClassification,
  compareClassification,
  getTableFieldClassifications,
  getFieldsByClassification,
  isSensitiveField,
  getFieldPurpose
};
