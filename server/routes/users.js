const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticateToken, checkRole } = require('../middleware/auth');

// 所有路由都需要認證
router.use(authenticateToken);

// 獲取所有使用者（僅管理員）
router.get('/', checkRole('admin', 'super_admin'), (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, name, email, role, isActive, lastLogin, createdAt, updatedAt FROM users').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '獲取使用者列表失敗' });
  }
});

// 獲取單個使用者
router.get('/:id', checkRole('admin', 'super_admin'), (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, name, email, role, isActive, lastLogin, createdAt, updatedAt FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '獲取使用者資訊失敗' });
  }
});

// 創建使用者（僅管理員）
router.post('/', [
  checkRole('admin', 'super_admin'),
  body('username').notEmpty().isLength({ min: 3 }).withMessage('使用者名稱至少3個字元'),
  body('password').isLength({ min: 8 }).withMessage('密碼至少8個字元'),
  body('name').notEmpty().withMessage('姓名不能為空'),
  body('email').isEmail().withMessage('電子郵件格式不正確'),
  body('role').isIn(['admin', 'user', 'super_admin']).withMessage('角色無效')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, name, email, role } = req.body;

  try {
    // 檢查使用者名稱是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);

    if (existing) {
      return res.status(400).json({ error: '使用者名稱或電子郵件已存在' });
    }

    // 雜湊密碼
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const now = new Date().toISOString();
    const id = `user_${Date.now()}`;

    // 插入使用者
    db.prepare(`
      INSERT INTO users (id, username, password, name, email, role, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, username, hashedPassword, name, email, role, now, now);

    const newUser = db.prepare('SELECT id, username, name, email, role, isActive, createdAt, updatedAt FROM users WHERE id = ?').get(id);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: '創建使用者失敗' });
  }
});

// 更新使用者（僅管理員）
router.put('/:id', checkRole('admin', 'super_admin'), (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE users
      SET name = ?, email = ?, role = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `).run(name, email, role, isActive ? 1 : 0, now, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    const updatedUser = db.prepare('SELECT id, username, name, email, role, isActive, lastLogin, createdAt, updatedAt FROM users WHERE id = ?').get(req.params.id);

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: '更新使用者失敗' });
  }
});

// 重設密碼（僅管理員）
router.post('/:id/reset-password', [
  checkRole('admin', 'super_admin'),
  body('password').isLength({ min: 8 }).withMessage('密碼至少8個字元')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { password } = req.body;
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const now = new Date().toISOString();

    const result = db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?')
      .run(hashedPassword, now, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json({ success: true, message: '密碼已重設' });
  } catch (error) {
    res.status(500).json({ error: '重設密碼失敗' });
  }
});

// 刪除使用者（僅管理員）
router.delete('/:id', checkRole('admin', 'super_admin'), (req, res) => {
  try {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json({ success: true, message: '使用者已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除使用者失敗' });
  }
});

module.exports = router;
