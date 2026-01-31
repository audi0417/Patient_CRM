/**
 * 存取控制中介層
 *
 * 基於 RBAC (Role-Based Access Control) 和資料分類的存取控制
 * 整合資料分類配置與權限矩陣，提供細粒度的存取控制
 */

const {
  checkPermission,
  checkDataClassificationAccess,
  checkFieldPermission,
  checkSpecialRule,
  getReadableFields,
  Operation
} = require('../config/accessControlMatrix');

const {
  getFieldClassification,
  isSensitiveField
} = require('../config/dataClassification');

/**
 * 存取控制中介層
 * 注入存取控制輔助函式到 req 物件
 */
function accessControlMiddleware(req, res, next) {
  // 確保使用者已認證
  if (!req.user) {
    req.checkAccess = () => false;
    req.filterFields = (table, data) => data;
    return next();
  }

  const userRole = req.user.role;

  /**
   * 檢查是否有權限存取資源
   * @param {string} resource - 資源名稱
   * @param {string} operation - 操作類型
   * @returns {boolean}
   */
  req.checkAccess = (resource, operation) => {
    return checkPermission(userRole, resource, operation);
  };

  /**
   * 檢查是否有權限存取特定欄位
   * @param {string} table - 資料表名稱
   * @param {string} field - 欄位名稱
   * @param {string} operation - 操作類型
   * @returns {boolean}
   */
  req.checkFieldAccess = (table, field, operation) => {
    return checkFieldPermission(userRole, table, field, operation);
  };

  /**
   * 檢查資料分類存取權限
   * @param {string} classification - 資料分類層級
   * @returns {boolean}
   */
  req.checkClassificationAccess = (classification) => {
    return checkDataClassificationAccess(userRole, classification);
  };

  /**
   * 檢查特殊規則
   * @param {string} rule - 規則名稱
   * @returns {boolean}
   */
  req.checkSpecialRule = (rule) => {
    return checkSpecialRule(rule, userRole);
  };

  /**
   * 過濾物件欄位（根據角色權限）
   * @param {string} table - 資料表名稱
   * @param {Object} data - 資料物件
   * @param {string} operation - 操作類型（預設 READ）
   * @returns {Object} 過濾後的資料物件
   */
  req.filterFields = (table, data, operation = Operation.READ) => {
    if (!data) return data;

    const filtered = {};

    for (const field in data) {
      // 檢查是否有權限存取此欄位
      if (checkFieldPermission(userRole, table, field, operation)) {
        filtered[field] = data[field];
      } else {
        // 敏感欄位記錄到日誌
        if (isSensitiveField(table, field)) {
          console.log(`[ACL] 角色 ${userRole} 無權限存取 ${table}.${field}`);
        }
      }
    }

    return filtered;
  };

  /**
   * 批次過濾物件陣列
   * @param {string} table - 資料表名稱
   * @param {Object[]} dataArray - 資料物件陣列
   * @param {string} operation - 操作類型（預設 READ）
   * @returns {Object[]} 過濾後的資料陣列
   */
  req.filterFieldsArray = (table, dataArray, operation = Operation.READ) => {
    if (!Array.isArray(dataArray)) return dataArray;
    return dataArray.map(data => req.filterFields(table, data, operation));
  };

  /**
   * 取得角色可讀取的欄位清單
   * @param {string} table - 資料表名稱
   * @returns {string[]} 欄位名稱陣列
   */
  req.getReadableFields = (table) => {
    return getReadableFields(userRole, table);
  };

  next();
}

/**
 * 要求特定權限的中介層工廠函式
 * @param {string} resource - 資源名稱
 * @param {string} operation - 操作類型
 * @returns {Function} Express 中介層函式
 */
function requireAccess(resource, operation) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: '未認證',
        code: 'UNAUTHORIZED'
      });
    }

    if (!req.checkAccess(resource, operation)) {
      // 記錄未授權的存取嘗試
      if (req.audit) {
        req.audit(
          operation,
          resource,
          null,
          { attempted: true },
          'FAILURE',
          '權限不足'
        );
      }

      return res.status(403).json({
        error: '權限不足',
        code: 'FORBIDDEN',
        details: `需要 ${resource}.${operation} 權限`
      });
    }

    next();
  };
}

/**
 * 要求特殊規則的中介層工廠函式
 * @param {string} rule - 規則名稱
 * @param {string} errorMessage - 錯誤訊息（可選）
 * @returns {Function} Express 中介層函式
 */
function requireSpecialRule(rule, errorMessage = '權限不足') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: '未認證',
        code: 'UNAUTHORIZED'
      });
    }

    if (!req.checkSpecialRule(rule)) {
      return res.status(403).json({
        error: errorMessage,
        code: 'FORBIDDEN',
        details: `需要特殊權限: ${rule}`
      });
    }

    next();
  };
}

/**
 * 驗證欄位存取權限
 * 檢查請求中的欄位是否都有權限存取
 * @param {string} table - 資料表名稱
 * @param {string} operation - 操作類型
 * @returns {Function} Express 中介層函式
 */
function validateFieldAccess(table, operation) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: '未認證',
        code: 'UNAUTHORIZED'
      });
    }

    const data = req.body;
    if (!data || typeof data !== 'object') {
      return next();
    }

    // 檢查所有欄位是否有權限存取
    const unauthorizedFields = [];

    for (const field in data) {
      if (!req.checkFieldAccess(table, field, operation)) {
        unauthorizedFields.push(field);
      }
    }

    if (unauthorizedFields.length > 0) {
      return res.status(403).json({
        error: '部分欄位無權限存取',
        code: 'FIELD_ACCESS_DENIED',
        fields: unauthorizedFields
      });
    }

    next();
  };
}

module.exports = {
  accessControlMiddleware,
  requireAccess,
  requireSpecialRule,
  validateFieldAccess,
  Operation
};
