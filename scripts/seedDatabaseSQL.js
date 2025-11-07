#!/usr/bin/env node

/**
 * SQLite 資料庫種子資料腳本
 * 用於填充模擬患者、預約和健康數據
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 取得資料庫路徑
const dbPath = path.join(__dirname, '..', 'data', 'patient_crm.db');
const db = new Database(dbPath);

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

// 插入患者資料
function seedPatients() {
  console.log('📝 正在插入患者資料...');
  const now = new Date().toISOString();

  const patients = [
    {
      name: "王小明", gender: "male", birthDate: "1985-03-15", phone: "0912-345-678",
      email: "wang.xiaoming@email.com", address: "台北市信義區信義路五段7號",
      tags: '["糖尿病", "高血壓"]',
      emergencyContact: "王太太", emergencyPhone: "0912-345-679"
    },
    {
      name: "李美玲", gender: "female", birthDate: "1990-07-22", phone: "0923-456-789",
      email: "li.meiling@email.com", address: "新北市板橋區文化路一段123號",
      tags: '["減重計畫", "健身"]',
      emergencyContact: "李先生", emergencyPhone: "0923-456-780"
    },
    {
      name: "陳建國", gender: "male", birthDate: "1978-11-08", phone: "0934-567-890",
      email: "chen.jianguo@email.com", address: "台中市西屯區台灣大道三段99號",
      tags: '["高血壓", "心臟病史"]',
      emergencyContact: "陳太太", emergencyPhone: "0934-567-891"
    },
    {
      name: "林雅婷", gender: "female", birthDate: "1995-02-14", phone: "0945-678-901",
      email: "lin.yating@email.com", address: "高雄市左營區博愛二路777號",
      tags: '["運動員", "營養諮詢"]',
      emergencyContact: "林媽媽", emergencyPhone: "0945-678-902"
    },
    {
      name: "張志豪", gender: "male", birthDate: "1988-09-30", phone: "0956-789-012",
      email: "zhang.zhihao@email.com", address: "台南市東區東門路二段88號",
      tags: '["減重計畫"]',
      emergencyContact: "張太太", emergencyPhone: "0956-789-013"
    },
    {
      name: "黃淑芬", gender: "female", birthDate: "1982-05-18", phone: "0967-890-123",
      email: "huang.shufen@email.com", address: "桃園市中壢區中央西路二段50號",
      tags: '["糖尿病", "營養諮詢"]',
      emergencyContact: "黃先生", emergencyPhone: "0967-890-124"
    },
    {
      name: "劉俊傑", gender: "male", birthDate: "1992-12-25", phone: "0978-901-234",
      email: "liu.junjie@email.com", address: "新竹市東區光復路一段321號",
      tags: '["健身", "增肌計畫"]',
      emergencyContact: "劉爸爸", emergencyPhone: "0978-901-235"
    },
    {
      name: "吳佩珊", gender: "female", birthDate: "1987-08-03", phone: "0989-012-345",
      email: "wu.peishan@email.com", address: "台北市大安區敦化南路二段66號",
      tags: '["產後恢復", "營養諮詢"]',
      emergencyContact: "吳先生", emergencyPhone: "0989-012-346"
    }
  ];

  const insertPatient = db.prepare(`
    INSERT INTO patients (
      id, name, gender, birthDate, phone, email, address,
      emergencyContact, emergencyPhone, notes, tags, groups,
      healthProfile, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const patientIds = [];
  patients.forEach(patient => {
    const id = generateId('patient');
    patientIds.push(id);

    insertPatient.run(
      id,
      patient.name,
      patient.gender,
      patient.birthDate,
      patient.phone,
      patient.email,
      patient.address,
      patient.emergencyContact,
      patient.emergencyPhone,
      null, // notes
      patient.tags,
      '[]', // groups
      null, // healthProfile
      now,
      now
    );
  });

  console.log(`✅ 已插入 ${patients.length} 位患者`);
  return patientIds;
}

// 插入預約資料
function seedAppointments(patientIds) {
  console.log('📅 正在插入預約資料...');
  const now = new Date().toISOString();

  const appointmentTypes = ['初診', '複診', '定期檢查', '營養諮詢', '運動指導', '健康評估'];

  const insertAppointment = db.prepare(`
    INSERT INTO appointments (
      id, patientId, date, time, type, notes, status,
      reminderSent, isRecurring, recurringPattern, recurringEndDate,
      parentAppointmentId, reminderDays, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  patientIds.forEach(patientId => {
    const numAppointments = randomInRange(3, 8);

    for (let i = 0; i < numAppointments; i++) {
      const id = generateId('appointment');
      const daysOffset = randomInRange(-30, 60); // 過去30天到未來60天
      const date = new Date();
      date.setDate(date.getDate() + daysOffset);
      const appointmentDate = date.toISOString().split('T')[0];

      const hour = randomInRange(9, 17);
      const minute = randomInRange(0, 3) * 15; // 0, 15, 30, 45
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      const type = appointmentTypes[randomInRange(0, appointmentTypes.length)];
      const status = daysOffset < 0 ? 'completed' : 'scheduled';

      insertAppointment.run(
        id,
        patientId,
        appointmentDate,
        time,
        type,
        `${type}相關事項`,
        status,
        0, // reminderSent
        0, // isRecurring
        null, // recurringPattern
        null, // recurringEndDate
        null, // parentAppointmentId
        1, // reminderDays
        now,
        now
      );
      count++;
    }
  });

  console.log(`✅ 已插入 ${count} 筆預約記錄`);
}

// 插入身體組成記錄
function seedBodyComposition(patientIds) {
  console.log('🏋️ 正在插入身體組成記錄...');

  const insertRecord = db.prepare(`
    INSERT INTO body_composition (
      id, patientId, date, weight, height, bmi, bodyFat,
      muscleMass, visceralFat, boneMass, bodyWater, bmr, notes, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  patientIds.forEach(patientId => {
    const numRecords = randomInRange(8, 15);
    const height = randomInRange(155, 185);
    let baseWeight = randomInRange(50, 95);

    for (let i = 0; i < numRecords; i++) {
      const id = generateId('body');
      const daysAgo = Math.floor((numRecords - i) * (180 / numRecords));
      const date = randomDate(daysAgo);

      // 模擬體重變化趨勢
      const weightChange = (i / numRecords) * randomInRange(-5, 5);
      const weight = parseFloat((baseWeight + weightChange + randomInRange(-2, 2)).toFixed(1));

      const bmi = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
      const bodyFat = randomInRange(15, 35, 1);
      const muscleMass = parseFloat((weight * randomInRange(0.35, 0.45)).toFixed(1));
      const visceralFat = randomInRange(5, 15);
      const boneMass = parseFloat((weight * 0.15).toFixed(1));
      const bodyWater = randomInRange(50, 65, 1);
      const bmr = Math.floor(weight * randomInRange(20, 25));

      insertRecord.run(
        id,
        patientId,
        date,
        weight,
        height,
        bmi,
        bodyFat,
        muscleMass,
        visceralFat,
        boneMass,
        bodyWater,
        bmr,
        i === 0 ? '初次評估' : (i === numRecords - 1 ? '最新記錄' : ''),
        new Date().toISOString()
      );
      count++;
    }
  });

  console.log(`✅ 已插入 ${count} 筆身體組成記錄`);
}

// 插入生命徵象記錄
function seedVitalSigns(patientIds) {
  console.log('❤️ 正在插入生命徵象記錄...');

  const insertRecord = db.prepare(`
    INSERT INTO vital_signs (
      id, patientId, date, bloodPressureSystolic, bloodPressureDiastolic,
      heartRate, temperature, respiratoryRate, oxygenSaturation,
      bloodGlucose, notes, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  patientIds.forEach(patientId => {
    const numRecords = randomInRange(6, 12);

    for (let i = 0; i < numRecords; i++) {
      const id = generateId('vital');
      const daysAgo = Math.floor((numRecords - i) * (120 / numRecords));
      const date = randomDate(daysAgo);

      const systolic = randomInRange(110, 140);
      const diastolic = randomInRange(70, 90);
      const heartRate = randomInRange(60, 90);
      const temperature = randomInRange(36.2, 37.2, 1);
      const respiratoryRate = randomInRange(12, 20);
      const oxygenSaturation = randomInRange(95, 100);
      const bloodGlucose = randomInRange(80, 120);

      insertRecord.run(
        id,
        patientId,
        date,
        systolic,
        diastolic,
        heartRate,
        temperature,
        respiratoryRate,
        oxygenSaturation,
        bloodGlucose,
        '',
        new Date().toISOString()
      );
      count++;
    }
  });

  console.log(`✅ 已插入 ${count} 筆生命徵象記錄`);
}

// 插入健康目標
function seedGoals(patientIds) {
  console.log('🎯 正在插入健康目標...');
  const now = new Date().toISOString();

  const goalTypes = [
    { category: '體重管理', title: '減重目標', description: '達到理想體重', targetValue: 70, unit: 'kg' },
    { category: '運動健身', title: '每週運動', description: '增加運動頻率', targetValue: 3, unit: '次' },
    { category: '血壓控制', title: '血壓目標', description: '降低收縮壓', targetValue: 120, unit: 'mmHg' },
    { category: '血糖控制', title: '血糖控制', description: '維持空腹血糖正常', targetValue: 100, unit: 'mg/dL' },
    { category: '體脂控制', title: '體脂率', description: '降低體脂率', targetValue: 20, unit: '%' }
  ];

  const insertGoal = db.prepare(`
    INSERT INTO goals (
      id, patientId, category, title, description, currentValue,
      targetValue, unit, startDate, targetDate, status, progress,
      milestones, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  patientIds.forEach(patientId => {
    const numGoals = randomInRange(1, 3);

    for (let i = 0; i < numGoals; i++) {
      const goal = goalTypes[randomInRange(0, goalTypes.length)];
      const id = generateId('goal');

      const startDate = randomDate(60);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + randomInRange(30, 180));

      const currentValue = goal.targetValue * randomInRange(0.7, 1.3, 1);
      const progress = Math.min(100, Math.max(0, randomInRange(10, 80)));
      const status = progress === 100 ? 'completed' : 'active';

      insertGoal.run(
        id,
        patientId,
        goal.category,
        goal.title,
        goal.description,
        currentValue,
        goal.targetValue,
        goal.unit,
        startDate,
        targetDate.toISOString().split('T')[0],
        status,
        progress,
        null, // milestones
        now,
        now
      );
      count++;
    }
  });

  console.log(`✅ 已插入 ${count} 個健康目標`);
}

// 主要執行函數
function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('  SQLite 資料庫種子資料');
  console.log('═══════════════════════════════════════\n');

  try {
    // 檢查資料庫是否存在
    if (!fs.existsSync(dbPath)) {
      console.error('❌ 資料庫不存在，請先啟動伺服器以創建資料庫');
      process.exit(1);
    }

    // 開始事務
    db.prepare('BEGIN').run();

    // 插入各種數據
    const patientIds = seedPatients();
    seedAppointments(patientIds);
    seedBodyComposition(patientIds);
    seedVitalSigns(patientIds);
    seedGoals(patientIds);

    // 提交事務
    db.prepare('COMMIT').run();

    console.log('\n═══════════════════════════════════════');
    console.log('  ✅ 模擬資料插入完成！');
    console.log('═══════════════════════════════════════\n');
    console.log('🔄 請重新載入應用程式查看數據\n');

  } catch (error) {
    db.prepare('ROLLBACK').run();
    console.error('\n❌ 發生錯誤:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

// 執行主程式
if (require.main === module) {
  main();
}

module.exports = { main };
