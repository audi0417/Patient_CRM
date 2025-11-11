# PostgreSQL 快速入門

本指南幫助您快速從 SQLite 遷移到 PostgreSQL 並部署到 Zeabur。

## 🎯 快速概覽

專案現已支援 **雙資料庫系統**：
- ✅ **SQLite** - 本地開發（預設）
- ✅ **PostgreSQL** - 生產環境/Zeabur 部署

## 📋 前置需求

### 本地開發
- Node.js 18+
- npm 或 yarn
- （可選）PostgreSQL 15+

### Zeabur 部署
- GitHub 帳號
- Zeabur 帳號 ([註冊](https://zeabur.com))

## 🚀 快速開始

### 方式 1: 使用 SQLite（本地開發）

最簡單的方式，無需任何配置：

```bash
# 1. 安裝依賴
npm install

# 2. 啟動伺服器
npm run server
```

✅ 完成！應用已在 http://localhost:3001 運行

### 方式 2: 使用本地 PostgreSQL

#### 步驟 1: 安裝 PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql
```

**Windows:**
下載並安裝 [PostgreSQL](https://www.postgresql.org/download/windows/)

#### 步驟 2: 建立資料庫

```bash
# 使用 psql 連線
psql postgres

# 建立資料庫和使用者
CREATE DATABASE patient_crm;
CREATE USER patient_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE patient_crm TO patient_user;
\q
```

#### 步驟 3: 配置環境變數

建立 `.env` 檔案：

```bash
# 複製範例檔案
cp .env.example .env
```

編輯 `.env`：

```bash
NODE_ENV=development
PORT=3001

# 使用 PostgreSQL
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=patient_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=patient_crm

# 或使用 DATABASE_URL
# DATABASE_URL=postgresql://patient_user:your_password@localhost:5432/patient_crm

# 認證
JWT_SECRET=your-super-secret-jwt-key-change-this
SUPER_ADMIN_PASSWORD=SuperAdmin@2024
```

#### 步驟 4: 測試連線

```bash
npm run test:postgres
```

#### 步驟 5: 啟動伺服器

```bash
npm run server
```

伺服器會自動初始化資料庫結構！

## 🌐 部署到 Zeabur

### 步驟 1: 準備專案

```bash
# 確保所有變更已提交
git add .
git commit -m "feat: 支援 PostgreSQL"
git push origin main
```

### 步驟 2: 在 Zeabur 建立專案

1. 訪問 [Zeabur Dashboard](https://dash.zeabur.com)
2. 點擊 **Create New Project**
3. 選擇 **Import from GitHub**
4. 選擇您的 `Patient_CRM` 儲存庫

### 步驟 3: 新增 PostgreSQL 服務

1. 在專案中點擊 **Add Service**
2. 選擇 **PostgreSQL**
3. 選擇方案：
   - **Developer** (免費) - 適合測試
   - **Pro** - 適合生產環境

等待 PostgreSQL 服務啟動...

### 步驟 4: 配置環境變數

在 Zeabur 專案設定中新增環境變數：

#### 方式 A: 使用 Zeabur 的內建環境變數（推薦）

Zeabur 會自動設定 `DATABASE_URL`，您只需新增：

```
DATABASE_TYPE=postgres
NODE_ENV=production
PORT=3001
JWT_SECRET=your-production-secret-key-change-this
SUPER_ADMIN_PASSWORD=your-secure-password-change-this
```

#### 方式 B: 手動配置（如果使用自訂 PostgreSQL）

```
DATABASE_TYPE=postgres
DATABASE_HOST=your-postgres-host
DATABASE_PORT=5432
DATABASE_NAME=patient_crm
DATABASE_USER=your-username
DATABASE_PASSWORD=your-password
NODE_ENV=production
PORT=3001
JWT_SECRET=your-production-secret-key
SUPER_ADMIN_PASSWORD=your-secure-password
```

### 步驟 5: 部署

1. Zeabur 會自動檢測 `Dockerfile` 並開始構建
2. 構建完成後自動部署
3. 首次啟動會自動初始化資料庫

### 步驟 6: 驗證部署

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

## 🔑 首次登入

使用超級管理員帳號登入：

```
帳號: superadmin
密碼: 您在環境變數中設定的 SUPER_ADMIN_PASSWORD
```

⚠️ **重要**: 首次登入後請立即修改密碼！

## 📊 資料遷移

### 從 SQLite 遷移到 PostgreSQL

如果您已經有 SQLite 資料庫並需要遷移資料：

```bash
# 1. 確保本地還在使用 SQLite
DATABASE_TYPE=sqlite npm run server

# 2. 導出資料（未來功能）
# npm run db:export > backup.json

# 3. 切換到 PostgreSQL
# 更新 .env: DATABASE_TYPE=postgres

# 4. 初始化 PostgreSQL 資料庫
npm run server

# 5. 導入資料（未來功能）
# npm run db:import < backup.json
```

## 🛠️ 常用命令

```bash
# 啟動開發伺服器
npm run server:dev

# 建立生產版本
npm run build

# 測試 PostgreSQL 連線
node scripts/testPostgresConnection.js

# 執行資料庫遷移
node server/database/migrate.js up

# 回滾遷移
node server/database/migrate.js down
```

## 📝 NPM 腳本

在 `package.json` 中新增以下腳本：

```json
{
  "scripts": {
    "test:postgres": "node scripts/testPostgresConnection.js",
    "migrate:up": "node server/database/migrate.js up",
    "migrate:down": "node server/database/migrate.js down"
  }
}
```

## 🔧 疑難排解

### 連線錯誤

**問題**: `ECONNREFUSED`
```bash
# 檢查 PostgreSQL 是否運行
# macOS
brew services list

# Linux
sudo systemctl status postgresql

# 啟動服務
brew services start postgresql@15  # macOS
sudo systemctl start postgresql     # Linux
```

**問題**: 認證失敗
- 檢查使用者名稱和密碼是否正確
- 確認 `pg_hba.conf` 設定允許連線
- PostgreSQL 預設可能使用 peer 認證

### 權限錯誤

```bash
# 授予完整權限
psql -d patient_crm
GRANT ALL ON SCHEMA public TO patient_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO patient_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO patient_user;
```

### Zeabur 部署失敗

1. **檢查構建日誌**: 在 Zeabur Dashboard 查看構建輸出
2. **環境變數**: 確認所有必要的環境變數都已設定
3. **資料庫連線**: 確認 PostgreSQL 服務已啟動
4. **健康檢查**: 檢查應用的健康檢查端點是否正常

### 資料表不存在

如果遇到 "table does not exist" 錯誤：

```bash
# 重新初始化資料庫（警告：會刪除所有資料）
# 刪除資料庫
dropdb patient_crm
createdb patient_crm

# 重新啟動伺服器初始化
npm run server
```

## 📚 更多資源

- [完整部署指南](./docs/DEPLOYMENT_GUIDE.md)
- [PostgreSQL 遷移指南](./docs/POSTGRESQL_MIGRATION.md)
- [多租戶架構](./docs/MULTI_TENANT_ARCHITECTURE.md)
- [Zeabur 文件](https://zeabur.com/docs)
- [PostgreSQL 文件](https://www.postgresql.org/docs/)

## 💡 最佳實踐

1. **本地開發**: 使用 SQLite 以保持簡單
2. **測試環境**: 使用本地 PostgreSQL 測試
3. **生產環境**: 使用 Zeabur PostgreSQL
4. **備份**: 定期備份生產資料庫
5. **密碼**: 使用強密碼並定期更換
6. **監控**: 設定 Zeabur 的監控和告警

## 🎉 完成！

現在您的 Patient CRM 已經可以在 PostgreSQL 上運行並部署到 Zeabur 了！

有問題？查看 [疑難排解](#🔧-疑難排解) 或提交 [Issue](https://github.com/your-repo/issues)。
