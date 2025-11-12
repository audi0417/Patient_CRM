/**
 * Organizations Management API
 *
 * 商業化 SaaS 組織管理端點
 *
 * 功能：
 * - 組織 CRUD 操作（超級管理員）
 * - 組織設定管理
 * - 用戶配額追蹤
 * - 訂閱方案管理
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin, requireTenant } = require('../middleware/tenantContext');
const { queryOne, queryAll, execute, transaction } = require('../database/helpers');

// ========== 超級管理員端點 ==========

// 獲取所有組織（超級管理員）
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { isActive, plan } = req.query;
    let query = 'SELECT * FROM organizations WHERE 1=1';
    const params = [];

    if (isActive !== undefined) {
      query += ' AND isActive = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }

    if (plan) {
      query += ' AND plan = ?';
      params.push(plan);
    }

    query += ' ORDER BY createdAt DESC';

    const organizations = await queryAll(query, params);

    // 為每個組織加入統計資訊
    const withStats = await Promise.all(organizations.map(async org => {
      const usersCount = await queryOne('SELECT COUNT(*) as count FROM users WHERE organizationId = ?', [org.id]);
      const patientsCount = await queryOne('SELECT COUNT(*) as count FROM patients WHERE organizationId = ?', [org.id]);
      const appointmentsCount = await queryOne('SELECT COUNT(*) as count FROM appointments WHERE organizationId = ?', [org.id]);

      const stats = {
        users: usersCount.count,
        patients: patientsCount.count,
        appointments: appointmentsCount.count
      };

      return {
        ...org,
        settings: org.settings ? JSON.parse(org.settings) : null,
        stats
      };
    }));

    res.json(withStats);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: '獲取組織列表失敗' });
  }
});

// 獲取單個組織（超級管理員）
router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const org = await queryOne('SELECT * FROM organizations WHERE id = ?', [req.params.id]);

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 加入詳細統計
    const usersCount = await queryOne('SELECT COUNT(*) as count FROM users WHERE organizationId = ?', [org.id]);
    const activeUsersCount = await queryOne('SELECT COUNT(*) as count FROM users WHERE organizationId = ? AND isActive = 1', [org.id]);
    const patientsCount = await queryOne('SELECT COUNT(*) as count FROM patients WHERE organizationId = ?', [org.id]);
    const appointmentsCount = await queryOne('SELECT COUNT(*) as count FROM appointments WHERE organizationId = ?', [org.id]);
    const appointmentsThisMonthCount = await queryOne(`
      SELECT COUNT(*) as count FROM appointments
      WHERE organizationId = ?
      AND date >= date('now', 'start of month')
    `, [org.id]);

    const stats = {
      users: usersCount.count,
      activeUsers: activeUsersCount.count,
      patients: patientsCount.count,
      appointments: appointmentsCount.count,
      appointmentsThisMonth: appointmentsThisMonthCount.count
    };

    res.json({
      ...org,
      settings: org.settings ? JSON.parse(org.settings) : null,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: '獲取組織資訊失敗' });
  }
});

// 創建組織（超級管理員）
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      domain,
      plan,
      maxUsers,
      maxPatients,
      billingEmail,
      contactName,
      contactPhone,
      contactEmail,
      settings
    } = req.body;

    // 驗證必填欄位
    if (!name || !slug) {
      return res.status(400).json({ error: '組織名稱和 slug 為必填' });
    }

    // 檢查 slug 是否已存在
    const existing = await queryOne('SELECT id FROM organizations WHERE slug = ?', [slug]);
    if (existing) {
      return res.status(400).json({ error: 'Slug 已被使用' });
    }

    const now = new Date().toISOString();
    const id = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 根據方案設定預設配額
    const planLimits = {
      basic: { maxUsers: 5, maxPatients: 100 },
      professional: { maxUsers: 20, maxPatients: 500 },
      enterprise: { maxUsers: 999, maxPatients: 99999 }
    };

    const limits = planLimits[plan] || planLimits.basic;

    await execute(`
      INSERT INTO organizations (
        id, name, slug, domain, plan, maxUsers, maxPatients,
        isActive, settings, billingEmail, contactName, contactPhone, contactEmail,
        subscriptionStartDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name,
      slug,
      domain || null,
      plan || 'basic',
      maxUsers || limits.maxUsers,
      maxPatients || limits.maxPatients,
      1, // isActive
      JSON.stringify(settings || {}),
      billingEmail || null,
      contactName || null,
      contactPhone || null,
      contactEmail || null,
      now, // subscriptionStartDate
      now,
      now
    ]);

    const newOrg = await queryOne('SELECT * FROM organizations WHERE id = ?', [id]);
    newOrg.settings = JSON.parse(newOrg.settings);

    res.status(201).json(newOrg);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: '創建組織失敗' });
  }
});

// 更新組織（超級管理員）
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      domain,
      plan,
      maxUsers,
      maxPatients,
      isActive,
      billingEmail,
      contactName,
      contactPhone,
      contactEmail,
      settings,
      subscriptionEndDate
    } = req.body;

    const now = new Date().toISOString();

    // 檢查組織是否存在
    const org = await queryOne('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 如果更新 slug，檢查是否與其他組織衝突
    if (slug && slug !== org.slug) {
      const existing = await queryOne('SELECT id FROM organizations WHERE slug = ? AND id != ?', [slug, req.params.id]);
      if (existing) {
        return res.status(400).json({ error: 'Slug 已被使用' });
      }
    }

    await execute(`
      UPDATE organizations
      SET name = COALESCE(?, name),
          slug = COALESCE(?, slug),
          domain = ?,
          plan = COALESCE(?, plan),
          maxUsers = COALESCE(?, maxUsers),
          maxPatients = COALESCE(?, maxPatients),
          isActive = COALESCE(?, isActive),
          settings = COALESCE(?, settings),
          billingEmail = ?,
          contactName = ?,
          contactPhone = ?,
          contactEmail = ?,
          subscriptionEndDate = ?,
          updatedAt = ?
      WHERE id = ?
    `, [
      name,
      slug,
      domain,
      plan,
      maxUsers,
      maxPatients,
      isActive !== undefined ? (isActive ? 1 : 0) : undefined,
      settings ? JSON.stringify(settings) : undefined,
      billingEmail,
      contactName,
      contactPhone,
      contactEmail,
      subscriptionEndDate,
      now,
      req.params.id
    ]);

    const updated = await queryOne('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    updated.settings = JSON.parse(updated.settings);

    res.json(updated);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: '更新組織失敗' });
  }
});

// 刪除組織（超級管理員，軟刪除）
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { force } = req.query;

    if (force === 'true') {
      // 硬刪除：刪除組織及所有相關資料
      await transaction(async () => {
        await execute('DELETE FROM goals WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM body_composition WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM vital_signs WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM consultations WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM appointments WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM patients WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM users WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM service_types WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM tags WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM groups WHERE organizationId = ?', [req.params.id]);
        await execute('DELETE FROM organizations WHERE id = ?', [req.params.id]);
      });

      res.json({ success: true, message: '組織及所有相關資料已刪除' });
    } else {
      // 軟刪除：停用組織
      const result = await execute('UPDATE organizations SET isActive = 0, updatedAt = ? WHERE id = ?', [
        new Date().toISOString(),
        req.params.id
      ]);

      if (result.changes === 0) {
        return res.status(404).json({ error: '組織不存在' });
      }

      res.json({ success: true, message: '組織已停用' });
    }
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ error: '刪除組織失敗' });
  }
});

// ========== 組織管理員管理端點 ==========

/**
 * GET /api/organizations/:id/admins
 * 獲取組織的管理員列表
 */
router.get('/:id/admins', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await queryAll(
      `SELECT id, username, name, email, role, isActive, lastLogin, createdAt
       FROM users
       WHERE organizationId = ? AND role = 'admin'
       ORDER BY createdAt DESC`,
      [req.params.id]
    );

    res.json(admins);
  } catch (error) {
    console.error('Get organization admins error:', error);
    res.status(500).json({ error: '獲取管理員列表失敗' });
  }
});

/**
 * POST /api/organizations/:id/admins
 * 為組織創建管理員帳號（自動生成密碼）
 */
router.post('/:id/admins', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, username } = req.body;

    // 驗證組織是否存在
    const org = await queryOne('SELECT id, name FROM organizations WHERE id = ?', [req.params.id]);
    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 生成預設帳號資訊
    const defaultUsername = username || `admin_${org.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const generatedPassword = crypto.randomBytes(8).toString('base64').slice(0, 12); // 生成 12 位隨機密碼
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // 檢查使用者名稱是否已存在
    const existing = await queryOne('SELECT id FROM users WHERE username = ?', [defaultUsername]);
    if (existing) {
      return res.status(400).json({ error: '使用者名稱已存在，請提供自訂使用者名稱' });
    }

    // 檢查 email 是否已存在（如果提供）
    if (email) {
      const existingEmail = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail) {
        return res.status(400).json({ error: '電子郵件已存在' });
      }
    }

    const now = new Date().toISOString();
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 創建管理員帳號
    await execute(`
      INSERT INTO users (
        id, username, password, name, email, role,
        organizationId, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      id,
      defaultUsername,
      hashedPassword,
      name || `${org.name} 管理員`,
      email || null,
      'admin',
      req.params.id,
      now,
      now
    ]);

    const newAdmin = await queryOne(
      'SELECT id, username, name, email, role, isActive, organizationId, createdAt FROM users WHERE id = ?',
      [id]
    );

    // 返回包含明文密碼的資訊（僅此一次）
    res.status(201).json({
      user: newAdmin,
      credentials: {
        username: defaultUsername,
        password: generatedPassword, // 明文密碼僅在創建時返回
        message: '請妥善保存此密碼，之後將無法再次查看'
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: '創建管理員失敗' });
  }
});

/**
 * POST /api/organizations/:id/admins/:userId/reset-password
 * 重置組織管理員密碼
 */
router.post('/:id/admins/:userId/reset-password', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    // 驗證該管理員屬於此組織
    const admin = await queryOne(
      'SELECT id, username, organizationId FROM users WHERE id = ? AND organizationId = ? AND role = ?',
      [req.params.userId, req.params.id, 'admin']
    );

    if (!admin) {
      return res.status(404).json({ error: '管理員不存在或不屬於此組織' });
    }

    // 生成新密碼
    const newPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    await execute(
      'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
      [hashedPassword, now, req.params.userId]
    );

    res.json({
      success: true,
      credentials: {
        username: admin.username,
        password: newPassword,
        message: '密碼已重置，請妥善保存新密碼'
      }
    });
  } catch (error) {
    console.error('Reset admin password error:', error);
    res.status(500).json({ error: '重置密碼失敗' });
  }
});

/**
 * DELETE /api/organizations/:id/admins/:userId
 * 刪除組織管理員
 */
router.delete('/:id/admins/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    // 驗證該管理員屬於此組織
    const admin = await queryOne(
      'SELECT id FROM users WHERE id = ? AND organizationId = ? AND role = ?',
      [req.params.userId, req.params.id, 'admin']
    );

    if (!admin) {
      return res.status(404).json({ error: '管理員不存在或不屬於此組織' });
    }

    // 檢查是否為該組織的最後一個管理員
    const adminCount = await queryOne(
      'SELECT COUNT(*) as count FROM users WHERE organizationId = ? AND role = ? AND isActive = 1',
      [req.params.id, 'admin']
    );

    if (adminCount.count <= 1) {
      return res.status(400).json({
        error: '無法刪除最後一個管理員，組織至少需要一位管理員'
      });
    }

    await execute('DELETE FROM users WHERE id = ?', [req.params.userId]);

    res.json({ success: true, message: '管理員已刪除' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: '刪除管理員失敗' });
  }
});

// ========== 一般用戶端點 ==========

// 獲取當前組織資訊
router.get('/me/info', authenticateToken, requireTenant, async (req, res) => {
  try {
    const org = await queryOne('SELECT * FROM organizations WHERE id = ?', [req.tenantContext.organizationId]);

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 一般用戶只能看到部分資訊
    const publicInfo = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      settings: org.settings ? JSON.parse(org.settings) : null
    };

    // 如果是組織管理員，顯示更多資訊
    if (req.user.role === 'admin') {
      const usersCount = await queryOne('SELECT COUNT(*) as count FROM users WHERE organizationId = ?', [org.id]);
      const patientsCount = await queryOne('SELECT COUNT(*) as count FROM patients WHERE organizationId = ?', [org.id]);

      const stats = {
        users: usersCount.count,
        patients: patientsCount.count
      };

      publicInfo.maxUsers = org.maxUsers;
      publicInfo.maxPatients = org.maxPatients;
      publicInfo.stats = stats;
      publicInfo.quotaUsage = {
        users: `${stats.users}/${org.maxUsers}`,
        patients: `${stats.patients}/${org.maxPatients}`
      };
    }

    res.json(publicInfo);
  } catch (error) {
    res.status(500).json({ error: '獲取組織資訊失敗' });
  }
});

// 更新當前組織設定（僅管理員）
router.put('/me/settings', authenticateToken, requireTenant, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }

  try {
    const { settings } = req.body;

    const now = new Date().toISOString();
    await execute('UPDATE organizations SET settings = ?, updatedAt = ? WHERE id = ?', [
      JSON.stringify(settings),
      now,
      req.tenantContext.organizationId
    ]);

    res.json({ success: true, message: '組織設定已更新' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: '更新設定失敗' });
  }
});

module.exports = router;
