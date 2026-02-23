/**
 * Auth Routes Integration Tests
 *
 * 測試認證 API 端點
 * - 登入
 * - Token 刷新
 * - 登出
 * - 密碼修改
 * - Token 驗證
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';
process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { hashPassword } = require('../../utils/password');
const { TEST_JWT_SECRET, TEST_ORG_ID, TEST_USER_ID } = require('../setup');

// Mock database helpers
jest.mock('../../database/helpers', () => ({
  queryOne: jest.fn(),
  queryAll: jest.fn(),
  execute: jest.fn(),
}));

const { queryOne, execute } = require('../../database/helpers');

// 建立測試 Express app
function createTestApp() {
  const app = express();
  app.use(express.json());

  // 注入 audit mock
  app.use((req, res, next) => {
    req.audit = jest.fn();
    next();
  });

  const authRoutes = require('../../routes/auth');
  app.use('/api/auth', authRoutes);
  return app;
}

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for non-existent user', async () => {
      queryOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for wrong password', async () => {
      const hashedPassword = await hashPassword('CorrectPassword123');
      queryOne.mockResolvedValue({
        id: TEST_USER_ID,
        username: 'testuser',
        password: hashedPassword,
        role: 'admin',
        organizationId: TEST_ORG_ID,
        isActive: 1,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with token for valid credentials', async () => {
      const hashedPassword = await hashPassword('CorrectPassword123');
      queryOne
        .mockResolvedValueOnce({
          id: TEST_USER_ID,
          username: 'testuser',
          password: hashedPassword,
          role: 'admin',
          organizationId: TEST_ORG_ID,
          isActive: 1,
          isFirstLogin: 0,
        })
        .mockResolvedValueOnce({ isActive: 1 }); // organization check

      execute.mockResolvedValue({ changes: 1 });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'CorrectPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined(); // 密碼不應外洩
    });

    it('should return 403 for inactive user', async () => {
      const hashedPassword = await hashPassword('Password123');
      queryOne.mockResolvedValue({
        id: TEST_USER_ID,
        username: 'testuser',
        password: hashedPassword,
        role: 'admin',
        organizationId: TEST_ORG_ID,
        isActive: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'Password123' });

      expect(res.status).toBe(403);
    });

    it('should return 403 for inactive organization', async () => {
      const hashedPassword = await hashPassword('Password123');
      queryOne
        .mockResolvedValueOnce({
          id: TEST_USER_ID,
          username: 'testuser',
          password: hashedPassword,
          role: 'admin',
          organizationId: TEST_ORG_ID,
          isActive: 1,
        })
        .mockResolvedValueOnce({ isActive: false }); // inactive org

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'Password123' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 400 without refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 401 for invalid refresh token', async () => {
      queryOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    it('should return new access token for valid refresh token', async () => {
      // 模擬有效的 refresh token 和使用者
      queryOne
        .mockResolvedValueOnce({
          token: 'valid-refresh-token',
          userId: TEST_USER_ID,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        })
        .mockResolvedValueOnce({
          id: TEST_USER_ID,
          username: 'testuser',
          role: 'admin',
          organizationId: TEST_ORG_ID,
          isActive: 1,
        });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/verify');

      expect(res.status).toBe(401);
    });

    it('should verify valid token', async () => {
      const jti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin', jti },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      // 黑名單查詢返回 null
      queryOne
        .mockResolvedValueOnce(null) // not blacklisted
        .mockResolvedValueOnce({
          id: TEST_USER_ID,
          username: 'testuser',
          role: 'admin',
          isActive: 1,
        });

      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should blacklist token on logout', async () => {
      const jti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin', jti },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      queryOne.mockResolvedValue(null); // not blacklisted
      execute.mockResolvedValue({ changes: 1 });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken: 'some-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // 應該將 token 加入黑名單
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('token_blacklist'),
        expect.arrayContaining([jti])
      );
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should reject weak password', async () => {
      const jti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin', jti },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      queryOne.mockResolvedValue(null); // not blacklisted

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'old', newPassword: 'weak' });

      expect(res.status).toBe(400);
    });

    it('should reject if old password is wrong', async () => {
      const hashedPassword = await hashPassword('OldPassword123');
      const jti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin', jti },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      queryOne
        .mockResolvedValueOnce(null) // not blacklisted
        .mockResolvedValueOnce({
          id: TEST_USER_ID,
          password: hashedPassword,
        });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'WrongOld123', newPassword: 'NewPassword123' });

      expect(res.status).toBe(401);
    });

    it('should reject same old and new password', async () => {
      const password = 'SamePassword123';
      const hashedPassword = await hashPassword(password);
      const jti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin', jti },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      queryOne
        .mockResolvedValueOnce(null) // not blacklisted
        .mockResolvedValueOnce({
          id: TEST_USER_ID,
          password: hashedPassword,
        });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: password, newPassword: password });

      expect(res.status).toBe(400);
    });

    it('should change password successfully', async () => {
      const oldPassword = 'OldPassword123';
      const hashedPassword = await hashPassword(oldPassword);
      const jti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin', jti },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      queryOne
        .mockResolvedValueOnce(null) // not blacklisted
        .mockResolvedValueOnce({
          id: TEST_USER_ID,
          password: hashedPassword,
        });

      execute.mockResolvedValue({ changes: 1 });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword, newPassword: 'NewPassword456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
