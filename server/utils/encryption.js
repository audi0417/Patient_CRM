/**
 * 加密工具類
 *
 * 提供 AES-256-GCM 加密/解密功能
 * 用於保護敏感資料（如 Line Channel Secret, Access Token）
 */

const crypto = require('crypto');

// 加密演算法
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 初始化向量長度
const AUTH_TAG_LENGTH = 16; // 驗證標籤長度

/**
 * 取得加密金鑰
 * @returns {Buffer} 32 字節的加密金鑰
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY 環境變數未設定');
  }

  // 優先嘗試 hex 解碼（64 hex chars = 32 bytes，安全性更高）
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // 向下相容：使用 UTF-8 編碼，確保至少 32 字節
  if (Buffer.byteLength(key, 'utf-8') < 32) {
    throw new Error('ENCRYPTION_KEY 長度不足，需至少 32 字節（建議使用 64 位 hex 字串）');
  }

  // 使用 SHA-256 雜湊確保得到固定 32 字節金鑰
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * 加密字串
 * @param {string} text - 要加密的明文
 * @returns {string} 加密後的密文（格式：iv:authTag:encrypted）
 */
function encrypt(text) {
  if (!text) {
    throw new Error('加密文字不能為空');
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 加密
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 取得驗證標籤
    const authTag = cipher.getAuthTag();

    // 組合：iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('加密失敗:', error);
    throw new Error('資料加密失敗');
  }
}

/**
 * 解密字串
 * @param {string} encryptedText - 加密的密文（格式：iv:authTag:encrypted）
 * @returns {string} 解密後的明文
 */
function decrypt(encryptedText) {
  if (!encryptedText) {
    throw new Error('解密文字不能為空');
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

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
    console.error('解密失敗:', error);
    throw new Error('資料解密失敗');
  }
}

/**
 * 批次加密物件中的指定欄位
 * @param {Object} obj - 原始物件
 * @param {string[]} fields - 要加密的欄位名稱陣列
 * @returns {Object} 加密後的物件
 */
function encryptFields(obj, fields) {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field]) {
      result[field] = encrypt(result[field]);
    }
  }

  return result;
}

/**
 * 批次解密物件中的指定欄位
 * @param {Object} obj - 加密的物件
 * @param {string[]} fields - 要解密的欄位名稱陣列
 * @returns {Object} 解密後的物件
 */
function decryptFields(obj, fields) {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field]) {
      try {
        result[field] = decrypt(result[field]);
      } catch (error) {
        console.error(`解密欄位 ${field} 失敗:`, error);
        // 保持原值
      }
    }
  }

  return result;
}

/**
 * 檢查加密金鑰是否已設定且有效
 * @returns {boolean} 金鑰是否有效
 */
function isEncryptionKeyValid() {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  isEncryptionKeyValid
};
