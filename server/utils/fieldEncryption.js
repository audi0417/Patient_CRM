/**
 * 欄位級加密工具
 *
 * 提供敏感醫療資料的欄位級加密/解密功能
 * 使用 AES-256-GCM + HKDF 組織金鑰衍生
 *
 * 核心特性：
 * - 組織隔離：每個組織使用獨立的衍生金鑰
 * - 透明加解密：應用層自動處理
 * - 向後相容：支援未加密的既有資料
 * - 加密標記：追蹤哪些欄位已加密
 */

const crypto = require('crypto');

// 加密演算法配置
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

// HKDF 配置
const HKDF_HASH = 'sha256';
const HKDF_INFO_PREFIX = 'patient-crm-org-key';

/**
 * 取得主加密金鑰
 * @returns {Buffer} 主金鑰
 * @throws {Error} 如果金鑰未設定或無效
 */
function getMasterKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('[Encryption] ENCRYPTION_KEY 環境變數未設定');
  }

  if (key.length < 32) {
    throw new Error('[Encryption] ENCRYPTION_KEY 長度必須至少 32 個字元');
  }

  // 使用 SHA-256 將金鑰標準化為 32 字節
  return crypto.createHash('sha256').update(key, 'utf8').digest();
}

/**
 * 使用 HKDF 從主金鑰衍生組織專用金鑰
 * @param {string} organizationId - 組織 ID
 * @returns {Buffer} 組織專用的 32 字節金鑰
 */
function deriveOrgKey(organizationId) {
  if (!organizationId) {
    throw new Error('[Encryption] organizationId 不能為空');
  }

  const masterKey = getMasterKey();
  const info = Buffer.from(`${HKDF_INFO_PREFIX}:${organizationId}`, 'utf8');

  // 使用空 salt（因為主金鑰已經是高熵的）
  const salt = Buffer.alloc(0);

  // HKDF 衍生
  const derivedKey = crypto.hkdfSync(
    HKDF_HASH,
    masterKey,
    salt,
    info,
    KEY_LENGTH
  );

  return derivedKey;
}

/**
 * 加密單一欄位值
 * @param {string} plaintext - 明文
 * @param {string} organizationId - 組織 ID
 * @returns {string|null} 加密後的密文（格式：iv:authTag:encrypted），若輸入為空則返回 null
 */
function encryptField(plaintext, organizationId) {
  // 空值不加密
  if (!plaintext) {
    return null;
  }
  
  // 將非字符串類型轉為字符串
  let textToEncrypt = plaintext;
  if (typeof textToEncrypt !== 'string') {
    textToEncrypt = JSON.stringify(textToEncrypt);
  }
  
  // 空字串不加密
  if (textToEncrypt.trim() === '') {
    return null;
  }

  try {
    const key = deriveOrgKey(organizationId);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 加密
    let encrypted = cipher.update(textToEncrypt, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 取得驗證標籤
    const authTag = cipher.getAuthTag();

    // 組合：iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] 加密失敗:', error);
    throw new Error('資料加密失敗');
  }
}

/**
 * 解密單一欄位值
 * @param {string} ciphertext - 密文（格式：iv:authTag:encrypted）
 * @param {string} organizationId - 組織 ID
 * @returns {string|null} 解密後的明文，若輸入為空則返回 null
 * @throws {Error} 解密失敗（可能是金鑰錯誤或資料損壞）
 */
function decryptField(ciphertext, organizationId) {
  if (!ciphertext) {
    return null;
  }

  try {
    const key = deriveOrgKey(organizationId);
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new Error('加密格式無效');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    // 解析各部分
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // 建立解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // 解密
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] 解密失敗:', error);
    throw new Error('資料解密失敗（可能是金鑰錯誤或資料損壞）');
  }
}

/**
 * 檢查值是否為已加密的格式
 * @param {string} value - 要檢查的值
 * @returns {boolean} 是否為加密格式
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // 檢查是否符合 iv:authTag:encrypted 格式
  const parts = value.split(':');
  if (parts.length !== 3) {
    return false;
  }

  // 檢查各部分是否為有效的 hex
  const [ivHex, authTagHex, encrypted] = parts;
  const hexRegex = /^[0-9a-f]+$/i;

  return (
    hexRegex.test(ivHex) &&
    hexRegex.test(authTagHex) &&
    hexRegex.test(encrypted) &&
    ivHex.length === IV_LENGTH * 2 && // hex 表示長度為原長度的 2 倍
    authTagHex.length === AUTH_TAG_LENGTH * 2
  );
}

/**
 * 批次加密物件中的指定欄位
 * @param {Object} obj - 原始物件
 * @param {string[]} fields - 要加密的欄位名稱陣列
 * @param {string} organizationId - 組織 ID
 * @returns {Object} 包含加密資料和加密標記的物件
 */
function encryptFields(obj, fields, organizationId) {
  if (!obj || !fields || fields.length === 0) {
    return { data: obj, encrypted: [] };
  }

  const result = { ...obj };
  const encryptedFields = [];

  for (const field of fields) {
    if (result[field] && !isEncrypted(result[field])) {
      try {
        result[field] = encryptField(result[field], organizationId);
        encryptedFields.push(field);
      } catch (error) {
        console.error(`[Encryption] 加密欄位 ${field} 失敗:`, error);
        throw error;
      }
    } else if (isEncrypted(result[field])) {
      // 已經加密，記錄到清單
      encryptedFields.push(field);
    }
  }

  return {
    data: result,
    encrypted: encryptedFields
  };
}

/**
 * 批次解密物件中的指定欄位
 * @param {Object} obj - 加密的物件
 * @param {string[]} fields - 要解密的欄位名稱陣列（可選，若未提供則從 _encrypted 讀取）
 * @param {string} organizationId - 組織 ID
 * @returns {Object} 解密後的物件
 */
function decryptFields(obj, fields, organizationId) {
  if (!obj) {
    return obj;
  }

  const result = { ...obj };

  // 如果沒有指定欄位，嘗試從 _encrypted 讀取
  const fieldsToDecrypt = fields || (obj._encrypted ? JSON.parse(obj._encrypted) : []);

  if (!fieldsToDecrypt || fieldsToDecrypt.length === 0) {
    return result;
  }

  for (const field of fieldsToDecrypt) {
    if (result[field]) {
      try {
        // 只解密已加密的欄位
        if (isEncrypted(result[field])) {
          result[field] = decryptField(result[field], organizationId);
        }
      } catch (error) {
        console.error(`[Encryption] 解密欄位 ${field} 失敗:`, error);
        // 保持原值（可能是舊資料或已損壞）
        console.warn(`[Encryption] 欄位 ${field} 保持加密狀態`);
      }
    }
  }

  // 移除內部欄位
  delete result._encrypted;

  return result;
}

/**
 * 批次解密物件陣列
 * @param {Object[]} objects - 加密的物件陣列
 * @param {string[]} fields - 要解密的欄位名稱陣列
 * @param {string} organizationId - 組織 ID
 * @returns {Object[]} 解密後的物件陣列
 */
function decryptObjectArray(objects, fields, organizationId) {
  if (!Array.isArray(objects)) {
    return objects;
  }

  return objects.map(obj => decryptFields(obj, fields, organizationId));
}

/**
 * 檢查加密金鑰是否已設定且有效
 * @returns {boolean} 金鑰是否有效
 */
function isEncryptionKeyValid() {
  try {
    const key = process.env.ENCRYPTION_KEY;
    return key && key.length >= 32;
  } catch {
    return false;
  }
}

/**
 * 測試組織金鑰衍生是否正常工作
 * @param {string} organizationId - 組織 ID
 * @returns {boolean} 是否正常
 */
function testOrgKeyDerivation(organizationId) {
  try {
    const testData = 'test-encryption-data';
    const encrypted = encryptField(testData, organizationId);
    const decrypted = decryptField(encrypted, organizationId);
    return decrypted === testData;
  } catch (error) {
    console.error('[Encryption] 組織金鑰衍生測試失敗:', error);
    return false;
  }
}

module.exports = {
  // 核心函式
  encryptField,
  decryptField,
  isEncrypted,

  // 批次操作
  encryptFields,
  decryptFields,
  decryptObjectArray,

  // 工具函式
  deriveOrgKey,
  isEncryptionKeyValid,
  testOrgKeyDerivation
};
