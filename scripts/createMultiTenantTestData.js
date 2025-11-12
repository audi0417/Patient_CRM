/**
 * Multi-Tenant Test Data Generator
 *
 * Create multi-organization test data to verify data isolation
 *
 * Features:
 * - Create 3 test organizations
 * - Each organization has independent users, patients, appointments
 * - Verify data isolation
 */

const crypto = require('crypto');
const { db } = require('../server/database/db');

// Generate random date
function randomDate(daysAgo = 180) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

// Generate unique ID
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

console.log('[MultiTenant] Starting multi-tenant test data creation...\n');

const now = new Date().toISOString();

// 1. Create super admin
console.log('[MultiTenant] Creating super admin...');
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
  'Super Admin',
  'superadmin@system.com',
  1,
  now,
  now
);

console.log('[MultiTenant] Super admin created');
console.log('   Username: superadmin');
console.log('   Password: Admin123\n');

// 2. Create test organizations
const organizations = [
  {
    name: 'Taipei Renai Hospital',
    slug: 'taipei-hospital',
    plan: 'professional',
    maxUsers: 20,
    maxPatients: 500,
    contactName: 'Dr. Wang',
    contactEmail: 'admin@taipei-hospital.com'
  },
  {
    name: 'Hsinchu Health Clinic',
    slug: 'hsinchu-clinic',
    plan: 'basic',
    maxUsers: 5,
    maxPatients: 100,
    contactName: 'Dr. Lee',
    contactEmail: 'admin@hsinchu-clinic.com'
  },
  {
    name: 'Kaohsiung Medical Center',
    slug: 'kaohsiung-medical',
    plan: 'enterprise',
    maxUsers: 999,
    maxPatients: 99999,
    contactName: 'Dr. Chang',
    contactEmail: 'admin@kaohsiung-medical.com'
  }
];

console.log('[MultiTenant] Creating test organizations...');

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

  console.log(`[MultiTenant] ${org.name} (${org.plan})`);
}

console.log('');

// 3. Create users and patients for each organization
for (const org of orgIds) {
  console.log(`[MultiTenant] Creating test data for ${org.name}...`);

  // Create admin
  const adminId = generateId('user');
  db.prepare(`
    INSERT INTO users (id, username, password, role, name, email, organizationId, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    adminId,
    `${org.slug}-admin`,
    hashedPassword,
    'admin',
    `${org.name} Admin`,
    `admin@${org.slug}.com`,
    org.id,
    1,
    now,
    now
  );

  console.log(`[MultiTenant] Admin: ${org.slug}-admin`);

  // Create doctor
  const doctorId = generateId('user');
  db.prepare(`
    INSERT INTO users (id, username, password, role, name, email, organizationId, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doctorId,
    `${org.slug}-doctor`,
    hashedPassword,
    'user',
    `${org.name} Doctor`,
    `doctor@${org.slug}.com`,
    org.id,
    1,
    now,
    now
  );

  console.log(`[MultiTenant] Doctor: ${org.slug}-doctor`);

  // Create 5 patients
  const patientIds = [];
  const patientNames = ['John Smith', 'Mary Johnson', 'David Chen', 'Lisa Wang', 'Michael Zhang'];

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
      `${org.name} Address ${i + 1}`,
      JSON.stringify(['Test Data']),
      org.id,
      now,
      now
    );
  }

  console.log(`[MultiTenant] Created ${patientIds.length} patients`);

  // Create appointments for each patient
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
        ['Initial Visit', 'Follow-up', 'Regular Check'][i % 3],
        daysOffset < 0 ? 'completed' : 'scheduled',
        org.id,
        now,
        now
      );

      appointmentCount++;
    }
  }

  console.log(`[MultiTenant] Created ${appointmentCount} appointments\n`);
}

// 4. Verify data isolation
console.log('[MultiTenant] Verifying data isolation...\n');

for (const org of orgIds) {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users WHERE organizationId = ?').get(org.id).count,
    patients: db.prepare('SELECT COUNT(*) as count FROM patients WHERE organizationId = ?').get(org.id).count,
    appointments: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE organizationId = ?').get(org.id).count
  };

  console.log(`${org.name}:`);
  console.log(`   Users: ${stats.users}`);
  console.log(`   Patients: ${stats.patients}`);
  console.log(`   Appointments: ${stats.appointments}\n`);
}

// 5. Check data without organizationId (should only be legacy data)
const orphanData = {
  users: db.prepare('SELECT COUNT(*) as count FROM users WHERE organizationId IS NULL').get().count,
  patients: db.prepare('SELECT COUNT(*) as count FROM patients WHERE organizationId IS NULL').get().count,
  appointments: db.prepare('SELECT COUNT(*) as count FROM appointments WHERE organizationId IS NULL').get().count
};

console.log('[MultiTenant] Data without organization (legacy):');
console.log(`   Users: ${orphanData.users}`);
console.log(`   Patients: ${orphanData.patients}`);
console.log(`   Appointments: ${orphanData.appointments}\n`);

console.log('[MultiTenant] Test data creation completed successfully!\n');

console.log('[MultiTenant] Test accounts:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Super Admin:');
console.log('  Username: superadmin');
console.log('  Password: Admin123');
console.log('  Role: Can manage all organizations\n');

for (const org of orgIds) {
  console.log(`${org.name}:`);
  console.log(`  Admin: ${org.slug}-admin / Admin123`);
  console.log(`  Doctor: ${org.slug}-doctor / Admin123\n`);
}

console.log('[MultiTenant] Verification steps:');
console.log('1. Login with accounts from different organizations');
console.log('2. Confirm you can only see patients from your organization');
console.log('3. 嘗試存取其他組織的患者 ID（應該返回 404）');
console.log('4. 檢查 API 回應中的 organizationId');
