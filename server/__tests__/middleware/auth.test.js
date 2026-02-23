/**
 * Auth Middleware Tests
 *
 * 測試 JWT 認證中介層
 * - Token 驗證
 * - Token 黑名單
 * - 角色檢查
 * - 錯誤處理
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  mockRequest,
  mockResponse,
  mockNext,
  TEST_JWT_SECRET,
  TEST_ORG_ID,
  TEST_USER_ID,
} = require('../setup');

// Mock database helpers
jest.mock('../../database/helpers', () => ({
  queryOne: jest.fn(),
  queryAll: jest.fn(),
  execute: jest.fn(),
}));

const { queryOne } = require('../../database/helpers');
const { authenticateToken, checkRole } = require('../../middleware/auth');

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should reject request without Authorization header', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = mockResponse();
      const next = mockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid token and inject user', async () => {
      const jti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin', organizationId: TEST_ORG_ID, jti },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      // Token 不在黑名單中
      queryOne.mockResolvedValue(null);

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(TEST_USER_ID);
      expect(req.user.role).toBe('admin');
      expect(req.user.organizationId).toBe(TEST_ORG_ID);
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin' },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' } // 已過期
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject blacklisted token', async () => {
      const jti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin', jti },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      // Token 在黑名單中
      queryOne.mockResolvedValue({ 1: 1 });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('撤銷') }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token signed with wrong secret', async () => {
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle token without jti (skip blacklist check)', async () => {
      const token = jwt.sign(
        { id: TEST_USER_ID, username: 'testuser', role: 'admin' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      // 不應查詢黑名單
      expect(queryOne).not.toHaveBeenCalled();
    });

    it('should handle Bearer prefix correctly', async () => {
      const req = mockRequest({
        headers: { authorization: 'NotBearer some-token' },
      });
      const res = mockResponse();
      const next = mockNext();

      await authenticateToken(req, res, next);

      // Bearer split 後 token 為 undefined 或空
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('checkRole', () => {
    it('should allow user with correct role', () => {
      const middleware = checkRole('admin', 'super_admin');
      const req = mockRequest({ user: { id: TEST_USER_ID, role: 'admin' } });
      const res = mockResponse();
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user with insufficient role', () => {
      const middleware = checkRole('admin', 'super_admin');
      const req = mockRequest({ user: { id: TEST_USER_ID, role: 'user' } });
      const res = mockResponse();
      const next = mockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      const middleware = checkRole('admin');
      const req = mockRequest(); // no user
      const res = mockResponse();
      const next = mockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept super_admin for super_admin-only route', () => {
      const middleware = checkRole('super_admin');
      const req = mockRequest({ user: { id: TEST_USER_ID, role: 'super_admin' } });
      const res = mockResponse();
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
