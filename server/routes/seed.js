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
      vital_signs: 0,
      body_composition: 0,
      goals: 0
    };

    const now = new Date().toISOString();

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
      },
      {
        id: generateId('user'),
        username: 'doctor2',
        password: hashedPassword,
        role: 'doctor',
        name: '李醫師',
        email: 'doctor2@example.com'
      }
    ];

    for (const user of testUsers) {
      userStmt.run(user.id, user.username, user.password, user.role, user.name, user.email, now, now);
      results.users++;
    }

    // 2. 插入患者資料 (20位)
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
      },
      {
        name: "周文華", gender: "male", birthDate: "1991-06-12", phone: "0911-234-567",
        email: "zhou.wenhua@email.com", address: "台北市中山區南京東路三段125號",
        tags: '["運動傷害", "復健"]',
        emergencyContact: "周太太", emergencyPhone: "0911-234-568"
      },
      {
        name: "鄭雅君", gender: "female", birthDate: "1993-04-25", phone: "0922-345-678",
        email: "zheng.yajun@email.com", address: "新北市新店區北新路二段88號",
        tags: '["營養諮詢", "健康檢查"]',
        emergencyContact: "鄭媽媽", emergencyPhone: "0922-345-679"
      },
      {
        name: "許建宏", gender: "male", birthDate: "1986-11-30", phone: "0933-456-789",
        email: "xu.jianhong@email.com", address: "台中市北區三民路三段156號",
        tags: '["高血壓", "定期追蹤"]',
        emergencyContact: "許太太", emergencyPhone: "0933-456-790"
      },
      {
        name: "謝佳玲", gender: "female", birthDate: "1989-09-08", phone: "0944-567-890",
        email: "xie.jialing@email.com", address: "高雄市三民區建國路二段99號",
        tags: '["減重計畫", "運動指導"]',
        emergencyContact: "謝先生", emergencyPhone: "0944-567-891"
      },
      {
        name: "楊子傑", gender: "male", birthDate: "1994-01-20", phone: "0955-678-901",
        email: "yang.zijie@email.com", address: "台南市中西區中山路一段66號",
        tags: '["健身", "體能訓練"]',
        emergencyContact: "楊爸爸", emergencyPhone: "0955-678-902"
      },
      {
        name: "賴美惠", gender: "female", birthDate: "1980-07-15", phone: "0966-789-012",
        email: "lai.meihui@email.com", address: "桃園市桃園區復興路一段50號",
        tags: '["糖尿病", "高血壓"]',
        emergencyContact: "賴先生", emergencyPhone: "0966-789-013"
      },
      {
        name: "馬俊翔", gender: "male", birthDate: "1996-03-05", phone: "0977-890-123",
        email: "ma.junxiang@email.com", address: "新竹市北區光華路二段77號",
        tags: '["運動員", "營養諮詢"]',
        emergencyContact: "馬媽媽", emergencyPhone: "0977-890-124"
      },
      {
        name: "洪雅雯", gender: "female", birthDate: "1992-10-18", phone: "0988-901-234",
        email: "hong.yawen@email.com", address: "台北市松山區南京東路五段88號",
        tags: '["孕婦照護", "營養諮詢"]',
        emergencyContact: "洪先生", emergencyPhone: "0988-901-235"
      },
      {
        name: "郭建成", gender: "male", birthDate: "1983-12-28", phone: "0910-123-456",
        email: "guo.jiancheng@email.com", address: "新北市永和區中正路一段123號",
        tags: '["慢性疾病", "定期追蹤"]',
        emergencyContact: "郭太太", emergencyPhone: "0910-123-457"
      },
      {
        name: "蔡欣怡", gender: "female", birthDate: "1997-05-22", phone: "0921-234-567",
        email: "cai.xinyi@email.com", address: "台中市南屯區文心路一段99號",
        tags: '["減重計畫", "健身"]',
        emergencyContact: "蔡媽媽", emergencyPhone: "0921-234-568"
      },
      {
        name: "何承翰", gender: "male", birthDate: "1990-08-14", phone: "0932-345-678",
        email: "he.chenghan@email.com", address: "高雄市鼓山區美術東路二段66號",
        tags: '["運動傷害", "復健治療"]',
        emergencyContact: "何太太", emergencyPhone: "0932-345-679"
      },
      {
        name: "葉思涵", gender: "female", birthDate: "1988-02-28", phone: "0943-456-789",
        email: "ye.sihan@email.com", address: "台南市安平區安平路一段88號",
        tags: '["營養諮詢", "健康管理"]',
        emergencyContact: "葉先生", emergencyPhone: "0943-456-790"
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

    // 3. 插入預約資料 (每位患者 3-8 筆)
    console.log('📅 正在插入預約資料...');
    const appointmentStmt = db.prepare(`
      INSERT INTO appointments (id, patientId, date, time, type, notes, status, reminderSent, isRecurring, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const appointmentTypes = ['初診', '複診', '定期檢查', '營養諮詢', '運動指導', '健康評估'];

    for (const patientId of patientIds) {
      const numAppointments = randomInRange(3, 8);

      for (let i = 0; i < numAppointments; i++) {
        const appointmentId = generateId('apt');
        const daysOffset = randomInRange(-30, 60); // 過去30天到未來60天
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        const appointmentDate = date.toISOString().split('T')[0];

        const hour = randomInRange(9, 17);
        const minute = randomInRange(0, 3) * 15; // 0, 15, 30, 45
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        const type = appointmentTypes[randomInRange(0, appointmentTypes.length)];
        const status = daysOffset < 0 ? 'completed' : 'scheduled';

        appointmentStmt.run(
          appointmentId,
          patientId,
          appointmentDate,
          time,
          type,
          `${type}相關事項`,
          status,
          0, // reminderSent
          0, // isRecurring
          now,
          now
        );
        results.appointments++;
      }
    }

    // 4. 插入生命徵象記錄 (每位患者 6-12 筆)
    console.log('❤️ 正在插入生命徵象記錄...');
    const vitalSignsStmt = db.prepare(`
      INSERT INTO vital_signs (id, patientId, date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const patientId of patientIds) {
      const numRecords = randomInRange(6, 12);

      for (let i = 0; i < numRecords; i++) {
        const recordId = generateId('vital');
        const daysAgo = Math.floor((numRecords - i) * (120 / numRecords));
        const date = randomDate(daysAgo);

        const systolic = randomInRange(110, 140);
        const diastolic = randomInRange(70, 90);
        const heartRate = randomInRange(60, 90);
        const temperature = randomInRange(36.2, 37.2, 1);
        const respiratoryRate = randomInRange(12, 20);
        const oxygenSaturation = randomInRange(95, 100);
        const bloodGlucose = randomInRange(80, 120);

        vitalSignsStmt.run(
          recordId,
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
          now
        );
        results.vital_signs++;
      }
    }

    // 5. 插入身體組成記錄 (每位患者 8-15 筆)
    console.log('🏋️ 正在插入身體組成記錄...');
    const bodyCompositionStmt = db.prepare(`
      INSERT INTO body_composition (id, patientId, date, weight, height, bmi, bodyFat, muscleMass, visceralFat, boneMass, bodyWater, bmr, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const patientId of patientIds) {
      const numRecords = randomInRange(8, 15);
      const height = randomInRange(155, 185);
      let baseWeight = randomInRange(50, 95);

      for (let i = 0; i < numRecords; i++) {
        const recordId = generateId('body');
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

        bodyCompositionStmt.run(
          recordId,
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
          now
        );
        results.body_composition++;
      }
    }

    // 6. 插入健康目標 (每位患者 1-3 個)
    console.log('🎯 正在插入健康目標...');
    const goalStmt = db.prepare(`
      INSERT INTO goals (id, patientId, category, title, description, currentValue, targetValue, unit, startDate, targetDate, status, progress, milestones, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const goalTypes = [
      { category: '體重管理', title: '減重目標', description: '達到理想體重', targetValue: 70, unit: 'kg' },
      { category: '運動健身', title: '每週運動', description: '增加運動頻率', targetValue: 3, unit: '次' },
      { category: '血壓控制', title: '血壓目標', description: '降低收縮壓', targetValue: 120, unit: 'mmHg' },
      { category: '血糖控制', title: '血糖控制', description: '維持空腹血糖正常', targetValue: 100, unit: 'mg/dL' },
      { category: '體脂控制', title: '體脂率', description: '降低體脂率', targetValue: 20, unit: '%' }
    ];

    for (const patientId of patientIds) {
      const numGoals = randomInRange(1, 3);

      for (let i = 0; i < numGoals; i++) {
        const goal = goalTypes[randomInRange(0, goalTypes.length)];
        const goalId = generateId('goal');

        const startDate = randomDate(60);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + randomInRange(30, 180));

        const currentValue = goal.targetValue * randomInRange(0.7, 1.3, 1);
        const progress = Math.min(100, Math.max(0, randomInRange(10, 80)));
        const status = progress === 100 ? 'completed' : 'active';

        goalStmt.run(
          goalId,
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
        results.goals++;
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
      vital_signs: db.prepare('SELECT COUNT(*) as count FROM vital_signs').get().count,
      body_composition: db.prepare('SELECT COUNT(*) as count FROM body_composition').get().count,
      goals: db.prepare('SELECT COUNT(*) as count FROM goals').get().count
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
    db.prepare('DELETE FROM goals').run();
    db.prepare('DELETE FROM body_composition').run();
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
