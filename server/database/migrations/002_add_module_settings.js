/**
 * Migration: 新增模組化功能設定
 *
 * 目的：讓每個組織可以自訂啟用的功能模組
 * 影響範圍：
 * - 組織設定 (organizations.settings)
 * - 新增模組配置欄位
 */

const { queryAll, execute } = require('../helpers');

/**
 * 模組類型定義
 */
const AVAILABLE_MODULES = {
  healthManagement: {
    id: 'healthManagement',
    name: '健康管理',
    description: '體組成記錄、生命徵象追蹤、健康目標設定與追蹤',
    defaultEnabled: true,
    features: ['body_composition', 'vital_signs', 'goals', 'health_analytics']
  },
  appointments: {
    id: 'appointments',
    name: '預約管理',
    description: '預約排程與提醒',
    defaultEnabled: true,
    features: ['appointments']
  },
  lineMessaging: {
    id: 'lineMessaging',
    name: 'Line 訊息互動',
    description: 'Line@ 官方帳號整合，支援即時訊息、預約通知與貼圖互動',
    defaultEnabled: false,
    features: ['line_messaging', 'line_webhook', 'sticker_support', 'appointment_notifications']
  }
};

/**
 * 取得預設模組設定
 */
function getDefaultModuleSettings() {
  const modules = {};
  for (const [key, module] of Object.entries(AVAILABLE_MODULES)) {
    modules[key] = {
      enabled: module.defaultEnabled,
      name: module.name,
      features: module.features
    };
  }
  return modules;
}

/**
 * 執行遷移
 */
async function up() {
  console.log('[Migration 002] 開始：新增模組化功能設定');

  try {
    // 1. 獲取所有現有組織
    const organizations = await queryAll('SELECT id, settings FROM organizations');
    console.log(`[Migration 002] 找到 ${organizations.length} 個組織`);

    // 2. 為每個組織更新模組設定
    for (const org of organizations) {
      let settings = {};

      // 解析現有設定
      if (org.settings) {
        try {
          settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
        } catch (e) {
          console.warn(`[Migration 002] 組織 ${org.id} 的 settings 解析失敗，使用空物件`);
        }
      }

      // 新增模組設定（如果不存在）
      if (!settings.modules) {
        settings.modules = getDefaultModuleSettings();

        const settingsJson = JSON.stringify(settings);
        await execute('UPDATE organizations SET settings = ? WHERE id = ?', [settingsJson, org.id]);

        console.log(`[Migration 002] 已更新組織 ${org.id} 的模組設定`);
      } else {
        console.log(`[Migration 002] 組織 ${org.id} 已有模組設定，跳過`);
      }
    }

    console.log('[Migration 002] 完成：模組化功能設定已新增');
    return true;
  } catch (error) {
    console.error('[Migration 002] 失敗:', error);
    throw error;
  }
}

/**
 * 回滾遷移
 */
async function down() {
  console.log('[Migration 002] 開始回滾：移除模組化功能設定');

  try {
    const organizations = await queryAll('SELECT id, settings FROM organizations');

    for (const org of organizations) {
      if (org.settings) {
        try {
          const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;

          if (settings.modules) {
            delete settings.modules;
            const settingsJson = JSON.stringify(settings);
            await execute('UPDATE organizations SET settings = ? WHERE id = ?', [settingsJson, org.id]);
            console.log(`[Migration 002] 已移除組織 ${org.id} 的模組設定`);
          }
        } catch (e) {
          console.warn(`[Migration 002] 組織 ${org.id} 的設定處理失敗`);
        }
      }
    }

    console.log('[Migration 002] 完成回滾');
    return true;
  } catch (error) {
    console.error('[Migration 002] 回滾失敗:', error);
    throw error;
  }
}

module.exports = {
  up,
  down,
  AVAILABLE_MODULES,
  getDefaultModuleSettings
};
