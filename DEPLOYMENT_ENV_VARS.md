# 線上部署環境變數配置指南

## ⚠️ 安全修復後的必要環境變數

部署到生產環境（Zeabur 或其他平台）時，**必須**設置以下環境變數：

---

## 🔐 關鍵安全變數（必須設置）

### 1. JWT_SECRET（必須）
```bash
JWT_SECRET=your-generated-secure-random-secret-here
```

**重要性**: ⭐⭐⭐⭐⭐ Critical
**如何生成**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**示例值**:
```
edaf71fb3aac691bad686d0ae01f8d44419b9cc1a5f0d5f2765a01ec84a3f2e4
```

**⚠️ 注意**:
- 此變數未設置時，系統將拒絕啟動
- 請使用 32 字符以上的隨機字符串
- 絕不要使用預設值或示例值

---

### 2. ALLOWED_ORIGINS（強烈建議）
```bash
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

**重要性**: ⭐⭐⭐⭐ High
**說明**: CORS 允許的來源清單（逗號分隔）

**Zeabur 部署示例**:
```bash
ALLOWED_ORIGINS=https://your-app.zeabur.app,https://your-custom-domain.com
```

**⚠️ 注意**:
- 未設置時，開發環境會允許 localhost 和 devtunnels.ms
- 生產環境請明確設置，避免安全風險

---

## 📊 資料庫配置

### PostgreSQL（Zeabur 推薦）

**方式 1: 使用 DATABASE_URL（推薦）**
```bash
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:port/database
```

Zeabur 會自動注入 `DATABASE_URL`，通常不需手動設置。

**方式 2: 分開配置**
```bash
DATABASE_TYPE=postgres
DATABASE_HOST=your-postgres-host.zeabur.internal
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=patient_crm
```

### SQLite（本地開發）
```bash
DATABASE_TYPE=sqlite
DATABASE_PATH=data/patient_crm.db
```

---

## 🔑 超級管理員配置

### SUPER_ADMIN_PASSWORD
```bash
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

**重要性**: ⭐⭐⭐⭐ High
**說明**: 首次啟動時創建的超級管理員密碼

**⚠️ 安全建議**:
1. 使用強密碼（至少 8 字符，包含大小寫、數字）
2. 部署後立即登入並修改密碼
3. 不要在代碼或文檔中暴露此密碼

---

## 🌐 應用配置

### NODE_ENV
```bash
NODE_ENV=production
```

**可選值**: `development`, `production`

### PORT
```bash
PORT=3001
```

Zeabur 會自動設置，通常不需手動配置。

---

## 📧 郵件服務（可選）

如需啟用郵件通知功能：

```bash
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@patient-crm.com
```

---

## 📱 SMS 服務（可選）

如需啟用簡訊通知功能：

```bash
ENABLE_SMS_NOTIFICATIONS=true
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-api-secret
```

---

## 🎯 Zeabur 完整配置範例

在 Zeabur 的環境變數面板中設置：

```bash
# 必須設置
JWT_SECRET=edaf71fb3aac691bad686d0ae01f8d44419b9cc1a5f0d5f2765a01ec84a3f2e4

# 安全配置
ALLOWED_ORIGINS=https://your-app.zeabur.app,https://your-domain.com

# 資料庫（Zeabur 會自動注入 DATABASE_URL）
DATABASE_TYPE=postgres

# 超級管理員
SUPER_ADMIN_PASSWORD=YourSecurePassword123!

# 應用配置
NODE_ENV=production

# 可選：郵件服務
ENABLE_EMAIL_NOTIFICATIONS=false
```

---

## ✅ 部署前檢查清單

部署到生產環境前，請確保：

- [ ] ✅ JWT_SECRET 已設置為安全的隨機字符串
- [ ] ✅ ALLOWED_ORIGINS 已設置為實際域名
- [ ] ✅ DATABASE_TYPE 設置為 postgres
- [ ] ✅ SUPER_ADMIN_PASSWORD 已設置為強密碼
- [ ] ✅ NODE_ENV 設置為 production
- [ ] ✅ 所有敏感信息未暴露在代碼庫中
- [ ] ✅ .env 文件已加入 .gitignore

---

## 🔄 部署後操作

1. **立即修改超級管理員密碼**
   - 使用 SUPER_ADMIN_PASSWORD 登入
   - 進入設置頁面修改密碼

2. **驗證安全配置**
   - 測試 CORS 設置是否正確
   - 驗證 JWT token 是否正常工作
   - 測試請求限流是否生效

3. **創建組織管理員**
   - 為每個組織創建專屬管理員
   - 分配適當權限

---

## 🆘 故障排除

### 問題: 系統啟動失敗，提示 "JWT_SECRET is not set"
**解決**: 在環境變數中添加 JWT_SECRET

### 問題: CORS 錯誤
**解決**: 檢查 ALLOWED_ORIGINS 是否包含前端域名

### 問題: 資料庫連接失敗
**解決**:
1. 檢查 DATABASE_TYPE 是否設置為 postgres
2. 驗證 DATABASE_URL 或各資料庫配置項是否正確
3. 檢查 Zeabur 資料庫服務是否正常運行

---

## 📞 需要協助？

如遇到部署問題，請檢查：
1. Zeabur 應用日誌
2. 環境變數是否正確設置
3. 資料庫服務是否正常運行
4. [SECURITY_FIXES_P0.md](./SECURITY_FIXES_P0.md) 中的安全修復是否完整
