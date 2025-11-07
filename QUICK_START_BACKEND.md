# 🚀 後端 API 快速開始指南

## 已完成功能

✅ 完整的後端 API 系統（Express + SQLite）
✅ JWT 認證系統
✅ 使用者、患者、健康數據、目標、預約管理
✅ 數據庫自動初始化
✅ 預設管理員帳號

## 立即開始使用

### 1. 啟動後端伺服器

```bash
npm run server
```

**輸出**:
```
╔════════════════════════════════════════╗
║   Patient CRM Backend Server          ║
╠════════════════════════════════════════╣
║   Status: Running                      ║
║   Port: 3001                         ║
║   URL: http://localhost:3001         ║
║   API: http://localhost:3001/api     ║
╚════════════════════════════════════════╝
```

### 2. 測試 API

#### 健康檢查
```bash
curl http://localhost:3001/api/health-check
```

#### 登入（獲取 Token）
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123"}'
```

**響應**:
```json
{
  "success": true,
  "user": {
    "id": "user_admin_001",
    "username": "admin",
    "name": "系統管理員",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 使用 Token 訪問受保護的 API
```bash
# 將上面獲得的 token 複製到這裡
TOKEN="your_token_here"

# 獲取患者列表
curl http://localhost:3001/api/patients \
  -H "Authorization: Bearer $TOKEN"

# 獲取使用者列表
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN"
```

## 完整 API 端點列表

### 認證 API
- `POST /api/auth/login` - 登入
- `POST /api/auth/logout` - 登出
- `GET /api/auth/verify` - 驗證 token
- `GET /api/auth/me` - 獲取當前使用者

### 使用者管理
- `GET /api/users` - 獲取所有使用者
- `GET /api/users/:id` - 獲取單個使用者
- `POST /api/users` - 創建使用者
- `PUT /api/users/:id` - 更新使用者
- `POST /api/users/:id/reset-password` - 重設密碼
- `DELETE /api/users/:id` - 刪除使用者

### 患者管理
- `GET /api/patients` - 獲取所有患者
- `GET /api/patients/:id` - 獲取單個患者
- `POST /api/patients` - 創建患者
- `PUT /api/patients/:id` - 更新患者
- `DELETE /api/patients/:id` - 刪除患者

### 健康數據
- `GET /api/health/body-composition?patientId=xxx` - 獲取體組成記錄
- `POST /api/health/body-composition` - 創建體組成記錄
- `PUT /api/health/body-composition/:id` - 更新體組成記錄
- `DELETE /api/health/body-composition/:id` - 刪除體組成記錄
- `GET /api/health/vital-signs?patientId=xxx` - 獲取生命徵象記錄
- `POST /api/health/vital-signs` - 創建生命徵象記錄
- `PUT /api/health/vital-signs/:id` - 更新生命徵象記錄
- `DELETE /api/health/vital-signs/:id` - 刪除生命徵象記錄

### 健康目標
- `GET /api/goals?patientId=xxx` - 獲取健康目標
- `GET /api/goals/:id` - 獲取單個目標
- `POST /api/goals` - 創建目標
- `PUT /api/goals/:id` - 更新目標
- `POST /api/goals/:id/update-progress` - 更新進度
- `DELETE /api/goals/:id` - 刪除目標

### 預約管理
- `GET /api/appointments?patientId=xxx` - 獲取預約
- `POST /api/appointments` - 創建預約
- `PUT /api/appointments/:id` - 更新預約
- `DELETE /api/appointments/:id` - 刪除預約

## 預設帳號

- **帳號**: `admin`
- **密碼**: `Admin123`
- **角色**: `admin`

## 數據庫

- **位置**: `data/patient_crm.db`
- **類型**: SQLite
- **自動初始化**: 首次啟動時自動創建

## 開發模式

### 自動重啟
```bash
npm run server:dev
```
使用 nodemon，代碼修改時自動重啟

### 同時啟動前後端
```bash
npm run dev:full
```
- 後端: http://localhost:3001
- 前端: http://localhost:8080

## 解決您的連接埠問題

現在使用後端 API 後：
- ✅ 資料存在伺服器數據庫中
- ✅ 可以從 `localhost`、IP 地址、或任何網路設備訪問
- ✅ 不再有 localStorage 域隔離問題
- ✅ 多設備共享同一份資料

### 訪問方式
```bash
# 本機訪問
http://localhost:3001/api

# IP 訪問（在同一網路下）
http://192.168.1.102:3001/api

# 其他設備訪問
http://YOUR_SERVER_IP:3001/api
```

## 環境配置

文件 `.env`:
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
DB_PATH=./data/patient_crm.db
CORS_ORIGIN=http://localhost:8080,http://localhost:8082,http://192.168.1.102:8082
```

## 下一步：前端整合

查看 `BACKEND_MIGRATION_GUIDE.md` 了解如何將前端整合到新的後端 API。

主要步驟：
1. 創建 API 客戶端 (`src/lib/api.ts`)
2. 更新認證邏輯
3. 更新數據存取層
4. 測試完整流程

## 故障排除

### 端口被佔用
```bash
# 修改 .env 中的 PORT
PORT=3002
```

### 數據庫鎖定
```bash
# 停止所有運行的伺服器實例
# 刪除 data/patient_crm.db-wal 和 data/patient_crm.db-shm
```

### CORS 錯誤
```bash
# 在 .env 中添加您的前端 URL
CORS_ORIGIN=http://localhost:8080,http://your-frontend-url
```

## 技術支持

如有問題，請查看：
- `BACKEND_IMPLEMENTATION_SUMMARY.md` - 詳細實作總結
- `BACKEND_MIGRATION_GUIDE.md` - 完整遷移指南

---

**後端狀態**: ✅ 已完成並運行中
**下一步**: 前端整合
**更新日期**: 2025-11-06
