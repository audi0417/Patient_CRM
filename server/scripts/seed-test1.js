#!/usr/bin/env node
/**
 * seed-test1.js
 * 為 test1 (陳楷融) 組織產生大量模擬數據
 * 用法: node server/scripts/seed-test1.js
 */

const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../../data/patient_crm.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const ORG_ID = 'org_1763470235296_6zte5jsxi';
const USER_ID = 'user_1763470235299_r8s8et2sj';

// ── helpers ──────────────────────────────────────────────────────
let idCounter = 0;
function uid(prefix = 'id') {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function randomDate(daysAgo, daysRecent = 0) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * (daysAgo - daysRecent) + daysRecent));
  return d;
}

function dateStr(d) { return d.toISOString().split('T')[0]; }
function isoStr(d) { return d.toISOString(); }

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randF(min, max, dec = 1) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ── 台灣名字資料庫 ──────────────────────────────────────────────
const LAST_NAMES = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾', '邱', '廖', '賴', '周', '徐', '蘇', '葉', '莊', '呂', '江', '何', '蕭', '羅', '高'];
const FIRST_NAMES_F = ['美玲', '雅婷', '怡君', '淑芬', '佳蓉', '詩涵', '宜蓁', '欣妤', '芷涵', '品萱', '思妤', '羽彤', '芸熙', '語彤', '子晴', '宥蓁', '心妍', '于萱', '佳穎', '靜宜', '雅琪', '婷婷', '素華', '麗華', '秀英', '淑華', '雅惠', '慧玲', '筱涵', '佩珊'];
const FIRST_NAMES_M = ['志明', '俊傑', '建宏', '家豪', '冠宇', '宗翰', '承恩', '柏翰', '彥廷', '宇翔', '品睿', '宥辰', '柏宇', '子軒', '宇恩', '浩然', '博文', '振宇', '明哲', '國豪', '威廷', '育承', '政宏', '信宏', '仁傑', '銘軒', '嘉偉', '勝文', '瑋翔', '哲瑋'];

const DISTRICTS = ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區', '板橋區', '新莊區', '三重區', '永和區', '中和區', '蘆洲區'];
const STREETS = ['忠孝東路', '仁愛路', '信義路', '和平東路', '民生東路', '中山北路', '復興南路', '敦化南路', '光復南路', '建國南路', '新生南路', '羅斯福路', '辛亥路', '基隆路', '市民大道'];
const BLOOD_TYPES = ['A', 'B', 'O', 'AB'];

const SERVICE_TYPES_DATA = [
  { name: '皮膚科', color: '#10b981' },
  { name: '醫學美容', color: '#8b5cf6' },
  { name: '雷射治療', color: '#ef4444' },
  { name: '微整形', color: '#f59e0b' },
  { name: '一般看診', color: '#3b82f6' },
  { name: '健檢', color: '#06b6d4' },
];

const SERVICE_ITEMS_DATA = [
  { code: 'SVC001', name: '玻尿酸注射', category: '微整形', unit: '次' },
  { code: 'SVC002', name: '肉毒桿菌', category: '微整形', unit: '次' },
  { code: 'SVC003', name: '皮秒雷射', category: '雷射治療', unit: '次' },
  { code: 'SVC004', name: '飛梭雷射', category: '雷射治療', unit: '次' },
  { code: 'SVC005', name: '淨膚雷射', category: '雷射治療', unit: '次' },
  { code: 'SVC006', name: '音波拉提', category: '醫學美容', unit: '次' },
  { code: 'SVC007', name: '電波拉皮', category: '醫學美容', unit: '次' },
  { code: 'SVC008', name: '保濕導入', category: '醫學美容', unit: '次' },
  { code: 'SVC009', name: '果酸換膚', category: '皮膚科', unit: '次' },
  { code: 'SVC010', name: '痘疤治療', category: '皮膚科', unit: '次' },
  { code: 'SVC011', name: '美白點滴', category: '醫學美容', unit: '次' },
  { code: 'SVC012', name: '一般門診', category: '一般看診', unit: '次' },
  { code: 'SVC013', name: '抽血檢驗', category: '健檢', unit: '次' },
  { code: 'SVC014', name: '全身健檢', category: '健檢', unit: '次' },
];

const APPOINTMENT_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
const APPOINTMENT_SOURCES = ['lineBooking', 'phoneCall', 'walkIn'];

const LINE_DISPLAY_NAMES_F = ['小美', '小慧', 'Amy', '阿珍', '小雅', '琪琪', 'Jenny', '小敏', '小涵', '小芸'];
const LINE_DISPLAY_NAMES_M = ['阿翔', '大明', 'Tom', '小宇', '阿傑', '小凱', 'David', '阿志', '阿宏', '小翰'];

const now = new Date();
const nowISO = isoStr(now);

// ── 開始生成 ────────────────────────────────────────────────────
console.log('🏥 開始為 test1 組織產生模擬數據...\n');

// ── 1. Service Types ──
console.log('📋 建立服務類型...');
const insertServiceType = db.prepare(`
  INSERT OR IGNORE INTO service_types (id, name, description, color, isActive, displayOrder, organizationId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
`);
const serviceTypeIds = {};
const stTxn = db.transaction(() => {
  SERVICE_TYPES_DATA.forEach((st, i) => {
    const id = uid('stype');
    serviceTypeIds[st.name] = id;
    insertServiceType.run(id, st.name, st.name + '相關服務', st.color, i, ORG_ID, nowISO, nowISO);
  });
});
stTxn();
console.log(`  ✓ ${SERVICE_TYPES_DATA.length} 項服務類型`);

// ── 2. Service Items ──
console.log('📦 建立服務項目...');
const insertServiceItem = db.prepare(`
  INSERT OR IGNORE INTO service_items (organizationId, code, name, category, unit, description, isActive, displayOrder, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
`);
const siTxn = db.transaction(() => {
  SERVICE_ITEMS_DATA.forEach((si, i) => {
    insertServiceItem.run(ORG_ID, si.code, si.name, si.category, si.unit, si.name, i, nowISO, nowISO);
  });
});
siTxn();
console.log(`  ✓ ${SERVICE_ITEMS_DATA.length} 項服務項目`);

// 取回 service_items id
const serviceItems = db.prepare('SELECT id, code, name, category FROM service_items WHERE organizationId = ?').all(ORG_ID);

// ── 3. Tags ──
console.log('🏷️  建立標籤...');
const TAG_DATA = [
  { name: 'VIP', color: '#f59e0b' },
  { name: '敏感肌', color: '#ef4444' },
  { name: '定期回診', color: '#10b981' },
  { name: '雷射客戶', color: '#8b5cf6' },
  { name: '微整形客戶', color: '#ec4899' },
  { name: '新客', color: '#3b82f6' },
  { name: '術後追蹤', color: '#06b6d4' },
  { name: '保養型', color: '#84cc16' },
];
const insertTag = db.prepare('INSERT OR IGNORE INTO tags (id, name, color, organizationId, createdAt) VALUES (?, ?, ?, ?, ?)');
const tagIds = [];
const tagTxn = db.transaction(() => {
  TAG_DATA.forEach(t => {
    const id = uid('tag');
    tagIds.push(id);
    insertTag.run(id, t.name, t.color, ORG_ID, nowISO);
  });
});
tagTxn();
console.log(`  ✓ ${TAG_DATA.length} 個標籤`);

// ── 4. Patients (150 位) ──
console.log('👤 建立病患...');
const PATIENT_COUNT = 150;
const insertPatient = db.prepare(`
  INSERT INTO patients (id, name, phone, email, birthDate, gender, bloodType, address, medicalHistory, allergies, notes, tags, organizationId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const patients = [];
const allergiesList = ['無', '無', '無', '無', '盤尼西林', '阿斯匹靈', '磺胺藥物', '海鮮', '花生', '乳膠'];
const medHistories = ['無特殊', '無特殊', '無特殊', '高血壓', '糖尿病', '氣喘', '甲狀腺功能低下', '心律不整', '過敏性鼻炎'];

const patTxn = db.transaction(() => {
  for (let i = 0; i < PATIENT_COUNT; i++) {
    const gender = Math.random() > 0.55 ? 'female' : 'male';
    const lastName = pick(LAST_NAMES);
    const firstName = gender === 'female' ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
    const name = lastName + firstName;
    const phone = `09${rand(10, 99)}${rand(100, 999)}${rand(100, 999)}`;
    const email = `${firstName.toLowerCase()}${rand(1, 999)}@example.com`;
    const age = rand(18, 75);
    const birthYear = now.getFullYear() - age;
    const birthDate = `${birthYear}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`;
    const district = pick(DISTRICTS);
    const street = pick(STREETS);
    const address = `台北市${district}${street}${rand(1, 300)}號${rand(2, 15)}樓`;
    const bloodType = pick(BLOOD_TYPES);
    const patientTags = JSON.stringify(shuffle(tagIds).slice(0, rand(0, 3)));
    const createdDate = randomDate(365, 0);

    const id = uid('pat');
    insertPatient.run(
      id, name, phone, email, birthDate, gender, bloodType, address,
      pick(medHistories), pick(allergiesList), '', patientTags,
      ORG_ID, isoStr(createdDate), isoStr(createdDate)
    );
    patients.push({ id, name, gender, createdAt: createdDate });
  }
});
patTxn();
console.log(`  ✓ ${PATIENT_COUNT} 位病患`);

// ── 5. Appointments (平均每位病患 4-8 筆，共 ~900 筆) ──
console.log('📅 建立預約...');
const insertAppt = db.prepare(`
  INSERT INTO appointments (id, patientId, date, time, type, notes, status, reminderSent, organizationId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let apptCount = 0;
const apptTxn = db.transaction(() => {
  for (const p of patients) {
    const count = rand(2, 10);
    for (let j = 0; j < count; j++) {
      const daysAgo = rand(0, 180);
      const apptDate = new Date();
      apptDate.setDate(apptDate.getDate() - daysAgo);
      const date = dateStr(apptDate);
      const time = pick(APPOINTMENT_TIMES);
      const svc = pick(SERVICE_ITEMS_DATA);
      const status = daysAgo === 0 ? 'scheduled' : daysAgo < 3 ? pick(['scheduled', 'completed']) :
        Math.random() < 0.75 ? 'completed' : Math.random() < 0.7 ? 'cancelled' : 'scheduled';

      insertAppt.run(
        uid('appt'), p.id, date, time, svc.name, `${pick(APPOINTMENT_SOURCES)}`, status,
        status === 'completed' ? 1 : 0, ORG_ID, isoStr(apptDate), isoStr(apptDate)
      );
      apptCount++;
    }
  }
});
apptTxn();
console.log(`  ✓ ${apptCount} 筆預約`);

// ── 6. Treatment Packages (約 60 筆) ──
console.log('💊 建立療程套裝...');
const insertPkg = db.prepare(`
  INSERT INTO treatment_packages (organizationId, patientId, packageName, packageNumber, items, startDate, expiryDate, status, notes, createdBy, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const PKG_TEMPLATES = [
  { name: '皮秒雷射療程 (6次)', items: [{ code: 'SVC003', qty: 6 }] },
  { name: '玻尿酸全臉療程 (3次)', items: [{ code: 'SVC001', qty: 3 }] },
  { name: '淨膚雷射美白組 (10次)', items: [{ code: 'SVC005', qty: 10 }] },
  { name: '音波拉提緊緻療程 (2次)', items: [{ code: 'SVC006', qty: 2 }] },
  { name: '全方位抗老套組', items: [{ code: 'SVC006', qty: 2 }, { code: 'SVC001', qty: 2 }, { code: 'SVC008', qty: 4 }] },
  { name: '痘疤修復療程 (8次)', items: [{ code: 'SVC010', qty: 8 }] },
  { name: '保濕水光療程 (5次)', items: [{ code: 'SVC008', qty: 5 }] },
  { name: '電波拉皮體驗組 (1次)', items: [{ code: 'SVC007', qty: 1 }] },
];

let pkgCount = 0;
const pkgTxn = db.transaction(() => {
  const selectedPatients = shuffle(patients).slice(0, 60);
  selectedPatients.forEach((p, i) => {
    const tpl = pick(PKG_TEMPLATES);
    const startDate = randomDate(180, 0);
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + rand(3, 12));
    const isExpired = expiryDate < now;
    const status = isExpired ? (Math.random() < 0.5 ? 'expired' : 'completed') :
      Math.random() < 0.7 ? 'active' : 'completed';

    const items = tpl.items.map(it => {
      const si = serviceItems.find(s => s.code === it.code);
      return { serviceItemId: si?.id, name: si?.name || it.code, totalQuantity: it.qty, usedQuantity: rand(0, it.qty) };
    });

    insertPkg.run(
      ORG_ID, p.id, tpl.name, `PKG-${String(i + 1).padStart(4, '0')}`,
      JSON.stringify(items), dateStr(startDate), dateStr(expiryDate), status,
      '', USER_ID, isoStr(startDate), nowISO
    );
    pkgCount++;
  });
});
pkgTxn();
console.log(`  ✓ ${pkgCount} 筆療程套裝`);

// ── 7. Package Usage Logs ──
console.log('📝 建立療程使用記錄...');
const pkgs = db.prepare('SELECT id, items, startDate, status FROM treatment_packages WHERE organizationId = ? AND status IN (?, ?)').all(ORG_ID, 'active', 'completed');
const insertUsage = db.prepare(`
  INSERT INTO package_usage_logs (organizationId, packageId, serviceItemId, usageDate, quantity, performedBy, notes, createdBy, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let usageCount = 0;
const usageTxn = db.transaction(() => {
  for (const pkg of pkgs) {
    const items = JSON.parse(pkg.items);
    for (const item of items) {
      const used = item.usedQuantity || 0;
      for (let u = 0; u < used; u++) {
        const useDate = randomDate(120, 0);
        insertUsage.run(ORG_ID, pkg.id, item.serviceItemId, dateStr(useDate), 1, USER_ID, '', USER_ID, isoStr(useDate));
        usageCount++;
      }
    }
  }
});
usageTxn();
console.log(`  ✓ ${usageCount} 筆使用記錄`);

// ── 8. Consultations (約 200 筆) ──
console.log('📋 建立門診記錄...');
const insertConsult = db.prepare(`
  INSERT INTO consultations (id, patientId, date, type, chiefComplaint, assessment, plan, notes, organizationId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const COMPLAINTS = ['皮膚暗沈', '痘疤困擾', '臉部鬆弛', '色斑', '毛孔粗大', '皺紋', '過敏紅腫', '黑眼圈', '乾燥脫皮', '出油嚴重'];
const ASSESSMENTS = ['膚況良好，持續保養', '建議進行雷射治療', '需加強保濕', '術後恢復正常', '過敏已改善', '膚質有明顯進步'];
const PLANS = ['安排下次雷射療程', '開立保濕處方', '定期追蹤', '術後回診一週', '調整保養品建議', '安排皮膚檢測'];

let consultCount = 0;
const consultTxn = db.transaction(() => {
  const selected = shuffle(patients).slice(0, 100);
  for (const p of selected) {
    const count = rand(1, 4);
    for (let j = 0; j < count; j++) {
      const d = randomDate(180, 0);
      insertConsult.run(
        uid('consult'), p.id, dateStr(d), pick(SERVICE_TYPES_DATA).name,
        pick(COMPLAINTS), pick(ASSESSMENTS), pick(PLANS), '',
        ORG_ID, isoStr(d), isoStr(d)
      );
      consultCount++;
    }
  }
});
consultTxn();
console.log(`  ✓ ${consultCount} 筆門診記錄`);

// ── 9. Body Composition (約 400 筆) ──
console.log('⚖️  建立體組成記錄...');
const insertBC = db.prepare(`
  INSERT INTO body_composition (id, patientId, date, weight, height, bmi, bodyFat, muscleMass, visceralFat, boneMass, bodyWater, bmr, notes, organizationId, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let bcCount = 0;
const bcTxn = db.transaction(() => {
  const selected = shuffle(patients).slice(0, 80);
  for (const p of selected) {
    const height = p.gender === 'female' ? randF(150, 172, 1) : randF(163, 185, 1);
    let baseWeight = p.gender === 'female' ? randF(45, 72, 1) : randF(58, 90, 1);
    const count = rand(3, 8);
    for (let j = 0; j < count; j++) {
      const d = randomDate(180 - j * 25, Math.max(0, 180 - (j + 1) * 25));
      const weight = parseFloat((baseWeight + randF(-2, 2, 1)).toFixed(1));
      baseWeight = weight;
      const bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
      const bodyFat = p.gender === 'female' ? randF(18, 35, 1) : randF(12, 28, 1);
      const muscleMass = p.gender === 'female' ? randF(35, 50, 1) : randF(45, 70, 1);
      const visceralFat = randF(1, 15, 0);
      const boneMass = p.gender === 'female' ? randF(2.0, 3.0, 1) : randF(2.5, 3.8, 1);
      const bodyWater = randF(45, 65, 1);
      const bmr = p.gender === 'female' ? rand(1100, 1500) : rand(1400, 1900);

      insertBC.run(uid('bc'), p.id, dateStr(d), weight, height, bmi, bodyFat, muscleMass, visceralFat, boneMass, bodyWater, bmr, '', ORG_ID, isoStr(d));
      bcCount++;
    }
  }
});
bcTxn();
console.log(`  ✓ ${bcCount} 筆體組成記錄`);

// ── 10. 營養記錄 (repurpose vital_signs table) ──
// 欄位對應：bloodPressureSystolic=卡路里(kcal), bloodPressureDiastolic=蛋白質(g),
//           heartRate=碳水化合物(g), temperature=脂肪(g), respiratoryRate=纖維(g),
//           oxygenSaturation=水分(ml), bloodGlucose=血糖(mg/dL)
console.log('🥗 建立營養記錄...');
const insertVS = db.prepare(`
  INSERT INTO vital_signs (id, patientId, date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, respiratoryRate, temperature, oxygenSaturation, bloodGlucose, notes, organizationId, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let vsCount = 0;
const vsTxn = db.transaction(() => {
  const selected = shuffle(patients).slice(0, 90);
  for (const p of selected) {
    const count = rand(3, 8);
    for (let j = 0; j < count; j++) {
      const d = randomDate(180, 0);
      const calories = rand(1200, 2500);     // 卡路里 kcal
      const protein = rand(40, 120);         // 蛋白質 g
      const carbs = rand(100, 350);          // 碳水化合物 g
      const fat = rand(30, 100);             // 脂肪 g
      const fiber = rand(10, 40);            // 纖維 g
      const water = rand(800, 3000);         // 水分 ml
      const glucose = rand(70, 130);         // 血糖 mg/dL

      insertVS.run(
        uid('vs'), p.id, dateStr(d),
        calories, protein, carbs, fiber,
        fat, water, glucose,
        '', ORG_ID, isoStr(d)
      );
      vsCount++;
    }
  }
});
vsTxn();
console.log(`  ✓ ${vsCount} 筆營養記錄`);

// ── 11. Goals (約 80 筆) ──
console.log('🎯 建立減重/營養目標...');
const insertGoal = db.prepare(`
  INSERT INTO goals (id, patientId, category, title, description, currentValue, targetValue, unit, startDate, targetDate, status, progress, organizationId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const GOAL_TEMPLATES = [
  { cat: 'weight', title: '減重目標', desc: '搭配營養計畫減重至目標體重', unit: 'kg', cur: [65, 85], target: [55, 72] },
  { cat: 'bodyFat', title: '體脂率下降', desc: '透過飲食控制與運動降低體脂', unit: '%', cur: [25, 35], target: [18, 25] },
  { cat: 'muscleMass', title: '增肌目標', desc: '增加肌肉量提升基礎代謝', unit: 'kg', cur: [35, 50], target: [42, 60] },
  { cat: 'health', title: '每日卡路里控制', desc: '控制每日熱量攝取在目標範圍', unit: 'kcal', cur: [2000, 2500], target: [1500, 1800] },
  { cat: 'exercise', title: '每週運動', desc: '每週達成運動次數目標', unit: '次/週', cur: [1, 3], target: [3, 5] },
];

let goalCount = 0;
const goalTxn = db.transaction(() => {
  const selected = shuffle(patients).slice(0, 50);
  for (const p of selected) {
    const count = rand(1, 3);
    const goals = shuffle(GOAL_TEMPLATES).slice(0, count);
    for (const g of goals) {
      const startD = randomDate(120, 30);
      const targetD = new Date(startD);
      targetD.setMonth(targetD.getMonth() + rand(2, 6));
      const progress = rand(10, 95);
      const status = progress >= 90 ? 'completed' : (targetD < now && progress < 50 ? 'overdue' : 'active');

      insertGoal.run(
        uid('goal'), p.id, g.cat, g.title, g.desc,
        randF(g.cur[0], g.cur[1], 1), randF(g.target[0], g.target[1], 1), g.unit,
        dateStr(startD), dateStr(targetD), status, progress,
        ORG_ID, isoStr(startD), nowISO
      );
      goalCount++;
    }
  }
});
goalTxn();
console.log(`  ✓ ${goalCount} 筆健康目標`);

// ── 12. LINE Users & Conversations & Messages ──
console.log('💬 建立 LINE 使用者、對話與訊息...');
const insertLineUser = db.prepare(`
  INSERT INTO line_users (id, lineUserId, organizationId, displayName, pictureUrl, patientId, isActive, followedAt, lastInteractionAt, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
`);
const insertConv = db.prepare(`
  INSERT INTO conversations (id, lineUserId, patientId, organizationId, status, priority, lastMessageAt, lastMessagePreview, unreadCount, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertMsg = db.prepare(`
  INSERT INTO line_messages (id, conversationId, organizationId, messageType, messageContent, senderId, recipientId, senderType, recipientType, status, sentAt, isReply, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const MSG_PATIENT = [
  '請問今天還有空的時段嗎？', '我想預約下週二下午', '想請問雷射療程費用', '上次的保養品用完了', '請問術後多久可以洗臉？',
  '可以幫我改時間嗎？', '我今天可能會遲到10分鐘', '想諮詢玻尿酸療程', '謝謝醫師的建議', '下次回診是什麼時候？',
  '最近皮膚有點過敏', '請問今天門診到幾點？', '好的，我知道了', '收到，謝謝', '想約術後回診',
  '請問有在做音波拉提嗎？', '我想改約其他日期', '療程還剩幾次？', '術後恢復還不錯', '可以推薦保養品嗎？',
];
const MSG_ADMIN = [
  '您好，已為您安排預約', '好的，已為您改好時間了', '術後 24 小時內請避免碰水', '建議您下週回診追蹤',
  '目前還有下午 3:00 的時段', '您的療程還剩 3 次', '已為您安排好回診時間', '請記得做好防曬喔',
  '好的，期待您的到來', '費用資訊已私訊給您', '建議保持肌膚保濕', '下次療程建議間隔兩週',
];

let lineUserCount = 0, convCount = 0, msgCount = 0;
const lineTxn = db.transaction(() => {
  // 70% of patients have LINE
  const linePatients = shuffle(patients).slice(0, Math.floor(PATIENT_COUNT * 0.7));

  for (const p of linePatients) {
    const lineUserId = `U${crypto.randomBytes(16).toString('hex')}`;
    const displayNames = p.gender === 'female' ? LINE_DISPLAY_NAMES_F : LINE_DISPLAY_NAMES_M;
    const displayName = pick(displayNames) + rand(1, 99);
    const followedAt = randomDate(300, 10);
    const luId = uid('lu');

    insertLineUser.run(luId, lineUserId, ORG_ID, displayName, '', p.id, isoStr(followedAt), nowISO, isoStr(followedAt), nowISO);
    lineUserCount++;

    // Conversation (FK references line_users.id, not lineUserId)
    const convId = uid('conv');
    const msgCountForConv = rand(3, 15);
    const isActive = Math.random() < 0.6;
    const unread = isActive && Math.random() < 0.3 ? rand(1, 5) : 0;
    const lastMsg = randomDate(isActive ? 7 : 60, 0);
    const preview = pick(MSG_PATIENT);

    insertConv.run(
      convId, luId, p.id, ORG_ID,
      isActive ? 'ACTIVE' : 'ARCHIVED',
      pick(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH']),
      isoStr(lastMsg), preview, unread,
      isoStr(followedAt), isoStr(lastMsg)
    );
    convCount++;

    // Messages
    for (let m = 0; m < msgCountForConv; m++) {
      const isFromPatient = Math.random() < 0.55;
      const msgDate = randomDate(60, 0);
      const content = isFromPatient ? pick(MSG_PATIENT) : pick(MSG_ADMIN);

      insertMsg.run(
        uid('msg'), convId, ORG_ID, 'TEXT', content,
        isFromPatient ? lineUserId : USER_ID,
        isFromPatient ? USER_ID : lineUserId,
        isFromPatient ? 'PATIENT' : 'ADMIN',
        isFromPatient ? 'ADMIN' : 'PATIENT',
        pick(['SENT', 'DELIVERED', 'READ', 'READ', 'READ']),
        isoStr(msgDate), isFromPatient ? 0 : 1, isoStr(msgDate)
      );
      msgCount++;
    }
  }
});
lineTxn();
console.log(`  ✓ ${lineUserCount} 位 LINE 使用者`);
console.log(`  ✓ ${convCount} 則對話`);
console.log(`  ✓ ${msgCount} 則訊息`);

// ── 13. 開啟模組 ──
console.log('⚙️  啟用所有模組...');
const insertModule = db.prepare(`
  INSERT OR REPLACE INTO module_settings (id, organizationId, moduleName, isEnabled, settings, createdAt, updatedAt)
  VALUES (?, ?, ?, 1, '{}', ?, ?)
`);
const modules = ['healthManagement', 'appointments', 'treatmentPackages', 'lineMessaging', 'clinicDashboard'];
const modTxn = db.transaction(() => {
  modules.forEach(m => {
    insertModule.run(uid('mod'), ORG_ID, m, nowISO, nowISO);
  });
});
modTxn();

// 同時更新 organizations.settings
const org = db.prepare('SELECT settings FROM organizations WHERE id = ?').get(ORG_ID);
const settings = org?.settings ? JSON.parse(org.settings) : {};
settings.modules = {};
modules.forEach(m => {
  settings.modules[m] = { enabled: true, name: m };
});
db.prepare('UPDATE organizations SET settings = ?, updatedAt = ? WHERE id = ?').run(JSON.stringify(settings), nowISO, ORG_ID);
console.log(`  ✓ ${modules.length} 個模組已啟用`);

// ── 完成 ──
db.close();

console.log('\n✅ 模擬數據建立完成！');
console.log('  總計：');
console.log(`    病患: ${PATIENT_COUNT}`);
console.log(`    預約: ${apptCount}`);
console.log(`    療程: ${pkgCount}`);
console.log(`    使用記錄: ${usageCount}`);
console.log(`    門診記錄: ${consultCount}`);
console.log(`    體組成: ${bcCount}`);
console.log(`    生命徵象: ${vsCount}`);
console.log(`    健康目標: ${goalCount}`);
console.log(`    LINE 使用者: ${lineUserCount}`);
console.log(`    對話: ${convCount}`);
console.log(`    訊息: ${msgCount}`);
