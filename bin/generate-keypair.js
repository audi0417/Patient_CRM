#!/usr/bin/env node

/**
 * License Key Pair Generator
 *
 * 生成用於 License 簽名的 RSA-2048 金鑰對
 *
 * 使用方式：
 *   node bin/generate-keypair.js
 *
 * 輸出：
 *   - config/license-private.pem (私鑰，絕不分發)
 *   - config/license-public.pem  (公鑰，隨地端安裝包分發)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '../config');
const PRIVATE_KEY_PATH = path.join(CONFIG_DIR, 'license-private.pem');
const PUBLIC_KEY_PATH = path.join(CONFIG_DIR, 'license-public.pem');

console.log('🔐 License Key Pair Generator');
console.log('='.repeat(60));

// 檢查是否已存在金鑰對
if (fs.existsSync(PRIVATE_KEY_PATH) || fs.existsSync(PUBLIC_KEY_PATH)) {
  console.log('\n⚠️  警告：金鑰對已存在！');
  console.log(`私鑰：${PRIVATE_KEY_PATH}`);
  console.log(`公鑰：${PUBLIC_KEY_PATH}`);
  console.log('\n若要重新生成，請先刪除現有檔案。');
  console.log('⚠️  重新生成將使所有現有 License Key 失效！\n');
  process.exit(1);
}

console.log('\n正在生成 RSA-2048 金鑰對...\n');

try {
  // 生成 RSA-2048 金鑰對
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // 確保 config 目錄存在
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // 儲存私鑰（權限 600）
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  console.log('✓ 私鑰已儲存：', PRIVATE_KEY_PATH);
  console.log('  權限：600 (僅擁有者可讀寫)');

  // 儲存公鑰
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  console.log('✓ 公鑰已儲存：', PUBLIC_KEY_PATH);

  console.log('\n' + '='.repeat(60));
  console.log('✅ 金鑰對生成成功！\n');

  console.log('📝 接下來的步驟：\n');
  console.log('1. 使用私鑰生成 License Key：');
  console.log('   node bin/generate-license.js --customer-id CUST-001 ...\n');
  console.log('2. 將公鑰包含在地端安裝包中');
  console.log('   (已自動放置在 config/license-public.pem)\n');
  console.log('3. 妥善保管私鑰，絕不分發或提交到版本控制');
  console.log('   (已加入 .gitignore)\n');

  // 確認 .gitignore 包含私鑰
  const gitignorePath = path.join(__dirname, '../.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('license-private.pem')) {
      gitignoreContent += '\n# License private key (never commit)\nconfig/license-private.pem\n';
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log('✓ 已將私鑰路徑加入 .gitignore\n');
    }
  }

  console.log('⚠️  重要提醒：');
  console.log('   - 私鑰丟失將無法生成新的 License Key');
  console.log('   - 私鑰洩漏將導致安全風險');
  console.log('   - 建議備份私鑰到安全的加密儲存位置\n');

} catch (error) {
  console.error('\n❌ 生成金鑰對失敗：');
  console.error(error.message);
  process.exit(1);
}
