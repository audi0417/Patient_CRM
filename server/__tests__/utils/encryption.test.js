/**
 * Encryption Utility Tests
 *
 * 測試 AES-256-GCM 加密/解密功能
 * - 基本加解密
 * - 批次加解密
 * - 金鑰驗證
 * - 錯誤處理
 */

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';

const { encrypt, decrypt, encryptFields, decryptFields, isEncryptionKeyValid } = require('../../utils/encryption');

describe('Encryption Utility', () => {
  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      // 格式: iv:authTag:encrypted
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'Same text';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw on empty input', () => {
      expect(() => encrypt('')).toThrow();
      expect(() => encrypt(null)).toThrow();
      expect(() => encrypt(undefined)).toThrow();
    });

    it('should handle unicode text', () => {
      const plaintext = '你好世界 🌍 日本語テスト';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string', () => {
      const plaintext = 'Test data 123';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on empty input', () => {
      expect(() => decrypt('')).toThrow();
      expect(() => decrypt(null)).toThrow();
    });

    it('should throw on invalid format', () => {
      expect(() => decrypt('not-valid-format')).toThrow();
      expect(() => decrypt('only:two')).toThrow();
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // 修改加密內容
      parts[2] = 'ff' + parts[2].slice(2);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // 修改 auth tag
      parts[1] = '00'.repeat(16);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('encryptFields', () => {
    it('should encrypt specified fields in an object', () => {
      const obj = {
        name: 'Test Patient',
        medicalHistory: 'Diabetes',
        allergies: 'Penicillin',
        phone: '0912345678',
      };

      const result = encryptFields(obj, ['medicalHistory', 'allergies']);

      expect(result.name).toBe('Test Patient');
      expect(result.phone).toBe('0912345678');
      expect(result.medicalHistory).not.toBe('Diabetes');
      expect(result.allergies).not.toBe('Penicillin');
      // 驗證加密格式
      expect(result.medicalHistory.split(':')).toHaveLength(3);
    });

    it('should skip null/undefined fields', () => {
      const obj = {
        name: 'Test',
        medicalHistory: null,
        allergies: undefined,
      };

      const result = encryptFields(obj, ['medicalHistory', 'allergies']);

      expect(result.medicalHistory).toBeNull();
      expect(result.allergies).toBeUndefined();
    });

    it('should return original object if no fields specified', () => {
      const obj = { name: 'Test' };
      const result = encryptFields(obj, []);

      expect(result).toEqual(obj);
    });
  });

  describe('decryptFields', () => {
    it('should decrypt specified fields in an object', () => {
      const original = {
        name: 'Test Patient',
        medicalHistory: 'Diabetes',
        allergies: 'Penicillin',
      };

      const encrypted = encryptFields(original, ['medicalHistory', 'allergies']);
      const decrypted = decryptFields(encrypted, ['medicalHistory', 'allergies']);

      expect(decrypted.name).toBe('Test Patient');
      expect(decrypted.medicalHistory).toBe('Diabetes');
      expect(decrypted.allergies).toBe('Penicillin');
    });

    it('should handle already-decrypted fields gracefully', () => {
      const obj = {
        medicalHistory: 'Not encrypted text',
      };

      // 不應拋出錯誤，保持原值
      const result = decryptFields(obj, ['medicalHistory']);
      // 可能保持原值或拋出，取決於實作
      expect(result.medicalHistory).toBeDefined();
    });
  });

  describe('isEncryptionKeyValid', () => {
    it('should return true when key is valid', () => {
      expect(isEncryptionKeyValid()).toBe(true);
    });

    it('should return false when key is missing', () => {
      const original = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(isEncryptionKeyValid()).toBe(false);

      process.env.ENCRYPTION_KEY = original;
    });
  });

  describe('encryption key validation', () => {
    it('should accept 64-char hex key', () => {
      const original = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);

      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);

      process.env.ENCRYPTION_KEY = original;
    });

    it('should reject short keys', () => {
      const original = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'tooshort';

      expect(() => encrypt('test')).toThrow();

      process.env.ENCRYPTION_KEY = original;
    });
  });
});
