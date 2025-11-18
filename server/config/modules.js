/**
 * 模組配置定義
 *
 * 定義系統可用的功能模組
 */

/**
 * 可用模組定義
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

module.exports = {
  AVAILABLE_MODULES,
  getDefaultModuleSettings
};
