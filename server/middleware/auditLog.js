const AuditLogger = require('../services/auditService');

/**
 * 稽核中介層：注入 audit() 幫助函式到 req 物件
 */
function auditMiddleware(req, res, next) {
  req.audit = (action, resource, resourceId, details = {}, status = 'SUCCESS', errorMessage = null) => {
    const user = req.user || {};

    AuditLogger.log({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      organizationId: user.organizationId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status,
      errorMessage
    });
  };

  next();
}

module.exports = auditMiddleware;
