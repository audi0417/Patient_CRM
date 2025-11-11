const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../../data/patient_crm.db');
const db = new Database(dbPath);

// 啟用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

function initialize() {
  console.log('🗄️  初始化數據庫...');

  // 使用者表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'user')),
      isActive INTEGER DEFAULT 1,
      lastLogin TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // 患者表
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('male', 'female', 'other')),
      birthDate TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      emergencyContact TEXT,
      emergencyPhone TEXT,
      notes TEXT,
      tags TEXT,
      groups TEXT,
      healthProfile TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // 體組成記錄表
  db.exec(`
    CREATE TABLE IF NOT EXISTS body_composition (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      date TEXT NOT NULL,
      weight REAL,
      height REAL,
      bodyFat REAL,
      muscleMass REAL,
      bmi REAL,
      visceralFat REAL,
      boneMass REAL,
      bodyWater REAL,
      bmr REAL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // 生命徵象記錄表
  db.exec(`
    CREATE TABLE IF NOT EXISTS vital_signs (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      date TEXT NOT NULL,
      bloodPressureSystolic INTEGER,
      bloodPressureDiastolic INTEGER,
      heartRate INTEGER,
      temperature REAL,
      respiratoryRate INTEGER,
      oxygenSaturation REAL,
      bloodGlucose REAL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // 健康目標表
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      currentValue REAL,
      targetValue REAL NOT NULL,
      unit TEXT,
      startDate TEXT NOT NULL,
      targetDate TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'cancelled', 'overdue')),
      progress INTEGER DEFAULT 0,
      milestones TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // 預約表
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('scheduled', 'completed', 'cancelled')),
      reminderSent INTEGER DEFAULT 0,
      isRecurring INTEGER DEFAULT 0,
      recurringPattern TEXT,
      recurringEndDate TEXT,
      parentAppointmentId TEXT,
      reminderDays INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // 標籤表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // 群組表
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT NOT NULL,
      patientIds TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // 服務類別表
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_types (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      displayOrder INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // 諮詢記錄表
  db.exec(`
    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT,
      chiefComplaint TEXT,
      assessment TEXT,
      plan TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // 建立索引以提高查詢性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_body_composition_patient ON body_composition(patientId, date);
    CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs(patientId, date);
    CREATE INDEX IF NOT EXISTS idx_goals_patient ON goals(patientId, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patientId, date);
    CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patientId, date);
  `);

  // 檢查是否需要創建超級管理員（用於系統管理）
  const superAdminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('super_admin');

  if (superAdminExists.count === 0) {
    console.log('👑 創建超級管理員帳號（系統控制台）...');

    // 從環境變數取得密碼，或使用預設值
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024';
    const hashedPassword = crypto.createHash('sha256').update(superAdminPassword).digest('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password, name, email, role, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'user_superadmin_001',
      'superadmin',
      hashedPassword,
      '系統超級管理員',
      'superadmin@system.com',
      'super_admin',
      1,
      now,
      now
    );

    console.log('✅ 超級管理員已創建');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  🔐 超級管理員帳號（請立即修改密碼）    │');
    console.log('├─────────────────────────────────────────┤');
    console.log('│  帳號: superadmin                       │');
    console.log(`│  密碼: ${superAdminPassword.padEnd(31)}│`);
    console.log('│  權限: 可管理所有組織和系統設定         │');
    console.log('└─────────────────────────────────────────┘');
    console.log('⚠️  重要：首次登入後請立即修改密碼！');
    console.log('');
  }

  // 檢查是否需要創建預設服務類別
  const serviceTypesExist = db.prepare('SELECT COUNT(*) as count FROM service_types').get();

  if (serviceTypesExist.count === 0) {
    console.log('📝 創建預設服務類別...');
    const now = new Date().toISOString();

    const defaultServiceTypes = [
      { name: '初診', color: '#6366f1', description: '首次就診評估', order: 0 },
      { name: '營養諮詢', color: '#22c55e', description: '營養評估與飲食建議', order: 1 },
      { name: '運動指導', color: '#f97316', description: '運動計畫與指導', order: 2 },
      { name: '複診', color: '#8b5cf6', description: '定期追蹤回診', order: 3 },
      { name: '健康評估', color: '#06b6d4', description: '綜合健康狀況評估', order: 4 },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO service_types (id, name, description, color, isActive, displayOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const type of defaultServiceTypes) {
      insertStmt.run(
        `service_type_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type.name,
        type.description,
        type.color,
        1, // 預設啟用
        type.order,
        now,
        now
      );
    }

    console.log('✅ 預設服務類別已創建');
  }

  console.log('✅ 數據庫初始化完成');
}

module.exports = { db, initialize };
