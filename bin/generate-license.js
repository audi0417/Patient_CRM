#!/usr/bin/env node

/**
 * License Key Generator
 *
 * 生成地端部署的 License Key
 *
 * 使用方式：
 *   node bin/generate-license.js \
 *     --customer-id CUST-12345 \
 *     --customer-name "診所名稱" \
 *     --license-type professional \
 *     --max-users 50 \
 *     --max-patients 10000 \
 *     --features "consultation_management,body_composition" \
 *     --duration 1y \
 *     [--hardware-fingerprint abc123...]
 *
 * License Types: starter | professional | enterprise
 * Duration: 1y (1 year), 6m (6 months), 3m (3 months)
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 解析命令列參數
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    params[key] = value;
  }

  return params;
}

// 計算到期時間
function calculateExpiry(duration) {
  const now = new Date();
  const match = duration.match(/^(\d+)([ymd])$/);

  if (!match) {
    throw new Error('Invalid duration format. Use: 1y, 6m, 3m, etc.');
  }

  const amount = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'y':
      now.setFullYear(now.getFullYear() + amount);
      break;
    case 'm':
      now.setMonth(now.getMonth() + amount);
      break;
    case 'd':
      now.setDate(now.getDate() + amount);
      break;
  }

  return now.toISOString();
}

// 生成 License Key
async function generateLicense() {
  console.log('🔑 License Key Generator');
  console.log('='.repeat(60));

  const params = parseArgs();

  // 驗證必要參數
  const required = ['customer-id', 'customer-name', 'license-type', 'max-users', 'max-patients', 'features', 'duration'];
  const missing = required.filter(key => !params[key]);

  if (missing.length > 0) {
    console.error('\n❌ 缺少必要參數：', missing.join(', '));
    console.log('\n使用方式：');
    console.log('  node bin/generate-license.js \\');
    console.log('    --customer-id CUST-12345 \\');
    console.log('    --customer-name "診所名稱" \\');
    console.log('    --license-type professional \\');
    console.log('    --max-users 50 \\');
    console.log('    --max-patients 10000 \\');
    console.log('    --features "consultation_management,body_composition" \\');
    console.log('    --duration 1y \\');
    console.log('    [--hardware-fingerprint abc123...]');
    console.log('\nLicense Types: starter | professional | enterprise');
    console.log('Duration: 1y (1 year), 6m (6 months), 3m (3 months)\n');
    process.exit(1);
  }

  // 讀取私鑰
  const privateKeyPath = path.join(__dirname, '../config/license-private.pem');
  if (!fs.existsSync(privateKeyPath)) {
    console.error('\n❌ 私鑰不存在！請先執行：node bin/generate-keypair.js\n');
    process.exit(1);
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  // 準備 License payload
  const issuedAt = new Date().toISOString();
  const expiresAt = calculateExpiry(params.duration);
  const features = params.features.split(',').map(f => f.trim());

  const payload = {
    customer_id: params['customer-id'],
    customer_name: params['customer-name'],
    license_type: params['license-type'],
    max_users: parseInt(params['max-users']),
    max_patients: parseInt(params['max-patients']),
    features,
    issued_at: issuedAt,
    expires_at: expiresAt
  };

  // 硬體綁定（可選）
  if (params['hardware-fingerprint']) {
    payload.hardware_binding = {
      method: params['hardware-method'] || 'mac_address',
      fingerprint: params['hardware-fingerprint']
    };
  }

  console.log('\n📋 License 資訊：');
  console.log(`客戶 ID：      ${payload.customer_id}`);
  console.log(`客戶名稱：     ${payload.customer_name}`);
  console.log(`License 類型： ${payload.license_type}`);
  console.log(`最大用戶數：   ${payload.max_users}`);
  console.log(`最大病患數：   ${payload.max_patients}`);
  console.log(`功能列表：     ${payload.features.join(', ')}`);
  console.log(`簽發日期：     ${payload.issued_at}`);
  console.log(`到期日期：     ${payload.expires_at}`);

  if (payload.hardware_binding) {
    console.log(`硬體綁定：     ${payload.hardware_binding.method}`);
    console.log(`指紋：         ${payload.hardware_binding.fingerprint.substring(0, 16)}...`);
  }

  // 生成 JWT
  try {
    const licenseKey = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: params.duration
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ License Key 生成成功！\n');
    console.log('License Key：');
    console.log(licenseKey);
    console.log('\n' + '='.repeat(60));

    // 儲存到檔案
    const licensesDir = path.join(__dirname, '../licenses');
    if (!fs.existsSync(licensesDir)) {
      fs.mkdirSync(licensesDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${params['customer-id']}_${timestamp}.license`;
    const filepath = path.join(licensesDir, filename);

    const licenseData = {
      ...payload,
      license_key: licenseKey,
      generated_at: new Date().toISOString()
    };

    fs.writeFileSync(filepath, JSON.stringify(licenseData, null, 2));
    console.log(`\n✓ License 已儲存至：${filepath}\n`);

    // 顯示使用說明
    console.log('📝 使用方式：\n');
    console.log('1. 將以下 License Key 提供給客戶：');
    console.log('   (已複製到上方)\n');
    console.log('2. 客戶在地端安裝時設定環境變數：');
    console.log(`   LICENSE_KEY="${licenseKey.substring(0, 50)}..."\n`);
    console.log('3. 或寫入 .env 檔案：');
    console.log(`   echo 'LICENSE_KEY="${licenseKey}"' >> .env\n`);

    if (!payload.hardware_binding) {
      console.log('⚠️  提醒：此 License 未綁定硬體，可在任何機器上使用。');
      console.log('   若要綁定硬體，請使用 --hardware-fingerprint 參數。\n');
    }

  } catch (error) {
    console.error('\n❌ 生成 License Key 失敗：');
    console.error(error.message);
    process.exit(1);
  }
}

generateLicense().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
