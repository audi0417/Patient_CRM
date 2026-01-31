/**
 * License Check Middleware
 *
 * License 驗證中介層，用於地端部署模式
 *
 * 功能：
 * - 啟動時初始化 License
 * - 定期檢查 License 狀態
 * - 功能閘道（requireFeature）
 */

const licenseService = require('../services/licenseService');
const { isOnPremise } = require('../config/deployment');

/**
 * 初始化 License（在伺服器啟動時呼叫）
 */
async function initializeLicense() {
  if (!isOnPremise()) {
    console.log('[License] Skipping license initialization (not in on-premise mode)');
    return;
  }

  console.log('[License] Initializing license system...');

  try {
    // 初始化並驗證 License
    await licenseService.verifyOnStartup();
    console.log('[License] License system initialized successfully');

    // 設定定期檢查（每小時）
    setInterval(async () => {
      try {
        await licenseService.periodicCheck();
      } catch (error) {
        console.error('[License] Periodic check failed:', error.message);
      }
    }, 3600000); // 1 hour

  } catch (error) {
    console.error('[License] ❌ FATAL: License initialization failed');
    console.error('[License]', error.message);
    console.error('[License] Server cannot start without valid license in on-premise mode');
    throw error;
  }
}

/**
 * License 定期檢查中介層
 * 用於保護需要 License 驗證的路由
 */
function periodicLicenseCheck(req, res, next) {
  // 僅在地端模式啟用
  if (!isOnPremise()) {
    return next();
  }

  licenseService.periodicCheck()
    .then(() => {
      // License 即將到期警告
      if (licenseService.isExpiringSoon()) {
        const daysRemaining = licenseService.getDaysUntilExpiry();
        console.warn(`[License] ⚠️  License expires in ${daysRemaining} days`);

        // 可選：在回應標頭中加入警告
        res.set('X-License-Expiring', `${daysRemaining} days remaining`);
      }

      next();
    })
    .catch(error => {
      console.error('[License] Verification failed:', error.message);
      res.status(403).json({
        error: 'License verification failed',
        code: 'LICENSE_INVALID',
        details: error.message
      });
    });
}

/**
 * 功能閘道中介層工廠
 * 檢查 License 是否包含特定功能
 *
 * @param {string} featureName - 功能名稱
 * @returns {Function} Express 中介層
 *
 * @example
 * router.get('/audit-logs', requireFeature('audit_logs'), (req, res) => {
 *   // 僅當 License 包含 audit_logs 功能時才能存取
 * });
 */
function requireFeature(featureName) {
  return (req, res, next) => {
    // 僅在地端模式啟用
    if (!isOnPremise()) {
      return next();
    }

    if (!licenseService.hasFeature(featureName)) {
      console.warn(`[License] Feature '${featureName}' blocked - not in license`);
      return res.status(403).json({
        error: `Feature '${featureName}' is not available in your license`,
        code: 'FEATURE_NOT_LICENSED',
        feature: featureName,
        available_features: licenseService.getLicenseInfo()?.features || []
      });
    }

    next();
  };
}

/**
 * 用戶配額檢查中介層
 * 檢查是否達到 License 的用戶數上限
 */
function checkUserQuota(req, res, next) {
  if (!isOnPremise()) {
    return next();
  }

  const { queryOne } = require('../database/helpers');
  const { whereBool } = require('../database/sqlHelpers');

  queryOne(`SELECT COUNT(*) as count FROM users WHERE ${whereBool('isActive', true)}`)
    .then(result => {
      return licenseService.checkUserLimit(result.count);
    })
    .then(() => next())
    .catch(error => {
      console.warn('[License] User quota check failed:', error.message);
      res.status(403).json({
        error: error.message,
        code: 'USER_QUOTA_EXCEEDED',
        limit: licenseService.getLicenseInfo()?.max_users
      });
    });
}

/**
 * 病患配額檢查中介層
 * 檢查是否達到 License 的病患數上限
 */
function checkPatientQuota(req, res, next) {
  if (!isOnPremise()) {
    return next();
  }

  const { queryOne } = require('../database/helpers');

  queryOne('SELECT COUNT(*) as count FROM patients')
    .then(result => {
      return licenseService.checkPatientLimit(result.count);
    })
    .then(() => next())
    .catch(error => {
      console.warn('[License] Patient quota check failed:', error.message);
      res.status(403).json({
        error: error.message,
        code: 'PATIENT_QUOTA_EXCEEDED',
        limit: licenseService.getLicenseInfo()?.max_patients
      });
    });
}

/**
 * 獲取 License 資訊（用於管理介面）
 */
function getLicenseInfo(req, res) {
  if (!isOnPremise()) {
    return res.json({
      mode: 'saas',
      message: 'License information not applicable in SaaS mode'
    });
  }

  const info = licenseService.getLicenseInfo();

  if (!info) {
    return res.status(500).json({
      error: 'License information not available',
      code: 'LICENSE_NOT_LOADED'
    });
  }

  // 加入額外狀態資訊
  const daysUntilExpiry = licenseService.getDaysUntilExpiry();
  const isExpiringSoon = licenseService.isExpiringSoon();

  res.json({
    ...info,
    status: {
      valid: true,
      days_until_expiry: daysUntilExpiry,
      expiring_soon: isExpiringSoon
    }
  });
}

module.exports = {
  initializeLicense,
  periodicLicenseCheck,
  requireFeature,
  checkUserQuota,
  checkPatientQuota,
  getLicenseInfo
};
