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
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin, requireTenant } = require('../middleware/tenantContext');

// ========== 超級管理員端點 ==========

// 獲取所有組織（超級管理員）
router.get('/', authenticateToken, requireSuperAdmin, (req, res) => {
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

    const organizations = db.prepare(query).all(...params);

    // 為每個組織加入統計資訊
    const withStats = organizations.map(org => {
      const stats = {
        users: db.prepare('SELECT COUNT(*) as count FROM users WHERE organizationId = ?').get(org.id).count,
        patients: db.prepare('SELECT COUNT(*) as count FROM patients WHERE organizationId = ?').get(org.id).count,
        appointments: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE organizationId = ?').get(org.id).count
      };

      return {
        ...org,
        settings: org.settings ? JSON.parse(org.settings) : null,
        stats
      };
    });

    res.json(withStats);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: '獲取組織列表失敗' });
  }
});

// 獲取單個組織（超級管理員）
router.get('/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 加入詳細統計
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users WHERE organizationId = ?').get(org.id).count,
      activeUsers: db.prepare('SELECT COUNT(*) as count FROM users WHERE organizationId = ? AND isActive = 1').get(org.id).count,
      patients: db.prepare('SELECT COUNT(*) as count FROM patients WHERE organizationId = ?').get(org.id).count,
      appointments: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE organizationId = ?').get(org.id).count,
      appointmentsThisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM appointments
        WHERE organizationId = ?
        AND date >= date('now', 'start of month')
      `).get(org.id).count
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
router.post('/', authenticateToken, requireSuperAdmin, (req, res) => {
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
    const existing = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(slug);
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

    db.prepare(`
      INSERT INTO organizations (
        id, name, slug, domain, plan, maxUsers, maxPatients,
        isActive, settings, billingEmail, contactName, contactPhone, contactEmail,
        subscriptionStartDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );

    const newOrg = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
    newOrg.settings = JSON.parse(newOrg.settings);

    res.status(201).json(newOrg);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: '創建組織失敗' });
  }
});

// 更新組織（超級管理員）
router.put('/:id', authenticateToken, requireSuperAdmin, (req, res) => {
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
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 如果更新 slug，檢查是否與其他組織衝突
    if (slug && slug !== org.slug) {
      const existing = db.prepare('SELECT id FROM organizations WHERE slug = ? AND id != ?').get(slug, req.params.id);
      if (existing) {
        return res.status(400).json({ error: 'Slug 已被使用' });
      }
    }

    const result = db.prepare(`
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
    `).run(
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
    );

    const updated = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
    updated.settings = JSON.parse(updated.settings);

    res.json(updated);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: '更新組織失敗' });
  }
});

// 刪除組織（超級管理員，軟刪除）
router.delete('/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    const { force } = req.query;

    if (force === 'true') {
      // 硬刪除：刪除組織及所有相關資料
      db.transaction(() => {
        db.prepare('DELETE FROM goals WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM body_composition WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM vital_signs WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM consultations WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM appointments WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM patients WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM users WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM service_types WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM tags WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM groups WHERE organizationId = ?').run(req.params.id);
        db.prepare('DELETE FROM organizations WHERE id = ?').run(req.params.id);
      })();

      res.json({ success: true, message: '組織及所有相關資料已刪除' });
    } else {
      // 軟刪除：停用組織
      const result = db.prepare('UPDATE organizations SET isActive = 0, updatedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), req.params.id);

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

// ========== 一般用戶端點 ==========

// 獲取當前組織資訊
router.get('/me/info', authenticateToken, requireTenant, (req, res) => {
  try {
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.tenantContext.organizationId);

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
      const stats = {
        users: db.prepare('SELECT COUNT(*) as count FROM users WHERE organizationId = ?').get(org.id).count,
        patients: db.prepare('SELECT COUNT(*) as count FROM patients WHERE organizationId = ?').get(org.id).count
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
router.put('/me/settings', authenticateToken, requireTenant, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }

  try {
    const { settings } = req.body;

    const now = new Date().toISOString();
    db.prepare('UPDATE organizations SET settings = ?, updatedAt = ? WHERE id = ?')
      .run(JSON.stringify(settings), now, req.tenantContext.organizationId);

    res.json({ success: true, message: '組織設定已更新' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: '更新設定失敗' });
  }
});

module.exports = router;
