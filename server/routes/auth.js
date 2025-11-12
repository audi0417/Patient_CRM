const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { queryOne, queryAll, execute } = require('../database/helpers');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

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
      return res.status(401).json({
        success: false,
        message: '使用者名稱或密碼錯誤'
      });
    }

    // 驗證密碼 - 使用 bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '使用者名稱或密碼錯誤'
      });
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

    // 生成 JWT Token（包含 organizationId）
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    // 只有非 super_admin 需要 organizationId
    if (user.organizationId) {
      tokenPayload.organizationId = user.organizationId;
    }

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 移除密碼後返回使用者資訊
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      token,
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

// 登出
router.post('/logout', authenticateToken, (req, res) => {
  // 客戶端負責刪除 token
  res.json({ success: true, message: '登出成功' });
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

    // 驗證舊密碼 - 使用 bcrypt
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
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
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
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
