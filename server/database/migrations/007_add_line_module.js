/**
 * Migration: 新增 Line 互動模組
 *
 * 目的：在模組系統中註冊 Line 互動功能
 * 影響範圍：
 * - 組織設定 (organizations.settings.modules)
 * - 新增 lineMessaging 模組
 */

const { queryAll, execute } = require('../helpers');

/**
 * Line 模組定義
 */
const LINE_MODULE = {
  id: 'lineMessaging',
  name: 'Line 訊息互動',
  description: 'Line@ 官方帳號整合，支援即時訊息、預約通知與貼圖互動',
  defaultEnabled: false, // 預設關閉，需手動配置 Line Channel 後啟用
  features: ['line_messaging', 'line_webhook', 'sticker_support', 'appointment_notifications']
};

/**
 * 執行遷移
 */
async function up() {
  console.log('[Migration 007] 開始：新增 Line 互動模組');

  try {
    // 1. 獲取所有現有組織
    const organizations = await queryAll('SELECT id, settings FROM organizations');
    console.log(`[Migration 007] 找到 ${organizations.length} 個組織`);

    // 2. 為每個組織更新模組設定
    for (const org of organizations) {
      let settings = {};

      // 解析現有設定
      if (org.settings) {
        try {
          settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
        } catch (e) {
          console.warn(`[Migration 007] 組織 ${org.id} 的 settings 解析失敗，使用空物件`);
        }
      }

      // 確保 modules 物件存在
      if (!settings.modules) {
        settings.modules = {};
      }

      // 新增 Line 模組（如果不存在）
      if (!settings.modules.lineMessaging) {
        settings.modules.lineMessaging = {
          enabled: LINE_MODULE.defaultEnabled,
          name: LINE_MODULE.name,
          description: LINE_MODULE.description,
          features: LINE_MODULE.features
        };

        const settingsJson = JSON.stringify(settings);
        await execute('UPDATE organizations SET settings = ? WHERE id = ?', [settingsJson, org.id]);

        console.log(`[Migration 007] 已為組織 ${org.id} 新增 Line 模組`);
      } else {
        console.log(`[Migration 007] 組織 ${org.id} 已有 Line 模組設定，跳過`);
      }
    }

    console.log('[Migration 007] 完成：Line 互動模組已新增');
    return true;
  } catch (error) {
    console.error('[Migration 007] 失敗:', error);
    throw error;
  }
}

/**
 * 回滾遷移
 */
async function down() {
  console.log('[Migration 007] 開始回滾：移除 Line 互動模組');

  try {
    const organizations = await queryAll('SELECT id, settings FROM organizations');

    for (const org of organizations) {
      if (org.settings) {
        try {
          const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;

          if (settings.modules && settings.modules.lineMessaging) {
            delete settings.modules.lineMessaging;
            const settingsJson = JSON.stringify(settings);
            await execute('UPDATE organizations SET settings = ? WHERE id = ?', [settingsJson, org.id]);
            console.log(`[Migration 007] 已移除組織 ${org.id} 的 Line 模組設定`);
          }
        } catch (e) {
          console.warn(`[Migration 007] 組織 ${org.id} 的設定處理失敗`);
        }
      }
    }

    console.log('[Migration 007] 完成回滾');
    return true;
  } catch (error) {
    console.error('[Migration 007] 回滾失敗:', error);
    throw error;
  }
}

module.exports = {
  up,
  down,
  LINE_MODULE
};
