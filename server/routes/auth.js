const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { queryOne, queryAll, execute } = require('../database/helpers');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { hashPassword, verifyPassword } = require('../utils/password');

// 登入
router.post('/login', [
  body('username').notEmpty().withMessage('使用者名稱不能為空'),
  body('password').notEmpty().withMessage('密碼不能為空')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // 查詢使用者（包含組織資訊）
    const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      // 記錄失敗的登入嘗試
      if (req.audit) {
        req.audit('LOGIN', 'auth', null, { username }, 'FAILURE', '使用者不存在');
      }
      return res.status(401).json({
        success: false,
        message: '使用者名稱或密碼錯誤'
      });
    }

    // 驗證密碼 - 使用新的驗證函式（支援 bcrypt 和舊版 SHA256）
    const { isValid, needsRehash } = await verifyPassword(password, user.password);

    if (!isValid) {
      // 記錄失敗的登入嘗試
      if (req.audit) {
        req.audit('LOGIN', 'auth', user.id, { username }, 'FAILURE', '密碼錯誤');
      }
      return res.status(401).json({
        success: false,
        message: '使用者名稱或密碼錯誤'
      });
    }

    // 如果使用舊版 SHA256，透明地重新雜湊為 bcrypt
    if (needsRehash) {
      const newHash = await hashPassword(password);
      await execute('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
    }

    // 檢查帳號是否啟用
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: '帳號已被停用，請聯繫管理員'
      });
    }

    // 多租戶架構：檢查組織狀態（super_admin 除外）
    if (user.role !== 'super_admin' && user.organizationId) {
      const org = await queryOne('SELECT isActive FROM organizations WHERE id = ?', [user.organizationId]);

      if (!org) {
        return res.status(403).json({
          success: false,
          message: '組織不存在，請聯繫管理員'
        });
      }

      if (!org.isActive) {
        return res.status(403).json({
          success: false,
          message: '組織已停用，請聯繫管理員'
        });
      }
    }

    // 更新最後登入時間
    const now = new Date().toISOString();
    await execute('UPDATE users SET lastLogin = ?, updatedAt = ? WHERE id = ?', [now, now, user.id]);

    // 生成 JWT Token（包含 organizationId 和 jti）
    const jti = crypto.randomBytes(16).toString('hex');
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      jti
    };

    // 只有非 super_admin 需要 organizationId
    if (user.organizationId) {
      tokenPayload.organizationId = user.organizationId;
    }

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: '4h' } // 從 24h 縮短至 4h
    );

    // 產生 refresh token（7 天有效期）
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await execute(`
      INSERT INTO refresh_tokens ("userId", token, "expiresAt")
      VALUES (?, ?, ?)
    `, [user.id, refreshToken, refreshExpiresAt]);

    // 移除密碼後返回使用者資訊
    const { password: _, ...userWithoutPassword } = user;

    // 記錄成功的登入
    if (req.audit) {
      req.audit('LOGIN', 'auth', user.id, { username: user.username, role: user.role });
    }

    res.json({
      success: true,
      user: userWithoutPassword,
      token,
      refreshToken,
      isFirstLogin: user.isFirstLogin === 1 || user.isFirstLogin === true,
      message: '登入成功'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登入失敗，請稍後再試'
    });
  }
});

// 刷新 token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: '缺少 refresh token'
    });
  }

  try {
    // 查詢 refresh token
    const tokenRecord = await queryOne(`
      SELECT * FROM refresh_tokens
      WHERE token = ? AND "expiresAt" > datetime('now')
    `, [refreshToken]);

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token 無效或已過期'
      });
    }

    // 獲取使用者資訊
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [tokenRecord.userId]);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: '使用者不存在或已停用'
      });
    }

    // 產生新的 access token
    const jti = crypto.randomBytes(16).toString('hex');
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      jti
    };

    if (user.organizationId) {
      tokenPayload.organizationId = user.organizationId;
    }

    const newToken = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    // 記錄 token 刷新
    if (req.audit) {
      req.audit('REFRESH_TOKEN', 'auth', user.id);
    }

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: '刷新 token 失敗'
    });
  }
});

// 登出
router.post('/logout', authenticateToken, async (req, res) => {
  const { jti } = req.user;
  const { refreshToken } = req.body;

  try {
    // 將 access token 加入黑名單（4 小時後過期）
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await execute(`
      INSERT INTO token_blacklist (jti, "expiresAt")
      VALUES (?, ?)
    `, [jti, expiresAt]);

    // 刪除 refresh token
    if (refreshToken) {
      await execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    }

    // 記錄登出行為
    if (req.audit) {
      req.audit('LOGOUT', 'auth', req.user.id);
    }

    res.json({ success: true, message: '登出成功' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: '登出失敗'
    });
  }
});

// 驗證 Token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (!user || !user.isActive) {
      return res.status(401).json({ valid: false });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ valid: true, user: userWithoutPassword });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

// 獲取當前使用者資訊
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: '獲取使用者資訊失敗' });
  }
});

// 首次登入修改密碼 (強制修改)
router.post('/first-login-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('目前密碼不能為空'),
  body('newPassword').notEmpty().withMessage('新密碼不能為空')
    .isLength({ min: 8 }).withMessage('密碼長度至少需要 8 個字元')
    .matches(/[A-Z]/).withMessage('密碼需包含至少一個大寫字母')
    .matches(/[a-z]/).withMessage('密碼需包含至少一個小寫字母')
    .matches(/[0-9]/).withMessage('密碼需包含至少一個數字')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // 獲取使用者
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '使用者不存在'
      });
    }

    // 檢查是否為首次登入
    if (user.isFirstLogin !== 1 && user.isFirstLogin !== true) {
      return res.status(400).json({
        success: false,
        message: '此端點僅供首次登入使用，請使用一般修改密碼功能'
      });
    }

    // 驗證目前密碼 - 使用新的驗證函式
    const { isValid } = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '目前密碼錯誤'
      });
    }

    // 檢查新密碼是否與目前密碼相同
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: '新密碼不能與目前密碼相同'
      });
    }

    // 更新密碼並標記非首次登入 - 使用 bcrypt 加密
    const hashedNewPassword = await hashPassword(newPassword);
    const now = new Date().toISOString();
    await execute(
      'UPDATE users SET password = ?, isFirstLogin = ?, updatedAt = ? WHERE id = ?',
      [hashedNewPassword, false, now, userId]
    );

    res.json({
      success: true,
      message: '密碼已成功更新'
    });
  } catch (error) {
    console.error('First login password change error:', error);
    res.status(500).json({
      success: false,
      message: '密碼更新失敗，請稍後再試'
    });
  }
});

// 修改密碼 (使用者自己修改)
router.post('/change-password', [
  authenticateToken,
  body('oldPassword').notEmpty().withMessage('舊密碼不能為空'),
  body('newPassword').notEmpty().withMessage('新密碼不能為空')
    .isLength({ min: 8 }).withMessage('密碼長度至少需要 8 個字元')
    .matches(/[A-Z]/).withMessage('密碼需包含至少一個大寫字母')
    .matches(/[a-z]/).withMessage('密碼需包含至少一個小寫字母')
    .matches(/[0-9]/).withMessage('密碼需包含至少一個數字')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }

  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // 獲取使用者
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '使用者不存在'
      });
    }

    // 驗證舊密碼 - 使用新的驗證函式
    const { isValid } = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '舊密碼錯誤'
      });
    }

    // 檢查新密碼是否與舊密碼相同
    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: '新密碼不能與舊密碼相同'
      });
    }

    // 更新密碼 - 使用 bcrypt 加密
    const hashedNewPassword = await hashPassword(newPassword);
    const now = new Date().toISOString();
    await execute('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [hashedNewPassword, now, userId]);

    res.json({
      success: true,
      message: '密碼已成功更新'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: '密碼更新失敗，請稍後再試'
    });
  }
});

module.exports = router;
