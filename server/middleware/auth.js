const jwt = require('jsonwebtoken');
const { queryOne } = require('../database/helpers');

// 強制要求設置 JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[Security] FATAL: JWT_SECRET is not set in environment variables');
  console.error('[Security] Please set JWT_SECRET in your .env file');
  console.error('[Security] You can generate a secure secret with:');
  console.error('[Security]   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// 驗證 JWT Token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '未提供認證令牌' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);

    // 檢查 token 是否在黑名單中（僅當 token 包含 jti 時）
    if (user.jti) {
      const isBlacklisted = await queryOne(
        'SELECT 1 FROM token_blacklist WHERE jti = ?',
        [user.jti]
      );

      if (isBlacklisted) {
        return res.status(403).json({ error: 'Token 已撤銷' });
      }
    }

    req.user = user;

    // 多租戶架構：注入 organizationId
    // 如果 token 中有 organizationId，確保它存在於 req.user
    if (user.organizationId) {
      req.user.organizationId = user.organizationId;
    }

    next();
  } catch (error) {
    return res.status(403).json({ error: '無效的認證令牌' });
  }
}

// 檢查角色權限
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未認證' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '權限不足' });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  checkRole,
  JWT_SECRET
};
