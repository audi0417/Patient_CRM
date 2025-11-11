# Zeabur 環境變數設定指南

## ⚠️ 重要提醒

**Zeabur 的環境變數必須在 Dashboard 中設定，不能只寫在 zeabur.json 中！**

## 📋 必須設定的環境變數

在 Zeabur Dashboard 的「Environment Variables」中新增以下變數：

### 1. 資料庫配置（必須）

```bash
DATABASE_TYPE=postgres
```

### 2. 應用配置（必須）

```bash
NODE_ENV=production
PORT=3001
```

### 3. 認證配置（必須）

```bash
JWT_SECRET=your-production-secret-key-at-least-32-characters
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

## 🔄 兩種資料庫連線方式

### 方式 A：使用 Zeabur 自動注入的 DATABASE_URL（推薦）

Zeabur 會自動將 PostgreSQL 服務的連線資訊注入為 `DATABASE_URL`。

**只需設定**：
```bash
DATABASE_TYPE=postgres
```

Zeabur 自動提供：
- `DATABASE_URL=postgresql://user:password@host:port/database`

### 方式 B：手動設定所有參數

如果 `DATABASE_URL` 沒有自動注入，手動設定：

```bash
DATABASE_TYPE=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=patient_crm
DATABASE_USER=你的使用者名稱
DATABASE_PASSWORD=你的密碼
```

**注意**：
- `DATABASE_HOST` 應該是 Zeabur PostgreSQL 服務的內部名稱（通常是 `postgres`）
- 不要使用 `localhost`

## 🚀 設定步驟

### 步驟 1：進入 Zeabur Dashboard

1. 登入 [Zeabur](https://dash.zeabur.com)
2. 選擇你的專案
3. 點擊你的應用服務

### 步驟 2：新增環境變數

1. 點擊「Variables」或「Environment」標籤
2. 點擊「Add Variable」
3. 逐一新增以上環境變數

### 步驟 3：檢查 PostgreSQL 服務

1. 確認 PostgreSQL 服務正在運行
2. 記下服務名稱（通常是 `postgres`）
3. 確認 DATABASE_URL 是否已自動注入

### 步驟 4：重新部署

設定完環境變數後：
1. 點擊「Redeploy」
2. 等待部署完成
3. 查看日誌確認連線成功

## 🔍 驗證設定

部署後，在日誌中應該看到：

```
🔍 環境變數檢查:
  NODE_ENV: production
  DATABASE_TYPE: postgres
  DATABASE_HOST: postgres （或從 DATABASE_URL 讀取）
  DATABASE_NAME: patient_crm
  ...

📊 資料庫類型: postgres
🔗 使用 DATABASE_URL 連接 PostgreSQL （或）
🔗 連接到 PostgreSQL: user@postgres:5432/patient_crm

🗄️  初始化數據庫...
✅ 數據庫初始化完成
```

## ❌ 常見錯誤

### 錯誤 1：ECONNREFUSED ::1:5432

**原因**：環境變數未設定，應用嘗試連接到 localhost

**解決方案**：
1. 在 Zeabur Dashboard 中設定 `DATABASE_TYPE=postgres`
2. 確保其他資料庫環境變數也已設定
3. 重新部署

### 錯誤 2：Environment variable not found

**原因**：環境變數只寫在 zeabur.json 中

**解決方案**：
- **必須**在 Zeabur Dashboard 的 Variables 介面中設定
- zeabur.json 中的 env 只是範例，不會實際生效

### 錯誤 3：連線到錯誤的主機

**原因**：DATABASE_HOST 設定為 localhost 或 127.0.0.1

**解決方案**：
- 使用 Zeabur PostgreSQL 服務的內部名稱（通常是 `postgres`）
- 或使用 DATABASE_URL（推薦）

## 📝 完整環境變數範例

在 Zeabur Dashboard 中設定：

```bash
# 應用配置
NODE_ENV=production
PORT=3001

# 資料庫配置（方式 A：使用 DATABASE_URL）
DATABASE_TYPE=postgres
# DATABASE_URL 由 Zeabur 自動注入

# 認證配置
JWT_SECRET=production-secret-key-change-this-to-something-secure
SUPER_ADMIN_PASSWORD=SecurePassword123!

# 可選配置
API_ENDPOINT=https://your-app.zeabur.app
CLIENT_URL=https://your-app.zeabur.app
```

## 🔐 安全建議

1. **JWT_SECRET**：
   - 使用至少 32 個字符的隨機字串
   - 可以使用：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

2. **SUPER_ADMIN_PASSWORD**：
   - 使用強密碼
   - 包含大小寫字母、數字和特殊符號
   - 至少 12 個字符

3. **DATABASE_PASSWORD**：
   - 使用 Zeabur 自動生成的密碼
   - 不要在程式碼中硬編碼

## 🔄 更新環境變數

如果需要修改環境變數：

1. 在 Zeabur Dashboard 中修改
2. 點擊「Save」
3. **必須重新部署**應用才會生效
4. 點擊「Redeploy」

## ✅ 檢查清單

部署前確認：

- [ ] 已在 Zeabur Dashboard 設定 DATABASE_TYPE=postgres
- [ ] 已設定 NODE_ENV=production
- [ ] 已設定 JWT_SECRET
- [ ] 已設定 SUPER_ADMIN_PASSWORD
- [ ] PostgreSQL 服務正在運行
- [ ] DATABASE_URL 已自動注入（或手動設定所有資料庫參數）
- [ ] 已點擊 Redeploy

---

**重要**: 環境變數的變更需要重新部署才會生效！

**更新時間**: 2024-11-11
