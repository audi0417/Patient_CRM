const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * 使用 bcrypt 雜湊密碼
 * @param {string} plaintext - 明文密碼
 * @returns {Promise<string>} bcrypt 雜湊值
 */
async function hashPassword(plaintext) {
  const saltRounds = 12;
  return await bcrypt.hash(plaintext, saltRounds);
}

/**
 * 驗證密碼（支援 bcrypt 和舊版 SHA256）
 * @param {string} plaintext - 明文密碼
 * @param {string} hash - 儲存的雜湊值
 * @returns {Promise<{isValid: boolean, needsRehash: boolean}>}
 */
async function verifyPassword(plaintext, hash) {
  // 檢查是否為 bcrypt 格式（以 $2a$, $2b$, $2y$ 開頭）
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    const isValid = await bcrypt.compare(plaintext, hash);
    return { isValid, needsRehash: false };
  }

  // 舊版 SHA256 格式（向下相容）
  const sha256Hash = crypto.createHash('sha256').update(plaintext).digest('hex');
  const isValid = sha256Hash === hash;

  return {
    isValid,
    needsRehash: isValid // 如果驗證成功，需要重新雜湊
  };
}

module.exports = {
  hashPassword,
  verifyPassword
};
