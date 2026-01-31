const { queryAll, execute } = require('../database/helpers');

class AuditLogger {
  /**
   * 記錄稽核日誌（非同步，不阻塞主流程）
   */
  static async log({
    userId,
    username,
    userRole,
    organizationId,
    action,
    resource,
    resourceId,
    details = {},
    ipAddress,
    userAgent,
    status = 'SUCCESS',
    errorMessage = null
  }) {
    // 使用 setImmediate 確保不阻塞主執行緒
    setImmediate(async () => {
      try {
        await execute(`
          INSERT INTO audit_logs (
            "userId", username, "userRole", "organizationId",
            action, resource, "resourceId", details,
            "ipAddress", "userAgent", status, "errorMessage"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          username,
          userRole,
          organizationId,
          action,
          resource,
          resourceId,
          JSON.stringify(details),
          ipAddress,
          userAgent,
          status,
          errorMessage
        ]);
      } catch (error) {
        // 稽核日誌失敗不應影響主流程，僅記錄錯誤
        console.error('[AuditLogger] Failed to write audit log:', error);
      }
    });
  }

  /**
   * 查詢稽核日誌
   */
  static async query({ organizationId, userId, resource, action, startDate, endDate, limit = 100, offset = 0 }) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (organizationId) {
      query += ' AND "organizationId" = ?';
      params.push(organizationId);
    }

    if (userId) {
      query += ' AND "userId" = ?';
      params.push(userId);
    }

    if (resource) {
      query += ' AND resource = ?';
      params.push(resource);
    }

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await queryAll(query, params);
  }
}

module.exports = AuditLogger;
