/**
 * 存取控制矩陣配置
 *
 * 定義系統中各角色對不同資源和資料分類的存取權限
 * 基於 RBAC (Role-Based Access Control) 模型
 *
 * 角色：
 * - super_admin: 超級管理員（跨組織）
 * - admin: 組織管理員
 * - user: 一般使用者
 */

const { DataClassification } = require('./dataClassification');

/**
 * 操作類型
 */
const Operation = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  EXPORT: 'EXPORT'
};

/**
 * 系統角色
 */
const Role = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user'
};

/**
 * 角色可存取的資料分類層級
 * 如果角色可存取某個層級，則自動可存取更低層級的資料
 */
const RoleDataClassificationAccess = {
  [Role.SUPER_ADMIN]: [
    DataClassification.PUBLIC,
    DataClassification.INTERNAL,
    DataClassification.CONFIDENTIAL,
    DataClassification.RESTRICTED
  ],
  [Role.ADMIN]: [
    DataClassification.PUBLIC,
    DataClassification.INTERNAL,
    DataClassification.CONFIDENTIAL,
    DataClassification.RESTRICTED
  ],
  [Role.USER]: [
    DataClassification.PUBLIC,
    DataClassification.INTERNAL,
    DataClassification.CONFIDENTIAL
    // user 預設無法存取 RESTRICTED，除非特定欄位例外
  ]
};

/**
 * 資源操作權限矩陣
 * 定義每個角色對每個資源的操作權限
 */
const ResourcePermissions = {
  // ========================================================================
  // 病患管理
  // ========================================================================
  patients: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.USER]: [Operation.CREATE, Operation.READ, Operation.UPDATE]
  },

  // ========================================================================
  // 諮詢記錄
  // ========================================================================
  consultations: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.USER]: [Operation.CREATE, Operation.READ, Operation.UPDATE]
  },

  // ========================================================================
  // 健康記錄
  // ========================================================================
  body_composition: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.USER]: [Operation.CREATE, Operation.READ, Operation.UPDATE]
  },

  vital_signs: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.USER]: [Operation.CREATE, Operation.READ, Operation.UPDATE]
  },

  goals: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.USER]: [Operation.CREATE, Operation.READ, Operation.UPDATE]
  },

  // ========================================================================
  // 預約管理
  // ========================================================================
  appointments: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE, Operation.EXPORT],
    [Role.USER]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE]
  },

  // ========================================================================
  // 使用者管理
  // ========================================================================
  users: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.USER]: [Operation.READ] // 只能查看同組織使用者
  },

  // ========================================================================
  // 組織管理
  // ========================================================================
  organizations: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.ADMIN]: [Operation.READ, Operation.UPDATE], // 只能修改自己的組織
    [Role.USER]: [Operation.READ] // 只能查看自己的組織
  },

  // ========================================================================
  // 服務管理
  // ========================================================================
  service_types: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.USER]: [Operation.READ]
  },

  service_items: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.USER]: [Operation.READ]
  },

  treatment_packages: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.USER]: [Operation.CREATE, Operation.READ, Operation.UPDATE]
  },

  // ========================================================================
  // 標籤與群組
  // ========================================================================
  tags: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.USER]: [Operation.READ]
  },

  groups: {
    [Role.SUPER_ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.ADMIN]: [Operation.CREATE, Operation.READ, Operation.UPDATE, Operation.DELETE],
    [Role.USER]: [Operation.READ]
  },

  // ========================================================================
  // 審計日誌
  // ========================================================================
  audit_logs: {
    [Role.SUPER_ADMIN]: [Operation.READ, Operation.EXPORT],
    [Role.ADMIN]: [Operation.READ, Operation.EXPORT],
    [Role.USER]: [] // 一般使用者無法存取審計日誌
  }
};

/**
 * 欄位級權限例外
 * 定義特定角色對特定欄位的存取權限覆蓋
 */
const FieldPermissionOverrides = {
  patients: {
    // user 角色可以讀取部分 RESTRICTED 欄位
    [Role.USER]: {
      medicalHistory: [Operation.READ], // 可讀但不可寫
      allergies: [Operation.READ, Operation.UPDATE], // 可讀可寫（重要安全資訊）
      notes: [Operation.READ, Operation.UPDATE]
    },
    // admin 角色對所有欄位有完整權限（已在資料分類中定義）
    [Role.ADMIN]: {},
    [Role.SUPER_ADMIN]: {}
  },

  consultations: {
    // user 角色對諮詢記錄有部分存取
    [Role.USER]: {
      chiefComplaint: [Operation.CREATE, Operation.READ, Operation.UPDATE],
      assessment: [Operation.CREATE, Operation.READ, Operation.UPDATE],
      plan: [Operation.CREATE, Operation.READ, Operation.UPDATE],
      notes: [Operation.CREATE, Operation.READ, Operation.UPDATE]
    }
  },

  users: {
    // 所有角色都無法讀取密碼欄位
    [Role.SUPER_ADMIN]: {
      password: [] // 永不返回
    },
    [Role.ADMIN]: {
      password: []
    },
    [Role.USER]: {
      password: []
    }
  }
};

/**
 * 特殊權限規則
 * 定義一些特殊的存取控制邏輯
 */
const SpecialRules = {
  // Super Admin 可以跨組織存取
  crossOrganizationAccess: {
    [Role.SUPER_ADMIN]: true,
    [Role.ADMIN]: false,
    [Role.USER]: false
  },

  // 可以修改其他使用者資料
  canModifyOtherUsers: {
    [Role.SUPER_ADMIN]: true,
    [Role.ADMIN]: true,
    [Role.USER]: false // 只能修改自己的資料
  },

  // 可以刪除病患
  canDeletePatients: {
    [Role.SUPER_ADMIN]: true,
    [Role.ADMIN]: true,
    [Role.USER]: false
  },

  // 可以匯出資料
  canExportData: {
    [Role.SUPER_ADMIN]: true,
    [Role.ADMIN]: true,
    [Role.USER]: false
  },

  // 可以存取審計日誌
  canAccessAuditLogs: {
    [Role.SUPER_ADMIN]: true,
    [Role.ADMIN]: true,
    [Role.USER]: false
  }
};

/**
 * 檢查角色是否有權限執行特定操作
 * @param {string} role - 角色
 * @param {string} resource - 資源名稱
 * @param {string} operation - 操作類型
 * @returns {boolean}
 */
function checkPermission(role, resource, operation) {
  if (!ResourcePermissions[resource]) {
    console.warn(`[ACL] 未定義的資源: ${resource}`);
    return false;
  }

  const permissions = ResourcePermissions[resource][role] || [];
  return permissions.includes(operation);
}

/**
 * 檢查角色是否可存取特定資料分類層級
 * @param {string} role - 角色
 * @param {string} classification - 資料分類層級
 * @returns {boolean}
 */
function checkDataClassificationAccess(role, classification) {
  const allowedClassifications = RoleDataClassificationAccess[role] || [];
  return allowedClassifications.includes(classification);
}

/**
 * 檢查角色對特定欄位的權限
 * @param {string} role - 角色
 * @param {string} table - 資料表名稱
 * @param {string} field - 欄位名稱
 * @param {string} operation - 操作類型
 * @returns {boolean}
 */
function checkFieldPermission(role, table, field, operation) {
  // 檢查是否有欄位級權限覆蓋
  if (FieldPermissionOverrides[table] &&
      FieldPermissionOverrides[table][role] &&
      FieldPermissionOverrides[table][role][field]) {
    const permissions = FieldPermissionOverrides[table][role][field];
    return permissions.includes(operation);
  }

  // 如果沒有特殊規則，則根據資料分類和角色權限判斷
  const { getFieldClassification } = require('./dataClassification');
  const classification = getFieldClassification(table, field);

  return checkDataClassificationAccess(role, classification);
}

/**
 * 取得角色對資源的所有權限
 * @param {string} role - 角色
 * @param {string} resource - 資源名稱
 * @returns {string[]} 操作類型陣列
 */
function getResourcePermissions(role, resource) {
  return ResourcePermissions[resource]?.[role] || [];
}

/**
 * 檢查特殊規則
 * @param {string} rule - 規則名稱
 * @param {string} role - 角色
 * @returns {boolean}
 */
function checkSpecialRule(rule, role) {
  return SpecialRules[rule]?.[role] || false;
}

/**
 * 取得角色可讀取的欄位清單
 * @param {string} role - 角色
 * @param {string} table - 資料表名稱
 * @returns {string[]} 欄位名稱陣列
 */
function getReadableFields(role, table) {
  const { getTableFieldClassifications } = require('./dataClassification');
  const fields = getTableFieldClassifications(table);
  const readableFields = [];

  for (const field in fields) {
    if (checkFieldPermission(role, table, field, Operation.READ)) {
      readableFields.push(field);
    }
  }

  return readableFields;
}

module.exports = {
  Operation,
  Role,
  RoleDataClassificationAccess,
  ResourcePermissions,
  FieldPermissionOverrides,
  SpecialRules,

  // 輔助函式
  checkPermission,
  checkDataClassificationAccess,
  checkFieldPermission,
  getResourcePermissions,
  checkSpecialRule,
  getReadableFields
};
