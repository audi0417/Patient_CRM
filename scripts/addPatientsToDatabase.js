#!/usr/bin/env node

/**
 * 新增患者到 SQLite 資料庫的腳本
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'patient_crm.db');
const db = new Database(dbPath);

// 產生唯一 ID
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 新增患者資料
const patients = [
  {
    name: "王小明", gender: "male", birthDate: "1985-03-15", phone: "0912-345-678",
    email: "wang.xiaoming@email.com", address: "台北市信義區信義路五段7號",
    emergencyContact: "王太太", emergencyPhone: "0912-345-679",
    tags: '["糖尿病", "高血壓"]'
  },
  {
    name: "李美玲", gender: "female", birthDate: "1990-07-22", phone: "0923-456-789",
    email: "li.meiling@email.com", address: "新北市板橋區文化路一段123號",
    emergencyContact: "李先生", emergencyPhone: "0923-456-780",
    tags: '["減重計畫", "健身"]'
  },
  {
    name: "陳建國", gender: "male", birthDate: "1978-11-08", phone: "0934-567-890",
    email: "chen.jianguo@email.com", address: "台中市西屯區台灣大道三段99號",
    emergencyContact: "陳太太", emergencyPhone: "0934-567-891",
    tags: '["高血壓", "心臟病史"]'
  },
  {
    name: "林雅婷", gender: "female", birthDate: "1995-02-14", phone: "0945-678-901",
    email: "lin.yating@email.com", address: "高雄市左營區博愛二路777號",
    emergencyContact: "林媽媽", emergencyPhone: "0945-678-902",
    tags: '["運動員", "營養諮詢"]'
  },
  {
    name: "張志豪", gender: "male", birthDate: "1988-09-30", phone: "0956-789-012",
    email: "zhang.zhihao@email.com", address: "台南市東區東門路二段88號",
    emergencyContact: "張太太", emergencyPhone: "0956-789-013",
    tags: '["減重計畫"]'
  },
  {
    name: "黃淑芬", gender: "female", birthDate: "1982-05-18", phone: "0967-890-123",
    email: "huang.shufen@email.com", address: "桃園市中壢區中央西路二段50號",
    emergencyContact: "黃先生", emergencyPhone: "0967-890-124",
    tags: '["糖尿病", "營養諮詢"]'
  },
  {
    name: "劉俊傑", gender: "male", birthDate: "1992-12-25", phone: "0978-901-234",
    email: "liu.junjie@email.com", address: "新竹市東區光復路一段321號",
    emergencyContact: "劉爸爸", emergencyPhone: "0978-901-235",
    tags: '["健身", "增肌計畫"]'
  },
  {
    name: "吳佩珊", gender: "female", birthDate: "1987-08-03", phone: "0989-012-345",
    email: "wu.peishan@email.com", address: "台北市大安區敦化南路二段66號",
    emergencyContact: "吳先生", emergencyPhone: "0989-012-346",
    tags: '["產後恢復", "營養諮詢"]'
  },
  {
    name: "陳思語", gender: "female", birthDate: "1993-04-11", phone: "0910-234-567",
    email: "chen.siyu@email.com", address: "台北市中山區長安東路一段50號",
    emergencyContact: "陳思語家屬", emergencyPhone: "0910-234-568",
    tags: '["運動員", "營養諮詢"]'
  },
  {
    name: "楊家豪", gender: "male", birthDate: "1980-06-20", phone: "0921-345-678",
    email: "yang.jiahao@email.com", address: "新北市新店區中興路一段288號",
    emergencyContact: "楊家豪家屬", emergencyPhone: "0921-345-679",
    tags: '["高血壓", "減重計畫"]'
  },
  {
    name: "洪美惠", gender: "female", birthDate: "1989-09-15", phone: "0932-456-789",
    email: "hong.meihui@email.com", address: "桃園市平鎮區中山路123號",
    emergencyContact: "洪美惠家屬", emergencyPhone: "0932-456-790",
    tags: '["糖尿病", "營養諮詢"]'
  },
  {
    name: "謝昊天", gender: "male", birthDate: "1996-01-28", phone: "0943-567-890",
    email: "xie.haotian@email.com", address: "台中市南屯區公益路880號",
    emergencyContact: "謝昊天家屬", emergencyPhone: "0943-567-891",
    tags: '["健身", "增肌計畫"]'
  },
  {
    name: "曾心怡", gender: "female", birthDate: "1984-10-05", phone: "0954-678-901",
    email: "zeng.xinyi@email.com", address: "台南市安平區怡平路99號",
    emergencyContact: "曾心怡家屬", emergencyPhone: "0954-678-902",
    tags: '["產後恢復", "健身"]'
  },
  {
    name: "馬建宏", gender: "male", birthDate: "1986-03-12", phone: "0965-789-012",
    email: "ma.jianhong@email.com", address: "高雄市苓雅區三多四路111號",
    emergencyContact: "馬建宏家屬", emergencyPhone: "0965-789-013",
    tags: '["心臟病史", "高血壓"]'
  },
  {
    name: "賴冠宇", gender: "male", birthDate: "1991-07-19", phone: "0976-890-123",
    email: "lai.guanyu@email.com", address: "新竹市竹北市中山路二段100號",
    emergencyContact: "賴冠宇家屬", emergencyPhone: "0976-890-124",
    tags: '["減重計畫", "營養諮詢"]'
  },
  {
    name: "饒筱樺", gender: "female", birthDate: "1994-11-22", phone: "0987-901-234",
    email: "rao.xiaohua@email.com", address: "台北市信義區松德路88號",
    emergencyContact: "饒筱樺家屬", emergencyPhone: "0987-901-235",
    tags: '["運動員", "增肌計畫"]'
  },
  {
    name: "董俊成", gender: "male", birthDate: "1979-02-08", phone: "0998-012-345",
    email: "dong.junchen@email.com", address: "新北市板橋區民生路二段77號",
    emergencyContact: "董俊成家屬", emergencyPhone: "0998-012-346",
    tags: '["糖尿病", "高血壓"]'
  },
  {
    name: "吳郁婕", gender: "female", birthDate: "1988-05-30", phone: "0901-123-456",
    email: "wu.yujie@email.com", address: "台中市西區民權路166號",
    emergencyContact: "吳郁婕家屬", emergencyPhone: "0901-123-457",
    tags: '["營養諮詢", "產後恢復"]'
  },
  {
    name: "江昆霖", gender: "male", birthDate: "1997-08-14", phone: "0912-234-567",
    email: "jiang.kunlin@email.com", address: "高雄市新興區中山一路100號",
    emergencyContact: "江昆霖家屬", emergencyPhone: "0912-234-568",
    tags: '["健身", "增肌計畫"]'
  },
  {
    name: "何巧紅", gender: "female", birthDate: "1985-12-03", phone: "0923-345-678",
    email: "he.qiaohong@email.com", address: "桃園市中壢區中央路100號",
    emergencyContact: "何巧紅家屬", emergencyPhone: "0923-345-679",
    tags: '["減重計畫", "高血壓"]'
  }
];

// 檢查是否已有患者
const countStmt = db.prepare('SELECT COUNT(*) as count FROM patients');
const result = countStmt.get();
const currentCount = result.count;

if (currentCount > 0) {
  console.log(`[Database] Found ${currentCount} existing patients`);
  console.log('[Database] Clearing existing data...');
  db.exec('DELETE FROM patients');
  db.exec('DELETE FROM appointments');
  db.exec('DELETE FROM body_composition');
  db.exec('DELETE FROM vital_signs');
  db.exec('DELETE FROM goals');
  db.exec('DELETE FROM consultations');
  console.log('[Database] Data cleared');
}

// Prepare insert statement
const insertPatient = db.prepare(`
  INSERT INTO patients (
    id, name, gender, birthDate, phone, email, address,
    emergencyContact, emergencyPhone, notes, tags, groups,
    healthProfile, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();
let insertedCount = 0;

try {
  // Begin transaction
  const insertMany = db.transaction(() => {
    patients.forEach(patient => {
      const id = generateId('patient');
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
      insertedCount++;
    });
  });

  insertMany();
  
  console.log(`[Database] Successfully added ${insertedCount} patients`);
  
  // Verify
  const verifyResult = db.prepare('SELECT COUNT(*) as count FROM patients').get();
  console.log(`[Database] Database now has ${verifyResult.count} patients`);
  
} catch (error) {
  console.error('[Database] Error adding patients:', error.message);
  process.exit(1);
} finally {
  db.close();
}
