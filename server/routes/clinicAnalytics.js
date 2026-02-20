const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');
const { requireTenant, checkSubscriptionExpiry } = require('../middleware/tenantContext');

// 應用認證和租戶上下文
router.use(authenticateToken);
router.use(requireTenant);
router.use(checkSubscriptionExpiry);

/**
 * 診所營運儀表板 API
 * GET /api/analytics/clinic-dashboard
 * 
 * 根據使用者角色返回對應數據：
 * - admin: 全診所數據
 * - user: 僅個人相關數據（未來擴充）
 */
router.get('/clinic-dashboard', async (req, res) => {
  try {
    const { organizationId } = req.tenantContext;
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y
    
    // 計算日期範圍
    const dateRanges = calculateDateRanges(period);
    
    // 並行查詢所有數據
    const [
      summary,
      patientsData,
      appointmentsData,
      packagesData,
      lineData
    ] = await Promise.all([
      getTodaySummary(organizationId, dateRanges),
      getPatientsAnalytics(organizationId, dateRanges),
      getAppointmentsAnalytics(organizationId, dateRanges),
      getPackagesAnalytics(organizationId, dateRanges),
      getLineAnalytics(organizationId, dateRanges)
    ]);

    res.json({
      summary,
      patients: patientsData,
      appointments: appointmentsData,
      packages: packagesData,
      line: lineData,
      period,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Clinic dashboard error:', error);
    res.status(500).json({ error: '獲取儀表板數據失敗' });
  }
});

/**
 * 計算日期範圍
 */
function calculateDateRanges(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  let periodStart = new Date(today);
  switch (period) {
    case '7d':
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case '30d':
      periodStart.setDate(periodStart.getDate() - 30);
      break;
    case '90d':
      periodStart.setDate(periodStart.getDate() - 90);
      break;
    case '1y':
      periodStart.setFullYear(periodStart.getFullYear() - 1);
      break;
  }

  return {
    today: today.toISOString().split('T')[0],
    yesterday: yesterday.toISOString().split('T')[0],
    startOfMonth: startOfMonth.toISOString().split('T')[0],
    startOfLastMonth: startOfLastMonth.toISOString().split('T')[0],
    periodStart: periodStart.toISOString().split('T')[0],
    now: now.toISOString()
  };
}

/**
 * 今日摘要卡片數據
 */
async function getTodaySummary(organizationId, dateRanges) {
  const { today, yesterday, startOfMonth } = dateRanges;
  
  // 今日預約數
  const todayAppointments = await queryOne(`
    SELECT COUNT(*) as count
    FROM appointments
    WHERE organizationId = ? AND date = ? AND status = 'scheduled'
  `, [organizationId, today]);

  // 昨日預約數（用於對比）
  const yesterdayAppointments = await queryOne(`
    SELECT COUNT(*) as count
    FROM appointments
    WHERE organizationId = ? AND date = ? AND status = 'scheduled'
  `, [organizationId, yesterday]);

  // 未讀 LINE 訊息
  const unreadMessages = await queryOne(`
    SELECT COALESCE(SUM(unreadCount), 0) as count
    FROM conversations
    WHERE organizationId = ? AND unreadCount > 0
  `, [organizationId]);

  // 本月新病患
  const newPatientsThisMonth = await queryOne(`
    SELECT COUNT(*) as count
    FROM patients
    WHERE organizationId = ? AND DATE(createdAt) >= ?
  `, [organizationId, startOfMonth]);

  // 上月新病患（用於計算增長率）
  const newPatientsLastMonth = await queryOne(`
    SELECT COUNT(*) as count
    FROM patients
    WHERE organizationId = ? 
      AND DATE(createdAt) >= ? 
      AND DATE(createdAt) < ?
  `, [organizationId, dateRanges.startOfLastMonth, startOfMonth]);

  // 即將到期療程（7天內）
  const expiringDate = new Date();
  expiringDate.setDate(expiringDate.getDate() + 7);
  const expiringPackages = await queryOne(`
    SELECT COUNT(*) as count
    FROM treatment_packages
    WHERE organizationId = ? 
      AND status = 'active'
      AND expiryDate IS NOT NULL
      AND DATE(expiryDate) <= DATE(?)
  `, [organizationId, expiringDate.toISOString().split('T')[0]]);

  return {
    todayAppointments: todayAppointments?.count || 0,
    todayAppointmentsDiff: (todayAppointments?.count || 0) - (yesterdayAppointments?.count || 0),
    unreadMessages: unreadMessages?.count || 0,
    newPatientsThisMonth: newPatientsThisMonth?.count || 0,
    newPatientsGrowthRate: calculateGrowthRate(
      newPatientsLastMonth?.count || 0, 
      newPatientsThisMonth?.count || 0
    ),
    expiringPackages: expiringPackages?.count || 0
  };
}

/**
 * 病患分析數據
 */
async function getPatientsAnalytics(organizationId, dateRanges) {
  const { periodStart, startOfMonth } = dateRanges;

  // 總病患數
  const totalPatients = await queryOne(`
    SELECT COUNT(*) as count
    FROM patients
    WHERE organizationId = ?
  `, [organizationId]);

  // 本月新病患
  const newPatientsThisMonth = await queryOne(`
    SELECT COUNT(*) as count
    FROM patients
    WHERE organizationId = ? AND DATE(createdAt) >= ?
  `, [organizationId, startOfMonth]);

  // 病患成長趨勢（按月）
  const growthTrend = await queryAll(`
    SELECT 
      strftime('%Y-%m', createdAt) as month,
      COUNT(*) as count
    FROM patients
    WHERE organizationId = ? AND DATE(createdAt) >= ?
    GROUP BY strftime('%Y-%m', createdAt)
    ORDER BY month ASC
  `, [organizationId, periodStart]);

  // 性別分布
  const genderDistribution = await queryAll(`
    SELECT 
      COALESCE(gender, 'unknown') as gender,
      COUNT(*) as count
    FROM patients
    WHERE organizationId = ?
    GROUP BY gender
  `, [organizationId]);

  // 年齡分布
  const ageDistribution = await queryAll(`
    SELECT 
      CASE 
        WHEN (julianday('now') - julianday(birthDate))/365 < 18 THEN '0-18'
        WHEN (julianday('now') - julianday(birthDate))/365 < 36 THEN '19-35'
        WHEN (julianday('now') - julianday(birthDate))/365 < 51 THEN '36-50'
        ELSE '51+'
      END as ageRange,
      COUNT(*) as count
    FROM patients
    WHERE organizationId = ? AND birthDate IS NOT NULL
    GROUP BY ageRange
    ORDER BY ageRange
  `, [organizationId]);

  // 回訪率：有 >=2 次預約的病患比例
  const patientsWithMultipleVisits = await queryOne(`
    SELECT COUNT(DISTINCT patientId) as count
    FROM appointments
    WHERE organizationId = ?
    GROUP BY patientId
    HAVING COUNT(*) >= 2
  `, [organizationId]);

  const returningRate = totalPatients?.count > 0 
    ? (patientsWithMultipleVisits?.count || 0) / totalPatients.count 
    : 0;

  // 沉睡客戶（90天無預約）
  const dormantDays = 90;
  const dormantDate = new Date();
  dormantDate.setDate(dormantDate.getDate() - dormantDays);
  
  const dormantPatients = await queryAll(`
    SELECT 
      p.id,
      p.name,
      MAX(a.date) as lastVisitDate,
      julianday('now') - julianday(MAX(a.date)) as daysSinceLastVisit
    FROM patients p
    INNER JOIN appointments a ON p.id = a.patientId
    WHERE p.organizationId = ?
    GROUP BY p.id, p.name
    HAVING MAX(a.date) < DATE(?)
    ORDER BY lastVisitDate ASC
    LIMIT 10
  `, [organizationId, dormantDate.toISOString().split('T')[0]]);

  return {
    total: totalPatients?.count || 0,
    newThisMonth: newPatientsThisMonth?.count || 0,
    growthTrend: growthTrend.map(row => ({
      month: row.month,
      count: row.count
    })),
    genderDistribution: Object.fromEntries(
      genderDistribution.map(row => [row.gender, row.count])
    ),
    ageDistribution: ageDistribution.map(row => ({
      range: row.ageRange,
      count: row.count
    })),
    returningRate: Math.round(returningRate * 100) / 100,
    dormant: dormantPatients.map(row => ({
      id: row.id,
      name: row.name,
      lastVisitDate: row.lastVisitDate,
      daysSinceLastVisit: Math.round(row.daysSinceLastVisit)
    }))
  };
}

/**
 * 預約分析數據
 */
async function getAppointmentsAnalytics(organizationId, dateRanges) {
  const { periodStart } = dateRanges;

  // 預約狀態統計
  const statusStats = await queryAll(`
    SELECT 
      status,
      COUNT(*) as count
    FROM appointments
    WHERE organizationId = ? AND DATE(date) >= ?
    GROUP BY status
  `, [organizationId, periodStart]);

  const statusCounts = Object.fromEntries(
    statusStats.map(row => [row.status, row.count])
  );

  const total = Object.values(statusCounts).reduce((sum, count) => sum + Number(count), 0);
  const completed = statusCounts.completed || 0;
  const cancelled = statusCounts.cancelled || 0;

  // 預約趨勢（按日期）
  const trend = await queryAll(`
    SELECT 
      date,
      COUNT(*) as count
    FROM appointments
    WHERE organizationId = ? AND DATE(date) >= ?
    GROUP BY date
    ORDER BY date ASC
  `, [organizationId, periodStart]);

  // 熱門時段
  const byTimeSlot = await queryAll(`
    SELECT 
      time,
      COUNT(*) as count
    FROM appointments
    WHERE organizationId = ? AND DATE(date) >= ?
    GROUP BY time
    ORDER BY count DESC
    LIMIT 10
  `, [organizationId, periodStart]);

  // 服務類型分布
  const byServiceType = await queryAll(`
    SELECT 
      type,
      COUNT(*) as count
    FROM appointments
    WHERE organizationId = ? AND DATE(date) >= ?
    GROUP BY type
    ORDER BY count DESC
  `, [organizationId, periodStart]);

  return {
    total,
    completionRate: total > 0 ? Math.round((completed / total) * 100) / 100 : 0,
    cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) / 100 : 0,
    trend: trend.map(row => ({
      date: row.date,
      count: row.count
    })),
    byTimeSlot: byTimeSlot.map(row => ({
      time: row.time,
      count: row.count
    })),
    byServiceType: byServiceType.map(row => ({
      type: row.type || '未分類',
      count: row.count
    }))
  };
}

/**
 * 療程方案分析數據
 */
async function getPackagesAnalytics(organizationId, dateRanges) {
  // 方案狀態統計
  const statusStats = await queryAll(`
    SELECT 
      status,
      COUNT(*) as count
    FROM treatment_packages
    WHERE organizationId = ?
    GROUP BY status
  `, [organizationId]);

  const statusCounts = Object.fromEntries(
    statusStats.map(row => [row.status, row.count])
  );

  // 即將到期方案（30天內）
  const expiringSoonDate = new Date();
  expiringSoonDate.setDate(expiringSoonDate.getDate() + 30);
  
  const expiringSoon = await queryOne(`
    SELECT COUNT(*) as count
    FROM treatment_packages
    WHERE organizationId = ? 
      AND status = 'active'
      AND expiryDate IS NOT NULL
      AND DATE(expiryDate) <= DATE(?)
  `, [organizationId, expiringSoonDate.toISOString().split('T')[0]]);

  // 熱門服務項目排行
  const topServices = await queryAll(`
    SELECT 
      si.name,
      COUNT(*) as usageCount
    FROM package_usage_logs pul
    INNER JOIN treatment_packages tp ON pul.packageId = tp.id
    INNER JOIN service_items si ON pul.serviceItemId = si.id
    WHERE tp.organizationId = ?
    GROUP BY si.id, si.name
    ORDER BY usageCount DESC
    LIMIT 10
  `, [organizationId]);

  return {
    active: statusCounts.active || 0,
    completed: statusCounts.completed || 0,
    expired: statusCounts.expired || 0,
    expiringSoon: expiringSoon?.count || 0,
    topServices: topServices.map(row => ({
      name: row.name,
      usageCount: row.usageCount
    }))
  };
}

/**
 * LINE 通訊分析數據
 */
async function getLineAnalytics(organizationId, dateRanges) {
  const { periodStart } = dateRanges;

  // 未讀對話數
  const unreadConversations = await queryOne(`
    SELECT COUNT(*) as count
    FROM conversations
    WHERE organizationId = ? AND unreadCount > 0
  `, [organizationId]);

  // 活躍對話數（近7天有訊息）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const activeConversations = await queryOne(`
    SELECT COUNT(DISTINCT conversationId) as count
    FROM line_messages
    WHERE organizationId = ? 
      AND DATE(sentAt) >= ?
  `, [organizationId, sevenDaysAgo.toISOString().split('T')[0]]);

  // 每日訊息量趨勢
  const dailyMessageTrend = await queryAll(`
    SELECT 
      DATE(sentAt) as date,
      SUM(CASE WHEN senderType = 'ADMIN' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN senderType = 'PATIENT' THEN 1 ELSE 0 END) as received
    FROM line_messages
    WHERE organizationId = ? AND DATE(sentAt) >= ?
    GROUP BY DATE(sentAt)
    ORDER BY date ASC
  `, [organizationId, periodStart]);

  return {
    unreadConversations: unreadConversations?.count || 0,
    activeConversations: activeConversations?.count || 0,
    dailyMessageTrend: dailyMessageTrend.map(row => ({
      date: row.date,
      sent: row.sent,
      received: row.received
    }))
  };
}

/**
 * 計算增長率（百分比）
 */
function calculateGrowthRate(previous, current) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

module.exports = router;
