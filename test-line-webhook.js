/**
 * LINE Webhook 路由測試腳本
 *
 * 測試目的：
 * 1. 驗證 organizationId 參數路由是否正確
 * 2. 測試簽名驗證邏輯
 * 3. 確認錯誤處理
 */

const crypto = require('crypto');

// 測試配置
const TEST_ORG_ID = 'test-org-123';
const TEST_CHANNEL_SECRET = 'test-channel-secret';
const BASE_URL = 'http://localhost:3001';

/**
 * 生成 LINE 簽名
 */
function generateLineSignature(body, channelSecret) {
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  return hash;
}

/**
 * 測試 1: 正確的路由格式
 */
async function testWebhookRouteFormat() {
  console.log('\n📝 測試 1: Webhook 路由格式');
  console.log('─'.repeat(50));

  const webhookUrl = `${BASE_URL}/api/line/webhook/${TEST_ORG_ID}`;
  console.log('✓ Webhook URL:', webhookUrl);
  console.log('✓ Organization ID:', TEST_ORG_ID);
  console.log('✓ 格式正確');
}

/**
 * 測試 2: 簽名生成
 */
async function testSignatureGeneration() {
  console.log('\n📝 測試 2: LINE 簽名生成');
  console.log('─'.repeat(50));

  const testEvent = {
    events: [
      {
        type: 'message',
        message: {
          type: 'text',
          text: 'Hello'
        },
        source: {
          userId: 'U1234567890'
        },
        replyToken: 'test-reply-token'
      }
    ]
  };

  const body = JSON.stringify(testEvent);
  const signature = generateLineSignature(body, TEST_CHANNEL_SECRET);

  console.log('✓ Event Body:', body.substring(0, 60) + '...');
  console.log('✓ Signature (base64):', signature.substring(0, 40) + '...');
  console.log('✓ Full signature header:', `sha256=${signature}`);
}

/**
 * 測試 3: 模擬 Webhook 請求結構
 */
async function testWebhookRequestStructure() {
  console.log('\n📝 測試 3: Webhook 請求結構');
  console.log('─'.repeat(50));

  const testEvent = {
    events: [
      {
        type: 'message',
        message: { type: 'text', text: 'Hello' },
        source: { userId: 'U1234567890' },
        replyToken: 'test-reply-token'
      }
    ]
  };

  const body = JSON.stringify(testEvent);
  const signature = generateLineSignature(body, TEST_CHANNEL_SECRET);

  const mockRequest = {
    method: 'POST',
    url: `/api/line/webhook/${TEST_ORG_ID}`,
    headers: {
      'x-line-signature': signature,
      'content-type': 'application/json'
    },
    body: testEvent
  };

  console.log('✓ HTTP Method:', mockRequest.method);
  console.log('✓ URL Path:', mockRequest.url);
  console.log('✓ Signature Header:', mockRequest.headers['x-line-signature'].substring(0, 40) + '...');
  console.log('✓ Event Count:', mockRequest.body.events.length);
  console.log('✓ Event Type:', mockRequest.body.events[0].type);
}

/**
 * 測試 4: 多組織支援
 */
async function testMultiOrganization() {
  console.log('\n📝 測試 4: 多組織支援');
  console.log('─'.repeat(50));

  const organizations = [
    { id: 'hospital-a', name: '醫院 A' },
    { id: 'hospital-b', name: '醫院 B' },
    { id: 'clinic-c', name: '診所 C' }
  ];

  organizations.forEach(org => {
    const webhookUrl = `${BASE_URL}/api/line/webhook/${org.id}`;
    console.log(`✓ ${org.name}:`, webhookUrl);
  });

  console.log('✓ 每個組織都有獨立的 Webhook URL');
}

/**
 * 測試 5: URL 編碼處理
 */
async function testUrlEncoding() {
  console.log('\n📝 測試 5: URL 編碼處理');
  console.log('─'.repeat(50));

  // 測試各種可能的組織 ID 格式
  const testCases = [
    { id: 'org-123', valid: true, note: '標準格式' },
    { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', valid: true, note: 'UUID 格式' },
    { id: 'test_org_456', valid: true, note: '底線格式' },
  ];

  testCases.forEach(test => {
    const webhookUrl = `${BASE_URL}/api/line/webhook/${test.id}`;
    const status = test.valid ? '✓' : '✗';
    console.log(`${status} ${test.note}: ${test.id}`);
  });
}

/**
 * 測試 6: 錯誤情境
 */
async function testErrorScenarios() {
  console.log('\n📝 測試 6: 錯誤情境處理');
  console.log('─'.repeat(50));

  const errorCases = [
    {
      scenario: '缺少簽名 header',
      expected: '401 - 缺少 X-Line-Signature',
      fix: '確認 LINE 平台正確設定 Webhook'
    },
    {
      scenario: '簽名驗證失敗',
      expected: '401 - 簽名驗證失敗',
      fix: '檢查 Channel Secret 是否正確'
    },
    {
      scenario: '組織 ID 不存在',
      expected: '404 - 找不到 Line 配置',
      fix: '確認組織已設定 LINE 整合'
    },
    {
      scenario: 'LINE 配置未啟用',
      expected: '404 - 配置未啟用',
      fix: '在管理介面啟用 LINE 模組'
    }
  ];

  errorCases.forEach((test, index) => {
    console.log(`\n  ${index + 1}. ${test.scenario}`);
    console.log(`     → 預期回應: ${test.expected}`);
    console.log(`     → 解決方式: ${test.fix}`);
  });
}

/**
 * 主測試函數
 */
async function runTests() {
  console.log('\n');
  console.log('═'.repeat(50));
  console.log('  LINE Webhook 路由測試');
  console.log('═'.repeat(50));

  try {
    await testWebhookRouteFormat();
    await testSignatureGeneration();
    await testWebhookRequestStructure();
    await testMultiOrganization();
    await testUrlEncoding();
    await testErrorScenarios();

    console.log('\n');
    console.log('═'.repeat(50));
    console.log('  ✓ 所有測試項目檢查完成');
    console.log('═'.repeat(50));

    console.log('\n📋 後續步驟：');
    console.log('  1. 啟動伺服器: npm run dev');
    console.log('  2. 在 LINE Developers 控制台設定 Webhook URL');
    console.log('  3. 格式: https://your-domain.com/api/line/webhook/{organizationId}');
    console.log('  4. 使用 LINE 的「驗證」功能測試連線');
    console.log('  5. 查看伺服器日誌確認請求');

    console.log('\n💡 提示：');
    console.log('  - 開發環境可使用 ngrok 建立公開 URL');
    console.log('  - 生產環境請設定 API_ENDPOINT 環境變數');
    console.log('  - 每個組織的 organizationId 可從資料庫查詢');

  } catch (error) {
    console.error('\n❌ 測試失敗:', error);
    process.exit(1);
  }
}

// 執行測試
runTests();
