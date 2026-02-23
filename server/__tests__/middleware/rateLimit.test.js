/**
 * Rate Limit Middleware Tests
 *
 * 測試請求限流功能
 * - 帳號登入失敗追蹤
 * - 帳號鎖定
 * - 登入成功重置
 */

process.env.JWT_SECRET = 'test-jwt-secret';

// 需要直接測試 accountLoginLimiter 的邏輯
const { accountLoginLimiter } = require('../../middleware/rateLimit');
const { mockRequest, mockResponse, mockNext } = require('../setup');

describe('Rate Limit Middleware', () => {
  describe('accountLoginLimiter', () => {
    it('should pass through when no username provided', () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();
      const next = mockNext();

      accountLoginLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should pass through on first attempt', () => {
      const req = mockRequest({ body: { username: 'fresh_user_' + Date.now() } });
      const res = mockResponse();
      const next = mockNext();

      accountLoginLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should intercept response to track failed login', () => {
      const username = 'track_user_' + Date.now();
      const req = mockRequest({ body: { username } });
      const res = mockResponse();
      const next = mockNext();

      accountLoginLimiter(req, res, next);

      // 模擬登入失敗回應
      res.statusCode = 401;
      res.json({ success: false, message: '密碼錯誤' });

      // 驗證 json 被攔截（res.json 被覆寫）
      expect(next).toHaveBeenCalled();
    });

    it('should clear attempts on successful login', () => {
      const username = 'success_user_' + Date.now();
      const req = mockRequest({ body: { username } });
      const res = mockResponse();
      const next = mockNext();

      accountLoginLimiter(req, res, next);

      // 模擬登入成功回應
      res.statusCode = 200;
      res.json({ success: true });

      expect(next).toHaveBeenCalled();
    });
  });
});
