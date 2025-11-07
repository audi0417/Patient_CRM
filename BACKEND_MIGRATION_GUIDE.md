# 後端 API 遷移指南

## 概述

本指南說明如何將系統從 localStorage 遷移到使用 Express + SQLite 的後端 API 架構。

## 已完成的工作

### ✅ 後端架構
- [x] Express 伺服器設置 (`server/index.js`)
- [x] SQLite 數據庫初始化 (`server/database/db.js`)
- [x] JWT 認證中介層 (`server/middleware/auth.js`)
- [x] 使用者認證 API (`server/routes/auth.js`)
- [x] 使用者管理 API (`server/routes/users.js`)
- [x] 患者管理 API (`server/routes/patients.js`)

### 📝 待完成的工作

#### 1. 完成剩餘的 API 路由

需要創建以下檔案：

**server/routes/health.js** - 健康數據 API
- GET /api/health/body-composition?patientId=xxx
- POST /api/health/body-composition
- DELETE /api/health/body-composition/:id
- GET /api/health/vital-signs?patientId=xxx
- POST /api/health/vital-signs
- DELETE /api/health/vital-signs/:id

**server/routes/goals.js** - 健康目標 API
- GET /api/goals?patientId=xxx
- GET /api/goals/:id
- POST /api/goals
- PUT /api/goals/:id
- DELETE /api/goals/:id
- POST /api/goals/:id/update-progress

**server/routes/appointments.js** - 預約 API
- GET /api/appointments?patientId=xxx
- POST /api/appointments
- PUT /api/appointments/:id
- DELETE /api/appointments/:id

#### 2. 創建前端 API 客戶端

需要創建 `src/lib/api.ts` 作為統一的 API 呼叫介面：

```typescript
// API 基礎配置
const API_BASE_URL = 'http://localhost:3001/api';

// 通用請求函數
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

// 認證 API
export const authAPI = {
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  verify: () => apiRequest('/auth/verify'),
};

// 患者 API
export const patientAPI = {
  getAll: () => apiRequest('/patients'),
  getById: (id) => apiRequest(`/patients/${id}`),
  create: (data) => apiRequest('/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`/patients/${id}`, { method: 'DELETE' }),
};

// ... 其他 API
```

#### 3. 更新前端代碼

需要更新以下檔案以使用新的 API：

1. **src/lib/auth.ts** - 替換 localStorage 邏輯為 API 呼叫
2. **src/lib/storage.ts** - 替換所有 localStorage 操作為 API 呼叫
3. **src/contexts/AuthContext.tsx** - 更新認證邏輯

#### 4. 環境配置

創建 `.env` 檔案：

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
DB_PATH=./data/patient_crm.db

# CORS
CORS_ORIGIN=http://localhost:8080
```

#### 5. 更新 package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "server": "node server/index.js",
    "server:dev": "nodemon server/index.js",
    "dev:full": "concurrently \"npm run server:dev\" \"npm run dev\""
  }
}
```

需要安裝：
```bash
npm install --save-dev nodemon concurrently
```

## API 端點總覽

### 認證 (已完成)
- POST /api/auth/login - 登入
- POST /api/auth/logout - 登出
- GET /api/auth/verify - 驗證 token
- GET /api/auth/me - 獲取當前使用者

### 使用者管理 (已完成)
- GET /api/users - 獲取所有使用者
- GET /api/users/:id - 獲取單個使用者
- POST /api/users - 創建使用者
- PUT /api/users/:id - 更新使用者
- POST /api/users/:id/reset-password - 重設密碼
- DELETE /api/users/:id - 刪除使用者

### 患者管理 (已完成)
- GET /api/patients - 獲取所有患者
- GET /api/patients/:id - 獲取單個患者
- POST /api/patients - 創建患者
- PUT /api/patients/:id - 更新患者
- DELETE /api/patients/:id - 刪除患者

### 健康數據 (待完成)
- 體組成記錄 CRUD
- 生命徵象記錄 CRUD

### 健康目標 (待完成)
- 目標 CRUD
- 進度更新

### 預約管理 (待完成)
- 預約 CRUD

## 啟動指南

### 1. 啟動後端伺服器
```bash
npm run server
```
或使用開發模式（自動重啟）：
```bash
npm run server:dev
```

### 2. 啟動前端
在另一個終端：
```bash
npm run dev
```

### 3. 同時啟動前後端
```bash
npm run dev:full
```

## 數據庫初始化

後端伺服器首次啟動時會自動：
1. 創建 SQLite 數據庫
2. 創建所有必要的表
3. 創建預設管理員帳號 (admin / Admin123)

## 測試 API

使用 curl 或 Postman 測試：

```bash
# 測試健康檢查
curl http://localhost:3001/api/health-check

# 測試登入
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123"}'

# 測試獲取患者（需要 token）
curl http://localhost:3001/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 部署考慮

### 生產環境設置
1. 使用強密碼和安全的 JWT_SECRET
2. 設置適當的 CORS 政策
3. 啟用 HTTPS
4. 使用 PM2 或 Docker 管理進程
5. 設置數據庫備份策略
6. 實施日誌管理

### 擴展性
- 可輕鬆遷移到 PostgreSQL 或 MySQL
- 可添加 Redis 快取層
- 可實作檔案上傳（圖片、文件）
- 可添加 WebSocket 支援實時通知

## 安全性最佳實踐
- ✅ JWT Token 認證
- ✅ 密碼雜湊 (SHA-256)
- ✅ 角色權限控制
- ✅ SQL 注入防護（prepared statements）
- ⚠️ 建議：添加 rate limiting
- ⚠️ 建議：添加請求日誌
- ⚠️ 建議：實作 HTTPS

## 下一步

1. 完成剩餘的 API 路由檔案
2. 創建前端 API 客戶端
3. 更新前端代碼使用 API
4. 測試完整流程
5. 部署到生產環境

---

**更新日期**: 2025-11-06
**版本**: 1.0.0
