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
const { queryOne, queryAll, execute } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/tenantContext');
const {
  whereBool,
  currentMonthStart,
  formatMonth,
  getTablesQuery,
  currentDate,
  quoteIdentifier,
  daysAgo,
  weeksAgo
} = require('../database/sqlHelpers');

// 所有端點都需要超級管理員權限
router.use(authenticateToken);
router.use(requireSuperAdmin);

// ========== 儀表板總覽 ==========

/**
 * GET /api/superadmin/dashboard
 * 系統總覽儀表板
 */
router.get('/dashboard', async (req, res) => {
  try {
    // 1. 組織統計
    const orgTotal = await queryOne('SELECT COUNT(*) as count FROM organizations');
    const orgActive = await queryOne(`SELECT COUNT(*) as count FROM organizations WHERE ${whereBool('isActive', true)}`);
    const orgInactive = await queryOne(`SELECT COUNT(*) as count FROM organizations WHERE ${whereBool('isActive', false)}`);
    const orgBasic = await queryOne('SELECT COUNT(*) as count FROM organizations WHERE plan = ?', ['basic']);
    const orgProfessional = await queryOne('SELECT COUNT(*) as count FROM organizations WHERE plan = ?', ['professional']);
    const orgEnterprise = await queryOne('SELECT COUNT(*) as count FROM organizations WHERE plan = ?', ['enterprise']);

    const orgStats = {
      total: orgTotal.count,
      active: orgActive.count,
      inactive: orgInactive.count,
      byPlan: {
        basic: orgBasic.count,
        professional: orgProfessional.count,
        enterprise: orgEnterprise.count
      }
    };

    // 2. 用戶統計
    const userTotal = await queryOne('SELECT COUNT(*) as count FROM users WHERE role != ?', ['super_admin']);
    const userActive = await queryOne(`SELECT COUNT(*) as count FROM users WHERE ${whereBool('isActive', true)} AND role != ?`, ['super_admin']);
    const userAdmins = await queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
    const userRegular = await queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['user']);

    const userStats = {
      total: userTotal.count,
      active: userActive.count,
      admins: userAdmins.count,
      regularUsers: userRegular.count
    };

    // 3. 患者統計
    const patientTotal = await queryOne('SELECT COUNT(*) as count FROM patients');
    const patientThisMonth = await queryOne(`
      SELECT COUNT(*) as count FROM patients
      WHERE DATE(${quoteIdentifier('createdAt')}) >= ${currentMonthStart()}
    `);
    const patientThisWeek = await queryOne(`
      SELECT COUNT(*) as count FROM patients
      WHERE DATE(${quoteIdentifier('createdAt')}) >= ${weeksAgo(1)}
    `);

    const patientStats = {
      total: patientTotal.count,
      thisMonth: patientThisMonth.count,
      thisWeek: patientThisWeek.count
    };

    // 4. 預約統計
    const appointmentTotal = await queryOne('SELECT COUNT(*) as count FROM appointments');
    const appointmentScheduled = await queryOne('SELECT COUNT(*) as count FROM appointments WHERE status = ?', ['scheduled']);
    const appointmentCompleted = await queryOne('SELECT COUNT(*) as count FROM appointments WHERE status = ?', ['completed']);
    const appointmentCancelled = await queryOne('SELECT COUNT(*) as count FROM appointments WHERE status = ?', ['cancelled']);
    const appointmentThisMonth = await queryOne(`
      SELECT COUNT(*) as count FROM appointments
      WHERE DATE(${quoteIdentifier('date')}) >= ${currentMonthStart()}
    `);

    const appointmentStats = {
      total: appointmentTotal.count,
      scheduled: appointmentScheduled.count,
      completed: appointmentCompleted.count,
      cancelled: appointmentCancelled.count,
      thisMonth: appointmentThisMonth.count
    };

    // 5. 系統健康指標
    const tableCountResult = await queryOne(getTablesQuery().replace('SELECT table_name', 'SELECT COUNT(*) as count'));

    const systemHealth = {
      database: {
        type: require('../database/sqlHelpers').getDbType(),
        tables: tableCountResult.count
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };

    // 6. 最近活動（最近 10 個新增的組織）
    const recentOrganizations = await queryAll(`
      SELECT id, name, slug, plan, createdAt
      FROM organizations
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    // 7. 配額使用率警告（接近上限的組織）
    const quotaData = await queryAll(`
      SELECT
        o.id, o.name, o.slug, o.plan, ${quoteIdentifier('o.maxUsers')}, ${quoteIdentifier('o.maxPatients')},
        (SELECT COUNT(*) FROM users WHERE ${quoteIdentifier('organizationId')} = o.id AND ${whereBool('isActive', true)}) as currentUsers,
        (SELECT COUNT(*) FROM patients WHERE ${quoteIdentifier('organizationId')} = o.id) as currentPatients
      FROM organizations o
      WHERE ${whereBool('o.isActive', true)}
    `);

    const quotaWarnings = quotaData.map(org => {
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

      const newOrgs = await queryOne(`
        SELECT COUNT(*) as count FROM organizations
        WHERE ${formatMonth('createdAt')} = ?
      `, [monthStr]);

      const newPatients = await queryOne(`
        SELECT COUNT(*) as count FROM patients
        WHERE ${formatMonth('createdAt')} = ?
      `, [monthStr]);

      monthlyGrowth.push({
        month: monthStr,
        organizations: newOrgs.count,
        patients: newPatients.count
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
 * GET /api/superadmin/organizations
 * 獲取所有組織列表（簡化版）
 */
router.get('/organizations', async (req, res) => {
  try {
    const { isActive, plan } = req.query;
    let query = `SELECT id, name, slug, plan, ${quoteIdentifier('isActive')}, ${quoteIdentifier('createdAt')} FROM organizations WHERE 1=1`;
    const params = [];

    if (isActive !== undefined) {
      const boolValue = isActive === 'true';
      query += ` AND ${whereBool('isActive', boolValue)}`;
    }

    if (plan) {
      query += ' AND plan = ?';
      params.push(plan);
    }

    query += ` ORDER BY ${quoteIdentifier('createdAt')} DESC`;

    const organizations = await queryAll(query, params);
    res.json(organizations);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: '獲取組織列表失敗' });
  }
});

/**
 * GET /api/superadmin/organizations/analytics
 * 所有組織的詳細使用量分析
 */
router.get('/organizations/analytics', async (req, res) => {
  try {
    const { plan, sortBy = 'patients', order = 'DESC' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (plan) {
      whereClause += ' AND plan = ?';
      params.push(plan);
    }

    const organizations = await queryAll(`
      SELECT
        o.id, o.name, o.slug, o.plan, ${quoteIdentifier('o.isActive')},
        ${quoteIdentifier('o.maxUsers')}, ${quoteIdentifier('o.maxPatients')},
        ${quoteIdentifier('o.subscriptionStartDate')}, ${quoteIdentifier('o.subscriptionEndDate')},
        ${quoteIdentifier('o.createdAt')}
      FROM organizations o
      ${whereClause}
    `, params);

    // 為每個組織計算使用量
    const analytics = await Promise.all(organizations.map(async (org) => {
      // 用戶統計
      const users = await queryOne(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN ${whereBool('isActive', true)} THEN 1 ELSE 0 END) as active,
               SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
        FROM users WHERE ${quoteIdentifier('organizationId')} = ?
      `, [org.id]);

      // 患者統計
      const patients = await queryOne(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(${quoteIdentifier('createdAt')}) >= ${currentMonthStart()} THEN 1 END) as thisMonth,
          COUNT(CASE WHEN ${quoteIdentifier('createdAt')} >= ${daysAgo(30)} THEN 1 END) as last30Days
        FROM patients WHERE ${quoteIdentifier('organizationId')} = ?
      `, [org.id]);

      // 預約統計
      const appointments = await queryOne(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN DATE(${quoteIdentifier('date')}) >= ${currentMonthStart()} THEN 1 END) as thisMonth
        FROM appointments WHERE ${quoteIdentifier('organizationId')} = ?
      `, [org.id]);

      // 最後活動時間
      const lastActivity = await queryOne(`
        SELECT MAX(${quoteIdentifier('lastLogin')}) as lastLogin FROM users
        WHERE ${quoteIdentifier('organizationId')} = ? AND ${quoteIdentifier('lastLogin')} IS NOT NULL
      `, [org.id]);

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
    }));

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
router.get('/settings', async (req, res) => {
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
router.put('/settings', async (req, res) => {
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
router.get('/activity-log', async (req, res) => {
  try {
    const { limit = 50, type } = req.query;

    // 最近登入的用戶
    const recentLogins = await queryAll(`
      SELECT
        u.id, u.username, u.name, u.role, ${quoteIdentifier('u.lastLogin')},
        o.name as organizationName
      FROM users u
      LEFT JOIN organizations o ON ${quoteIdentifier('u.organizationId')} = o.id
      WHERE ${quoteIdentifier('u.lastLogin')} IS NOT NULL AND u.role != 'super_admin'
      ORDER BY ${quoteIdentifier('u.lastLogin')} DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // 最近新增的組織
    const recentOrganizations = await queryAll(`
      SELECT id, name, slug, plan, ${quoteIdentifier('createdAt')}
      FROM organizations
      ORDER BY ${quoteIdentifier('createdAt')} DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // 最近新增的患者
    const recentPatients = await queryAll(`
      SELECT
        p.id, p.name, ${quoteIdentifier('p.createdAt')},
        o.name as organizationName
      FROM patients p
      LEFT JOIN organizations o ON ${quoteIdentifier('p.organizationId')} = o.id
      ORDER BY ${quoteIdentifier('p.createdAt')} DESC
      LIMIT ?
    `, [parseInt(limit)]);

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
router.get('/revenue', async (req, res) => {
  try {
    const planPrices = {
      basic: 99,
      professional: 499,
      enterprise: 1999
    };

    // 按方案統計組織數量
    const orgsByPlan = await queryAll(`
      SELECT plan, COUNT(*) as count
      FROM organizations
      WHERE ${whereBool('isActive', true)}
      GROUP BY plan
    `);

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

// ========== 患者總覽 ==========

/**
 * GET /api/superadmin/patients
 * 獲取所有組織的患者列表（超級管理員專用）
 */
// 病患統計端點（僅匯總資料，不包含個人 PII）
router.get('/patients/stats', async (req, res) => {
  try {
    const stats = await queryAll(`
      SELECT
        o.id AS organizationId,
        o.name AS organizationName,
        COUNT(p.id) AS patientCount,
        COUNT(CASE WHEN ${quoteIdentifier('p.createdAt')} >= ${daysAgo(30)} THEN 1 END) AS patientsLast30Days,
        COUNT(CASE WHEN ${quoteIdentifier('p.createdAt')} >= ${daysAgo(7)} THEN 1 END) AS patientsLast7Days
      FROM organizations o
      LEFT JOIN patients p ON ${quoteIdentifier('p.organizationId')} = o.id
      GROUP BY o.id, o.name
      ORDER BY patientCount DESC
    `);

    res.json(stats);
  } catch (error) {
    console.error('[SuperAdmin] Error fetching patient stats:', error);
    res.status(500).json({ error: '獲取病患統計失敗' });
  }
});

// Debug 端點（僅在環境變數啟用時可用，用於系統除錯）
if (process.env.ENABLE_SUPERADMIN_PII_ACCESS === 'true') {
  router.get('/patients/debug', async (req, res) => {
    try {
      const patients = await queryAll(`
        SELECT
          p.id,
          p.name,
          p.gender,
          ${quoteIdentifier('p.birthDate')},
          p.phone,
          p.email,
          ${quoteIdentifier('p.bloodType')},
          p.tags,
          ${quoteIdentifier('p.organizationId')},
          o.name as organizationName,
          ${quoteIdentifier('p.createdAt')}
        FROM patients p
        LEFT JOIN organizations o ON ${quoteIdentifier('p.organizationId')} = o.id
        ORDER BY ${quoteIdentifier('p.createdAt')} DESC
        LIMIT 100
      `);

      // 解析 JSON 欄位
      const parsedPatients = patients.map(p => ({
        ...p,
        tags: p.tags ? JSON.parse(p.tags) : []
      }));

      console.warn('[SuperAdmin] DEBUG: PII access by user', req.user?.username);

      res.json(parsedPatients);
    } catch (error) {
      console.error('[SuperAdmin] Error fetching patients (debug):', error);
      res.status(500).json({ error: '獲取患者列表失敗' });
    }
  });
}

module.exports = router;
