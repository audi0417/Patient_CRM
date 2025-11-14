/**
 * 模組存取控制中介軟體
 *
 * 根據組織的模組設定，控制使用者對特定功能的存取權限
 */

const { queryOne } = require('../database/helpers');

/**
 * 檢查組織是否啟用指定模組
 * @param {string} moduleId - 模組 ID (healthData, goals, consultations, appointments, analytics)
 */
function requireModule(moduleId) {
  return async (req, res, next) => {
    try {
      // Super admin 不受模組限制
      if (req.user && req.user.role === 'super_admin') {
        return next();
      }

      // 獲取使用者的組織 ID
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          error: '無法確認組織資訊',
          code: 'NO_ORGANIZATION'
        });
      }

      // 查詢組織設定
      const org = await queryOne('SELECT settings FROM organizations WHERE id = ?', [organizationId]);

      if (!org) {
        return res.status(404).json({
          success: false,
          error: '組織不存在',
          code: 'ORGANIZATION_NOT_FOUND'
        });
      }

      // 解析模組設定
      let modules = {};
      if (org.settings) {
        try {
          const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
          modules = settings.modules || {};
        } catch (e) {
          console.error('解析組織設定失敗:', e);
        }
      }

      // 檢查模組是否啟用
      const moduleConfig = modules[moduleId];

      if (!moduleConfig || !moduleConfig.enabled) {
        return res.status(403).json({
          success: false,
          error: '此功能模組未啟用',
          code: 'MODULE_DISABLED',
          module: moduleId,
          moduleName: moduleConfig?.name || moduleId
        });
      }

      // 模組已啟用，繼續處理請求
      next();
    } catch (error) {
      console.error('模組檢查錯誤:', error);
      res.status(500).json({
        success: false,
        error: '模組檢查失敗',
        code: 'MODULE_CHECK_ERROR'
      });
    }
  };
}

/**
 * 取得組織的模組配置（用於前端）
 */
async function getOrganizationModules(req, res) {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      // Super admin 返回所有模組為啟用
      if (req.user?.role === 'super_admin') {
        const { AVAILABLE_MODULES } = require('../database/migrations/002_add_module_settings');
        const allModules = {};
        for (const [key, module] of Object.entries(AVAILABLE_MODULES)) {
          allModules[key] = {
            enabled: true,
            name: module.name,
            description: module.description,
            features: module.features
          };
        }
        return res.json({ modules: allModules });
      }

      return res.status(400).json({
        success: false,
        error: '無法確認組織資訊'
      });
    }

    const org = await queryOne('SELECT settings FROM organizations WHERE id = ?', [organizationId]);

    if (!org) {
      return res.status(404).json({
        success: false,
        error: '組織不存在'
      });
    }

    let modules = {};
    if (org.settings) {
      try {
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
        modules = settings.modules || {};
      } catch (e) {
        console.error('解析組織設定失敗:', e);
      }
    }

    res.json({ modules });
  } catch (error) {
    console.error('獲取模組配置錯誤:', error);
    res.status(500).json({
      success: false,
      error: '獲取模組配置失敗'
    });
  }
}

module.exports = {
  requireModule,
  getOrganizationModules
};
