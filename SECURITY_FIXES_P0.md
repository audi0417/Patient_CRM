# P0 安全修復清單

## ⚠️ 這些問題必須在部署到生產環境前修復

### 1. 修復密碼加密（Critical）

**當前問題**：
```javascript
// ❌ 不安全
const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
```

**修復方案**：
```javascript
// ✅ 安全
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash(password, 10);

// 驗證
const isValid = await bcrypt.compare(password, user.password);
```

**影響文件**：
- `server/routes/auth.js`
- `server/routes/users.js`
- `server/routes/organizations.js`

**遷移步驟**：
1. 安裝 bcrypt: `npm install bcryptjs`
2. 更新所有密碼處理代碼
3. 創建密碼遷移腳本
4. 強制所有用戶重置密碼（或逐步遷移）

---

### 2. 實作請求限流（High）

**安裝**：
```bash
npm install express-rate-limit
```

**實作**：
```javascript
// server/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 限制 5 次嘗試
  message: '登入嘗試次數過多，請稍後再試',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 一般 API 限制
});

module.exports = { loginLimiter, apiLimiter };
```

**應用**：
```javascript
// server/index.js
const { loginLimiter, apiLimiter } = require('./middleware/rateLimit');

app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);
```

---

### 3. 強化 CORS 配置（High）

**當前問題**：
```javascript
// ❌ 允許所有來源
app.use(cors({ origin: true }));
```

**修復**：
```javascript
// ✅ 限制允許的來源
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**.env 更新**：
```env
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

---

### 4. 強化 JWT Secret（High）

**當前問題**：
```javascript
// ❌ 有預設值，不安全
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**修復**：
```javascript
// ✅ 強制要求設置
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables');
  process.exit(1);
}
```

**.env 更新**：
```env
# 生成強隨機密鑰
JWT_SECRET=your-very-long-random-secret-key-min-32-chars
```

**生成密鑰**：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 驗證清單

- [ ] 所有密碼處理都使用 bcrypt
- [ ] 登入端點有請求限流
- [ ] CORS 限制到特定域名
- [ ] JWT_SECRET 必須設置
- [ ] 測試所有修復的功能
- [ ] 更新部署文檔

---

**預計工時**: 6-8 小時
**優先級**: P0 - 必須在生產部署前完成
