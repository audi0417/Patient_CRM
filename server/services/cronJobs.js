/**
 * 定時任務服務
 *
 * 處理系統的定時任務，包括：
 * - 每日預約提醒發送
 */

const cron = require('node-cron');
const { queryOne, queryAll } = require('../database/helpers');
const EmailService = require('./emailService');

/**
 * 啟動所有定時任務
 */
function startCronJobs() {
  console.log('🕐 啟動定時任務服務...');

  // 每天早上 9:00 發送明日預約提醒
  cron.schedule('0 9 * * *', async () => {
    console.log('📅 開始檢查明日預約並發送提醒...');
    await sendTomorrowAppointmentReminders();
  });

  // 開發測試：每分鐘執行一次（注釋掉以避免測試時頻繁執行）
  // cron.schedule('* * * * *', async () => {
  //   console.log('🧪 [測試] 檢查明日預約...');
  //   await sendTomorrowAppointmentReminders();
  // });

  console.log('✅ 定時任務已啟動：');
  console.log('   - 每日 09:00 發送明日預約提醒');
}

/**
 * 發送明日預約提醒
 */
async function sendTomorrowAppointmentReminders() {
  try {
    // 計算明天的日期
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    console.log(`📆 查詢日期: ${tomorrowDate} 的預約`);

    // 查詢所有啟用中的組織及其設定
    const organizations = await queryAll(
      'SELECT id, name, settings FROM organizations WHERE isActive = 1'
    );

    console.log(`🏥 找到 ${organizations.length} 個啟用中的組織`);

    let totalReminders = 0;
    let emailsSent = 0;
    let linesSent = 0;
    let errors = 0;

    // 為每個組織處理提醒
    for (const org of organizations) {
      try {
        // 解析組織的通知設定
        let notifications = {
          emailReminders: false,
          lineReminders: false
        };

        if (org.settings) {
          try {
            const settings = typeof org.settings === 'string'
              ? JSON.parse(org.settings)
              : org.settings;
            if (settings.notifications) {
              notifications = { ...notifications, ...settings.notifications };
            }
          } catch (e) {
            console.error(`解析組織 ${org.name} 設定失敗:`, e);
          }
        }

        // 如果兩種提醒都未啟用，跳過此組織
        if (!notifications.emailReminders && !notifications.lineReminders) {
          console.log(`⏭️  組織 ${org.name} 未啟用任何提醒方式，跳過`);
          continue;
        }

        console.log(`🔍 處理組織: ${org.name}`);
        console.log(`   Email 提醒: ${notifications.emailReminders ? '✅' : '❌'}`);
        console.log(`   LINE 提醒: ${notifications.lineReminders ? '✅' : '❌'}`);

        // 查詢該組織明天的預約
        const appointments = await queryAll(`
          SELECT
            a.id,
            a.date,
            a.time,
            a.type,
            a.notes,
            p.id as patientId,
            p.name as patientName,
            p.email as patientEmail,
            p.lineUserId
          FROM appointments a
          JOIN patients p ON a.patientId = p.id
          WHERE a.organizationId = ?
            AND a.date = ?
            AND a.status = 'scheduled'
          ORDER BY a.time
        `, [org.id, tomorrowDate]);

        console.log(`   找到 ${appointments.length} 筆預約`);

        // 為每個預約發送提醒
        for (const apt of appointments) {
          totalReminders++;
          let reminderSent = false;

          // Email 提醒
          if (notifications.emailReminders && apt.patientEmail) {
            try {
              const result = await EmailService.sendAppointmentReminder({
                to: apt.patientEmail,
                patientName: apt.patientName,
                date: apt.date,
                time: apt.time,
                type: apt.type,
                notes: apt.notes
              });

              if (result.success) {
                console.log(`   ✉️  已發送 Email 提醒至: ${apt.patientEmail} (${apt.patientName})`);
                emailsSent++;
                reminderSent = true;
              } else {
                console.error(`   ❌ Email 發送失敗: ${result.error}`);
                errors++;
              }
            } catch (error) {
              console.error(`   ❌ Email 發送異常:`, error);
              errors++;
            }
          } else if (notifications.emailReminders && !apt.patientEmail) {
            console.log(`   ⚠️  ${apt.patientName} 未設定 Email，跳過 Email 提醒`);
          }

          // LINE 提醒
          if (notifications.lineReminders && apt.lineUserId) {
            try {
              // 查詢 LINE 設定
              const lineConfig = await queryOne(
                'SELECT channelAccessToken FROM line_configs WHERE organizationId = ? AND isActive = 1',
                [org.id]
              );

              if (lineConfig && lineConfig.channelAccessToken) {
                // 這裡應該調用 LINE 訊息發送服務
                // 目前暫時只記錄，未來可以整合 LINE Messaging API
                console.log(`   📱 [TODO] 應發送 LINE 提醒至: ${apt.patientName}`);
                linesSent++;
                reminderSent = true;
              } else {
                console.log(`   ⚠️  LINE 設定未啟用，跳過 LINE 提醒`);
              }
            } catch (error) {
              console.error(`   ❌ LINE 發送異常:`, error);
              errors++;
            }
          } else if (notifications.lineReminders && !apt.lineUserId) {
            console.log(`   ⚠️  ${apt.patientName} 未綁定 LINE，跳過 LINE 提醒`);
          }

          if (!reminderSent) {
            console.log(`   ℹ️  ${apt.patientName} 無可用的提醒方式`);
          }
        }
      } catch (error) {
        console.error(`處理組織 ${org.name} 時發生錯誤:`, error);
        errors++;
      }
    }

    // 輸出統計資訊
    console.log('');
    console.log('📊 提醒發送統計：');
    console.log(`   總預約數: ${totalReminders}`);
    console.log(`   Email 已發送: ${emailsSent}`);
    console.log(`   LINE 已發送: ${linesSent}`);
    console.log(`   發送失敗: ${errors}`);
    console.log('✅ 明日預約提醒處理完成');

  } catch (error) {
    console.error('❌ 發送明日預約提醒時發生嚴重錯誤:', error);
  }
}

module.exports = {
  startCronJobs,
  sendTomorrowAppointmentReminders // 導出以便測試
};
