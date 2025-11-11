/**
 * Multi-Tenant Test Data Generator
 *
 * 建立多組織測試資料以驗證資料隔離
 *
 * 功能：
 * - 建立 3 個測試組織
 * - 每個組織有獨立的使用者、患者、預約
 * - 驗證資料隔離
 */

const crypto = require('crypto');
const { db } = require('../server/database/db');

// 產生隨機日期
function randomDate(daysAgo = 180) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

// 產生唯一 ID
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

console.log('🚀 開始建立多租戶測試資料...\n');

const now = new Date().toISOString();

// 1. 建立超級管理員
console.log('👑 建立超級管理員...');
const superAdminId = generateId('user');
const hashedPassword = crypto.createHash('sha256').update('Admin123').digest('hex');

db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password, role, name, email, isActive, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  superAdminId,
  'superadmin',
  hashedPassword,
  'super_admin',
  '超級管理員',
  'superadmin@system.com',
  1,
  now,
  now
);

console.log('✅ 超級管理員已建立');
console.log('   帳號: superadmin');
console.log('   密碼: Admin123\n');

// 2. 建立測試組織
const organizations = [
  {
    name: '台北仁愛醫院',
    slug: 'taipei-hospital',
    plan: 'professional',
    maxUsers: 20,
    maxPatients: 500,
    contactName: '王院長',
    contactEmail: 'admin@taipei-hospital.com'
  },
  {
    name: '新竹健康診所',
    slug: 'hsinchu-clinic',
    plan: 'basic',
    maxUsers: 5,
    maxPatients: 100,
    contactName: '李醫師',
    contactEmail: 'admin@hsinchu-clinic.com'
  },
  {
    name: '高雄長庚醫療中心',
    slug: 'kaohsiung-medical',
    plan: 'enterprise',
    maxUsers: 999,
    maxPatients: 99999,
    contactName: '張總監',
    contactEmail: 'admin@kaohsiung-medical.com'
  }
];

console.log('🏢 建立測試組織...');

const orgIds = [];
for (const org of organizations) {
  const orgId = generateId('org');
  orgIds.push({ id: orgId, ...org });

  db.prepare(`
    INSERT INTO organizations (
      id, name, slug, plan, maxUsers, maxPatients, isActive,
      contactName, contactEmail, subscriptionStartDate, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orgId,
    org.name,
    org.slug,
    org.plan,
    org.maxUsers,
    org.maxPatients,
    1,
    org.contactName,
    org.contactEmail,
    now,
    now,
    now
  );

  console.log(`✅ ${org.name} (${org.plan})`);
}

console.log('');

// 3. 為每個組織建立使用者和患者
for (const org of orgIds) {
  console.log(`📝 建立 ${org.name} 的測試資料...`);

  // 建立管理員
  const adminId = generateId('user');
  db.prepare(`
    INSERT INTO users (id, username, password, role, name, email, organizationId, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    adminId,
    `${org.slug}-admin`,
    hashedPassword,
    'admin',
    `${org.name} 管理員`,
    `admin@${org.slug}.com`,
    org.id,
    1,
    now,
    now
  );

  console.log(`   👤 管理員: ${org.slug}-admin`);

  // 建立醫師
  const doctorId = generateId('user');
  db.prepare(`
    INSERT INTO users (id, username, password, role, name, email, organizationId, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doctorId,
    `${org.slug}-doctor`,
    hashedPassword,
    'user',
    `${org.name} 醫師`,
    `doctor@${org.slug}.com`,
    org.id,
    1,
    now,
    now
  );

  console.log(`   👤 醫師: ${org.slug}-doctor`);

  // 建立 5 位患者
  const patientIds = [];
  const patientNames = ['王小明', '李美玲', '陳建國', '林雅婷', '張志豪'];

  for (let i = 0; i < 5; i++) {
    const patientId = generateId('patient');
    patientIds.push(patientId);

    db.prepare(`
      INSERT INTO patients (
        id, name, gender, birthDate, phone, email, address,
        tags, organizationId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      patientId,
      `${patientNames[i]} (${org.name})`,
      i % 2 === 0 ? 'male' : 'female',
      randomDate(10000),
      `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      `patient${i}@${org.slug}.com`,
      `${org.name} 地址 ${i + 1}號`,
      JSON.stringify(['測試資料']),
      org.id,
      now,
      now
    );
  }

  console.log(`   🏥 建立 ${patientIds.length} 位患者`);

  // 為每位患者建立預約
  let appointmentCount = 0;
  for (const patientId of patientIds) {
    for (let i = 0; i < 3; i++) {
      const appointmentId = generateId('apt');
      const daysOffset = Math.floor(Math.random() * 60) - 30;
      const date = new Date();
      date.setDate(date.getDate() + daysOffset);

      db.prepare(`
        INSERT INTO appointments (
          id, patientId, date, time, type, status,
          organizationId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        appointmentId,
        patientId,
        date.toISOString().split('T')[0],
        `${9 + Math.floor(Math.random() * 8)}:00`,
        ['初診', '複診', '定期檢查'][i % 3],
        daysOffset < 0 ? 'completed' : 'scheduled',
        org.id,
        now,
        now
      );

      appointmentCount++;
    }
  }

  console.log(`   📅 建立 ${appointmentCount} 筆預約\n`);
}

// 4. 驗證資料隔離
console.log('🔍 驗證資料隔離...\n');

for (const org of orgIds) {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users WHERE organizationId = ?').get(org.id).count,
    patients: db.prepare('SELECT COUNT(*) as count FROM patients WHERE organizationId = ?').get(org.id).count,
    appointments: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE organizationId = ?').get(org.id).count
  };

  console.log(`${org.name}:`);
  console.log(`   使用者: ${stats.users}`);
  console.log(`   患者: ${stats.patients}`);
  console.log(`   預約: ${stats.appointments}\n`);
}

// 5. 檢查沒有 organizationId 的資料（應該只有舊資料）
const orphanData = {
  users: db.prepare('SELECT COUNT(*) as count FROM users WHERE organizationId IS NULL').get().count,
  patients: db.prepare('SELECT COUNT(*) as count FROM patients WHERE organizationId IS NULL').get().count,
  appointments: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE organizationId IS NULL').get().count
};

console.log('📊 無組織資料（舊資料）:');
console.log(`   使用者: ${orphanData.users}`);
console.log(`   患者: ${orphanData.patients}`);
console.log(`   預約: ${orphanData.appointments}\n`);

console.log('✅ 多租戶測試資料建立完成！\n');

console.log('🔐 測試帳號:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('超級管理員:');
console.log('  帳號: superadmin');
console.log('  密碼: Admin123');
console.log('  權限: 可管理所有組織\n');

for (const org of orgIds) {
  console.log(`${org.name}:`);
  console.log(`  管理員: ${org.slug}-admin / Admin123`);
  console.log(`  醫師: ${org.slug}-doctor / Admin123\n`);
}

console.log('📝 驗證步驟:');
console.log('1. 使用不同組織的帳號登入');
console.log('2. 確認只能看到自己組織的患者');
console.log('3. 嘗試存取其他組織的患者 ID（應該返回 404）');
console.log('4. 檢查 API 回應中的 organizationId');
