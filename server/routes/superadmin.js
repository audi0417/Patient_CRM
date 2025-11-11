/**
 * Super Admin Dashboard API
 *
 * 公司控制台 - 管理所有組織和查看系統統計
 *
 * 功能：
 * - 系統總覽儀表板
 * - 組織使用量追蹤
 * - 收入和訂閱統計
 * - 系統健康監控
 * - 用戶活躍度分析
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/tenantContext');

// 所有端點都需要超級管理員權限
router.use(authenticateToken);
router.use(requireSuperAdmin);

// ========== 儀表板總覽 ==========

/**
 * GET /api/superadmin/dashboard
 * 系統總覽儀表板
 */
router.get('/dashboard', (req, res) => {
  try {
    // 1. 組織統計
    const orgStats = {
      total: db.prepare('SELECT COUNT(*) as count FROM organizations').get().count,
      active: db.prepare('SELECT COUNT(*) as count FROM organizations WHERE isActive = 1').get().count,
      inactive: db.prepare('SELECT COUNT(*) as count FROM organizations WHERE isActive = 0').get().count,
      byPlan: {
        basic: db.prepare('SELECT COUNT(*) as count FROM organizations WHERE plan = ?').get('basic').count,
        professional: db.prepare('SELECT COUNT(*) as count FROM organizations WHERE plan = ?').get('professional').count,
        enterprise: db.prepare('SELECT COUNT(*) as count FROM organizations WHERE plan = ?').get('enterprise').count
      }
    };

    // 2. 用戶統計
    const userStats = {
      total: db.prepare('SELECT COUNT(*) as count FROM users WHERE role != ?').get('super_admin').count,
      active: db.prepare('SELECT COUNT(*) as count FROM users WHERE isActive = 1 AND role != ?').get('super_admin').count,
      admins: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin').count,
      regularUsers: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count
    };

    // 3. 患者統計
    const patientStats = {
      total: db.prepare('SELECT COUNT(*) as count FROM patients').get().count,
      thisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM patients
        WHERE date(createdAt) >= date('now', 'start of month')
      `).get().count,
      thisWeek: db.prepare(`
        SELECT COUNT(*) as count FROM patients
        WHERE date(createdAt) >= date('now', 'weekday 0', '-7 days')
      `).get().count
    };

    // 4. 預約統計
    const appointmentStats = {
      total: db.prepare('SELECT COUNT(*) as count FROM appointments').get().count,
      scheduled: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE status = ?').get('scheduled').count,
      completed: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE status = ?').get('completed').count,
      cancelled: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE status = ?').get('cancelled').count,
      thisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM appointments
        WHERE date(date) >= date('now', 'start of month')
      `).get().count
    };

    // 5. 系統健康指標
    const dbInfo = db.prepare('PRAGMA database_list').all();
    const tableCount = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get().count;

    const systemHealth = {
      database: {
        size: dbInfo[0] ? 'Connected' : 'Unknown',
        tables: tableCount
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };

    // 6. 最近活動（最近 10 個新增的組織）
    const recentOrganizations = db.prepare(`
      SELECT id, name, slug, plan, createdAt
      FROM organizations
      ORDER BY createdAt DESC
      LIMIT 10
    `).all();

    // 7. 配額使用率警告（接近上限的組織）
    const quotaWarnings = db.prepare(`
      SELECT
        o.id, o.name, o.slug, o.plan, o.maxUsers, o.maxPatients,
        (SELECT COUNT(*) FROM users WHERE organizationId = o.id AND isActive = 1) as currentUsers,
        (SELECT COUNT(*) FROM patients WHERE organizationId = o.id) as currentPatients
      FROM organizations o
      WHERE o.isActive = 1
    `).all().map(org => {
      const userUsage = (org.currentUsers / org.maxUsers) * 100;
      const patientUsage = (org.currentPatients / org.maxPatients) * 100;

      return {
        ...org,
        userUsagePercent: Math.round(userUsage),
        patientUsagePercent: Math.round(patientUsage),
        needsAttention: userUsage > 80 || patientUsage > 80
      };
    }).filter(org => org.needsAttention);

    // 8. 月度增長趨勢（最近 6 個月）
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStr = month.toISOString().substring(0, 7); // YYYY-MM

      const newOrgs = db.prepare(`
        SELECT COUNT(*) as count FROM organizations
        WHERE strftime('%Y-%m', createdAt) = ?
      `).get(monthStr).count;

      const newPatients = db.prepare(`
        SELECT COUNT(*) as count FROM patients
        WHERE strftime('%Y-%m', createdAt) = ?
      `).get(monthStr).count;

      monthlyGrowth.push({
        month: monthStr,
        organizations: newOrgs,
        patients: newPatients
      });
    }

    res.json({
      organizations: orgStats,
      users: userStats,
      patients: patientStats,
      appointments: appointmentStats,
      systemHealth,
      recentOrganizations,
      quotaWarnings,
      monthlyGrowth,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: '獲取儀表板資料失敗' });
  }
});

// ========== 組織使用量分析 ==========

/**
 * GET /api/superadmin/organizations/analytics
 * 所有組織的詳細使用量分析
 */
router.get('/organizations/analytics', (req, res) => {
  try {
    const { plan, sortBy = 'patients', order = 'DESC' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (plan) {
      whereClause += ' AND plan = ?';
      params.push(plan);
    }

    const organizations = db.prepare(`
      SELECT
        o.id, o.name, o.slug, o.plan, o.isActive,
        o.maxUsers, o.maxPatients,
        o.subscriptionStartDate, o.subscriptionEndDate,
        o.createdAt
      FROM organizations o
      ${whereClause}
    `).all(...params);

    // 為每個組織計算使用量
    const analytics = organizations.map(org => {
      // 用戶統計
      const users = db.prepare(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active,
               SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
        FROM users WHERE organizationId = ?
      `).get(org.id);

      // 患者統計
      const patients = db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN date(createdAt) >= date('now', 'start of month') THEN 1 END) as thisMonth,
          COUNT(CASE WHEN date(createdAt) >= date('now', '-30 days') THEN 1 END) as last30Days
        FROM patients WHERE organizationId = ?
      `).get(org.id);

      // 預約統計
      const appointments = db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN date(date) >= date('now', 'start of month') THEN 1 END) as thisMonth
        FROM appointments WHERE organizationId = ?
      `).get(org.id);

      // 最後活動時間
      const lastActivity = db.prepare(`
        SELECT MAX(lastLogin) as lastLogin FROM users
        WHERE organizationId = ? AND lastLogin IS NOT NULL
      `).get(org.id);

      // 計算使用率
      const userUsagePercent = Math.round((users.active / org.maxUsers) * 100);
      const patientUsagePercent = Math.round((patients.total / org.maxPatients) * 100);

      // 計算健康分數 (0-100)
      let healthScore = 100;
      if (userUsagePercent > 90) healthScore -= 30;
      else if (userUsagePercent > 80) healthScore -= 15;
      if (patientUsagePercent > 90) healthScore -= 30;
      else if (patientUsagePercent > 80) healthScore -= 15;
      if (!lastActivity.lastLogin) healthScore -= 20;
      else {
        const daysSinceLogin = Math.floor(
          (Date.now() - new Date(lastActivity.lastLogin).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLogin > 30) healthScore -= 20;
        else if (daysSinceLogin > 14) healthScore -= 10;
      }

      return {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          isActive: Boolean(org.isActive),
          createdAt: org.createdAt,
          subscriptionEndDate: org.subscriptionEndDate
        },
        usage: {
          users: {
            current: users.active,
            total: users.total,
            admins: users.admins,
            limit: org.maxUsers,
            usagePercent: userUsagePercent
          },
          patients: {
            total: patients.total,
            thisMonth: patients.thisMonth,
            last30Days: patients.last30Days,
            limit: org.maxPatients,
            usagePercent: patientUsagePercent
          },
          appointments: {
            total: appointments.total,
            scheduled: appointments.scheduled,
            completed: appointments.completed,
            thisMonth: appointments.thisMonth
          }
        },
        activity: {
          lastLogin: lastActivity.lastLogin,
          isActive: !!lastActivity.lastLogin &&
            (Date.now() - new Date(lastActivity.lastLogin).getTime()) < (30 * 24 * 60 * 60 * 1000)
        },
        healthScore,
        alerts: {
          userQuotaHigh: userUsagePercent > 80,
          patientQuotaHigh: patientUsagePercent > 80,
          inactive: !lastActivity.lastLogin ||
            (Date.now() - new Date(lastActivity.lastLogin).getTime()) > (30 * 24 * 60 * 60 * 1000),
          subscriptionExpiring: org.subscriptionEndDate &&
            new Date(org.subscriptionEndDate).getTime() - Date.now() < (7 * 24 * 60 * 60 * 1000)
        }
      };
    });

    // 排序
    const validSortFields = ['patients', 'users', 'appointments', 'healthScore'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'patients';

    analytics.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'patients':
          aVal = a.usage.patients.total;
          bVal = b.usage.patients.total;
          break;
        case 'users':
          aVal = a.usage.users.current;
          bVal = b.usage.users.current;
          break;
        case 'appointments':
          aVal = a.usage.appointments.total;
          bVal = b.usage.appointments.total;
          break;
        case 'healthScore':
          aVal = a.healthScore;
          bVal = b.healthScore;
          break;
      }
      return order === 'DESC' ? bVal - aVal : aVal - bVal;
    });

    res.json({
      total: analytics.length,
      organizations: analytics,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: '獲取使用量分析失敗' });
  }
});

// ========== 系統設定 ==========

/**
 * GET /api/superadmin/settings
 * 獲取系統設定
 */
router.get('/settings', (req, res) => {
  try {
    // 系統設定可以存在專門的設定表，這裡示範使用簡單的鍵值對
    // 實際應用中可以建立 system_settings 表

    const settings = {
      system: {
        name: 'Patient CRM System',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'production'
      },
      plans: {
        basic: {
          name: 'Basic',
          maxUsers: 5,
          maxPatients: 100,
          price: 99,
          currency: 'TWD',
          features: ['基礎患者管理', '預約排程', '健康記錄']
        },
        professional: {
          name: 'Professional',
          maxUsers: 20,
          maxPatients: 500,
          price: 499,
          currency: 'TWD',
          features: ['進階報表', 'API 存取', '多用戶協作', '優先支援']
        },
        enterprise: {
          name: 'Enterprise',
          maxUsers: 999,
          maxPatients: 99999,
          price: 1999,
          currency: 'TWD',
          features: ['無限制使用', '客製化功能', '專屬客服', 'SLA 保證']
        }
      },
      limits: {
        maxOrganizations: 10000,
        maxUsersPerOrg: {
          basic: 5,
          professional: 20,
          enterprise: 999
        },
        maxPatientsPerOrg: {
          basic: 100,
          professional: 500,
          enterprise: 99999
        }
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: '獲取系統設定失敗' });
  }
});

/**
 * PUT /api/superadmin/settings
 * 更新系統設定（預留功能）
 */
router.put('/settings', (req, res) => {
  try {
    // 這裡可以實作系統設定更新邏輯
    // 例如更新方案價格、功能限制等

    res.json({
      success: true,
      message: '系統設定已更新'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: '更新系統設定失敗' });
  }
});

// ========== 活動日誌 ==========

/**
 * GET /api/superadmin/activity-log
 * 系統活動日誌（最近登入、新增組織等）
 */
router.get('/activity-log', (req, res) => {
  try {
    const { limit = 50, type } = req.query;

    // 最近登入的用戶
    const recentLogins = db.prepare(`
      SELECT
        u.id, u.username, u.name, u.role, u.lastLogin,
        o.name as organizationName
      FROM users u
      LEFT JOIN organizations o ON u.organizationId = o.id
      WHERE u.lastLogin IS NOT NULL AND u.role != 'super_admin'
      ORDER BY u.lastLogin DESC
      LIMIT ?
    `).all(parseInt(limit));

    // 最近新增的組織
    const recentOrganizations = db.prepare(`
      SELECT id, name, slug, plan, createdAt
      FROM organizations
      ORDER BY createdAt DESC
      LIMIT ?
    `).all(parseInt(limit));

    // 最近新增的患者
    const recentPatients = db.prepare(`
      SELECT
        p.id, p.name, p.createdAt,
        o.name as organizationName
      FROM patients p
      LEFT JOIN organizations o ON p.organizationId = o.id
      ORDER BY p.createdAt DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({
      recentLogins,
      recentOrganizations,
      recentPatients,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: '獲取活動日誌失敗' });
  }
});

// ========== 收入報表 ==========

/**
 * GET /api/superadmin/revenue
 * 收入和訂閱統計（基於訂閱方案）
 */
router.get('/revenue', (req, res) => {
  try {
    const planPrices = {
      basic: 99,
      professional: 499,
      enterprise: 1999
    };

    // 按方案統計組織數量
    const orgsByPlan = db.prepare(`
      SELECT plan, COUNT(*) as count
      FROM organizations
      WHERE isActive = 1
      GROUP BY plan
    `).all();

    // 計算月收入
    const monthlyRevenue = orgsByPlan.reduce((sum, item) => {
      return sum + (planPrices[item.plan] || 0) * item.count;
    }, 0);

    // 年收入
    const yearlyRevenue = monthlyRevenue * 12;

    // 各方案收入佔比
    const revenueByPlan = orgsByPlan.map(item => ({
      plan: item.plan,
      organizations: item.count,
      monthlyRevenue: (planPrices[item.plan] || 0) * item.count,
      yearlyRevenue: (planPrices[item.plan] || 0) * item.count * 12,
      price: planPrices[item.plan]
    }));

    res.json({
      summary: {
        totalOrganizations: orgsByPlan.reduce((sum, item) => sum + item.count, 0),
        monthlyRevenue,
        yearlyRevenue,
        currency: 'TWD'
      },
      byPlan: revenueByPlan,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Revenue error:', error);
    res.status(500).json({ error: '獲取收入報表失敗' });
  }
});

module.exports = router;
