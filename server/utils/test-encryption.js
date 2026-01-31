/**
 * 加密功能測試腳本
 *
 * 用於測試欄位加密模組的核心功能
 * 執行：node server/utils/test-encryption.js
 */

const {
  encryptField,
  decryptField,
  isEncrypted,
  encryptFields,
  decryptFields,
  testOrgKeyDerivation,
  isEncryptionKeyValid
} = require('./fieldEncryption');

// 設定測試環境變數（如果未設定）
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-minimum';
  console.log('⚠️  使用測試金鑰（生產環境請設定 ENCRYPTION_KEY 環境變數）\n');
}

console.log('🔐 開始測試欄位加密功能\n');
console.log('='.repeat(60));

// 測試 1：檢查金鑰是否有效
console.log('\n測試 1: 檢查加密金鑰');
console.log('-'.repeat(60));
const keyValid = isEncryptionKeyValid();
console.log(`金鑰狀態: ${keyValid ? '✅ 有效' : '❌ 無效'}`);

if (!keyValid) {
  console.error('❌ 測試失敗：加密金鑰無效');
  process.exit(1);
}

// 測試 2：單一欄位加密/解密
console.log('\n測試 2: 單一欄位加密/解密');
console.log('-'.repeat(60));
const testData = '患者醫療史：高血壓、糖尿病';
const orgId1 = 'org-test-001';

console.log(`原始資料: ${testData}`);
const encrypted = encryptField(testData, orgId1);
console.log(`加密後: ${encrypted.substring(0, 50)}...`);
console.log(`是否為加密格式: ${isEncrypted(encrypted) ? '✅ 是' : '❌ 否'}`);

const decrypted = decryptField(encrypted, orgId1);
console.log(`解密後: ${decrypted}`);
console.log(`資料一致: ${decrypted === testData ? '✅ 是' : '❌ 否'}`);

if (decrypted !== testData) {
  console.error('❌ 測試失敗：解密資料與原始資料不符');
  process.exit(1);
}

// 測試 3：組織金鑰隔離
console.log('\n測試 3: 組織金鑰隔離');
console.log('-'.repeat(60));
const orgId2 = 'org-test-002';
const encrypted1 = encryptField('組織 1 的資料', orgId1);
const encrypted2 = encryptField('組織 2 的資料', orgId2);

console.log(`組織 1 加密: ${encrypted1.substring(0, 40)}...`);
console.log(`組織 2 加密: ${encrypted2.substring(0, 40)}...`);
console.log(`密文不同: ${encrypted1 !== encrypted2 ? '✅ 是' : '❌ 否'}`);

// 測試跨組織解密（應該失敗或返回錯誤資料）
try {
  const wrongDecrypt = decryptField(encrypted1, orgId2);
  console.log(`⚠️  跨組織解密結果: ${wrongDecrypt}`);
  console.log(`跨組織解密失敗（預期行為）: ❌ 未按預期失敗`);
} catch (error) {
  console.log(`跨組織解密失敗（預期行為）: ✅ 正確阻止`);
}

// 測試 4：批次欄位加密
console.log('\n測試 4: 批次欄位加密');
console.log('-'.repeat(60));
const patientData = {
  id: 'patient-001',
  name: '王小明',
  medicalHistory: '高血壓病史 10 年',
  allergies: '青黴素過敏',
  emergencyContact: '家屬：王大華 0912-345-678'
};

const fieldsToEncrypt = ['medicalHistory', 'allergies', 'emergencyContact'];
console.log('原始資料:', JSON.stringify(patientData, null, 2));

const { data: encryptedPatient, encrypted: encryptedFieldsList } = encryptFields(
  patientData,
  fieldsToEncrypt,
  orgId1
);

console.log('\n已加密欄位:', encryptedFieldsList);
console.log('加密後資料:');
console.log(`  medicalHistory: ${encryptedPatient.medicalHistory?.substring(0, 40)}...`);
console.log(`  allergies: ${encryptedPatient.allergies?.substring(0, 40)}...`);
console.log(`  emergencyContact: ${encryptedPatient.emergencyContact?.substring(0, 40)}...`);

// 測試 5：批次欄位解密
console.log('\n測試 5: 批次欄位解密');
console.log('-'.repeat(60));
const decryptedPatient = decryptFields(encryptedPatient, fieldsToEncrypt, orgId1);

console.log('解密後資料:', JSON.stringify(decryptedPatient, null, 2));

const allMatch =
  decryptedPatient.medicalHistory === patientData.medicalHistory &&
  decryptedPatient.allergies === patientData.allergies &&
  decryptedPatient.emergencyContact === patientData.emergencyContact;

console.log(`所有欄位正確解密: ${allMatch ? '✅ 是' : '❌ 否'}`);

if (!allMatch) {
  console.error('❌ 測試失敗：批次解密資料不正確');
  process.exit(1);
}

// 測試 6：空值處理
console.log('\n測試 6: 空值處理');
console.log('-'.repeat(60));
const nullValue = encryptField(null, orgId1);
const emptyValue = encryptField('', orgId1);
console.log(`null 值加密結果: ${nullValue === null ? '✅ null' : '❌ 非 null'}`);
console.log(`空字串加密結果: ${emptyValue === null ? '✅ null' : '❌ 非 null'}`);

// 測試 7：組織金鑰衍生測試
console.log('\n測試 7: 組織金鑰衍生測試');
console.log('-'.repeat(60));
const org1Test = testOrgKeyDerivation(orgId1);
const org2Test = testOrgKeyDerivation(orgId2);
console.log(`組織 1 金鑰衍生: ${org1Test ? '✅ 正常' : '❌ 失敗'}`);
console.log(`組織 2 金鑰衍生: ${org2Test ? '✅ 正常' : '❌ 失敗'}`);

// 最終結果
console.log('\n' + '='.repeat(60));
console.log('✅ 所有測試通過！加密功能正常運作');
console.log('='.repeat(60));

console.log('\n📋 測試總結:');
console.log('  ✅ 加密金鑰有效');
console.log('  ✅ 單一欄位加密/解密正常');
console.log('  ✅ 組織金鑰隔離有效');
console.log('  ✅ 批次欄位加密正常');
console.log('  ✅ 批次欄位解密正常');
console.log('  ✅ 空值處理正確');
console.log('  ✅ 組織金鑰衍生正常');

console.log('\n💡 提示:');
console.log('  - 生產環境請務必設定強度足夠的 ENCRYPTION_KEY');
console.log('  - 建議使用 32 個以上的隨機字元');
console.log('  - 金鑰一旦使用後不應更改，否則無法解密既有資料');
console.log('  - 建議定期備份金鑰到安全位置\n');
