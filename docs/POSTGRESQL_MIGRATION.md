# PostgreSQL 遷移指南

本文件說明如何從 SQLite 遷移到 PostgreSQL，並部署到 Zeabur。

## 架構概述

專案現在支援雙資料庫系統：
- **SQLite**: 用於本地開發和測試
- **PostgreSQL**: 用於生產環境部署（Zeabur）

## 資料庫抽象層

所有資料庫操作現在通過統一的適配器介面進行：

```javascript
// 使用新的資料庫介面
const { queryOne, queryAll, execute } = require('./server/database/helpers');

// 查詢單一結果
const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);

// 查詢多個結果
const users = await queryAll('SELECT * FROM users WHERE role = ?', ['admin']);

// 執行 INSERT/UPDATE/DELETE
const result = await execute('INSERT INTO users (...) VALUES (...)', [params]);
```

## 本地開發設定

### 1. 使用 SQLite（預設）

```bash
# .env 檔案
DATABASE_TYPE=sqlite
DATABASE_PATH=data/patient_crm.db
```

### 2. 使用本地 PostgreSQL

安裝 PostgreSQL：
```bash
# macOS
brew install postgresql
brew services start postgresql

# 建立資料庫
createdb patient_crm
```

更新 `.env` 檔案：
```bash
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=patient_crm
```

### 3. 初始化資料庫

```bash
# 安裝依賴
npm install

# 啟動伺服器（會自動初始化資料庫）
npm run server
```

## Zeabur 部署步驟

### 1. 準備專案

確保所有變更都已提交到 Git：

```bash
git add .
git commit -m "feat: 支援 PostgreSQL 並配置 Zeabur 部署"
git push origin main
```

### 2. 在 Zeabur 建立專案

1. 訪問 [Zeabur Dashboard](https://dash.zeabur.com)
2. 點擊「Create New Project」
3. 連接您的 GitHub 儲存庫
4. 選擇 `Patient_CRM` 專案

### 3. 新增 PostgreSQL 服務

1. 在專案中點擊「Add Service」
2. 選擇「PostgreSQL」
3. 選擇適合的方案（Developer 或更高）
4. 等待 PostgreSQL 服務啟動

### 4. 配置環境變數

Zeabur 會自動注入以下環境變數：
- `DATABASE_URL` - PostgreSQL 連接字串

您需要手動添加：
- `DATABASE_TYPE=postgres`
- `NODE_ENV=production`
- `PORT=3001`
- `JWT_SECRET=your-production-secret-key`
- `SUPER_ADMIN_PASSWORD=your-secure-password`

### 5. 部署應用

1. Zeabur 會自動檢測 `Dockerfile` 並開始構建
2. 構建完成後自動部署
3. 首次啟動時會自動執行資料庫初始化

### 6. 驗證部署

訪問您的應用 URL：
```
https://your-app.zeabur.app/api/health-check
```

應該返回：
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

## 資料遷移

### 從 SQLite 遷移到 PostgreSQL

如果您已經有 SQLite 資料庫並需要遷移到 PostgreSQL：

#### 方法 1: 使用遷移腳本（推薦）

```bash
# 1. 導出 SQLite 資料
node scripts/exportData.js > data_backup.json

# 2. 切換到 PostgreSQL
# 更新 .env 中的 DATABASE_TYPE=postgres

# 3. 導入資料到 PostgreSQL
node scripts/importData.js < data_backup.json
```

#### 方法 2: 使用 pgloader（進階）

```bash
# 安裝 pgloader
brew install pgloader

# 執行遷移
pgloader sqlite:///path/to/patient_crm.db postgresql://user:pass@host/database
```

## 疑難排解

### 連線錯誤

如果遇到 PostgreSQL 連線錯誤：

1. 檢查環境變數是否正確設定
2. 確認 PostgreSQL 服務是否正在運行
3. 檢查防火牆設定
4. 查看日誌：`docker logs <container_id>`

### 資料表不存在

```bash
# 重新初始化資料庫
# 警告：這會刪除所有資料！
npm run server
```

### Boolean 類型問題

PostgreSQL 使用 `BOOLEAN` 類型，SQLite 使用 `INTEGER`。
系統會自動處理這些差異，但在查詢時注意：

```javascript
// SQLite
WHERE isActive = 1

// PostgreSQL
WHERE "isActive" = TRUE

// 統一寫法（推薦）
WHERE "isActive" = ?  // 傳入 true/false
```

### 欄位名稱大小寫

PostgreSQL 對大小寫敏感，使用雙引號包裹駝峰命名的欄位：

```sql
-- 正確
SELECT "createdAt", "isActive" FROM users

-- 錯誤
SELECT createdAt, isActive FROM users
```

## 效能優化

### 索引

系統已經為多租戶架構建立了複合索引，確保查詢效能：

```sql
CREATE INDEX idx_patients_org_name ON patients("organizationId", name);
CREATE INDEX idx_appointments_org_date ON appointments("organizationId", date, time);
```

### 連接池

PostgreSQL 適配器使用連接池，預設配置：
- 最小連接數: 2
- 最大連接數: 10
- 空閒超時: 30 秒

可以通過環境變數調整：
```bash
PGPOOL_MIN=2
PGPOOL_MAX=20
PGPOOL_IDLE_TIMEOUT=30000
```

## 備份與恢復

### 備份 PostgreSQL 資料庫

```bash
# 使用 pg_dump
pg_dump -h localhost -U patient_user patient_crm > backup.sql

# 在 Zeabur 上備份
# 通過 Zeabur Dashboard 的資料庫管理介面
```

### 恢復資料庫

```bash
# 本地恢復
psql -h localhost -U patient_user patient_crm < backup.sql

# Zeabur 恢復
# 使用 Zeabur 的資料庫還原功能
```

## 相關文件

- [部署指南](./DEPLOYMENT_GUIDE.md)
- [多租戶架構](./MULTI_TENANT_ARCHITECTURE.md)
- [API 文件](./API_DOCUMENTATION.md)

## 支援

如有問題，請查看：
1. Zeabur 文件: https://zeabur.com/docs
2. PostgreSQL 文件: https://www.postgresql.org/docs/
3. 專案 Issues: https://github.com/your-repo/issues
