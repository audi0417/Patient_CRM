#!/usr/bin/env node

/**
 * 為患者添加健康數據、預約和諮詢記錄的腳本
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'patient_crm.db');
const db = new Database(dbPath);

// 產生唯一 ID
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 產生隨機日期 (過去 N 天)
function randomDate(daysAgo = 180) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

// 產生隨機數字
function randomInRange(min, max, decimals = 0) {
  const value = Math.random() * (max - min) + min;
  return decimals > 0 ? parseFloat(value.toFixed(decimals)) : Math.floor(value);
}

// 產生未來日期
function futureDate(daysInFuture = 60) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysInFuture));
  return date.toISOString().split('T')[0];
}

// 隨機選擇
function randomChoose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

console.log('[HealthData] Adding health data and appointment info to patients...\n');

// Get all patient IDs
const patients = db.prepare('SELECT id, name FROM patients').all();
console.log(`[HealthData] Found ${patients.length} patients\n`);

let bodyCompositionCount = 0;
let vitalSignsCount = 0;
let appointmentCount = 0;
let goalCount = 0;
let consultationCount = 0;

const appointmentTypes = ['Initial Visit', 'Follow-up', 'Regular Check', 'Nutrition Consult', 'Exercise Guidance', 'Health Assessment'];
const appointmentStatuses = ['scheduled', 'completed', 'cancelled'];
const goalCategories = ['Weight Management', 'Fitness Plan', 'Blood Glucose Control', 'Blood Pressure Management', 'Muscle Building', 'Postpartum Recovery'];

try {
  const addData = db.transaction(() => {
    patients.forEach((patient, index) => {
      console.log(`[HealthData] Processing: ${patient.name} (${index + 1}/${patients.length})`);

      // 1. Add body composition records (3-5 records)
      const bodyCompositionRecords = randomInRange(3, 5);
      for (let i = 0; i < bodyCompositionRecords; i++) {
        const id = generateId('body_comp');
        const recordDate = randomDate(180);
        const weight = randomInRange(50, 100, 1);
        const height = randomInRange(150, 190, 1);
        const bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));

        db.prepare(`
          INSERT INTO body_composition (
            id, patientId, date, weight, height, bodyFat, muscleMass,
            bmi, visceralFat, boneMass, bodyWater, bmr, notes, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          patient.id,
          recordDate,
          weight,
          height,
          randomInRange(15, 35, 1), // bodyFat
          randomInRange(25, 45, 1), // muscleMass
          bmi,
          randomInRange(50, 150, 1), // visceralFat
          randomInRange(2, 3.5, 2), // boneMass
          randomInRange(50, 70, 1), // bodyWater
          randomInRange(1500, 2500), // bmr
          null,
          new Date(recordDate).toISOString()
        );
        bodyCompositionCount++;
      }

      // 2. 添加生命徵象記錄 (4-6 筆)
      const vitalSignsRecords = randomInRange(4, 6);
      for (let i = 0; i < vitalSignsRecords; i++) {
        const id = generateId('vital_signs');
        const recordDate = randomDate(180);

        db.prepare(`
          INSERT INTO vital_signs (
            id, patientId, date, bloodPressureSystolic, bloodPressureDiastolic,
            heartRate, temperature, respiratoryRate, oxygenSaturation,
            bloodGlucose, notes, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          patient.id,
          recordDate,
          randomInRange(110, 140), // 血壓收縮壓
          randomInRange(70, 90), // 血壓舒張壓
          randomInRange(60, 100), // 心率
          randomInRange(36.5, 37.5, 1), // 體溫
          randomInRange(12, 20), // 呼吸速率
          randomInRange(95, 100, 1), // 血氧飽和度
          randomInRange(90, 140, 1), // 血糖
          null,
          new Date(recordDate).toISOString()
        );
        vitalSignsCount++;
      }

      // 3. 添加健康目標 (2-3 個)
      const goalRecords = randomInRange(2, 3);
      for (let i = 0; i < goalRecords; i++) {
        const id = generateId('goal');
        const category = randomChoose(goalCategories);
        const startDate = randomDate(180);
        const targetDate = futureDate(90);
        const currentValue = randomInRange(50, 100, 1);
        const targetValue = randomInRange(50, 120, 1);
        const progress = randomInRange(0, 100);

        db.prepare(`
          INSERT INTO goals (
            id, patientId, category, title, description, currentValue,
            targetValue, unit, startDate, targetDate, status, progress,
            milestones, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          patient.id,
          category,
          `${category}目標`,
          `健康管理計畫 - ${category}`,
          currentValue,
          targetValue,
          'kg',
          startDate,
          targetDate,
          randomChoose(['active', 'completed']),
          progress,
          JSON.stringify([
            { name: '初期檢查', completed: true },
            { name: '中期評估', completed: Math.random() > 0.5 },
            { name: '最終檢查', completed: false }
          ]),
          new Date().toISOString(),
          new Date().toISOString()
        );
        goalCount++;
      }

      // 4. 添加預約記錄 (4-8 筆)
      const appointmentRecords = randomInRange(4, 8);
      for (let i = 0; i < appointmentRecords; i++) {
        const id = generateId('appointment');
        const appointmentDate = randomDate(120);
        const appointmentTime = `${randomInRange(9, 17)}:${randomInRange(0, 60, 0).toString().padStart(2, '0')}`;
        const type = randomChoose(appointmentTypes);
        const status = randomChoose(appointmentStatuses);

        db.prepare(`
          INSERT INTO appointments (
            id, patientId, date, time, type, notes, status, reminderSent,
            isRecurring, recurringPattern, recurringEndDate, parentAppointmentId,
            reminderDays, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          patient.id,
          appointmentDate,
          appointmentTime,
          type,
          `${type} - 例行檢查`,
          status,
          Math.random() > 0.3 ? 1 : 0,
          0, // isRecurring
          null,
          null,
          null,
          1,
          new Date(appointmentDate).toISOString(),
          new Date(appointmentDate).toISOString()
        );
        appointmentCount++;
      }

      // 5. 添加諮詢記錄 (2-4 筆)
      const consultationRecords = randomInRange(2, 4);
      for (let i = 0; i < consultationRecords; i++) {
        const id = generateId('consultation');
        const recordDate = randomDate(180);

        db.prepare(`
          INSERT INTO consultations (
            id, patientId, date, type, chiefComplaint, assessment,
            plan, notes, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          patient.id,
          recordDate,
          randomChoose(['初診', '復診', '追蹤']),
          '患者主要訴求',
          '營養師評估結果',
          '後續治療計畫',
          `諮詢記錄 - ${recordDate}`,
          new Date(recordDate).toISOString(),
          new Date(recordDate).toISOString()
        );
        consultationCount++;
      }
    });
  });

  addData();

  console.log(`\n[HealthData] Completed adding mock data`);
  console.log(`\n[HealthData] Statistics:`);
  console.log(`   • Body composition records: ${bodyCompositionCount}`);
  console.log(`   • Vital signs records: ${vitalSignsCount}`);
  console.log(`   • Health goals: ${goalCount}`);
  console.log(`   • Appointment records: ${appointmentCount}`);
  console.log(`   • Consultation records: ${consultationCount}`);

  // Verify data
  const bodyCompCount = db.prepare('SELECT COUNT(*) as count FROM body_composition').get();
  const vitalCount = db.prepare('SELECT COUNT(*) as count FROM vital_signs').get();
  const appointmentDbCount = db.prepare('SELECT COUNT(*) as count FROM appointments').get();
  const goalDbCount = db.prepare('SELECT COUNT(*) as count FROM goals').get();
  const consultationDbCount = db.prepare('SELECT COUNT(*) as count FROM consultations').get();

  console.log(`\n[HealthData] Database verification:`);
  console.log(`   • Body composition: ${bodyCompCount.count}`);
  console.log(`   • Vital signs: ${vitalCount.count}`);
  console.log(`   • Appointments: ${appointmentDbCount.count}`);
  console.log(`   • Goals: ${goalDbCount.count}`);
  console.log(`   • Consultations: ${consultationDbCount.count}`);

} catch (error) {
  console.error('[HealthData] Error adding data:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
