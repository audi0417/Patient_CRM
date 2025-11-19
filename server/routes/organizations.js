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
const crypto = require('crypto');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin, requireTenant } = require('../middleware/tenantContext');
const { queryOne, queryAll, execute, transaction } = require('../database/helpers');
const { getDefaultModuleSettings } = require('../config/modules');

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

    // 詳細驗證必填欄位
    const missingFields = [];
    if (!name || name.trim() === '') missingFields.push('組織名稱');
    if (!slug || slug.trim() === '') missingFields.push('識別碼 (Slug)');
    if (!contactName || contactName.trim() === '') missingFields.push('聯絡人姓名');
    if (!contactEmail || contactEmail.trim() === '') missingFields.push('聯絡人電子郵件');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `以下欄位為必填項目：${missingFields.join('、')}`,
        missingFields: missingFields
      });
    }

    // 驗證 slug 格式（只允許小寫字母、數字、連字號）
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        error: '識別碼格式錯誤：只能包含小寫英文字母、數字和連字號(-)',
        field: 'slug'
      });
    }

    // 檢查 slug 是否已存在（唯一性約束）
    const existing = await queryOne('SELECT id, name FROM organizations WHERE slug = ?', [slug]);
    if (existing) {
      console.log(`[Organizations] Slug conflict detected:`, {
        requestedSlug: slug,
        existingOrgId: existing.id,
        existingOrgName: existing.name
      });
      return res.status(400).json({
        error: `識別碼「${slug}」已被組織「${existing.name}」使用，請使用其他識別碼`,
        field: 'slug',
        conflict: true,
        existingOrg: {
          id: existing.id,
          name: existing.name
        }
      });
    }
    console.log(`[Organizations] Slug "${slug}" is available`);

    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return res.status(400).json({
        error: '聯絡人電子郵件格式不正確',
        field: 'contactEmail'
      });
    }

    // 使用事務處理：確保組織和管理員同時創建成功，否則全部回滾
    await transaction(async () => {
      const now = new Date().toISOString();
      const id = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 根據方案設定預設配額
      const planLimits = {
        basic: { maxUsers: 9999, maxPatients: 100 },
        professional: { maxUsers: 9999, maxPatients: 500 },
        enterprise: { maxUsers: 9999, maxPatients: 99999 }
      };

      const limits = planLimits[plan] || planLimits.basic;

      // 準備預設設定（包含模組配置）
      const defaultSettings = {
        modules: getDefaultModuleSettings(),
        ...(settings || {})
      };

      // 步驟 1: 創建組織
      await execute(`
        INSERT INTO organizations (
          id, name, slug, domain, plan, maxUsers, maxPatients,
          isActive, settings, billingEmail, contactName, contactPhone, contactEmail,
          subscriptionStartDate, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        name.trim(),
        slug.trim().toLowerCase(),
        domain || null,
        plan || 'basic',
        maxUsers || limits.maxUsers,
        maxPatients || limits.maxPatients,
        1, // isActive
        JSON.stringify(defaultSettings),
        billingEmail || null,
        contactName.trim(),
        contactPhone || null,
        contactEmail.trim(),
        now, // subscriptionStartDate
        now,
        now
      ]);

      // 步驟 2: 創建管理員帳號（使用 slug 作為帳號名稱）
      const adminUsername = slug.trim().toLowerCase();
      const generatedPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);
      const hashedPassword = crypto.createHash('sha256').update(generatedPassword).digest('hex');
      const adminId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await execute(`
        INSERT INTO users (
          id, username, password, name, email, role,
          organizationId, isActive, isFirstLogin, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
      `, [
        adminId,
        adminUsername,
        hashedPassword,
        `${name.trim()} 管理員`,
        contactEmail.trim(),
        'admin',
        id,
        now,
        now
      ]);

      // 事務成功，返回結果
      const newOrg = await queryOne('SELECT * FROM organizations WHERE id = ?', [id]);
      newOrg.settings = JSON.parse(newOrg.settings);

      res.status(201).json({
        organization: newOrg,
        adminCredentials: {
          username: adminUsername,
          password: generatedPassword,
          message: '請妥善保存此密碼，提供給客戶進行首次登入'
        }
      });
    });

  } catch (error) {
    console.error('Create organization error:', error);

    // 提供詳細的錯誤訊息
    let errorMessage = '創建組織失敗';
    if (error.message) {
      if (error.message.includes('UNIQUE constraint failed')) {
        errorMessage = '識別碼已被使用，請使用其他識別碼';
      } else if (error.message.includes('NOT NULL constraint failed')) {
        errorMessage = '必填欄位未填寫完整';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      console.log(`[Organizations] Starting hard delete for organization: ${req.params.id}`);

      await transaction(async () => {
        // 按照依賴順序刪除（子資料 -> 父資料）
        console.log('[Organizations] Deleting goals...');
        const goalsResult = await execute('DELETE FROM goals WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${goalsResult.changes || 0} goals`);

        console.log('[Organizations] Deleting body_composition...');
        const bcResult = await execute('DELETE FROM body_composition WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${bcResult.changes || 0} body_composition records`);

        console.log('[Organizations] Deleting vital_signs...');
        const vsResult = await execute('DELETE FROM vital_signs WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${vsResult.changes || 0} vital_signs records`);

        console.log('[Organizations] Deleting consultations...');
        const consultResult = await execute('DELETE FROM consultations WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${consultResult.changes || 0} consultations`);

        console.log('[Organizations] Deleting appointments...');
        const apptResult = await execute('DELETE FROM appointments WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${apptResult.changes || 0} appointments`);

        console.log('[Organizations] Deleting patients...');
        const patientResult = await execute('DELETE FROM patients WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${patientResult.changes || 0} patients`);

        console.log('[Organizations] Deleting users...');
        const userResult = await execute('DELETE FROM users WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${userResult.changes || 0} users`);

        console.log('[Organizations] Deleting service_types...');
        const stResult = await execute('DELETE FROM service_types WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${stResult.changes || 0} service_types`);

        console.log('[Organizations] Deleting tags...');
        const tagResult = await execute('DELETE FROM tags WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${tagResult.changes || 0} tags`);

        console.log('[Organizations] Deleting groups...');
        const groupResult = await execute('DELETE FROM groups WHERE organizationId = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${groupResult.changes || 0} groups`);

        console.log('[Organizations] Deleting organization...');
        // 在刪除前查詢組織資訊用於日誌
        const orgToDelete = await queryOne('SELECT id, name, slug FROM organizations WHERE id = ?', [req.params.id]);
        console.log('[Organizations] Organization to delete:', orgToDelete);

        const orgResult = await execute('DELETE FROM organizations WHERE id = ?', [req.params.id]);
        console.log(`[Organizations] Deleted ${orgResult.changes || 0} organizations`);

        if (orgResult.changes === 0) {
          throw new Error('組織不存在或已被刪除');
        }

        // 確認刪除：檢查是否還存在
        const checkDeleted = await queryOne('SELECT id FROM organizations WHERE id = ?', [req.params.id]);
        console.log('[Organizations] Verification - org still exists?', checkDeleted ? 'YES (ERROR!)' : 'NO (correct)');

        // 檢查 slug 是否被釋放
        if (orgToDelete && orgToDelete.slug) {
          const slugCheck = await queryOne('SELECT id FROM organizations WHERE slug = ?', [orgToDelete.slug]);
          console.log(`[Organizations] Verification - slug "${orgToDelete.slug}" still occupied?`, slugCheck ? 'YES (ERROR!)' : 'NO (correct)');
        }
      });

      console.log(`[Organizations] Successfully deleted organization: ${req.params.id}`);
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

    // 驗證組織是否存在並獲取配額資訊
    const org = await queryOne('SELECT id, name, maxUsers FROM organizations WHERE id = ?', [req.params.id]);
    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 檢查用戶配額
    const currentUserCount = await queryOne(
      'SELECT COUNT(*) as count FROM users WHERE organizationId = ? AND isActive = 1',
      [req.params.id]
    );

    if (currentUserCount.count >= org.maxUsers) {
      return res.status(403).json({
        error: `已達到用戶數量上限 (${org.maxUsers})`,
        code: 'QUOTA_EXCEEDED',
        current: currentUserCount.count,
        limit: org.maxUsers
      });
    }

    // 生成預設帳號資訊
    const defaultUsername = username || `admin_${org.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const generatedPassword = crypto.randomBytes(8).toString('base64').slice(0, 12); // 生成 12 位隨機密碼
    const hashedPassword = crypto.createHash('sha256').update(generatedPassword).digest('hex');

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
        organizationId, isActive, isFirstLogin, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
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
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
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

// 獲取通知設定（僅管理員）
router.get('/me/notifications', authenticateToken, requireTenant, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }

  try {
    const org = await queryOne('SELECT settings FROM organizations WHERE id = ?', [req.tenantContext.organizationId]);

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 解析設定並取得通知設定
    let notifications = {
      emailReminders: false,
      lineReminders: false
    };

    if (org.settings) {
      try {
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
        if (settings.notifications) {
          notifications = { ...notifications, ...settings.notifications };
        }
      } catch (e) {
        console.error('解析組織設定失敗:', e);
      }
    }

    res.json({ notifications });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: '獲取通知設定失敗' });
  }
});

// 更新通知設定（僅管理員）
router.put('/me/notifications', authenticateToken, requireTenant, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }

  try {
    const { emailReminders, lineReminders } = req.body;

    // 驗證輸入
    if (emailReminders !== undefined && typeof emailReminders !== 'boolean') {
      return res.status(400).json({ error: 'emailReminders 必須是布林值' });
    }
    if (lineReminders !== undefined && typeof lineReminders !== 'boolean') {
      return res.status(400).json({ error: 'lineReminders 必須是布林值' });
    }

    // 取得現有設定
    const org = await queryOne('SELECT settings FROM organizations WHERE id = ?', [req.tenantContext.organizationId]);

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 解析現有設定
    let settings = {};
    if (org.settings) {
      try {
        settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
      } catch (e) {
        console.error('解析組織設定失敗:', e);
      }
    }

    // 更新通知設定
    if (!settings.notifications) {
      settings.notifications = {};
    }

    if (emailReminders !== undefined) {
      settings.notifications.emailReminders = emailReminders;
    }
    if (lineReminders !== undefined) {
      settings.notifications.lineReminders = lineReminders;
    }

    // 儲存回資料庫
    const now = new Date().toISOString();
    const settingsJson = JSON.stringify(settings);
    await execute('UPDATE organizations SET settings = ?, updatedAt = ? WHERE id = ?', [
      settingsJson,
      now,
      req.tenantContext.organizationId
    ]);

    res.json({
      success: true,
      message: '通知設定已更新',
      notifications: settings.notifications
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: '更新通知設定失敗' });
  }
});

// ========== 模組管理 ==========

// 獲取可用的模組列表（超級管理員）
router.get('/modules/available', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { AVAILABLE_MODULES } = require('../config/modules');
    res.json({ modules: AVAILABLE_MODULES });
  } catch (error) {
    console.error('Get available modules error:', error);
    res.status(500).json({ error: '獲取模組列表失敗' });
  }
});

// 獲取組織的模組配置（超級管理員）
router.get('/:id/modules', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const org = await queryOne('SELECT settings FROM organizations WHERE id = ?', [req.params.id]);

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    let modules = {};
    if (org.settings) {
      try {
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
        modules = settings.modules || {};
      } catch (e) {
        console.error('解析組織設定失敗:', e);
      }
    }

    res.json({ modules });
  } catch (error) {
    console.error('Get organization modules error:', error);
    res.status(500).json({ error: '獲取組織模組配置失敗' });
  }
});

// 更新組織的模組配置（超級管理員）
router.put('/:id/modules', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { modules } = req.body;

    if (!modules || typeof modules !== 'object') {
      return res.status(400).json({ error: '無效的模組配置' });
    }

    // 檢查組織是否存在
    const org = await queryOne('SELECT settings FROM organizations WHERE id = ?', [req.params.id]);
    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    // 解析現有設定
    let settings = {};
    if (org.settings) {
      try {
        settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
      } catch (e) {
        console.error('解析組織設定失敗:', e);
      }
    }

    // 更新模組設定
    settings.modules = modules;

    // 儲存回資料庫
    const now = new Date().toISOString();
    const settingsJson = JSON.stringify(settings);
    await execute('UPDATE organizations SET settings = ?, updatedAt = ? WHERE id = ?', [settingsJson, now, req.params.id]);

    res.json({
      success: true,
      message: '模組配置已更新',
      modules
    });
  } catch (error) {
    console.error('Update organization modules error:', error);
    res.status(500).json({ error: '更新模組配置失敗' });
  }
});

module.exports = router;
