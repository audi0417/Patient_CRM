/**
 * License Verification Service
 *
 * 地端部署的 License Key 驗證服務
 *
 * 功能：
 * - JWT 簽名驗證（RS256）
 * - 到期時間檢查
 * - 硬體指紋綁定驗證
 * - 功能閘道檢查
 * - 用戶/病患數限制檢查
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class LicenseService {
  constructor() {
    this.publicKey = null;
    this.licenseCache = null;
    this.lastCheck = null;
    this.CHECK_INTERVAL = 3600000; // 1 hour
  }

  /**
   * 初始化並載入公鑰
   */
  initialize() {
    try {
      // 從環境變數或預設路徑讀取公鑰
      const publicKeyPath = process.env.LICENSE_PUBLIC_KEY_PATH || 'config/license-public.pem';
      const fullPath = path.join(__dirname, '../..', publicKeyPath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`License public key not found at: ${fullPath}`);
      }

      this.publicKey = fs.readFileSync(fullPath, 'utf8');
      console.log('[License] Public key loaded successfully');
    } catch (error) {
      console.error('[License] Failed to load public key:', error.message);
      throw error;
    }
  }

  /**
   * 啟動時驗證 License
   */
  async verifyOnStartup() {
    console.log('[License] Verifying license on startup...');

    const licenseKey = process.env.LICENSE_KEY;
    if (!licenseKey) {
      throw new Error('LICENSE_KEY environment variable not set');
    }

    if (!this.publicKey) {
      this.initialize();
    }

    try {
      // 驗證 JWT 簽名和過期時間
      const license = jwt.verify(licenseKey, this.publicKey, {
        algorithms: ['RS256']
      });

      console.log('[License] JWT signature verified');

      // 檢查過期時間（額外檢查，jwt.verify 也會檢查）
      if (license.expires_at) {
        const expiresAt = new Date(license.expires_at);
        const now = new Date();

        if (now > expiresAt) {
          throw new Error(`License expired on ${expiresAt.toISOString()}`);
        }

        const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
        console.log(`[License] License valid until ${expiresAt.toISOString()} (${daysUntilExpiry} days remaining)`);

        if (daysUntilExpiry < 30) {
          console.warn(`[License] ⚠️  License will expire in ${daysUntilExpiry} days!`);
        }
      }

      // 硬體綁定驗證
      if (license.hardware_binding) {
        console.log('[License] Verifying hardware fingerprint...');
        const currentFingerprint = await this.getHardwareFingerprint(license.hardware_binding.method);

        if (currentFingerprint !== license.hardware_binding.fingerprint) {
          throw new Error('Hardware fingerprint mismatch - license is bound to different hardware');
        }

        console.log('[License] Hardware fingerprint verified');
      } else {
        console.log('[License] No hardware binding - license can run on any machine');
      }

      // 快取 License
      this.licenseCache = license;
      this.lastCheck = Date.now();

      // 顯示 License 資訊
      console.log('[License] ✓ License verified successfully');
      console.log(`[License]   Customer: ${license.customer_name} (${license.customer_id})`);
      console.log(`[License]   Type: ${license.license_type}`);
      console.log(`[License]   Max Users: ${license.max_users}`);
      console.log(`[License]   Max Patients: ${license.max_patients}`);
      console.log(`[License]   Features: ${license.features.join(', ')}`);

      return license;
    } catch (error) {
      console.error('[License] ❌ License verification failed:', error.message);
      throw error;
    }
  }

  /**
   * 定期檢查（每小時）
   */
  async periodicCheck() {
    const now = Date.now();

    // 如果最近檢查過，返回快取
    if (this.licenseCache && this.lastCheck && (now - this.lastCheck) < this.CHECK_INTERVAL) {
      return this.licenseCache;
    }

    // 重新驗證
    await this.verifyOnStartup();
    return this.licenseCache;
  }

  /**
   * 檢查是否有特定功能
   */
  hasFeature(featureName) {
    if (!this.licenseCache) {
      console.warn('[License] License not cached - call verifyOnStartup() first');
      return false;
    }

    return this.licenseCache.features && this.licenseCache.features.includes(featureName);
  }

  /**
   * 檢查用戶數限制
   */
  async checkUserLimit(currentCount) {
    if (!this.licenseCache) {
      throw new Error('License not verified');
    }

    if (currentCount >= this.licenseCache.max_users) {
      throw new Error(`User limit exceeded: ${currentCount}/${this.licenseCache.max_users}`);
    }

    return true;
  }

  /**
   * 檢查病患數限制
   */
  async checkPatientLimit(currentCount) {
    if (!this.licenseCache) {
      throw new Error('License not verified');
    }

    if (currentCount >= this.licenseCache.max_patients) {
      throw new Error(`Patient limit exceeded: ${currentCount}/${this.licenseCache.max_patients}`);
    }

    return true;
  }

  /**
   * 獲取硬體指紋
   */
  async getHardwareFingerprint(method = 'mac_address') {
    let data = '';

    switch (method) {
      case 'mac_address': {
        const ifaces = os.networkInterfaces();
        const macs = Object.values(ifaces)
          .flat()
          .filter(i => !i.internal && i.mac !== '00:00:00:00:00:00')
          .map(i => i.mac)
          .sort();

        if (macs.length === 0) {
          throw new Error('No valid network interfaces found for hardware fingerprint');
        }

        data = macs.join(',');
        break;
      }

      case 'cpu_id': {
        const cpus = os.cpus();
        if (cpus.length === 0) {
          throw new Error('No CPU information available');
        }
        data = cpus[0].model;
        break;
      }

      case 'mixed': {
        const ifaces = os.networkInterfaces();
        const macs = Object.values(ifaces)
          .flat()
          .filter(i => !i.internal && i.mac !== '00:00:00:00:00:00')
          .map(i => i.mac)
          .sort();

        const cpus = os.cpus();
        const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';

        data = macs.join(',') + cpuModel;
        break;
      }

      default:
        throw new Error(`Unknown hardware fingerprint method: ${method}`);
    }

    // 生成 SHA-256 hash
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 獲取當前 License 資訊
   */
  getLicenseInfo() {
    if (!this.licenseCache) {
      return null;
    }

    return {
      customer_id: this.licenseCache.customer_id,
      customer_name: this.licenseCache.customer_name,
      license_type: this.licenseCache.license_type,
      max_users: this.licenseCache.max_users,
      max_patients: this.licenseCache.max_patients,
      features: this.licenseCache.features,
      issued_at: this.licenseCache.issued_at,
      expires_at: this.licenseCache.expires_at,
      hardware_bound: !!this.licenseCache.hardware_binding
    };
  }

  /**
   * 檢查 License 是否即將過期（30天內）
   */
  isExpiringSoon() {
    if (!this.licenseCache || !this.licenseCache.expires_at) {
      return false;
    }

    const expiresAt = new Date(this.licenseCache.expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));

    return daysUntilExpiry > 0 && daysUntilExpiry < 30;
  }

  /**
   * 獲取距離到期的天數
   */
  getDaysUntilExpiry() {
    if (!this.licenseCache || !this.licenseCache.expires_at) {
      return null;
    }

    const expiresAt = new Date(this.licenseCache.expires_at);
    const now = new Date();
    return Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
  }
}

// 單例模式
module.exports = new LicenseService();
