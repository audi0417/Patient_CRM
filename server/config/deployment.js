/**
 * Deployment Configuration Module
 *
 * 管理部署模式和配置
 * 支援 SaaS（多租戶雲端）和 On-Premise（地端部署）兩種模式
 */

const fs = require('fs');
const path = require('path');

// 部署模式常數
const DEPLOYMENT_MODES = {
  SAAS: 'saas',
  ON_PREMISE: 'on-premise'
};

/**
 * 獲取當前部署模式
 * @returns {'saas'|'on-premise'} 部署模式
 */
function getDeploymentMode() {
  const mode = (process.env.DEPLOYMENT_MODE || 'saas').toLowerCase();

  if (mode === 'on-premise' || mode === 'onpremise') {
    return DEPLOYMENT_MODES.ON_PREMISE;
  }

  return DEPLOYMENT_MODES.SAAS;
}

/**
 * 檢查是否為地端部署模式
 * @returns {boolean}
 */
function isOnPremise() {
  return getDeploymentMode() === DEPLOYMENT_MODES.ON_PREMISE;
}

/**
 * 檢查是否為 SaaS 模式
 * @returns {boolean}
 */
function isSaaS() {
  return getDeploymentMode() === DEPLOYMENT_MODES.SAAS;
}

/**
 * 獲取應用程式版本
 * @returns {string} 版本號
 */
function getAppVersion() {
  // 優先使用環境變數
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }

  // 從 package.json 讀取
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || '1.0.0';
  } catch (error) {
    console.warn('[Deployment] Failed to read version from package.json:', error.message);
    return '1.0.0';
  }
}

/**
 * 獲取完整的部署配置
 * @returns {Object} 部署配置物件
 */
function getDeploymentConfig() {
  const mode = getDeploymentMode();
  const version = getAppVersion();

  const config = {
    mode,
    version,
    isOnPremise: isOnPremise(),
    isSaaS: isSaaS(),
    nodeEnv: process.env.NODE_ENV || 'production',
    features: {
      multiTenant: isSaaS(),
      licenseValidation: isOnPremise(),
      superadminPortal: isSaaS(),
      selfHosted: isOnPremise()
    }
  };

  // On-Premise 特定配置
  if (isOnPremise()) {
    config.license = {
      keyProvided: !!process.env.LICENSE_KEY,
      publicKeyPath: process.env.LICENSE_PUBLIC_KEY_PATH || 'config/license-public.pem'
    };
  }

  // SaaS 特定配置
  if (isSaaS()) {
    config.saas = {
      allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
      apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:3001',
      clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
    };
  }

  return config;
}

/**
 * 驗證部署配置是否正確
 * @returns {{valid: boolean, errors: string[]}} 驗證結果
 */
function validateDeploymentConfig() {
  const errors = [];
  const mode = getDeploymentMode();

  // On-Premise 模式驗證
  if (mode === DEPLOYMENT_MODES.ON_PREMISE) {
    if (!process.env.LICENSE_KEY) {
      errors.push('LICENSE_KEY is required for on-premise deployment');
    }

    const publicKeyPath = process.env.LICENSE_PUBLIC_KEY_PATH || 'config/license-public.pem';
    const fullPath = path.join(__dirname, '../..', publicKeyPath);

    if (!fs.existsSync(fullPath)) {
      errors.push(`License public key not found at: ${publicKeyPath}`);
    }
  }

  // SaaS 模式驗證
  if (mode === DEPLOYMENT_MODES.SAAS) {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.ALLOWED_ORIGINS) {
        errors.push('ALLOWED_ORIGINS should be configured for production SaaS deployment');
      }
    }
  }

  // 通用驗證
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('CHANGE_THIS')) {
    errors.push('JWT_SECRET must be set to a secure random string');
  }

  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.includes('CHANGE_THIS')) {
    errors.push('ENCRYPTION_KEY must be set to a secure random string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 在啟動時顯示部署資訊
 */
function logDeploymentInfo() {
  const config = getDeploymentConfig();

  console.log('\n' + '='.repeat(60));
  console.log('📦 Patient CRM - Deployment Configuration');
  console.log('='.repeat(60));
  console.log(`Mode:        ${config.mode.toUpperCase()}`);
  console.log(`Version:     ${config.version}`);
  console.log(`Environment: ${config.nodeEnv}`);

  if (config.isOnPremise) {
    console.log(`License:     ${config.license.keyProvided ? '✓ Provided' : '✗ Missing'}`);
  }

  if (config.isSaaS) {
    console.log(`Multi-Tenant: ✓ Enabled`);
  }

  console.log('='.repeat(60) + '\n');

  // 驗證配置
  const validation = validateDeploymentConfig();
  if (!validation.valid) {
    console.error('\n⚠️  Configuration Warnings:');
    validation.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    console.error('');
  }
}

module.exports = {
  DEPLOYMENT_MODES,
  getDeploymentMode,
  isOnPremise,
  isSaaS,
  getAppVersion,
  getDeploymentConfig,
  validateDeploymentConfig,
  logDeploymentInfo
};
