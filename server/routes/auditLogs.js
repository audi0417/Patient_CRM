const express = require('express');
const router = express.Router();
const { authenticateToken, checkRole } = require('../middleware/auth');
const AuditLogger = require('../services/auditService');

// 查詢稽核日誌（管理員限定）
router.get('/', authenticateToken, checkRole('admin', 'super_admin'), async (req, res) => {
  const { userId, resource, action, startDate, endDate, limit, offset } = req.query;

  try {
    // 一般管理員只能查看自己組織的日誌
    const organizationId = req.user.role === 'super_admin' ? req.query.organizationId : req.user.organizationId;

    const logs = await AuditLogger.query({
      organizationId,
      userId,
      resource,
      action,
      startDate,
      endDate,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    });

    // 記錄查詢稽核日誌的行為
    req.audit('READ', 'audit_logs', null, {
      queryParams: { resource, action, startDate, endDate }
    });

    res.json(logs);
  } catch (error) {
    console.error('Query audit logs error:', error);
    req.audit('READ', 'audit_logs', null, {}, 'FAILURE', error.message);
    res.status(500).json({ message: '查詢失敗' });
  }
});

module.exports = router;
