/**
 * Rate Limiting Middleware
 * 保護 API 端點免受暴力破解和 DDoS 攻擊
 */

const rateLimit = require('express-rate-limit');

// 登入端點限流 - 防止暴力破解
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 限制 5 次登入嘗試
  message: {
    error: '登入嘗試次數過多，請 15 分鐘後再試',
    code: 'TOO_MANY_LOGIN_ATTEMPTS'
  },
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false, // 停用 X-RateLimit-* headers
  skipSuccessfulRequests: false, // 成功的請求也計數
  skipFailedRequests: false, // 失敗的請求也計數
});

// 一般 API 限流
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 限制 100 次請求
  message: {
    error: 'API 請求過於頻繁，請稍後再試',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 嚴格限流 - 用於敏感操作
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 10, // 限制 10 次請求
  message: {
    error: '操作過於頻繁，請稍後再試',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 創建帳號限流
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 3, // 限制 3 次創建
  message: {
    error: '創建帳號請求過於頻繁，請 1 小時後再試',
    code: 'TOO_MANY_ACCOUNT_CREATIONS'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter,
  strictLimiter,
  createAccountLimiter
};
