/**
 * Field-Level Encryption Tests
 *
 * 測試組織隔離的欄位級加密功能
 * - 組織專用金鑰衍生 (HKDF)
 * - 加解密隔離性
 * - 批次操作
 * - isEncrypted 檢測
 */

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';

const {
  encryptField,
  decryptField,
  isEncrypted,
  encryptFields,
  decryptFields,
  decryptObjectArray,
  deriveOrgKey,
  testOrgKeyDerivation,
} = require('../../utils/fieldEncryption');

const ORG_A = 'org_test_a';
const ORG_B = 'org_test_b';

describe('Field-Level Encryption', () => {
  describe('deriveOrgKey', () => {
    it('should derive a 32-byte key for an organization', () => {
      const key = deriveOrgKey(ORG_A);
      // hkdfSync returns ArrayBuffer, needs proper check
      expect(key).toBeDefined();
      expect(Buffer.from(key).length).toBe(32);
    });

    it('should derive different keys for different organizations', () => {
      const keyA = Buffer.from(deriveOrgKey(ORG_A));
      const keyB = Buffer.from(deriveOrgKey(ORG_B));

      expect(keyA.equals(keyB)).toBe(false);
    });

    it('should derive same key for same organization (deterministic)', () => {
      const key1 = Buffer.from(deriveOrgKey(ORG_A));
      const key2 = Buffer.from(deriveOrgKey(ORG_A));

      expect(key1.equals(key2)).toBe(true);
    });

    it('should throw for empty organizationId', () => {
      expect(() => deriveOrgKey('')).toThrow();
      expect(() => deriveOrgKey(null)).toThrow();
      expect(() => deriveOrgKey(undefined)).toThrow();
    });
  });

  describe('encryptField / decryptField', () => {
    it('should encrypt and decrypt a field value', () => {
      const plaintext = '高血壓病史';
      const encrypted = encryptField(plaintext, ORG_A);
      const decrypted = decryptField(encrypted, ORG_A);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('should return null for empty/null input', () => {
      expect(encryptField('', ORG_A)).toBeNull();
      expect(encryptField(null, ORG_A)).toBeNull();
      expect(encryptField('   ', ORG_A)).toBeNull();
      expect(decryptField(null, ORG_A)).toBeNull();
    });

    it('should fail decryption with wrong organization key', () => {
      const encrypted = encryptField('sensitive data', ORG_A);

      // 使用不同組織的金鑰解密應該失敗
      expect(() => decryptField(encrypted, ORG_B)).toThrow();
    });

    it('should handle unicode and special characters', () => {
      const testCases = [
        '中文醫療記錄',
        'English text with symbols !@#$%',
        '日本語テスト',
        'Mixed 混合 テスト 🏥',
        '<script>alert("xss")</script>',
      ];

      testCases.forEach((text) => {
        const encrypted = encryptField(text, ORG_A);
        const decrypted = decryptField(encrypted, ORG_A);
        expect(decrypted).toBe(text);
      });
    });
  });

  describe('isEncrypted', () => {
    it('should detect encrypted values', () => {
      const encrypted = encryptField('test data', ORG_A);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for non-encrypted values', () => {
      expect(isEncrypted('plain text')).toBe(false);
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted(123)).toBe(false);
      expect(isEncrypted('only:two')).toBe(false);
      expect(isEncrypted('a:b:c')).toBe(false); // 非 hex
    });
  });

  describe('encryptFields (batch)', () => {
    it('should encrypt specified fields in an object', () => {
      const data = {
        id: 'p1',
        name: '王小明',
        medicalHistory: '高血壓',
        allergies: '青黴素',
        phone: '0912345678',
      };

      const result = encryptFields(data, ['medicalHistory', 'allergies'], ORG_A);

      expect(result.data.id).toBe('p1');
      expect(result.data.name).toBe('王小明');
      expect(result.data.phone).toBe('0912345678');
      expect(isEncrypted(result.data.medicalHistory)).toBe(true);
      expect(isEncrypted(result.data.allergies)).toBe(true);
      expect(result.encrypted).toContain('medicalHistory');
      expect(result.encrypted).toContain('allergies');
    });

    it('should not re-encrypt already encrypted fields', () => {
      const encrypted = encryptField('test', ORG_A);
      const data = { medicalHistory: encrypted };

      const result = encryptFields(data, ['medicalHistory'], ORG_A);

      // 已加密的欄位應保持不變
      expect(result.data.medicalHistory).toBe(encrypted);
      expect(result.encrypted).toContain('medicalHistory');
    });

    it('should return empty encrypted list for null/empty input', () => {
      expect(encryptFields(null, ['field'], ORG_A).data).toBeNull();
      expect(encryptFields({}, [], ORG_A).encrypted).toEqual([]);
    });
  });

  describe('decryptFields (batch)', () => {
    it('should decrypt specified fields', () => {
      const original = {
        name: '王小明',
        medicalHistory: '高血壓',
        allergies: '青黴素',
      };

      const { data: encrypted } = encryptFields(original, ['medicalHistory', 'allergies'], ORG_A);
      const decrypted = decryptFields(encrypted, ['medicalHistory', 'allergies'], ORG_A);

      expect(decrypted.name).toBe('王小明');
      expect(decrypted.medicalHistory).toBe('高血壓');
      expect(decrypted.allergies).toBe('青黴素');
    });

    it('should read field list from _encrypted if no fields specified', () => {
      const original = { medicalHistory: '高血壓' };
      const { data: encrypted, encrypted: fields } = encryptFields(original, ['medicalHistory'], ORG_A);
      encrypted._encrypted = JSON.stringify(fields);

      const decrypted = decryptFields(encrypted, null, ORG_A);

      expect(decrypted.medicalHistory).toBe('高血壓');
      expect(decrypted._encrypted).toBeUndefined(); // _encrypted 應被移除
    });

    it('should handle non-encrypted values gracefully', () => {
      const data = { medicalHistory: 'plain text' };
      const result = decryptFields(data, ['medicalHistory'], ORG_A);

      // 非加密值應保持原樣
      expect(result.medicalHistory).toBe('plain text');
    });
  });

  describe('decryptObjectArray', () => {
    it('should decrypt fields in an array of objects', () => {
      const patients = [
        { name: 'A', medicalHistory: encryptField('記錄A', ORG_A) },
        { name: 'B', medicalHistory: encryptField('記錄B', ORG_A) },
      ];

      const result = decryptObjectArray(patients, ['medicalHistory'], ORG_A);

      expect(result[0].medicalHistory).toBe('記錄A');
      expect(result[1].medicalHistory).toBe('記錄B');
    });

    it('should handle non-array input', () => {
      expect(decryptObjectArray(null, ['field'], ORG_A)).toBeNull();
      expect(decryptObjectArray('string', ['field'], ORG_A)).toBe('string');
    });
  });

  describe('testOrgKeyDerivation', () => {
    it('should return true when encryption is working', () => {
      expect(testOrgKeyDerivation(ORG_A)).toBe(true);
    });
  });
});
