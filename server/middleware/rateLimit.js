/**
 * Rate Limiting Middleware
 * 保護 API 端點免受暴力破解和 DDoS 攻擊
 */

const rateLimit = require('express-rate-limit');

// 儲存帳號登入失敗記錄 { username: { attempts: number, lockedUntil: timestamp } }
const loginAttempts = new Map();

// 清理過期的登入失敗記錄（每小時執行一次）
setInterval(() => {
  const now = Date.now();
  for (const [username, data] of loginAttempts.entries()) {
    if (data.lockedUntil && data.lockedUntil < now) {
      loginAttempts.delete(username);
    }
  }
}, 60 * 60 * 1000);

// 帳號登入失敗追蹤中介軟體
const accountLoginLimiter = (req, res, next) => {
  const username = req.body.username;

  if (!username) {
    return next();
  }

  const now = Date.now();
  const userAttempts = loginAttempts.get(username);

  // 檢查是否被鎖定
  if (userAttempts && userAttempts.lockedUntil && userAttempts.lockedUntil > now) {
    const remainingMinutes = Math.ceil((userAttempts.lockedUntil - now) / 1000 / 60);
    return res.status(429).json({
      success: false,
      error: `此帳號因密碼錯誤次數過多已被鎖定，請 ${remainingMinutes} 分鐘後再試`,
      code: 'ACCOUNT_LOCKED',
      lockedUntil: new Date(userAttempts.lockedUntil).toISOString()
    });
  }

  // 儲存原始的 res.json 以便攔截回應
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    // 檢查登入是否失敗（狀態碼 401 且非成功）
    if (res.statusCode === 401 && data.success === false) {
      const attempts = loginAttempts.get(username) || { attempts: 0, lockedUntil: null };
      attempts.attempts += 1;

      // 達到 15 次失敗，鎖定帳號 15 分鐘
      if (attempts.attempts >= 15) {
        attempts.lockedUntil = now + (15 * 60 * 1000);
        loginAttempts.set(username, attempts);

        return originalJson({
          success: false,
          error: '密碼錯誤次數過多，此帳號已被鎖定 15 分鐘',
          code: 'ACCOUNT_LOCKED',
          lockedUntil: new Date(attempts.lockedUntil).toISOString()
        });
      }

      loginAttempts.set(username, attempts);

      // 提示剩餘嘗試次數
      const remainingAttempts = 15 - attempts.attempts;
      data.message = `${data.message}（剩餘 ${remainingAttempts} 次嘗試機會）`;
    }
    // 登入成功，清除失敗記錄
    else if (res.statusCode === 200 && data.success === true) {
      loginAttempts.delete(username);
    }

    return originalJson(data);
  };

  next();
};

// 一般 IP 限流 - 防止同一 IP 大量嘗試不同帳號
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 50, // 同一 IP 最多 50 次登入請求（可嘗試多個不同帳號）
  message: {
    error: '登入請求過於頻繁，請 15 分鐘後再試',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
  accountLoginLimiter,
  loginLimiter,
  apiLimiter,
  strictLimiter,
  createAccountLimiter
};
