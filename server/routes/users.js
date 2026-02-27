const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { queryOne, queryAll, execute } = require('../database/helpers');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { checkUserQuota } = require('../middleware/licenseCheck');
const EmailService = require('../services/emailService');
const { hashPassword } = require('../utils/password');

// 所有路由都需要認證
router.use(authenticateToken);

// 獲取所有使用者（僅管理員）
router.get('/', checkRole('admin', 'super_admin'), async (req, res) => {
  try {
    // 如果是一般管理員（admin），過濾掉 super_admin 角色的使用者
    // 如果是超級管理員（super_admin），顯示所有使用者
    let query = 'SELECT id, username, name, email, role, isActive, lastLogin, createdAt, updatedAt FROM users';

    if (req.user.role === 'admin') {
      query += " WHERE role != 'super_admin'";
    }

    const users = await queryAll(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '獲取使用者列表失敗' });
  }
});

// 獲取單個使用者
router.get('/:id', checkRole('admin', 'super_admin'), async (req, res) => {
  try {
    const user = await queryOne('SELECT id, username, name, email, role, isActive, lastLogin, createdAt, updatedAt FROM users WHERE id = ?', [req.params.id]);

    if (!user) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    // 一般管理員不能查看 super_admin 使用者
    if (req.user.role === 'admin' && user.role === 'super_admin') {
      return res.status(403).json({ error: '沒有權限查看此使用者' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '獲取使用者資訊失敗' });
  }
});

// 創建使用者（僅管理員，檢查 License 配額）
router.post('/', [
  checkRole('admin', 'super_admin'),
  checkUserQuota,
  body('username').notEmpty().isLength({ min: 3 }).withMessage('使用者名稱至少3個字元'),
  body('password').isLength({ min: 8 }).withMessage('密碼至少8個字元'),
  body('name').notEmpty().withMessage('姓名不能為空'),
  body('email').isEmail().withMessage('電子郵件格式不正確'),
  body('role').isIn(['admin', 'user', 'super_admin']).withMessage('角色無效')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, name, email, role } = req.body;

  try {
    // 一般管理員不能創建 super_admin 使用者
    if (req.user.role === 'admin' && role === 'super_admin') {
      return res.status(403).json({ error: '沒有權限創建超級管理員帳號' });
    }

    // 檢查使用者名稱是否已存在
    const existing = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);

    if (existing) {
      return res.status(400).json({ error: '使用者名稱或電子郵件已存在' });
    }

    // 雜湊密碼 - 使用 bcrypt
    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();
    const id = `user_${Date.now()}`;

    // 決定 organizationId
    // Admin 創建的使用者屬於同一組織，super_admin 創建的使用者不設定組織
    const organizationId = req.user.role === 'admin' ? req.user.organizationId : null;

    // 插入使用者
    await execute(`
      INSERT INTO users (id, username, password, name, email, role, organizationId, isActive, isFirstLogin, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
    `, [id, username, hashedPassword, name, email, role, organizationId, now, now]);

    const newUser = await queryOne('SELECT id, username, name, email, role, isActive, createdAt, updatedAt FROM users WHERE id = ?', [id]);

    // 如果郵件服務已啟用，發送帳號密碼郵件
    if (EmailService.isEnabled() && email) {
      try {
        // 取得組織名稱
        let organizationName = '診所管理系統';
        if (organizationId) {
          const org = await queryOne('SELECT name FROM organizations WHERE id = ?', [organizationId]);
          if (org) {
            organizationName = org.name;
          }
        }

        // 發送郵件（非同步，不阻塞回應）
        setImmediate(async () => {
          try {
            await EmailService.sendUserCredentials({
              to: email,
              userName: name,
              username,
              password, // 明文密碼，只在這裡使用一次
              organizationName
            });
            console.log(`✅ 已發送帳號資訊郵件至: ${email}`);
          } catch (emailError) {
            console.error('發送帳號資訊郵件失敗:', emailError);
          }
        });
      } catch (error) {
        console.error('準備發送帳號資訊郵件時發生錯誤:', error);
        // 不影響使用者創建結果，僅記錄錯誤
      }
    }

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: '創建使用者失敗' });
  }
});

// 更新使用者（僅管理員）
router.put('/:id', checkRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const now = new Date().toISOString();

    // 檢查目標使用者是否存在
    const targetUser = await queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);

    if (!targetUser) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    // 一般管理員不能更新 super_admin 使用者
    if (req.user.role === 'admin' && targetUser.role === 'super_admin') {
      return res.status(403).json({ error: '沒有權限更新此使用者' });
    }

    // 一般管理員不能將使用者角色改為 super_admin
    if (req.user.role === 'admin' && role === 'super_admin') {
      return res.status(403).json({ error: '沒有權限設定超級管理員角色' });
    }

    const result = await execute(`
      UPDATE users
      SET name = ?, email = ?, role = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `, [name, email, role, isActive ? 1 : 0, now, req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    const updatedUser = await queryOne('SELECT id, username, name, email, role, isActive, lastLogin, createdAt, updatedAt FROM users WHERE id = ?', [req.params.id]);

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: '更新使用者失敗' });
  }
});

// 重設密碼（僅管理員）
router.post('/:id/reset-password', [
  checkRole('admin', 'super_admin'),
  body('password').isLength({ min: 8 }).withMessage('密碼至少8個字元')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // 檢查目標使用者是否存在
    const targetUser = await queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);

    if (!targetUser) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    // 一般管理員不能重設 super_admin 的密碼
    if (req.user.role === 'admin' && targetUser.role === 'super_admin') {
      return res.status(403).json({ error: '沒有權限重設此使用者的密碼' });
    }

    const { password } = req.body;
    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    const result = await execute('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [hashedPassword, now, req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json({ success: true, message: '密碼已重設' });
  } catch (error) {
    res.status(500).json({ error: '重設密碼失敗' });
  }
});

// 刪除使用者（僅管理員）
router.delete('/:id', checkRole('admin', 'super_admin'), async (req, res) => {
  try {
    // 檢查目標使用者是否存在
    const targetUser = await queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);

    if (!targetUser) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    // 一般管理員不能刪除 super_admin 使用者
    if (req.user.role === 'admin' && targetUser.role === 'super_admin') {
      return res.status(403).json({ error: '沒有權限刪除此使用者' });
    }

    const result = await execute('DELETE FROM users WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json({ success: true, message: '使用者已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除使用者失敗' });
  }
});

module.exports = router;
