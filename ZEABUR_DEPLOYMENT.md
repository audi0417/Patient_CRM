# Zeabur 部署指南

本文件說明如何將 Patient CRM 部署到 Zeabur 平台。

## 🔐 安全性說明

本系統使用 **SHA256** 進行密碼加密，確保密碼安全儲存。所有密碼在儲存前都會經過 SHA256 雜湊處理。

## 🚀 快速開始

### 1. 準備工作

確保你的專案已經推送到 Git 倉庫（GitHub, GitLab, 或 Bitbucket）。

### 2. 在 Zeabur 創建專案

1. 登入 [Zeabur](https://zeabur.com)
2. 點擊「New Project」創建新專案
3. 連接你的 Git 倉庫並選擇此專案

---

## 🔧 必要的環境變數配置

在 Zeabur 控制台的「Environment Variables」中設定以下變數：

### ⚠️ 必須設定（系統無法啟動）

```bash
# JWT 密鑰 - 用於生成認證 Token
# 請使用以下指令生成一個安全的隨機字串：
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_generated_secret_here_min_32_chars

# 範例（請勿使用此範例，請自行生成）：
# JWT_SECRET=96311eb6af2067b6e9ca9e88d9caffd691c6370046d9269cf6ef7b3f0e781a65
```

### 🔐 強烈建議設定（安全性）

```bash
# 超級管理員初始密碼
# ⚠️ 部署後請立即登入並修改密碼！
SUPER_ADMIN_PASSWORD=YourSecurePassword123!

# 如果不設定，預設值為：SuperAdmin@2024
```

### 🗄️ 資料庫配置（Zeabur 會自動設定）

當你在 Zeabur 加入 PostgreSQL 服務時，以下變數會**自動注入**：

```bash
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:port/database

# 或者分開設定（Zeabur 通常使用 DATABASE_URL）
DATABASE_HOST=xxx.zeabur.app
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=xxxxx
DATABASE_NAME=patient_crm
```

**注意**：無需手動設定資料庫變數，Zeabur 會自動處理！

### 🌐 可選配置

```bash
# Node 環境
NODE_ENV=production

# 伺服器埠號（Zeabur 會自動設定，無需手動設定）
PORT=3001

# CORS 允許的來源（逗號分隔）
# 如果不設定，系統會自動允許所有 zeabur.app 子域名
ALLOWED_ORIGINS=https://your-custom-domain.com

# 資料庫初始化模式
# auto: 自動檢測並創建（預設）
# force: 強制重建資料表（⚠️ 會刪除所有資料）
# skip: 跳過初始化
DB_INIT_MODE=auto
```

---

## 📋 完整環境變數清單

### 最小配置（必須）

只需要設定這一個變數即可啟動：

```bash
JWT_SECRET=your_generated_secret_here
```

### 推薦配置（生產環境）

```bash
# 認證
JWT_SECRET=your_generated_secret_here
SUPER_ADMIN_PASSWORD=YourSecurePassword123!

# 環境
NODE_ENV=production

# 資料庫（如果 Zeabur 未自動注入）
DATABASE_TYPE=postgres
# DATABASE_URL 會由 Zeabur 自動設定
```

### 完整配置（所有選項）

```bash
# 認證
JWT_SECRET=your_generated_secret_here
SUPER_ADMIN_PASSWORD=YourSecurePassword123!

# 環境
NODE_ENV=production
PORT=3001

# 資料庫
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:port/database

# 安全
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# 初始化
DB_INIT_MODE=auto
```

---

## 📝 部署步驟

### 步驟 1: 推送程式碼

```bash
git add .
git commit -m "Ready for Zeabur deployment"
git push origin main
```

### 步驟 2: 在 Zeabur 創建服務

1. 在專案中點擊「Add Service」
2. 選擇「Git」
3. 選擇你的 Git 倉庫
4. Zeabur 會自動偵測為 Node.js 專案

### 步驟 3: 新增 PostgreSQL 資料庫

1. 點擊「Add Service」
2. 選擇「Database」→「PostgreSQL」
3. Zeabur 會自動將資料庫連線資訊注入環境變數

### 步驟 4: 設定環境變數

在服務的「Environment Variables」頁面設定：

```bash
JWT_SECRET=<你生成的密鑰>
SUPER_ADMIN_PASSWORD=<你的安全密碼>
```

**生成 JWT_SECRET：**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 步驟 5: 部署

Zeabur 會自動執行：

1. `npm install` - 安裝依賴
2. `npm run build` - 編譯前端
3. `npm start` - 啟動伺服器

---

## 🔍 驗證部署

### 1. 檢查服務狀態

在 Zeabur 控制台查看：
- ✅ 服務狀態為「Running」
- ✅ 沒有錯誤日誌

### 2. 測試 API

訪問：`https://your-app.zeabur.app/api/health-check`

應該回傳：
```json
{
  "status": "ok",
  "timestamp": "2025-01-13T..."
}
```

### 3. 登入超級管理員

使用以下帳號登入：

```
帳號：superadmin
密碼：你設定的 SUPER_ADMIN_PASSWORD（或預設的 SuperAdmin@2024）
```

**⚠️ 重要：登入後立即修改密碼！**

---

## 🐛 常見問題排查

### 問題 1: 無法啟動 - JWT_SECRET 錯誤

**錯誤訊息：**
```
[Security] FATAL: JWT_SECRET is not set in environment variables
```

**解決方法：**
1. 在 Zeabur 環境變數中設定 `JWT_SECRET`
2. 使用指令生成：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 問題 2: 超級管理員無法登入

**可能原因：**
1. 密碼錯誤（檢查 `SUPER_ADMIN_PASSWORD` 環境變數）
2. 資料庫未正確初始化

**解決方法：**
1. 檢查 Zeabur 日誌，確認看到：
   ```
   [Database] Super admin created
   ```
2. 如果需要重建，設定 `DB_INIT_MODE=force`（⚠️ 會刪除所有資料）

### 問題 3: 資料庫連線失敗

**解決方法：**
1. 確認 PostgreSQL 服務正在運行
2. 檢查 Zeabur 是否已自動注入 `DATABASE_URL`
3. 查看日誌中的資料庫連線訊息

### 問題 4: CORS 錯誤

**解決方法：**
1. 系統預設會自動允許所有 `zeabur.app` 子域名
2. 如果使用自訂網域，需設定 `ALLOWED_ORIGINS`：
   ```bash
   ALLOWED_ORIGINS=https://your-domain.com
   ```

### 問題 5: Rate Limiting 錯誤

**錯誤訊息：**
```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false
```

**解決方法：**
此問題已在 [server/index.js:12](server/index.js#L12) 修正，確保使用最新版本。

---

## 📊 查看日誌

在 Zeabur 控制台的「Logs」頁面可以查看：

### 啟動日誌（正常情況）

```
[Database] Initializing...
[Database] Testing PostgreSQL connection...
[Database] PostgreSQL connection successful
[Database] Tables already exist, skipping creation
[Database] Default organization created (if needed)
[Database] Super admin created (if needed)
[Database] Initialization complete
[Server] Patient CRM Backend & Frontend
[Server] Status: Running
[Server] Port: 3001
```

### 關鍵日誌訊息

- ✅ `[Database] Initialization complete` - 資料庫初始化成功
- ✅ `[Server] Status: Running` - 伺服器啟動成功
- ✅ `[Database] Super admin created` - 超級管理員已創建
- ⚠️ `[CORS] Blocked origin` - CORS 阻擋（需要檢查 ALLOWED_ORIGINS）

---

## 🔄 更新部署

### 方式 1: 自動部署

推送到 Git 倉庫後，Zeabur 會自動重新部署：

```bash
git add .
git commit -m "Update features"
git push origin main
```

### 方式 2: 手動觸發

在 Zeabur 控制台點擊「Redeploy」按鈕。

---

## 🔐 安全建議

### 1. 立即更改超級管理員密碼

部署完成後第一件事：

1. 登入系統
2. 前往「設定」→「變更密碼」
3. 設定強密碼（至少 8 碼，包含大小寫字母和數字）

### 2. 定期更新 JWT_SECRET

如果懷疑密鑰洩漏：

1. 生成新的 JWT_SECRET
2. 更新 Zeabur 環境變數
3. 重新部署（所有使用者需要重新登入）

### 3. 設定 ALLOWED_ORIGINS

如果使用自訂網域，務必設定 `ALLOWED_ORIGINS` 限制來源：

```bash
ALLOWED_ORIGINS=https://your-domain.com
```

### 4. 啟用 HTTPS

Zeabur 預設已啟用 HTTPS，請確保：
- 不要在前端使用 HTTP API 端點
- 檢查瀏覽器地址欄顯示 🔒 鎖頭圖示

---

## 🎯 預設帳號資訊

### 超級管理員

```
帳號：superadmin
密碼：SUPER_ADMIN_PASSWORD 環境變數的值（預設：SuperAdmin@2024）
角色：super_admin
組織：自動分配到第一個組織
```

### 預設組織

```
組織 ID：org_default_001
組織名稱：default
方案：enterprise（無限制）
狀態：啟用
```

---

## 📞 技術支援

如有問題，請檢查：

1. **Zeabur 日誌** - 查看詳細的錯誤訊息
2. **環境變數** - 確認所有必要變數已設定
3. **資料庫服務** - 確認 PostgreSQL 正在運行
4. **網路連線** - 測試 API 健康檢查端點

---

**文件版本**: 1.0
**最後更新**: 2025-01-13
**適用系統版本**: Patient CRM v1.0+
