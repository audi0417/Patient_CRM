# Zeabur 部署指南 - Patient CRM

## 📌 項目概況

**數據庫**: SQLite (better-sqlite3)
**後端**: Node.js + Express
**前端**: React + Vite
**部署平台**: Zeabur (雲端 PaaS 平台)

---

## 🔍 目前使用的技術

### 資料庫
- **類型**: SQLite (better-sqlite3)
- **特點**: 文件型數據庫，輕量級，無需額外服務
- **位置**: `/data/patient_crm.db`
- **優勢**: 本地開發零配置，部署簡單

### 後端架構
- Node.js Express 伺服器
- RESTful API 設計
- JWT 認證機制
- CORS 支援多來源

---

## ⚠️ SQLite 部署問題

### ❌ 不適合 Zeabur 的理由

1. **文件系統限制**
   - Zeabur 使用容器化環境，無持久存儲
   - 容器重啟後數據丟失
   - 無法在多個實例間共享數據

2. **多實例部署**
   - 無法水平擴展
   - 每個實例有獨立的數據庫

3. **備份困難**
   - 無法自動備份
   - 無法進行即時同步

### ✅ 推薦解決方案

#### 方案 1: PostgreSQL (推薦)
- **優勢**: 
  - Zeabur 原生支援
  - 功能完整的關係型資料庫
  - 支援多用戶併發
  - 自動備份

- **遷移難度**: ⭐⭐☆ 中等
  - 需要修改連接配置
  - 需要調整某些 SQL 語句

#### 方案 2: MySQL
- **優勢**:
  - Zeabur 支援
  - 性能優良
  - 廣泛使用

- **遷移難度**: ⭐⭐☆ 中等

#### 方案 3: MongoDB (如果轉向文檔型)
- **優勢**:
  - Zeabur 支援
  - 靈活的 Schema
  - 易於擴展

- **遷移難度**: ⭐⭐⭐ 較難

---

## 🚀 Zeabur 部署步驟

### 步驟 1: 準備 Docker 配置

#### a) 創建 Dockerfile

```dockerfile
# 多階段構建
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製源代碼
COPY . .

# 構建前端
RUN npm run build

# 生產階段
FROM node:18-alpine

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝生產依賴
RUN npm ci --only=production

# 從 builder 階段複製構建好的前端
COPY --from=builder /app/dist ./dist

# 複製服務器代碼
COPY server ./server
COPY scripts ./scripts
COPY data ./data

# 暴露端口
EXPOSE 3001

# 啟動命令
CMD ["node", "server/index.js"]
```

#### b) 創建 .dockerignore

```
node_modules
npm-debug.log
dist
.git
.gitignore
README.md
.env.local
.env.*.local
vite.config.ts.timestamp-*
coverage
*.db-shm
*.db-wal
electron/
electron-builder.json
```

### 步驟 2: 環境變量設定

#### 創建 .env.production

```env
# 伺服器配置
NODE_ENV=production
PORT=3001

# 數據庫配置（如果使用 PostgreSQL）
DATABASE_URL=postgresql://user:password@host:port/database

# 認證配置
JWT_SECRET=your-secret-key-here

# API 配置
API_ENDPOINT=https://your-app.zeabur.app
CLIENT_URL=https://your-app.zeabur.app

# 日誌級別
LOG_LEVEL=info
```

### 步驟 3: 在 Zeabur 上部署

#### a) 連接 GitHub

1. 登入 [Zeabur 官網](https://zeabur.com)
2. 點擊 "New Project"
3. 選擇 "Deploy from GitHub"
4. 連接您的 GitHub 帳號
5. 選擇 Patient_CRM 倉庫

#### b) 配置部署

1. **選擇構建方式**
   - 選擇 "Dockerfile"（如果有 Dockerfile）
   - 或選擇 "Node.js"（自動檢測）

2. **設定環境變量**
   - 進入 "Environment" 標籤
   - 添加所有 `.env.production` 中的變量
   - 特別是 `JWT_SECRET` 和 `DATABASE_URL`

3. **添加數據庫服務**
   - 如果選擇 PostgreSQL：
     1. 點擊 "Add Service"
     2. 選擇 "PostgreSQL"
     3. Zeabur 會自動生成 `DATABASE_URL`

#### c) 部署

1. 確認配置無誤
2. 點擊 "Deploy"
3. 等待部署完成（通常 5-10 分鐘）

---

## 🗄️ 遷移到 PostgreSQL 指南

### 步驟 1: 安裝 PostgreSQL 驅動

```bash
npm install pg
npm uninstall better-sqlite3
```

### 步驟 2: 修改數據庫連接文件

新建 `server/database/postgres.js`:

```javascript
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function initialize() {
  console.log('🗄️  初始化 PostgreSQL 數據庫...');

  // 用戶表
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'user')),
      isActive INTEGER DEFAULT 1,
      lastLogin TEXT,
      createdAt TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP NOT NULL
    )
  `);

  // 患者表
  pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('male', 'female', 'other')),
      birthDate TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      emergencyContact TEXT,
      emergencyPhone TEXT,
      notes TEXT,
      tags TEXT,
      groups TEXT,
      healthProfile TEXT,
      createdAt TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP NOT NULL
    )
  `);

  // ... 其他表的 SQL
}

module.exports = { pool, initialize };
```

### 步驟 3: 遷移現有數據

```bash
# 備份現有 SQLite 數據
cp data/patient_crm.db data/patient_crm.db.backup

# 編寫遷移腳本
# 使用 better-sqlite3 讀取，pg 寫入
```

---

## 📊 Zeabur 架構圖

```
┌─────────────────────────────────────────────────┐
│                  Zeabur 雲端                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐      ┌──────────────────┐   │
│  │  React App   │◄────►│  Node.js Server  │   │
│  │  (Vite)      │      │  (Express)       │   │
│  └──────────────┘      └────────┬─────────┘   │
│                                 │              │
│                         ┌───────▼────────┐    │
│                         │  PostgreSQL    │    │
│                         │  (或 MySQL)    │    │
│                         └────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## ✅ 部署後的檢查清單

- [ ] 前端頁面可以正常加載
- [ ] API 端點正常響應
- [ ] 登錄功能正常
- [ ] 患者列表顯示正常
- [ ] 分頁功能正常
- [ ] 健康數據正常顯示
- [ ] 預約功能正常
- [ ] 數據庫持久化正常

---

## 🆘 常見問題

### Q1: 部署後數據丟失？
**A**: SQLite 在容器環境中不會持久化。需要遷移到 PostgreSQL。

### Q2: 如何查看部署日誌？
**A**: 
1. 進入 Zeabur 控制面板
2. 選擇您的應用
3. 點擊 "Logs" 查看即時日誌

### Q3: 如何更新部署？
**A**: 
1. 推送更新到 GitHub
2. Zeabur 會自動觸發重新部署
3. 或在控制面板手動點擊 "Redeploy"

### Q4: 如何備份數據？
**A**: 
1. 若使用 PostgreSQL，Zeabur 提供自動備份
2. 可在控制面板下載備份

---

## 📞 推薦配置總結

| 項目 | 當前 | 推薦 | 原因 |
|------|------|------|------|
| 數據庫 | SQLite | PostgreSQL | 雲端持久化 |
| 認證 | JWT | JWT | 無需改變 |
| API | Express | Express | 性能足夠 |
| 前端 | React | React | 無需改變 |

---

## 🎯 下一步

1. 根據上述指南創建必要的配置文件
2. 創建 GitHub 倉庫
3. 在 Zeabur 上進行首次部署
4. 測試所有功能
5. 配置自動部署

有任何部署問題，請參考 [Zeabur 官方文檔](https://zeabur.com/docs)。
