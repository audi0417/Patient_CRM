/**
 * Seed API Routes
 * 用於雲端部署時加入模擬數據的 API 端點
 * 警告：僅用於開發和測試環境！
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const bcrypt = require('bcryptjs');

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

// POST /api/seed - 加入模擬數據
router.post('/', async (req, res) => {
  try {
    // 檢查環境變數，生產環境禁用
    if (process.env.NODE_ENV === 'production' && !req.body.force) {
      return res.status(403).json({
        error: '生產環境禁止執行 seed 操作，請在請求中加入 { "force": true } 參數'
      });
    }

    const results = {
      patients: 0,
      users: 0,
      appointments: 0,
      health_records: 0
    };

    // 1. 插入測試用戶
    console.log('📝 正在插入測試用戶...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const userStmt = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password, role, name, email, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const testUsers = [
      {
        id: generateId('user'),
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        name: '系統管理員',
        email: 'admin@example.com'
      },
      {
        id: generateId('user'),
        username: 'doctor1',
        password: hashedPassword,
        role: 'doctor',
        name: '王醫師',
        email: 'doctor1@example.com'
      }
    ];

    const now = new Date().toISOString();
    for (const user of testUsers) {
      userStmt.run(user.id, user.username, user.password, user.role, user.name, user.email, now, now);
      results.users++;
    }

    // 2. 插入患者資料
    console.log('📝 正在插入患者資料...');
    const patientStmt = db.prepare(`
      INSERT INTO patients (id, name, gender, birthDate, phone, email, address, tags, emergencyContact, emergencyPhone, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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
        emergencyContact: "李先生", emergencyPhone: "0923-456-790"
      },
      {
        name: "張大偉", gender: "male", birthDate: "1978-11-08", phone: "0934-567-890",
        email: "zhang.dawei@email.com", address: "桃園市中壢區中山路456號",
        tags: '["運動傷害", "復健"]',
        emergencyContact: "張太太", emergencyPhone: "0934-567-891"
      },
      {
        name: "陳雅婷", gender: "female", birthDate: "1995-05-30", phone: "0945-678-901",
        email: "chen.yating@email.com", address: "台中市西屯區台灣大道三段789號",
        tags: '["孕婦照護"]',
        emergencyContact: "陳先生", emergencyPhone: "0945-678-902"
      },
      {
        name: "林志明", gender: "male", birthDate: "1982-09-12", phone: "0956-789-012",
        email: "lin.zhiming@email.com", address: "高雄市左營區博愛二路321號",
        tags: '["慢性疾病", "定期追蹤"]',
        emergencyContact: "林太太", emergencyPhone: "0956-789-013"
      }
    ];

    const patientIds = [];
    for (const patient of patients) {
      const patientId = generateId('patient');
      patientIds.push(patientId);
      patientStmt.run(
        patientId,
        patient.name,
        patient.gender,
        patient.birthDate,
        patient.phone,
        patient.email,
        patient.address,
        patient.tags,
        patient.emergencyContact,
        patient.emergencyPhone,
        now,
        now
      );
      results.patients++;
    }

    // 3. 插入預約資料
    console.log('📝 正在插入預約資料...');
    const appointmentStmt = db.prepare(`
      INSERT INTO appointments (id, patientId, date, time, type, notes, status, reminderSent, isRecurring, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const appointmentTypes = ["定期回診", "追蹤檢查", "健康檢查", "復健治療"];
    const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

    // 為每個患者生成 2-4 個預約
    for (const patientId of patientIds) {
      const numAppointments = randomInRange(2, 4);
      for (let i = 0; i < numAppointments; i++) {
        const appointmentId = generateId('apt');
        const date = randomDate(90); // 過去 90 天內
        const time = times[Math.floor(Math.random() * times.length)];
        const type = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)];
        const status = Math.random() > 0.3 ? 'completed' : 'scheduled';

        appointmentStmt.run(
          appointmentId,
          patientId,
          date,
          time,
          type,
          `${type}記錄`,
          status,
          0,
          0,
          now,
          now
        );
        results.appointments++;
      }
    }

    // 4. 插入健康記錄
    console.log('📝 正在插入健康記錄...');
    const vitalSignsStmt = db.prepare(`
      INSERT INTO vital_signs (id, patientId, date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 為每個患者生成 3-5 筆健康記錄
    for (const patientId of patientIds) {
      const numRecords = randomInRange(3, 5);
      for (let i = 0; i < numRecords; i++) {
        const recordId = generateId('vital');
        const date = randomDate(60);

        vitalSignsStmt.run(
          recordId,
          patientId,
          date,
          randomInRange(110, 140),
          randomInRange(70, 90),
          randomInRange(60, 100),
          randomInRange(36.0, 37.5, 1),
          now
        );
        results.health_records++;
      }
    }

    console.log('✅ 模擬數據插入完成！');

    res.json({
      success: true,
      message: '模擬數據插入成功',
      results
    });

  } catch (error) {
    console.error('❌ Seed 失敗:', error);
    res.status(500).json({
      error: 'Seed 操作失敗',
      details: error.message
    });
  }
});

// GET /api/seed/status - 檢查數據庫狀態
router.get('/status', async (req, res) => {
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      patients: db.prepare('SELECT COUNT(*) as count FROM patients').get().count,
      appointments: db.prepare('SELECT COUNT(*) as count FROM appointments').get().count,
      vital_signs: db.prepare('SELECT COUNT(*) as count FROM vital_signs').get().count
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: '無法獲取數據庫狀態',
      details: error.message
    });
  }
});

// DELETE /api/seed - 清空所有數據（僅開發環境）
router.delete('/', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: '生產環境禁止清空數據'
      });
    }

    // 清空所有表格
    db.prepare('DELETE FROM vital_signs').run();
    db.prepare('DELETE FROM appointments').run();
    db.prepare('DELETE FROM patients').run();
    db.prepare('DELETE FROM users WHERE username != "admin"').run(); // 保留 admin

    res.json({
      success: true,
      message: '所有數據已清空'
    });
  } catch (error) {
    res.status(500).json({
      error: '清空數據失敗',
      details: error.message
    });
  }
});

module.exports = router;
