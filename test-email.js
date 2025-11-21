#!/usr/bin/env node

/**
 * 測試郵件發送功能
 */

require('dotenv').config();
const EmailService = require('./server/services/emailService');

async function testEmail() {
  console.log('📧 開始測試郵件發送功能...\n');

  // 檢查配置
  console.log('✅ 檢查配置:');
  console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '已設定' : '未設定'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || '未設定'}\n`);

  if (!EmailService.isEnabled()) {
    console.error('❌ 郵件服務未啟用，請設定 RESEND_API_KEY');
    process.exit(1);
  }

  console.log('📬 發送測試郵件...\n');

  try {
    // 測試 1: 預約提醒
    console.log('1️⃣ 測試預約提醒郵件:');
    const result1 = await EmailService.sendAppointmentReminder({
      to: 'audiaudy3030422@gmail.com',
      patientName: '測試用戶',
      date: '2025-11-20',
      time: '14:30',
      type: '系統功能測試',
      notes: '這是一封測試郵件,用於確認 Email 功能正常運作。如果您收到此郵件,表示系統已正確配置。'
    });

    if (result1.success) {
      console.log('   ✅ 預約提醒郵件發送成功!');
      console.log(`   📨 郵件 ID: ${result1.data?.id || 'N/A'}\n`);
    } else {
      console.error(`   ❌ 發送失敗: ${result1.error}\n`);
    }

    // 測試 2: 預約確認
    console.log('2️⃣ 測試預約確認郵件:');
    const result2 = await EmailService.sendAppointmentConfirmation({
      to: 'audiaudy3030422@gmail.com',
      patientName: '測試用戶',
      date: '2025-11-21',
      time: '10:00',
      type: '健康檢查',
      notes: '請攜帶健保卡'
    });

    if (result2.success) {
      console.log('   ✅ 預約確認郵件發送成功!');
      console.log(`   📨 郵件 ID: ${result2.data?.id || 'N/A'}\n`);
    } else {
      console.error(`   ❌ 發送失敗: ${result2.error}\n`);
    }

    // 測試 3: 一般通知
    console.log('3️⃣ 測試一般通知郵件:');
    const result3 = await EmailService.sendNotification({
      to: 'audiaudy3030422@gmail.com',
      patientName: '測試用戶',
      title: '系統測試通知',
      message: '<p>您好！這是一封來自 Patient CRM 系統的測試通知郵件。</p><p>如果您收到此郵件,表示系統的郵件功能已經正確配置並可以正常使用。</p><p>感謝您的耐心測試！</p>'
    });

    if (result3.success) {
      console.log('   ✅ 一般通知郵件發送成功!');
      console.log(`   📨 郵件 ID: ${result3.data?.id || 'N/A'}\n`);
    } else {
      console.error(`   ❌ 發送失敗: ${result3.error}\n`);
    }

    console.log('🎉 測試完成！請檢查您的郵箱: audiaudy3030422@gmail.com');
    console.log('💡 提示: 如果沒收到郵件,請檢查垃圾郵件資料夾');

  } catch (error) {
    console.error('\n❌ 測試過程發生錯誤:');
    console.error(error);
    process.exit(1);
  }
}

// 執行測試
testEmail().then(() => {
  console.log('\n✅ 腳本執行完成');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ 腳本執行失敗:', error);
  process.exit(1);
});
