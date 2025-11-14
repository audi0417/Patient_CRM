/**
 * 整合模組配置
 * 將原有的 5 個模組整合為 2 個模組：
 * 1. healthManagement (健康管理) - 合併 healthData + goals
 * 2. appointments (預約管理)
 * 移除: consultations, analytics
 */

const { queryAll, execute } = require('../helpers');

const NEW_MODULES = {
  healthManagement: {
    id: 'healthManagement',
    name: '健康管理',
    description: '體組成記錄、生命徵象追蹤、健康目標設定與追蹤',
    enabled: true,
    features: ['body_composition', 'vital_signs', 'goals', 'health_analytics']
  },
  appointments: {
    id: 'appointments',
    name: '預約管理',
    description: '預約排程與提醒',
    enabled: true,
    features: ['appointments']
  }
};

async function up() {
  console.log('[Migration 003] 開始整合模組配置...');

  try {
    // 獲取所有組織
    const organizations = await queryAll('SELECT id, name, settings FROM organizations');

    if (organizations.length === 0) {
      console.log('[Migration 003] 沒有找到任何組織');
      return;
    }

    for (const org of organizations) {
      console.log(`[Migration 003] 處理組織: ${org.name} (${org.id})`);

      let settings = {};
      if (org.settings) {
        try {
          settings = typeof org.settings === 'string'
            ? JSON.parse(org.settings)
            : org.settings;
        } catch (e) {
          console.log(`[Migration 003] 組織 ${org.id} 的 settings 解析失敗，使用空物件`);
          settings = {};
        }
      }

      // 檢查舊模組配置
      const oldModules = settings.modules || {};

      // 計算新的模組啟用狀態
      // healthManagement: 如果舊的 healthData 或 goals 任一啟用，則啟用
      const healthDataEnabled = oldModules.healthData?.enabled ?? true;
      const goalsEnabled = oldModules.goals?.enabled ?? true;
      const healthManagementEnabled = healthDataEnabled || goalsEnabled;

      // appointments: 保持原狀態
      const appointmentsEnabled = oldModules.appointments?.enabled ?? true;

      // 建立新的模組配置
      const newModules = {
        healthManagement: {
          ...NEW_MODULES.healthManagement,
          enabled: healthManagementEnabled
        },
        appointments: {
          ...NEW_MODULES.appointments,
          enabled: appointmentsEnabled
        }
      };

      // 更新 settings
      settings.modules = newModules;

      // 儲存回資料庫
      const settingsJson = JSON.stringify(settings);
      const now = new Date().toISOString();

      await execute(
        'UPDATE organizations SET settings = ?, updatedAt = ? WHERE id = ?',
        [settingsJson, now, org.id]
      );

      console.log(`[Migration 003] ✓ 組織 ${org.id} 模組配置已更新`);
      console.log(`  - 健康管理: ${healthManagementEnabled ? '啟用' : '停用'}`);
      console.log(`  - 預約管理: ${appointmentsEnabled ? '啟用' : '停用'}`);
    }

    console.log('[Migration 003] 模組整合完成！');

  } catch (error) {
    console.error('[Migration 003] 錯誤:', error);
    throw error;
  }
}

async function down() {
  console.log('[Migration 003] 無法回復此遷移，請手動還原模組配置');
}

module.exports = { up, down };
