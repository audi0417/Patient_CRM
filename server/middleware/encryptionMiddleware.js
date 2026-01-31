/**
 * 加密中介層
 *
 * 為路由提供便利的加密/解密輔助函式
 * 自動注入 organizationId，簡化加密操作
 */

const {
  encryptField,
  decryptField,
  encryptFields,
  decryptFields,
  decryptObjectArray,
  isEncrypted
} = require('../utils/fieldEncryption');

/**
 * 加密中介層
 * 注入加密/解密輔助函式到 req 物件
 */
function encryptionMiddleware(req, res, next) {
  // 確保使用者已認證且有 organizationId
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    // 如果沒有 organizationId，仍注入函式但會在使用時報錯
    req.encrypt = () => {
      throw new Error('加密功能需要 organizationId（使用者需先登入）');
    };
    req.decrypt = () => {
      throw new Error('解密功能需要 organizationId（使用者需先登入）');
    };
    return next();
  }

  /**
   * 加密單一欄位
   * @param {string} plaintext - 明文
   * @returns {string|null} 密文
   */
  req.encryptField = (plaintext) => {
    return encryptField(plaintext, organizationId);
  };

  /**
   * 解密單一欄位
   * @param {string} ciphertext - 密文
   * @returns {string|null} 明文
   */
  req.decryptField = (ciphertext) => {
    return decryptField(ciphertext, organizationId);
  };

  /**
   * 批次加密物件欄位
   * @param {Object} obj - 原始物件
   * @param {string[]} fields - 要加密的欄位陣列
   * @returns {Object} { data: 加密後的物件, encrypted: 已加密欄位陣列 }
   */
  req.encryptFields = (obj, fields) => {
    return encryptFields(obj, fields, organizationId);
  };

  /**
   * 批次解密物件欄位
   * @param {Object} obj - 加密的物件
   * @param {string[]} [fields] - 要解密的欄位陣列（可選，若未提供則從 _encrypted 讀取）
   * @returns {Object} 解密後的物件
   */
  req.decryptFields = (obj, fields) => {
    return decryptFields(obj, fields, organizationId);
  };

  /**
   * 批次解密物件陣列
   * @param {Object[]} objects - 加密的物件陣列
   * @param {string[]} fields - 要解密的欄位陣列
   * @returns {Object[]} 解密後的物件陣列
   */
  req.decryptObjectArray = (objects, fields) => {
    return decryptObjectArray(objects, fields, organizationId);
  };

  /**
   * 檢查值是否已加密
   * @param {string} value - 要檢查的值
   * @returns {boolean} 是否已加密
   */
  req.isEncrypted = (value) => {
    return isEncrypted(value);
  };

  /**
   * 取得當前組織 ID
   * @returns {string} 組織 ID
   */
  req.getOrganizationId = () => {
    return organizationId;
  };

  next();
}

module.exports = encryptionMiddleware;
