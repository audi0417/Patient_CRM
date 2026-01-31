/**
 * 存取控制系統測試腳本
 *
 * 測試項目：
 * 1. 角色資源權限檢查
 * 2. 資料分類存取權限
 * 3. 欄位級權限檢查
 * 4. 特殊規則驗證
 * 5. 欄位過濾功能
 */

const {
  Operation,
  Role,
  checkPermission,
  checkDataClassificationAccess,
  checkFieldPermission,
  checkSpecialRule,
  getReadableFields
} = require('./accessControlMatrix');

const {
  DataClassification,
  getFieldClassification,
  isSensitiveField
} = require('./dataClassification');

// 測試計數器
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 測試輔助函式
function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ ${testName}`);
  } else {
    failedTests++;
    console.error(`❌ ${testName}`);
  }
}

function assertEqual(actual, expected, testName) {
  totalTests++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passedTests++;
    console.log(`✅ ${testName}`);
  } else {
    failedTests++;
    console.error(`❌ ${testName}`);
    console.error(`   期望: ${JSON.stringify(expected)}`);
    console.error(`   實際: ${JSON.stringify(actual)}`);
  }
}

function testSection(name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(60)}\n`);
}

// ============================================================================
// 測試 1：角色資源權限檢查
// ============================================================================
function testResourcePermissions() {
  testSection('測試 1：角色資源權限檢查');

  // Super Admin 權限
  assert(
    checkPermission(Role.SUPER_ADMIN, 'patients', Operation.CREATE),
    'Super Admin 可以創建病患'
  );
  assert(
    checkPermission(Role.SUPER_ADMIN, 'patients', Operation.DELETE),
    'Super Admin 可以刪除病患'
  );
  assert(
    checkPermission(Role.SUPER_ADMIN, 'patients', Operation.EXPORT),
    'Super Admin 可以匯出病患資料'
  );
  assert(
    checkPermission(Role.SUPER_ADMIN, 'audit_logs', Operation.READ),
    'Super Admin 可以讀取審計日誌'
  );

  // Admin 權限
  assert(
    checkPermission(Role.ADMIN, 'patients', Operation.CREATE),
    'Admin 可以創建病患'
  );
  assert(
    checkPermission(Role.ADMIN, 'patients', Operation.DELETE),
    'Admin 可以刪除病患'
  );
  assert(
    checkPermission(Role.ADMIN, 'patients', Operation.EXPORT),
    'Admin 可以匯出病患資料'
  );
  assert(
    checkPermission(Role.ADMIN, 'audit_logs', Operation.READ),
    'Admin 可以讀取審計日誌'
  );
  assert(
    !checkPermission(Role.ADMIN, 'organizations', Operation.CREATE),
    'Admin 不可以創建組織'
  );

  // User 權限
  assert(
    checkPermission(Role.USER, 'patients', Operation.CREATE),
    'User 可以創建病患'
  );
  assert(
    checkPermission(Role.USER, 'patients', Operation.READ),
    'User 可以讀取病患資料'
  );
  assert(
    checkPermission(Role.USER, 'patients', Operation.UPDATE),
    'User 可以更新病患資料'
  );
  assert(
    !checkPermission(Role.USER, 'patients', Operation.DELETE),
    'User 不可以刪除病患'
  );
  assert(
    !checkPermission(Role.USER, 'patients', Operation.EXPORT),
    'User 不可以匯出病患資料'
  );
  assert(
    !checkPermission(Role.USER, 'audit_logs', Operation.READ),
    'User 不可以讀取審計日誌'
  );

  // 諮詢記錄權限
  assert(
    checkPermission(Role.USER, 'consultations', Operation.CREATE),
    'User 可以創建諮詢記錄'
  );
  assert(
    checkPermission(Role.USER, 'consultations', Operation.UPDATE),
    'User 可以更新諮詢記錄'
  );
  assert(
    !checkPermission(Role.USER, 'consultations', Operation.DELETE),
    'User 不可以刪除諮詢記錄'
  );

  // 使用者管理權限
  assert(
    checkPermission(Role.ADMIN, 'users', Operation.CREATE),
    'Admin 可以創建使用者'
  );
  assert(
    checkPermission(Role.ADMIN, 'users', Operation.DELETE),
    'Admin 可以刪除使用者'
  );
  assert(
    checkPermission(Role.USER, 'users', Operation.READ),
    'User 可以讀取使用者資料'
  );
  assert(
    !checkPermission(Role.USER, 'users', Operation.CREATE),
    'User 不可以創建使用者'
  );
}

// ============================================================================
// 測試 2：資料分類存取權限
// ============================================================================
function testDataClassificationAccess() {
  testSection('測試 2：資料分類存取權限');

  // Super Admin 可存取所有分類
  assert(
    checkDataClassificationAccess(Role.SUPER_ADMIN, DataClassification.PUBLIC),
    'Super Admin 可存取 PUBLIC 資料'
  );
  assert(
    checkDataClassificationAccess(Role.SUPER_ADMIN, DataClassification.INTERNAL),
    'Super Admin 可存取 INTERNAL 資料'
  );
  assert(
    checkDataClassificationAccess(Role.SUPER_ADMIN, DataClassification.CONFIDENTIAL),
    'Super Admin 可存取 CONFIDENTIAL 資料'
  );
  assert(
    checkDataClassificationAccess(Role.SUPER_ADMIN, DataClassification.RESTRICTED),
    'Super Admin 可存取 RESTRICTED 資料'
  );

  // Admin 可存取所有分類
  assert(
    checkDataClassificationAccess(Role.ADMIN, DataClassification.PUBLIC),
    'Admin 可存取 PUBLIC 資料'
  );
  assert(
    checkDataClassificationAccess(Role.ADMIN, DataClassification.INTERNAL),
    'Admin 可存取 INTERNAL 資料'
  );
  assert(
    checkDataClassificationAccess(Role.ADMIN, DataClassification.CONFIDENTIAL),
    'Admin 可存取 CONFIDENTIAL 資料'
  );
  assert(
    checkDataClassificationAccess(Role.ADMIN, DataClassification.RESTRICTED),
    'Admin 可存取 RESTRICTED 資料'
  );

  // User 不可存取 RESTRICTED（預設）
  assert(
    checkDataClassificationAccess(Role.USER, DataClassification.PUBLIC),
    'User 可存取 PUBLIC 資料'
  );
  assert(
    checkDataClassificationAccess(Role.USER, DataClassification.INTERNAL),
    'User 可存取 INTERNAL 資料'
  );
  assert(
    checkDataClassificationAccess(Role.USER, DataClassification.CONFIDENTIAL),
    'User 可存取 CONFIDENTIAL 資料'
  );
  assert(
    !checkDataClassificationAccess(Role.USER, DataClassification.RESTRICTED),
    'User 預設不可存取 RESTRICTED 資料'
  );
}

// ============================================================================
// 測試 3：欄位級權限檢查
// ============================================================================
function testFieldPermissions() {
  testSection('測試 3：欄位級權限檢查');

  // Admin 對病患資料的欄位權限
  assert(
    checkFieldPermission(Role.ADMIN, 'patients', 'name', Operation.READ),
    'Admin 可以讀取病患姓名'
  );
  assert(
    checkFieldPermission(Role.ADMIN, 'patients', 'medicalHistory', Operation.READ),
    'Admin 可以讀取病歷'
  );
  assert(
    checkFieldPermission(Role.ADMIN, 'patients', 'allergies', Operation.UPDATE),
    'Admin 可以更新過敏資訊'
  );

  // User 對病患資料的欄位權限
  assert(
    checkFieldPermission(Role.USER, 'patients', 'name', Operation.READ),
    'User 可以讀取病患姓名'
  );
  assert(
    checkFieldPermission(Role.USER, 'patients', 'phone', Operation.READ),
    'User 可以讀取病患電話'
  );

  // User 對 RESTRICTED 欄位的特殊權限（透過 FieldPermissionOverrides）
  assert(
    checkFieldPermission(Role.USER, 'patients', 'medicalHistory', Operation.READ),
    'User 可以讀取病歷（透過權限覆蓋）'
  );
  assert(
    !checkFieldPermission(Role.USER, 'patients', 'medicalHistory', Operation.UPDATE),
    'User 不可以更新病歷'
  );
  assert(
    checkFieldPermission(Role.USER, 'patients', 'allergies', Operation.READ),
    'User 可以讀取過敏資訊（安全考量）'
  );
  assert(
    checkFieldPermission(Role.USER, 'patients', 'allergies', Operation.UPDATE),
    'User 可以更新過敏資訊（安全考量）'
  );

  // 諮詢記錄欄位權限
  assert(
    checkFieldPermission(Role.USER, 'consultations', 'chiefComplaint', Operation.READ),
    'User 可以讀取主訴'
  );
  assert(
    checkFieldPermission(Role.USER, 'consultations', 'assessment', Operation.UPDATE),
    'User 可以更新評估'
  );

  // 密碼欄位永不可讀
  assert(
    !checkFieldPermission(Role.SUPER_ADMIN, 'users', 'password', Operation.READ),
    'Super Admin 不可以讀取密碼'
  );
  assert(
    !checkFieldPermission(Role.ADMIN, 'users', 'password', Operation.READ),
    'Admin 不可以讀取密碼'
  );
  assert(
    !checkFieldPermission(Role.USER, 'users', 'password', Operation.READ),
    'User 不可以讀取密碼'
  );
}

// ============================================================================
// 測試 4：特殊規則驗證
// ============================================================================
function testSpecialRules() {
  testSection('測試 4：特殊規則驗證');

  // 跨組織存取
  assert(
    checkSpecialRule('crossOrganizationAccess', Role.SUPER_ADMIN),
    'Super Admin 可以跨組織存取'
  );
  assert(
    !checkSpecialRule('crossOrganizationAccess', Role.ADMIN),
    'Admin 不可以跨組織存取'
  );
  assert(
    !checkSpecialRule('crossOrganizationAccess', Role.USER),
    'User 不可以跨組織存取'
  );

  // 修改其他使用者資料
  assert(
    checkSpecialRule('canModifyOtherUsers', Role.SUPER_ADMIN),
    'Super Admin 可以修改其他使用者'
  );
  assert(
    checkSpecialRule('canModifyOtherUsers', Role.ADMIN),
    'Admin 可以修改其他使用者'
  );
  assert(
    !checkSpecialRule('canModifyOtherUsers', Role.USER),
    'User 不可以修改其他使用者'
  );

  // 刪除病患
  assert(
    checkSpecialRule('canDeletePatients', Role.SUPER_ADMIN),
    'Super Admin 可以刪除病患'
  );
  assert(
    checkSpecialRule('canDeletePatients', Role.ADMIN),
    'Admin 可以刪除病患'
  );
  assert(
    !checkSpecialRule('canDeletePatients', Role.USER),
    'User 不可以刪除病患'
  );

  // 匯出資料
  assert(
    checkSpecialRule('canExportData', Role.SUPER_ADMIN),
    'Super Admin 可以匯出資料'
  );
  assert(
    checkSpecialRule('canExportData', Role.ADMIN),
    'Admin 可以匯出資料'
  );
  assert(
    !checkSpecialRule('canExportData', Role.USER),
    'User 不可以匯出資料'
  );

  // 存取審計日誌
  assert(
    checkSpecialRule('canAccessAuditLogs', Role.SUPER_ADMIN),
    'Super Admin 可以存取審計日誌'
  );
  assert(
    checkSpecialRule('canAccessAuditLogs', Role.ADMIN),
    'Admin 可以存取審計日誌'
  );
  assert(
    !checkSpecialRule('canAccessAuditLogs', Role.USER),
    'User 不可以存取審計日誌'
  );
}

// ============================================================================
// 測試 5：欄位過濾功能
// ============================================================================
function testFieldFiltering() {
  testSection('測試 5：欄位過濾功能');

  // 取得可讀取的欄位清單
  const adminReadableFields = getReadableFields(Role.ADMIN, 'patients');
  assert(
    adminReadableFields.includes('name'),
    'Admin 可讀欄位包含 name'
  );
  assert(
    adminReadableFields.includes('medicalHistory'),
    'Admin 可讀欄位包含 medicalHistory'
  );
  assert(
    adminReadableFields.includes('allergies'),
    'Admin 可讀欄位包含 allergies'
  );

  const userReadableFields = getReadableFields(Role.USER, 'patients');
  assert(
    userReadableFields.includes('name'),
    'User 可讀欄位包含 name'
  );
  assert(
    userReadableFields.includes('phone'),
    'User 可讀欄位包含 phone'
  );
  assert(
    userReadableFields.includes('medicalHistory'),
    'User 可讀欄位包含 medicalHistory（透過覆蓋）'
  );

  // 驗證欄位數量差異
  assert(
    adminReadableFields.length > userReadableFields.length,
    'Admin 可讀欄位數量應大於 User'
  );
}

// ============================================================================
// 測試 6：資料分類配置
// ============================================================================
function testDataClassificationConfig() {
  testSection('測試 6：資料分類配置');

  // 驗證欄位分類
  assertEqual(
    getFieldClassification('patients', 'name'),
    DataClassification.CONFIDENTIAL,
    '病患姓名為 CONFIDENTIAL'
  );
  assertEqual(
    getFieldClassification('patients', 'medicalHistory'),
    DataClassification.RESTRICTED,
    '病歷為 RESTRICTED'
  );
  assertEqual(
    getFieldClassification('patients', 'allergies'),
    DataClassification.RESTRICTED,
    '過敏資訊為 RESTRICTED'
  );
  assertEqual(
    getFieldClassification('patients', 'phone'),
    DataClassification.CONFIDENTIAL,
    '電話為 CONFIDENTIAL'
  );

  // 驗證敏感欄位檢測
  assert(
    isSensitiveField('patients', 'medicalHistory'),
    'medicalHistory 為敏感欄位'
  );
  assert(
    isSensitiveField('patients', 'name'),
    'name 為敏感欄位'
  );
  assert(
    !isSensitiveField('patients', 'id'),
    'id 不是敏感欄位'
  );

  // 諮詢記錄分類
  assertEqual(
    getFieldClassification('consultations', 'chiefComplaint'),
    DataClassification.RESTRICTED,
    '主訴為 RESTRICTED'
  );
  assertEqual(
    getFieldClassification('consultations', 'assessment'),
    DataClassification.RESTRICTED,
    '評估為 RESTRICTED'
  );

  // 使用者資料分類
  assertEqual(
    getFieldClassification('users', 'password'),
    DataClassification.RESTRICTED,
    '密碼為 RESTRICTED'
  );
  assertEqual(
    getFieldClassification('users', 'email'),
    DataClassification.INTERNAL,
    'email 為 INTERNAL'
  );
}

// ============================================================================
// 主測試函式
// ============================================================================
function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      存取控制系統測試                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  testResourcePermissions();
  testDataClassificationAccess();
  testFieldPermissions();
  testSpecialRules();
  testFieldFiltering();
  testDataClassificationConfig();

  // 輸出測試結果
  console.log('\n' + '='.repeat(60));
  console.log('  測試結果總覽');
  console.log('='.repeat(60));
  console.log(`總測試數: ${totalTests}`);
  console.log(`通過: ${passedTests} ✅`);
  console.log(`失敗: ${failedTests} ❌`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  console.log('='.repeat(60) + '\n');

  if (failedTests === 0) {
    console.log('✅ 所有測試通過！存取控制系統運作正常。\n');
    process.exit(0);
  } else {
    console.error('❌ 部分測試失敗，請檢查存取控制配置。\n');
    process.exit(1);
  }
}

// 執行測試
runAllTests();
