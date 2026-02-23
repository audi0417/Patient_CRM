/**
 * Password Utility Tests
 *
 * 測試密碼雜湊與驗證功能
 * - bcrypt 雜湊
 * - bcrypt 驗證
 * - SHA256 舊版相容
 * - 自動重新雜湊標記
 */

const crypto = require('crypto');

// 在載入 auth.js 相關模組之前，先設定 JWT_SECRET
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';

const { hashPassword, verifyPassword } = require('../../utils/password');

describe('Password Utility', () => {
  describe('hashPassword', () => {
    it('should generate a bcrypt hash', async () => {
      const hash = await hashPassword('TestPassword123');

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt prefix
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword('SamePassword');
      const hash2 = await hashPassword('SamePassword');

      expect(hash1).not.toBe(hash2); // 因為 salt 不同
    });

    it('should generate different hashes for different passwords', async () => {
      const hash1 = await hashPassword('Password1');
      const hash2 = await hashPassword('Password2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword - bcrypt', () => {
    it('should verify correct bcrypt password', async () => {
      const password = 'CorrectPassword123';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);

      expect(result.isValid).toBe(true);
      expect(result.needsRehash).toBe(false);
    });

    it('should reject incorrect bcrypt password', async () => {
      const hash = await hashPassword('CorrectPassword');

      const result = await verifyPassword('WrongPassword', hash);

      expect(result.isValid).toBe(false);
      expect(result.needsRehash).toBe(false);
    });

    it('should reject empty password against bcrypt hash', async () => {
      const hash = await hashPassword('SomePassword');

      const result = await verifyPassword('', hash);

      expect(result.isValid).toBe(false);
    });
  });

  describe('verifyPassword - SHA256 legacy', () => {
    it('should verify correct SHA256 password and flag for rehash', async () => {
      const password = 'LegacyPassword';
      const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');

      const result = await verifyPassword(password, sha256Hash);

      expect(result.isValid).toBe(true);
      expect(result.needsRehash).toBe(true); // 需要升級到 bcrypt
    });

    it('should reject incorrect SHA256 password', async () => {
      const sha256Hash = crypto.createHash('sha256').update('CorrectPassword').digest('hex');

      const result = await verifyPassword('WrongPassword', sha256Hash);

      expect(result.isValid).toBe(false);
      expect(result.needsRehash).toBe(false); // 驗證失敗不需要 rehash
    });
  });
});
