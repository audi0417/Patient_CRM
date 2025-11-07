#!/usr/bin/env node

/**
 * 資料庫種子數據腳本
 * 將模擬數據插入到 SQLite 資料庫中
 *
 * 使用方式:
 * node scripts/seedDatabase.js
 *
 * 或者:
 * npm run seed-db
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 資料庫路徑
const DB_PATH = path.join(__dirname, '..', 'data', 'patient_crm.db');

// 確保 data 目錄存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 連接資料庫
const db = new Database(DB_PATH);

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

// 建立模擬患者資料
function createPatients() {
  console.log('📝 建立模擬患者資料...');

  const now = new Date().toISOString();

  const mockData = [
    {
      id: `patient_${Date.now()}_1`,
      name: "王小明",
      gender: "male",
      birthDate: "1985-03-15",
      phone: "0912-345-678",
      email: "wang.xiaoming@email.com",
      address: "台北市信義區信義路五段7號",
      emergencyContact: "王太太",
      emergencyPhone: "0912-345-679",
      notes: "糖尿病史，需要定期追蹤血糖",
      tags: JSON.stringify(["糖尿病", "高血壓"]),
      groups: JSON.stringify(["慢性病管理"]),
      healthProfile: JSON.stringify({
        height: 175,
        weight: 85,
        targetWeight: 75,
        activityLevel: "light"
      }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: `patient_${Date.now()}_2`,
      name: "李美玲",
      gender: "female",
      birthDate: "1990-07-22",
      phone: "0923-456-789",
      email: "lee.meiling@email.com",
      address: "新北市板橋區文化路二段182號",
      emergencyContact: "李先生",
      emergencyPhone: "0923-456-790",
      notes: "參加減重課程，目標減重10公斤",
      tags: JSON.stringify(["減重計畫", "健身"]),
      groups: JSON.stringify(["2025減肥課程", "運動訓練班"]),
      healthProfile: JSON.stringify({
        height: 162,
        weight: 68,
        targetWeight: 58,
        activityLevel: "moderate"
      }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: `patient_${Date.now()}_3`,
      name: "陳建國",
      gender: "male",
      birthDate: "1975-11-08",
      phone: "0934-567-890",
      email: "chen.jianguo@email.com",
      address: "台中市西屯區台灣大道三段99號",
      emergencyContact: "陳太太",
      emergencyPhone: "0934-567-891",
      notes: "高血壓，有心臟病史，需控制血壓",
      tags: JSON.stringify(["高血壓", "心臟病史"]),
      groups: JSON.stringify(["慢性病管理"]),
      healthProfile: JSON.stringify({
        height: 172,
        weight: 82,
        targetWeight: 75,
        activityLevel: "light"
      }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: `patient_${Date.now()}_4`,
      name: "林雅婷",
      gender: "female",
      birthDate: "1995-04-12",
      phone: "0945-678-901",
      email: "lin.yating@email.com",
      address: "高雄市前鎮區中山二路5號",
      emergencyContact: "林媽媽",
      emergencyPhone: "0945-678-902",
      notes: "專業運動員，需要增肌減脂",
      tags: JSON.stringify(["運動員", "營養諮詢"]),
      groups: JSON.stringify(["運動訓練班", "營養調理"]),
      healthProfile: JSON.stringify({
        height: 168,
        weight: 58,
        targetWeight: 60,
        activityLevel: "very_active"
      }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: `patient_${Date.now()}_5`,
      name: "張志豪",
      gender: "male",
      birthDate: "1988-09-25",
      phone: "0956-789-012",
      email: "zhang.zhihao@email.com",
      address: "台南市東區大學路一段1號",
      emergencyContact: "張太太",
      emergencyPhone: "0956-789-013",
      notes: "減重計畫參與者",
      tags: JSON.stringify(["減重計畫"]),
      groups: JSON.stringify(["2025減肥課程"]),
      healthProfile: JSON.stringify({
        height: 178,
        weight: 95,
        targetWeight: 80,
        activityLevel: "light"
      }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: `patient_${Date.now()}_6`,
      name: "黃淑芬",
      gender: "female",
      birthDate: "1982-06-30",
      phone: "0967-890-123",
      email: "huang.shufen@email.com",
      address: "桃園市中壢區中央東路88號",
      emergencyContact: "黃先生",
      emergencyPhone: "0967-890-124",
      notes: "糖尿病患者，需要飲食控制",
      tags: JSON.stringify(["糖尿病", "營養諮詢"]),
      groups: JSON.stringify(["慢性病管理", "營養調理"]),
      healthProfile: JSON.stringify({
        height: 160,
        weight: 70,
        targetWeight: 62,
        activityLevel: "sedentary"
      }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: `patient_${Date.now()}_7`,
      name: "劉俊傑",
      gender: "male",
      birthDate: "1992-12-18",
      phone: "0978-901-234",
      email: "liu.junjie@email.com",
      address: "新竹市東區光復路二段101號",
      emergencyContact: "劉爸爸",
      emergencyPhone: "0978-901-235",
      notes: "健身愛好者，想增加肌肉量",
      tags: JSON.stringify(["健身"]),
      groups: JSON.stringify(["運動訓練班"]),
      healthProfile: JSON.stringify({
        height: 180,
        weight: 75,
        targetWeight: 82,
        activityLevel: "active"
      }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: `patient_${Date.now()}_8`,
      name: "吳佩珊",
      gender: "female",
      birthDate: "1993-08-05",
      phone: "0989-012-345",
      email: "wu.peishan@email.com",
      address: "台北市大安區羅斯福路四段1號",
      emergencyContact: "吳先生",
      emergencyPhone: "0989-012-346",
      notes: "產後恢復，需要營養調理",
      tags: JSON.stringify(["產後恢復", "營養諮詢"]),
      groups: JSON.stringify(["營養調理"]),
      healthProfile: JSON.stringify({
        height: 165,
        weight: 62,
        targetWeight: 55,
        activityLevel: "light"
      }),
      createdAt: now,
      updatedAt: now
    }
  ];

  const insertPatient = db.prepare(`
    INSERT INTO patients (id, name, gender, birthDate, phone, email, address,
                         emergencyContact, emergencyPhone, notes, tags, groups,
                         healthProfile, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((patients) => {
    for (const patient of patients) {
      insertPatient.run(
        patient.id, patient.name, patient.gender, patient.birthDate,
        patient.phone, patient.email, patient.address,
        patient.emergencyContact, patient.emergencyPhone, patient.notes,
        patient.tags, patient.groups, patient.healthProfile,
        patient.createdAt, patient.updatedAt
      );
    }
  });

  insertMany(mockData);
  console.log(`✅ 已建立 ${mockData.length} 位模擬患者`);

  return mockData;
}

// 建立體組成記錄
function createBodyCompositionRecords(patients) {
  console.log('📊 生成體組成記錄...');

  const now = new Date().toISOString();
  const insertRecord = db.prepare(`
    INSERT INTO body_composition (id, patientId, date, weight, height, bmi, bodyFat, muscleMass,
                                  visceralFat, boneMass, bodyWater, bmr, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalRecords = 0;

  const insertMany = db.transaction(() => {
    patients.forEach(patient => {
      const healthProfile = JSON.parse(patient.healthProfile);
      const recordCount = randomInRange(8, 15);
      const baseWeight = healthProfile.weight;
      const targetWeight = healthProfile.targetWeight;
      const weightDiff = targetWeight - baseWeight;

      for (let i = 0; i < recordCount; i++) {
        const daysAgo = Math.floor((180 / recordCount) * (recordCount - i));
        const date = randomDate(daysAgo);
        const progress = i / recordCount;
        const weight = baseWeight + (weightDiff * progress) + randomInRange(-2, 2, 1);
        const height = healthProfile.height;
        const bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
        const bodyFat = randomInRange(15, 35, 1);
        const muscleMass = parseFloat((weight * randomInRange(0.35, 0.45, 2)).toFixed(1));
        const visceralFat = randomInRange(5, 15);
        const boneMass = parseFloat((weight * 0.15).toFixed(1));
        const bodyWater = parseFloat((weight * randomInRange(0.50, 0.65, 2)).toFixed(1));
        const bmr = Math.floor(weight * 22 + randomInRange(-100, 100));
        const id = `bc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        insertRecord.run(
          id, patient.id, date, weight, height, bmi, bodyFat, muscleMass,
          visceralFat, boneMass, bodyWater, bmr, null, now
        );
        totalRecords++;
      }
    });
  });

  insertMany();
  console.log(`✅ 已生成 ${totalRecords} 筆體組成記錄`);
}

// 建立生命徵象記錄
function createVitalSignsRecords(patients) {
  console.log('💓 生成生命徵象記錄...');

  const now = new Date().toISOString();
  const insertRecord = db.prepare(`
    INSERT INTO vital_signs (id, patientId, date, bloodPressureSystolic, bloodPressureDiastolic,
                            heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalRecords = 0;

  const insertMany = db.transaction(() => {
    patients.forEach(patient => {
      const recordCount = randomInRange(6, 12);

      for (let i = 0; i < recordCount; i++) {
        const daysAgo = Math.floor((180 / recordCount) * (recordCount - i));
        const date = randomDate(daysAgo);
        const systolic = randomInRange(110, 140);
        const diastolic = randomInRange(70, 90);
        const heartRate = randomInRange(60, 90);
        const temperature = randomInRange(36.0, 37.5, 1);
        const respiratoryRate = randomInRange(12, 20);
        const oxygenSaturation = randomInRange(95, 100);
        const bloodGlucose = randomInRange(80, 120);
        const id = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        insertRecord.run(
          id, patient.id, date, systolic, diastolic, heartRate, temperature,
          respiratoryRate, oxygenSaturation, bloodGlucose, null, now
        );
        totalRecords++;
      }
    });
  });

  insertMany();
  console.log(`✅ 已生成 ${totalRecords} 筆生命徵象記錄`);
}

// 建立健康目標
function createGoals(patients) {
  console.log('🎯 建立健康目標...');

  const now = new Date().toISOString();
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 3);
  const targetDate = futureDate.toISOString().split('T')[0];

  const insertGoal = db.prepare(`
    INSERT INTO goals (id, patientId, category, title, description, targetValue, currentValue,
                      unit, startDate, targetDate, status, progress, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalGoals = 0;
  const startDate = new Date().toISOString().split('T')[0];

  const insertMany = db.transaction(() => {
    patients.forEach(patient => {
      const healthProfile = JSON.parse(patient.healthProfile);

      // 體重目標
      if (healthProfile.targetWeight && healthProfile.weight !== healthProfile.targetWeight) {
        const startValue = healthProfile.weight;
        const targetValue = healthProfile.targetWeight;
        const currentValue = startValue + (targetValue - startValue) * 0.3; // 已完成30%
        const progress = Math.round(((currentValue - startValue) / (targetValue - startValue)) * 100);
        const id = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        insertGoal.run(
          id, patient.id, 'weight', '達成目標體重', '努力達成目標體重',
          targetValue, currentValue, 'kg', startDate, targetDate, 'active', progress,
          now, now
        );
        totalGoals++;
      }

      // 體脂率目標（隨機給一些患者）
      if (Math.random() > 0.5) {
        const targetBodyFat = randomInRange(18, 25, 1);
        const startBodyFat = randomInRange(25, 35, 1);
        const currentBodyFat = startBodyFat - (startBodyFat - targetBodyFat) * 0.4;
        const progress = Math.round(((startBodyFat - currentBodyFat) / (startBodyFat - targetBodyFat)) * 100);
        const id = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        insertGoal.run(
          id, patient.id, 'bodyFat', '降低體脂率', '降低體脂率至健康範圍',
          targetBodyFat, currentBodyFat, '%', startDate, targetDate, 'active', progress,
          now, now
        );
        totalGoals++;
      }
    });
  });

  insertMany();
  console.log(`✅ 已建立 ${totalGoals} 個健康目標`);
}

// 主執行函數
function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   插入模擬數據到資料庫                ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // 檢查資料庫是否存在
    if (!fs.existsSync(DB_PATH)) {
      console.error('❌ 資料庫不存在！請先啟動後端伺服器以初始化資料庫。');
      console.error('   執行: npm run server');
      process.exit(1);
    }

    // 開始交易
    const insertAll = db.transaction(() => {
      // 清空現有數據（可選）
      console.log('🗑️  清空現有數據...');
      db.prepare('DELETE FROM goals').run();
      db.prepare('DELETE FROM vital_signs').run();
      db.prepare('DELETE FROM body_composition').run();
      db.prepare('DELETE FROM appointments').run();
      db.prepare('DELETE FROM patients').run();
      console.log('✅ 已清空現有數據\n');

      // 插入數據
      const patients = createPatients();
      createBodyCompositionRecords(patients);
      createVitalSignsRecords(patients);
      createGoals(patients);
    });

    insertAll();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   數據插入完成！                      ║');
    console.log('╚════════════════════════════════════════╝\n');

    // 顯示統計
    const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
    const bodyCompCount = db.prepare('SELECT COUNT(*) as count FROM body_composition').get().count;
    const vitalSignsCount = db.prepare('SELECT COUNT(*) as count FROM vital_signs').get().count;
    const goalsCount = db.prepare('SELECT COUNT(*) as count FROM goals').get().count;

    console.log('📊 數據統計:');
    console.log(`   患者: ${patientCount} 位`);
    console.log(`   體組成記錄: ${bodyCompCount} 筆`);
    console.log(`   生命徵象記錄: ${vitalSignsCount} 筆`);
    console.log(`   健康目標: ${goalsCount} 個`);
    console.log('\n🚀 請重新載入應用程式查看新數據\n');

  } catch (error) {
    console.error('❌ 插入數據時發生錯誤:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// 執行主函數
main();
