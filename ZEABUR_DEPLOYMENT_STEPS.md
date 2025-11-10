# Zeabur 部署完整步驟指南

## 📋 快速概況

| 項目 | 詳情 |
|------|------|
| **當前數據庫** | SQLite (better-sqlite3) |
| **推薦遷移** | PostgreSQL |
| **部署平台** | Zeabur |
| **前端框架** | React + Vite |
| **後端** | Node.js + Express |

---

## 🔍 您的系統現況

### 當前配置
```
Patient_CRM/
├── server/              # Express 後端
│   ├── database/db.js  # SQLite 配置
│   └── routes/         # API 路由
├── src/                # React 前端
├── package.json        # 依賴配置
└── data/
    └── patient_crm.db  # SQLite 文件
```

### 當前使用技術
- **數據庫**: SQLite (better-sqlite3)
- **ORM**: 無（直接 SQL）
- **認證**: JWT
- **API 框架**: Express

---

## 🚀 Zeabur 部署方案（推薦）

### 方案選擇

#### ❌ 不推薦：直接部署 SQLite
```
問題:
✗ 容器環境無持久存儲
✗ 數據會在重啟時丟失
✗ 無法多實例部署
✗ 備份困難
```

#### ✅ 推薦方案 1：Zeabur + PostgreSQL
```
優點:
✓ Zeabur 原生集成
✓ 自動備份
✓ 高可用性
✓ 支持多實例
✓ 迅速設置
```

#### ✅ 推薦方案 2：Zeabur + MySQL
```
優點:
✓ 同樣可靠
✓ 更熟悉的配置
✓ 性能優良
```

---

## 📝 步驟 1：準備代碼

### 1.1 檢查必要文件

確保項目根目錄有以下文件：
```bash
✓ Dockerfile           # 已創建
✓ .dockerignore        # 已創建
✓ .env.example         # 已創建
✓ package.json         # 已存在
✓ vite.config.ts       # 已存在
✓ server/index.js      # 已存在
```

### 1.2 驗證配置

```bash
# 檢查 Node.js 版本
node --version          # 需要 v18+

# 檢查 npm 版本
npm --version           # 需要 v9+

# 測試本地構建
npm run build

# 測試後端服務
npm run server
```

---

## 🔧 步驟 2：設置 GitHub 倉庫

### 2.1 初始化 Git（如果未初始化）

```bash
cd ~/Documents/Patient_CRM

# 初始化 git
git init

# 添加遠程倉庫
git remote add origin https://github.com/YOUR_USERNAME/Patient_CRM.git

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: Patient CRM with Zeabur deployment"

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 2.2 設置 GitHub 密鑰（可選但推薦）

1. 在 GitHub 上創建個人訪問令牌 (PAT)
2. 用於 Zeabur 自動部署

---

## 🌐 步驟 3：在 Zeabur 上部署

### 3.1 登入 Zeabur

1. 訪問 https://zeabur.com
2. 使用 GitHub 帳號登入
3. 授權 Zeabur 訪問您的倉庫

### 3.2 創建新項目

```
1. 點擊 "New Project"
2. 選擇 "Deploy from GitHub"
3. 搜索 "Patient_CRM"
4. 選擇倉庫
5. 點擊 "Deploy"
```

### 3.3 配置服務

#### 第一次部署（應用程序）

1. **選擇部署方式**
   - Zeabur 會自動檢測到 Dockerfile
   - 選擇 "Docker" 部署方式

2. **設置環境變量**
   - 進入 "Environment" 標籤
   - 添加必要的環境變量

3. **等待部署**
   - 部署通常需要 5-10 分鐘
   - 查看 "Logs" 標籤追蹤進度

### 3.4 添加 PostgreSQL 數據庫

#### 方式 A：使用 Zeabur 託管 PostgreSQL

```
1. 在項目中點擊 "Add Service"
2. 選擇 "PostgreSQL"
3. 配置以下參數:
   - Database Name: patient_crm
   - Username: patient_user
   - Password: (自動生成，複製保存)
4. Zeabur 會自動提供 DATABASE_URL
```

#### 方式 B：使用外部 PostgreSQL 服務

```
如果您已有 PostgreSQL 帳號：
1. 使用服務商提供的 DATABASE_URL
2. 在環境變量中設置 DATABASE_URL
3. 格式: postgresql://user:password@host:port/database
```

### 3.5 設置環境變量

在 Zeabur 控制面板中設置：

```
# 必填變量
DATABASE_URL=postgresql://patient_user:PASSWORD@HOST:5432/patient_crm
JWT_SECRET=your-unique-secret-key-min-32-chars-long
NODE_ENV=production
PORT=3001

# 可選變量
LOG_LEVEL=info
API_ENDPOINT=https://your-app.zeabur.app
CLIENT_URL=https://your-app.zeabur.app
```

---

## 🗄️ 步驟 4：遷移數據（可選）

### 4.1 如果需要保留現有數據

#### 選項 1：使用數據遷移腳本

```bash
# 創建遷移腳本
npm run migrate-to-postgres

# 此腳本會：
# 1. 讀取現有 SQLite 數據
# 2. 轉換為 PostgreSQL 格式
# 3. 上傳到雲端數據庫
```

#### 選項 2：手動重新輸入

```bash
# 在新部署的系統中：
# 1. 登入系統
# 2. 重新添加患者
# 3. 重新添加其他數據
# （通常應用於測試環境）
```

### 4.2 數據備份

```bash
# 在遷移前備份 SQLite
cp data/patient_crm.db data/patient_crm.db.backup

# PostgreSQL 備份（由 Zeabur 自動進行）
# 無需手動操作
```

---

## ✅ 步驟 5：驗證部署

### 5.1 檢查應用狀態

```
1. 進入 Zeabur 控制面板
2. 查看應用狀態：應顯示 "Running" ✓
3. 查看日誌：應無錯誤消息
```

### 5.2 測試應用

```bash
# 檢查健康狀態
curl https://your-app.zeabur.app/api/health-check

# 預期輸出
{
  "status": "ok",
  "timestamp": "2025-11-10T..."
}
```

### 5.3 訪問應用

```
1. 在瀏覽器中打開 https://your-app.zeabur.app
2. 應能看到登入頁面
3. 使用默認憑證登入：
   - 用戶名: admin
   - 密碼: Admin123
```

### 5.4 功能測試

- [ ] 登入成功
- [ ] 患者列表顯示
- [ ] 分頁功能正常
- [ ] 新增患者功能
- [ ] 預約功能
- [ ] 健康數據顯示
- [ ] 數據持久化（重啟後仍存在）

---

## 🔗 訪問您的應用

部署完成後，您可以通過以下方式訪問：

```
默認域名: https://your-app-name.zeabur.app
自定義域名: https://your-domain.com (需要額外配置)
```

---

## 📊 Zeabur 部署架構

```
┌─────────────────────────────────────────┐
│         Zeabur 雲端平台                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐   ┌──────────────┐  │
│  │  React App   │───│  Express API │  │
│  │  (前端)      │   │  (後端)      │  │
│  └──────────────┘   └──────┬───────┘  │
│                            │          │
│                    ┌───────▼────────┐ │
│                    │  PostgreSQL    │ │
│                    │  (數據庫)      │ │
│                    └────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🆘 故障排查

### 問題 1：部署失敗

**症狀**: 部署時出現錯誤
**解決**:
```bash
# 1. 檢查日誌
# 進入 Zeabur 控制面板 → Logs 標籤

# 2. 常見錯誤:
- npm 依賴錯誤 → 檢查 package.json 和 package-lock.json
- Dockerfile 錯誤 → 驗證 Dockerfile 語法
- 環境變量缺失 → 添加必要的環境變量
```

### 問題 2：數據庫連接失敗

**症狀**: 應用可以啟動但無法訪問數據
**解決**:
```bash
# 1. 驗證 DATABASE_URL
echo $DATABASE_URL

# 2. 測試連接
node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()', (err, res) => {console.log(err || res.rows[0]); process.exit(0);})"

# 3. 確保數據庫已創建
```

### 問題 3：性能問題

**症狀**: 應用響應緩慢
**解決**:
```bash
# 1. 增加容器資源
# Zeabur 控制面板 → Settings → Compute

# 2. 檢查數據庫連接
# 使用連接池（已配置）

# 3. 啟用 CDN
# Zeabur 控制面板 → Settings → CDN
```

---

## 💡 最佳實踐

### 安全性

✓ 使用強密碼和複雜的 JWT Secret
✓ 啟用 HTTPS（Zeabur 自動提供）
✓ 定期更新依賴
✓ 使用環境變量存儲敏感信息
✗ 勿在代碼中硬編碼密鑰

### 性能

✓ 使用 PostgreSQL 而不是 SQLite
✓ 啟用數據庫索引
✓ 使用連接池
✓ 啟用 gzip 壓縮

### 可靠性

✓ 啟用自動備份
✓ 設置監控告警
✓ 使用健康檢查
✓ 定期測試恢復流程

---

## 📞 有用的連結

- [Zeabur 官方文檔](https://zeabur.com/docs)
- [Docker 文檔](https://docs.docker.com/)
- [PostgreSQL 文檔](https://www.postgresql.org/docs/)
- [Express.js 文檔](https://expressjs.com/)

---

## 🎯 部署檢查清單

### 部署前
- [ ] 代碼已提交到 GitHub
- [ ] Dockerfile 已創建並測試
- [ ] package.json 依賴已更新
- [ ] .env.example 已創建
- [ ] README.md 已更新

### 部署中
- [ ] 已連接 Zeabur 與 GitHub
- [ ] 已選擇正確的倉庫和分支
- [ ] 已添加 PostgreSQL 服務
- [ ] 已設置所有環境變量
- [ ] 構建已成功完成

### 部署後
- [ ] 應用已啟動（Running 狀態）
- [ ] 健康檢查通過
- [ ] 前端可以訪問
- [ ] 數據庫連接正常
- [ ] 登入功能正常
- [ ] 數據已持久化
- [ ] 日誌無異常警告

---

## 🚀 後續步驟

1. **自定義域名**
   - 在 Zeabur 中配置自定義域名
   - 設置 DNS 記錄

2. **設置自動更新**
   - 推送到 GitHub main 分支自動重新部署

3. **監控和日誌**
   - 配置日誌收集
   - 設置性能監控

4. **備份策略**
   - 配置定期備份
   - 測試恢復流程

5. **用戶管理**
   - 創建更多用戶帳號
   - 配置角色和權限

---

需要幫助嗎？
- 查看 Zeabur 文檔：https://zeabur.com/docs
- 檢查應用日誌
- 聯繫 Zeabur 支援
