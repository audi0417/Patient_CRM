#!/usr/bin/env node

/**
 * 初始化資料庫腳本
 * 包含管理員帳號、模擬患者、群組、標籤和健康數據
 *
 * 使用方式:
 * node scripts/initDatabase.js
 *
 * 或者直接執行:
 * npm run init-db
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 取得資料儲存路徑
function getStoragePath(filename) {
  const storagePath = path.join(__dirname, '..', 'data', filename);
  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return storagePath;
}

// 儲存 JSON 檔案
function saveData(filename, data) {
  const storagePath = getStoragePath(filename);
  try {
    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`儲存 ${filename} 時發生錯誤:`, error.message);
    return false;
  }
}

// 產生隨機日期 (過去 N 天到今天)
function randomDate(daysAgo = 180) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

// 產生隨機數字 (在範圍內)
function randomInRange(min, max, decimals = 0) {
  const value = Math.random() * (max - min) + min;
  return decimals > 0 ? parseFloat(value.toFixed(decimals)) : Math.floor(value);
}

// 產生唯一 ID
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 密碼雜湊函數
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 建立管理員帳號
function createAdminUser() {
  return {
    id: 'user_admin_001',
    username: 'admin',
    password: hashPassword('Admin123'),
    name: '系統管理員',
    email: 'admin@hospital.com',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// 建立標籤
function createTags() {
  return [
    { id: 'tag_001', name: '糖尿病', color: '#ef4444', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_002', name: '高血壓', color: '#f97316', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_003', name: '減重計畫', color: '#10b981', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_004', name: '健身', color: '#3b82f6', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_005', name: '營養諮詢', color: '#8b5cf6', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_006', name: '運動員', color: '#ec4899', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_007', name: '心臟病史', color: '#f43f5e', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_008', name: '產後恢復', color: '#d946ef', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_009', name: '高血脂', color: '#eab308', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tag_010', name: '睡眠障礙', color: '#6366f1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
}

// 建立群組
function createGroups() {
  const now = new Date().toISOString();
  return [
    {
      id: 'group_001',
      name: '2025減肥課程',
      description: '2025年減重課程學員',
      color: '#10b981',
      patientIds: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'group_002',
      name: '慢性病管理',
      description: '糖尿病、高血壓等慢性病患者',
      color: '#ef4444',
      patientIds: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'group_003',
      name: '運動訓練班',
      description: '運動員與健身愛好者',
      color: '#3b82f6',
      patientIds: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'group_004',
      name: '營養調理',
      description: '需要營養諮詢與飲食調理',
      color: '#8b5cf6',
      patientIds: [],
      createdAt: now,
      updatedAt: now
    }
  ];
}

// 模擬患者資料
function createPatients(groups) {
  const now = new Date().toISOString();
  const patients = [];

  const mockData = [
    {
      name: "王小明", gender: "male", birthDate: "1985-03-15", phone: "0912-345-678",
      email: "wang.xiaoming@email.com", address: "台北市信義區信義路五段7號",
      bloodType: "A", allergies: ["花生", "青黴素"], tags: ["糖尿病", "高血壓"],
      groupIds: ['group_002'], healthProfile: { height: 175, baseWeight: 85, targetWeight: 75, activityLevel: "light" }
    },
    {
      name: "李美玲", gender: "female", birthDate: "1990-07-22", phone: "0923-456-789",
      email: "li.meiling@email.com", address: "新北市板橋區文化路一段123號",
      bloodType: "B", allergies: ["海鮮"], tags: ["減重計畫", "健身"],
      groupIds: ['group_001', 'group_003'], healthProfile: { height: 162, baseWeight: 68, targetWeight: 55, activityLevel: "moderate" }
    },
    {
      name: "陳建國", gender: "male", birthDate: "1978-11-08", phone: "0934-567-890",
      email: "chen.jianguo@email.com", address: "台中市西屯區台灣大道三段99號",
      bloodType: "O", allergies: [], tags: ["高血壓", "心臟病史"],
      groupIds: ['group_002'], healthProfile: { height: 170, baseWeight: 78, targetWeight: 70, activityLevel: "sedentary" }
    },
    {
      name: "林雅婷", gender: "female", birthDate: "1995-02-14", phone: "0945-678-901",
      email: "lin.yating@email.com", address: "高雄市左營區博愛二路777號",
      bloodType: "AB", allergies: ["塵蟎", "花粉"], tags: ["運動員", "營養諮詢"],
      groupIds: ['group_003', 'group_004'], healthProfile: { height: 168, baseWeight: 58, targetWeight: 60, activityLevel: "very_active" }
    },
    {
      name: "張志豪", gender: "male", birthDate: "1988-09-30", phone: "0956-789-012",
      email: "zhang.zhihao@email.com", address: "台南市東區東門路二段88號",
      bloodType: "A", allergies: ["阿斯匹靈"], tags: ["減重計畫"],
      groupIds: ['group_001'], healthProfile: { height: 178, baseWeight: 92, targetWeight: 80, activityLevel: "light" }
    },
    {
      name: "黃淑芬", gender: "female", birthDate: "1982-05-18", phone: "0967-890-123",
      email: "huang.shufen@email.com", address: "桃園市中壢區中央西路二段50號",
      bloodType: "O", allergies: ["磺胺類藥物"], tags: ["糖尿病", "營養諮詢"],
      groupIds: ['group_002', 'group_004'], healthProfile: { height: 160, baseWeight: 65, targetWeight: 58, activityLevel: "moderate" }
    },
    {
      name: "劉俊傑", gender: "male", birthDate: "1992-12-25", phone: "0978-901-234",
      email: "liu.junjie@email.com", address: "新竹市東區光復路一段321號",
      bloodType: "B", allergies: [], tags: ["健身", "增肌計畫"],
      groupIds: ['group_003'], healthProfile: { height: 180, baseWeight: 75, targetWeight: 82, activityLevel: "active" }
    },
    {
      name: "吳佩珊", gender: "female", birthDate: "1987-08-03", phone: "0989-012-345",
      email: "wu.peishan@email.com", address: "台北市大安區敦化南路二段66號",
      bloodType: "A", allergies: ["乳製品"], tags: ["產後恢復", "營養諮詢"],
      groupIds: ['group_004'], healthProfile: { height: 165, baseWeight: 62, targetWeight: 55, activityLevel: "light" }
    }
  ];

  mockData.forEach((data, index) => {
    const patientId = generateId('patient');
    const patient = {
      id: patientId,
      name: data.name,
      gender: data.gender,
      birthDate: data.birthDate,
      phone: data.phone,
      email: data.email,
      address: data.address,
      emergencyContact: `${data.name}家屬`,
      emergencyPhone: data.phone.replace(/\d$/, (d) => (parseInt(d) + 1) % 10),
      bloodType: data.bloodType,
      allergies: data.allergies,
      tags: data.tags,
      groupIds: data.groupIds,
      createdAt: now,
      updatedAt: now
    };
    patients.push(patient);

    // 更新群組的 patientIds
    data.groupIds.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        group.patientIds.push(patientId);
        group.updatedAt = now;
      }
    });

    data.healthProfile.patientId = patientId;
  });

  return { patients, healthProfiles: mockData.map(d => d.healthProfile) };
}

// 為患者生成體組成記錄
function generateBodyCompositionRecords(patients, healthProfiles) {
  const records = [];

  patients.forEach((patient, index) => {
    const profile = healthProfiles[index];
    const count = randomInRange(8, 15);

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor((count - i) * (180 / count));
      const date = randomDate(daysAgo);

      const weightProgress = i / count;
      const currentWeight = profile.baseWeight - (profile.baseWeight - profile.targetWeight) * weightProgress * 0.5;
      const weight = currentWeight + randomInRange(-2, 2, 1);

      const bmi = weight / Math.pow(profile.height / 100, 2);
      const bodyFat = randomInRange(15, 35, 1);
      const muscleMass = weight * randomInRange(0.35, 0.45, 2);

      records.push({
        id: generateId('body'),
        patientId: patient.id,
        date,
        weight: parseFloat(weight.toFixed(1)),
        height: profile.height,
        bodyFat,
        muscleMass,
        bmi: parseFloat(bmi.toFixed(1)),
        visceralFat: randomInRange(5, 15),
        boneMass: parseFloat((weight * 0.15).toFixed(1)),
        bodyWater: randomInRange(50, 65, 1),
        bmr: Math.floor(weight * randomInRange(20, 25)),
        notes: i === 0 ? "初次評估" : (i === count - 1 ? "最新記錄" : "")
      });
    }
  });

  return records;
}

// 為患者生成生命徵象記錄
function generateVitalSignsRecords(patients) {
  const records = [];

  patients.forEach(patient => {
    const hasHighBP = patient.tags?.includes('高血壓');
    const hasDiabetes = patient.tags?.includes('糖尿病');
    const count = randomInRange(6, 12);

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor((count - i) * (120 / count));
      const date = randomDate(daysAgo);

      const systolic = hasHighBP ? randomInRange(130, 160) : randomInRange(110, 130);
      const diastolic = hasHighBP ? randomInRange(85, 100) : randomInRange(70, 85);
      const glucose = hasDiabetes ? randomInRange(120, 180) : randomInRange(80, 110);

      records.push({
        id: generateId('vital'),
        patientId: patient.id,
        date,
        bloodPressureSystolic: systolic,
        bloodPressureDiastolic: diastolic,
        heartRate: randomInRange(60, 90),
        temperature: randomInRange(36.2, 37.2, 1),
        respiratoryRate: randomInRange(12, 20),
        oxygenSaturation: randomInRange(95, 100),
        bloodGlucose: glucose,
        notes: ""
      });
    }
  });

  return records;
}

// 主要執行函數
async function initDatabase() {
  console.log('\n═══════════════════════════════════════');
  console.log('  初始化資料庫');
  console.log('═══════════════════════════════════════\n');

  try {
    // Create admin account
    const admin = createAdminUser();
    console.log('[Init] Created admin account: admin / Admin123');

    // Create tags
    const tags = createTags();
    console.log(`[Init] Created ${tags.length} tags`);

    // Create groups
    const groups = createGroups();
    console.log(`[Init] Created ${groups.length} groups`);

    // Create patients
    const { patients, healthProfiles } = createPatients(groups);
    console.log(`[Init] Created ${patients.length} mock patients`);

    // Generate health data
    const bodyRecords = generateBodyCompositionRecords(patients, healthProfiles);
    console.log(`[Init] Generated ${bodyRecords.length} body composition records`);

    const vitalRecords = generateVitalSignsRecords(patients);
    console.log(`[Init] Generated ${vitalRecords.length} vital signs records`);

    // Save all data
    console.log('\n[Init] Saving data...\n');

    saveData('users.json', [admin]);
    saveData('tags.json', tags);
    saveData('groups.json', groups);
    saveData('patients.json', patients);
    saveData('bodyComposition.json', bodyRecords);
    saveData('vitalSigns.json', vitalRecords);
    saveData('appointments.json', []);
    saveData('goals.json', []);
    saveData('initialAssessments.json', []);

    // 顯示摘要
    console.log('═══════════════════════════════════════');
    console.log('  Data initialization completed!');
    console.log('═══════════════════════════════════════\n');
    console.log('[Init] Data summary:');
    console.log(`   Admin account: 1 (admin / Admin123)`);
    console.log(`   Tags: ${tags.length}`);
    console.log(`   Groups: ${groups.length}`);
    console.log(`   Patients: ${patients.length}`);
    console.log(`   Body composition records: ${bodyRecords.length}`);
    console.log(`   Vital signs records: ${vitalRecords.length}`);
    console.log('\n[Init] Data saved to data/ directory');
    console.log('[Init] Reload application to start using\n');
    console.log('[Init] Login info:');
    console.log('   Username: admin');
    console.log('   Password: Admin123\n');

  } catch (error) {
    console.error('\n[Init] Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute main program
if (require.main === module) {
  initDatabase().catch(console.error);
}

module.exports = { initDatabase };
