const fs = require('fs');
const path = require('path');

const patientsFile = path.join(__dirname, '../data/patients.json');

// 新增患者資料
const newPatients = [
  {
    name: "陳思語",
    gender: "female",
    birthDate: "1993-04-11",
    phone: "0910-234-567",
    email: "chen.siyu@email.com",
    address: "台北市中山區長安東路一段50號",
    emergencyContact: "陳思語家屬",
    emergencyPhone: "0910-234-568",
    bloodType: "B",
    allergies: ["黃色染料"],
    tags: ["運動員", "營養諮詢"],
    groupIds: ["group_001"]
  },
  {
    name: "楊家豪",
    gender: "male",
    birthDate: "1980-06-20",
    phone: "0921-345-678",
    email: "yang.jiahao@email.com",
    address: "新北市新店區中興路一段288號",
    emergencyContact: "楊家豪家屬",
    emergencyPhone: "0921-345-679",
    bloodType: "O",
    allergies: ["青黴素"],
    tags: ["高血壓", "減重計畫"],
    groupIds: ["group_002", "group_003"]
  },
  {
    name: "洪美惠",
    gender: "female",
    birthDate: "1989-09-15",
    phone: "0932-456-789",
    email: "hong.meihui@email.com",
    address: "桃園市平鎮區中山路123號",
    emergencyContact: "洪美惠家屬",
    emergencyPhone: "0932-456-790",
    bloodType: "AB",
    allergies: [],
    tags: ["糖尿病", "營養諮詢"],
    groupIds: ["group_004"]
  },
  {
    name: "謝昊天",
    gender: "male",
    birthDate: "1996-01-28",
    phone: "0943-567-890",
    email: "xie.haotian@email.com",
    address: "台中市南屯區公益路880號",
    emergencyContact: "謝昊天家屬",
    emergencyPhone: "0943-567-891",
    bloodType: "A",
    allergies: ["海鮮", "堅果"],
    tags: ["健身", "增肌計畫"],
    groupIds: ["group_001"]
  },
  {
    name: "曾心怡",
    gender: "female",
    birthDate: "1984-10-05",
    phone: "0954-678-901",
    email: "zeng.xinyi@email.com",
    address: "台南市安平區怡平路99號",
    emergencyContact: "曾心怡家屬",
    emergencyPhone: "0954-678-902",
    bloodType: "B",
    allergies: ["磺胺類藥物"],
    tags: ["產後恢復", "健身"],
    groupIds: ["group_002"]
  },
  {
    name: "馬建宏",
    gender: "male",
    birthDate: "1986-03-12",
    phone: "0965-789-012",
    email: "ma.jianhong@email.com",
    address: "高雄市苓雅區三多四路111號",
    emergencyContact: "馬建宏家屬",
    emergencyPhone: "0965-789-013",
    bloodType: "O",
    allergies: ["阿斯匹靈"],
    tags: ["心臟病史", "高血壓"],
    groupIds: ["group_003"]
  },
  {
    name: "賴冠宇",
    gender: "male",
    birthDate: "1991-07-19",
    phone: "0976-890-123",
    email: "lai.guanyu@email.com",
    address: "新竹市竹北市中山路二段100號",
    emergencyContact: "賴冠宇家屬",
    emergencyPhone: "0976-890-124",
    bloodType: "A",
    allergies: [],
    tags: ["減重計畫", "營養諮詢"],
    groupIds: ["group_004"]
  },
  {
    name: "饒筱樺",
    gender: "female",
    birthDate: "1994-11-22",
    phone: "0987-901-234",
    email: "rao.xiaohua@email.com",
    address: "台北市信義區松德路88號",
    emergencyContact: "饒筱樺家屬",
    emergencyPhone: "0987-901-235",
    bloodType: "B",
    allergies: ["乳製品", "雞蛋"],
    tags: ["運動員", "增肌計畫"],
    groupIds: ["group_001"]
  },
  {
    name: "董俊成",
    gender: "male",
    birthDate: "1979-02-08",
    phone: "0998-012-345",
    email: "dong.junchen@email.com",
    address: "新北市板橋區民生路二段77號",
    emergencyContact: "董俊成家屬",
    emergencyPhone: "0998-012-346",
    bloodType: "O",
    allergies: ["花生"],
    tags: ["糖尿病", "高血壓"],
    groupIds: ["group_002"]
  },
  {
    name: "吳郁婕",
    gender: "female",
    birthDate: "1988-05-30",
    phone: "0901-123-456",
    email: "wu.yujie@email.com",
    address: "台中市西區民權路166號",
    emergencyContact: "吳郁婕家屬",
    emergencyPhone: "0901-123-457",
    bloodType: "AB",
    allergies: [],
    tags: ["營養諮詢", "產後恢復"],
    groupIds: ["group_003", "group_004"]
  },
  {
    name: "江昆霖",
    gender: "male",
    birthDate: "1997-08-14",
    phone: "0912-234-567",
    email: "jiang.kunlin@email.com",
    address: "高雄市新興區中山一路100號",
    emergencyContact: "江昆霖家屬",
    emergencyPhone: "0912-234-568",
    bloodType: "A",
    allergies: ["磺胺類藥物"],
    tags: ["健身", "增肌計畫"],
    groupIds: ["group_001"]
  },
  {
    name: "何巧紅",
    gender: "female",
    birthDate: "1985-12-03",
    phone: "0923-345-678",
    email: "he.qiaohong@email.com",
    address: "桃園市中壢區中央路100號",
    emergencyContact: "何巧紅家屬",
    emergencyPhone: "0923-345-679",
    bloodType: "B",
    allergies: ["青黴素", "海鮮"],
    tags: ["減重計畫", "高血壓"],
    groupIds: ["group_002"]
  }
];

// 讀取現有患者
let patients = [];
if (fs.existsSync(patientsFile)) {
  const data = fs.readFileSync(patientsFile, 'utf-8');
  patients = JSON.parse(data);
}

// 新增患者（附加新的ID）
const now = new Date().toISOString();
const addedPatients = newPatients.map((patient, index) => ({
  id: `patient_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
  ...patient,
  createdAt: now,
  updatedAt: now
}));

// 合併患者資料
const allPatients = [...patients, ...addedPatients];

// Write file
fs.writeFileSync(patientsFile, JSON.stringify(allPatients, null, 2), 'utf-8');

console.log(`[Patients] Successfully added ${addedPatients.length} patients`);
console.log(`[Patients] Database now has ${allPatients.length} patients`);
console.log(`[Patients] File updated: ${patientsFile}`);
