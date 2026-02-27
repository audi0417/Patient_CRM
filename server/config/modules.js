/**
 * 模組配置定義
 *
 * 定義系統可用的功能模組
 */

/**
 * 可用模組定義
 */
const AVAILABLE_MODULES = {
  dataRecording: {
    id: 'dataRecording',
    name: '數據記錄模組',
    description: '支援多種數據記錄模式：營養管理、醫療監護、運動訓練、復健追蹤等',
    defaultEnabled: false,
    features: ['body_composition', 'vital_signs_recording', 'goals', 'data_analytics', 'multiple_recording_modes']
  },
  appointments: {
    id: 'appointments',
    name: '預約管理',
    description: '預約排程與提醒',
    defaultEnabled: false,
    features: ['appointments']
  },
  treatmentPackages: {
    id: 'treatmentPackages',
    name: '療程套裝',
    description: '療程方案管理、使用記錄追蹤、剩餘次數查詢',
    defaultEnabled: false,
    features: ['treatment_packages', 'package_usage_logs', 'service_items']
  },
  lineMessaging: {
    id: 'lineMessaging',
    name: 'Line 訊息互動',
    description: 'Line@ 官方帳號整合，支援即時訊息、預約通知與貼圖互動',
    defaultEnabled: false,
    features: ['line_messaging', 'line_webhook', 'sticker_support', 'appointment_notifications']
  },
  clinicDashboard: {
    id: 'clinicDashboard',
    name: '營運儀表板',
    description: '診所營運數據總覽、預約分析、病患成長、LINE 通訊績效',
    defaultEnabled: false,
    features: ['clinic_dashboard', 'analytics_overview', 'appointment_analytics', 'patient_analytics', 'line_analytics']
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
