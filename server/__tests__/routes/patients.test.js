/**
 * Patient Routes Integration Tests
 *
 * 測試患者管理 API 端點
 * - CRUD 操作
 * - 租戶隔離
 * - 輸入驗證
 * - 加密/解密
 * - 存取控制
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';
process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqlite';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { TEST_JWT_SECRET, TEST_ORG_ID, TEST_USER_ID, createTestPatient } = require('../setup');

// Mock database
jest.mock('../../database/db', () => ({
  db: { adapter: null },
}));

jest.mock('../../database/helpers', () => ({
  queryOne: jest.fn(),
  queryAll: jest.fn(),
  execute: jest.fn(),
}));

const { queryOne, queryAll, execute } = require('../../database/helpers');

/**
 * 建立測試用 Express app（含中介層鏈）
 */
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock audit
  app.use((req, res, next) => {
    req.audit = jest.fn();
    next();
  });

  const patientRoutes = require('../../routes/patients');
  app.use('/api/patients', patientRoutes);
  return app;
}

/**
 * 產生帶有 org 的 admin token
 */
function createAdminToken() {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { id: TEST_USER_ID, username: 'admin', role: 'admin', organizationId: TEST_ORG_ID, jti },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createUserToken() {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { id: 'user_test_002', username: 'normaluser', role: 'user', organizationId: TEST_ORG_ID, jti },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Patient Routes', () => {
  let app;
  let adminToken;

  beforeAll(() => {
    app = createTestApp();
    adminToken = createAdminToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: token not blacklisted, org exists and active
    queryOne.mockImplementation((sql) => {
      if (sql.includes('token_blacklist')) return Promise.resolve(null);
      if (sql.includes('organizations')) {
        return Promise.resolve({
          id: TEST_ORG_ID,
          name: 'Test Clinic',
          slug: 'test-clinic',
          plan: 'professional',
          isActive: 1,
          maxUsers: 10,
          maxPatients: 100,
          subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('GET /api/patients', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/patients');
      expect(res.status).toBe(401);
    });

    it('should return patients list for authenticated admin', async () => {
      const patient = createTestPatient({ id: 'p1', name: '王小明' });

      queryAll.mockImplementation((sql) => {
        if (sql.includes('patients')) return Promise.resolve([patient]);
        if (sql.includes('tags')) return Promise.resolve([]);
        return Promise.resolve([]);
      });

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/patients - Input Validation', () => {
    it('should reject patient with empty name', async () => {
      // 設定 count 查詢以通過配額檢查
      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        if (sql.includes('COUNT')) return Promise.resolve({ count: 5 });
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject patient with invalid gender', async () => {
      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        if (sql.includes('COUNT')) return Promise.resolve({ count: 5 });
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '測試', gender: 'invalid_gender' });

      expect(res.status).toBe(400);
    });

    it('should reject patient with invalid email', async () => {
      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        if (sql.includes('COUNT')) return Promise.resolve({ count: 5 });
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '測試', email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('should reject patient with invalid blood type', async () => {
      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        if (sql.includes('COUNT')) return Promise.resolve({ count: 5 });
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '測試', bloodType: 'X' });

      expect(res.status).toBe(400);
    });

    it('should reject tags that are not an array', async () => {
      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        if (sql.includes('COUNT')) return Promise.resolve({ count: 5 });
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '測試', tags: 'not-array' });

      expect(res.status).toBe(400);
    });

    it('should create patient with valid data', async () => {
      const newPatient = createTestPatient({ id: 'patient_new', name: '新患者' });

      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        if (sql.includes('COUNT')) return Promise.resolve({ count: 5 });
        if (sql.includes('SELECT * FROM patients')) return Promise.resolve(newPatient);
        return Promise.resolve(null);
      });
      execute.mockResolvedValue({ changes: 1 });
      queryAll.mockResolvedValue([]); // tags

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '新患者',
          gender: 'female',
          birthDate: '1985-06-15',
          phone: '0912345678',
          email: 'test@example.com',
          bloodType: 'B',
          tags: [],
          groups: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('新患者');
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should return 404 for non-existent patient', async () => {
      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        if (sql.includes('SELECT * FROM patients')) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get('/api/patients/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/patients/:id', () => {
    it('should return 404 when patient does not exist', async () => {
      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        return Promise.resolve(null);
      });
      execute.mockResolvedValue({ changes: 0 });

      const res = await request(app)
        .delete('/api/patients/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should delete patient successfully', async () => {
      queryOne.mockImplementation((sql) => {
        if (sql.includes('token_blacklist')) return Promise.resolve(null);
        if (sql.includes('organizations')) {
          return Promise.resolve({
            id: TEST_ORG_ID, name: 'Test', slug: 'test', plan: 'pro',
            isActive: 1, maxUsers: 10, maxPatients: 100,
            subscriptionEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          });
        }
        return Promise.resolve(null);
      });
      execute.mockResolvedValue({ changes: 1 });

      const res = await request(app)
        .delete('/api/patients/patient_123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
