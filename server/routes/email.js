/**
 * 電子郵件 API 路由
 *
 * 提供郵件發送功能
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenantContext');
const EmailService = require('../services/emailService');
const { queryOne } = require('../database/helpers');

// 所有郵件路由都需要認證和租戶上下文
router.use(authenticateToken);
router.use(requireTenant);

/**
 * GET /api/email/status
 * 檢查郵件服務狀態
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: EmailService.isEnabled(),
      sender: EmailService.getSenderEmail()
    }
  });
});

/**
 * POST /api/email/send/appointment-reminder
 * 發送預約提醒郵件
 */
router.post('/send/appointment-reminder', async (req, res) => {
  try {
    const { patientId, appointmentId, to, date, time, type, notes } = req.body;

    // 驗證必填欄位
    if (!to || !date || !time || !type) {
      return res.status(400).json({
        success: false,
        error: '缺少必填欄位：to, date, time, type'
      });
    }

    // 取得病患姓名
    let patientName = req.body.patientName;
    if (!patientName && patientId) {
      const patient = await queryOne('SELECT name FROM patients WHERE id = ?', [patientId]);
      patientName = patient?.name || '患者';
    }

    // 發送郵件
    const result = await EmailService.sendAppointmentReminder({
      to,
      patientName: patientName || '患者',
      date,
      time,
      type,
      notes
    });

    if (result.success) {
      res.json({
        success: true,
        message: '預約提醒郵件已發送'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('發送預約提醒失敗:', error);
    res.status(500).json({
      success: false,
      error: '發送預約提醒失敗'
    });
  }
});

/**
 * POST /api/email/send/appointment-confirmation
 * 發送預約確認郵件
 */
router.post('/send/appointment-confirmation', async (req, res) => {
  try {
    const { patientId, to, date, time, type, notes } = req.body;

    // 驗證必填欄位
    if (!to || !date || !time || !type) {
      return res.status(400).json({
        success: false,
        error: '缺少必填欄位：to, date, time, type'
      });
    }

    // 取得病患姓名
    let patientName = req.body.patientName;
    if (!patientName && patientId) {
      const patient = await queryOne('SELECT name FROM patients WHERE id = ?', [patientId]);
      patientName = patient?.name || '患者';
    }

    // 發送郵件
    const result = await EmailService.sendAppointmentConfirmation({
      to,
      patientName: patientName || '患者',
      date,
      time,
      type,
      notes
    });

    if (result.success) {
      res.json({
        success: true,
        message: '預約確認郵件已發送'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('發送預約確認失敗:', error);
    res.status(500).json({
      success: false,
      error: '發送預約確認失敗'
    });
  }
});

/**
 * POST /api/email/send/appointment-cancellation
 * 發送預約取消通知
 */
router.post('/send/appointment-cancellation', async (req, res) => {
  try {
    const { patientId, to, date, time, type, reason } = req.body;

    // 驗證必填欄位
    if (!to || !date || !time || !type) {
      return res.status(400).json({
        success: false,
        error: '缺少必填欄位：to, date, time, type'
      });
    }

    // 取得病患姓名
    let patientName = req.body.patientName;
    if (!patientName && patientId) {
      const patient = await queryOne('SELECT name FROM patients WHERE id = ?', [patientId]);
      patientName = patient?.name || '患者';
    }

    // 發送郵件
    const result = await EmailService.sendAppointmentCancellation({
      to,
      patientName: patientName || '患者',
      date,
      time,
      type,
      reason
    });

    if (result.success) {
      res.json({
        success: true,
        message: '預約取消通知已發送'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('發送預約取消通知失敗:', error);
    res.status(500).json({
      success: false,
      error: '發送預約取消通知失敗'
    });
  }
});

/**
 * POST /api/email/send/notification
 * 發送一般通知郵件
 */
router.post('/send/notification', async (req, res) => {
  try {
    const { patientId, to, title, message } = req.body;

    // 驗證必填欄位
    if (!to || !title || !message) {
      return res.status(400).json({
        success: false,
        error: '缺少必填欄位：to, title, message'
      });
    }

    // 取得病患姓名
    let patientName = req.body.patientName;
    if (!patientName && patientId) {
      const patient = await queryOne('SELECT name FROM patients WHERE id = ?', [patientId]);
      patientName = patient?.name || '患者';
    }

    // 發送郵件
    const result = await EmailService.sendNotification({
      to,
      patientName: patientName || '患者',
      title,
      message
    });

    if (result.success) {
      res.json({
        success: true,
        message: '通知郵件已發送'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('發送通知郵件失敗:', error);
    res.status(500).json({
      success: false,
      error: '發送通知郵件失敗'
    });
  }
});

/**
 * POST /api/email/send/user-credentials
 * 發送用戶帳號密碼郵件（新建診所用戶時使用）
 */
router.post('/send/user-credentials', async (req, res) => {
  try {
    const { to, userName, username, password, organizationName, loginUrl } = req.body;

    // 驗證必填欄位
    if (!to || !userName || !username || !password) {
      return res.status(400).json({
        success: false,
        error: '缺少必填欄位：to, userName, username, password'
      });
    }

    // 發送郵件
    const result = await EmailService.sendUserCredentials({
      to,
      userName,
      username,
      password,
      organizationName: organizationName || '診所管理系統',
      loginUrl
    });

    if (result.success) {
      res.json({
        success: true,
        message: '用戶帳號資訊已發送'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('發送用戶帳號資訊失敗:', error);
    res.status(500).json({
      success: false,
      error: '發送用戶帳號資訊失敗'
    });
  }
});

module.exports = router;
