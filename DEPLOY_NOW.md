# 🚀 立即部署到 Zeabur

## 問題診斷

您遇到的錯誤：`ECONNREFUSED ::1:5432`

**原因**：應用無法連接到 PostgreSQL，可能是：
1. 環境變數未正確設定
2. PostgreSQL 服務未啟動
3. 主機名稱配置錯誤

## ✅ 解決方案

### 步驟 1：在 Zeabur Dashboard 設定環境變數

**⚠️ 關鍵步驟：必須在 Dashboard 介面中設定！**

1. 登入 [Zeabur Dashboard](https://dash.zeabur.com)
2. 選擇你的專案
3. 點擊你的應用服務（app）
4. 點擊「Variables」標籤

### 步驟 2：新增以下環境變數

```bash
# 必須設定
DATABASE_TYPE=postgres
NODE_ENV=production
PORT=3001

# 認證配置（請修改為安全的值）
JWT_SECRET=your-production-secret-key-at-least-32-characters
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

### 步驟 3：使用 Zeabur 的 DATABASE_URL

Zeabur 會自動將 PostgreSQL 服務連線資訊注入為 `DATABASE_URL` 環境變數。

**確認方式**：
1. 在應用的 Variables 中查看
2. 應該會看到 `DATABASE_URL` 自動出現
3. 格式類似：`postgresql://user:password@postgres.zeabur.internal:5432/patient_crm`

### 步驟 4：確認 PostgreSQL 服務

1. 在 Zeabur Dashboard 中檢查 PostgreSQL 服務狀態
2. 確保狀態為「Running」（綠色）
3. 如果未運行，點擊啟動

### 步驟 5：重新部署

1. 點擊應用服務的「Redeploy」按鈕
2. 等待構建完成
3. 查看部署日誌

## 📊 預期日誌輸出

成功部署後，日誌應該顯示：

```
🔍 環境變數檢查:
  NODE_ENV: production
  DATABASE_TYPE: postgres
  DATABASE_HOST: postgres （或其他主機名）
  DATABASE_URL: defined

📊 資料庫類型: postgres
🔗 使用 DATABASE_URL 連接 PostgreSQL

🗄️  初始化數據庫...
📋 建立資料表結構...
⚡ 建立索引...
✅ 數據庫初始化完成

Server running on port 3001
```

## 🔧 如果仍然失敗

### 檢查清單

- [ ] PostgreSQL 服務正在運行
- [ ] 已在 Dashboard 設定 `DATABASE_TYPE=postgres`
- [ ] 已設定 `NODE_ENV=production`
- [ ] 已設定 `JWT_SECRET` 和 `SUPER_ADMIN_PASSWORD`
- [ ] 已點擊 Redeploy
- [ ] 等待至少 2 分鐘讓服務完全啟動

### 方案 A：使用 Zeabur 的 PostgreSQL 服務連結功能

1. 在 Dashboard 中
2. 點擊應用服務
3. 尋找「Service Connections」或「連接服務」
4. 將 PostgreSQL 服務連接到應用
5. Zeabur 會自動設定 `DATABASE_URL`

### 方案 B：手動設定完整的資料庫參數

如果 `DATABASE_URL` 沒有自動注入，在 Variables 中新增：

```bash
DATABASE_TYPE=postgres
DATABASE_HOST=postgres.zeabur.internal
DATABASE_PORT=5432
DATABASE_NAME=patient_crm
DATABASE_USER=你的使用者名稱
DATABASE_PASSWORD=你的密碼
```

**獲取這些資訊**：
1. 點擊 PostgreSQL 服務
2. 查看「Connection」或「連線資訊」
3. 複製相關參數

### 方案 C：使用內建的 PostgreSQL 服務發現

Zeabur 支援服務發現，主機名稱可能是：
- `postgres`
- `postgres.zeabur.internal`
- PostgreSQL 服務的完整內部 DNS 名稱

在 Variables 中設定：
```bash
DATABASE_HOST=postgres
```

然後重新部署。

## 🐛 調試步驟

### 1. 查看完整日誌

在 Zeabur Dashboard：
1. 點擊應用服務
2. 查看「Logs」標籤
3. 尋找 `🔍 環境變數檢查` 的輸出
4. 確認所有環境變數都有正確的值

### 2. 檢查環境變數是否生效

在日誌中應該看到：
```
  DATABASE_TYPE: postgres （不是 undefined）
  DATABASE_HOST: postgres （不是 undefined 或 localhost）
```

如果看到 `undefined`，表示環境變數未設定。

### 3. 測試 PostgreSQL 連線

在 Zeabur Terminal（如果可用）：
```bash
# 測試 PostgreSQL 服務是否可達
nc -zv postgres 5432

# 或
telnet postgres 5432
```

## 📝 快速修復命令

如果需要重新提交程式碼：

```bash
# 1. 確保所有檔案已更新
git add .

# 2. 提交變更
git commit -m "fix: 新增環境變數偵錯，修正 Zeabur 部署問題"

# 3. 推送到 GitHub
git push origin main

# 4. Zeabur 會自動重新部署（如果啟用自動部署）
# 或在 Dashboard 手動點擊 Redeploy
```

## 🎯 成功標準

部署成功後：

1. **健康檢查通過**：
   ```
   https://your-app.zeabur.app/api/health-check
   ```
   返回：`{"status":"ok","timestamp":"..."}`

2. **可以訪問應用**：
   ```
   https://your-app.zeabur.app
   ```

3. **可以登入**：
   - 帳號：`superadmin`
   - 密碼：您設定的 `SUPER_ADMIN_PASSWORD`

## 📚 相關文件

- [ZEABUR_ENV_SETUP.md](ZEABUR_ENV_SETUP.md) - 環境變數設定詳解
- [docs/ZEABUR_TROUBLESHOOTING.md](docs/ZEABUR_TROUBLESHOOTING.md) - 完整疑難排解
- [POSTGRESQL_QUICKSTART.md](POSTGRESQL_QUICKSTART.md) - 快速入門指南

## 💬 需要協助？

如果問題持續：

1. 在 Zeabur Dashboard 複製完整的錯誤日誌
2. 檢查是否有 `🔍 環境變數檢查` 的輸出
3. 確認 DATABASE_TYPE 的值
4. 查看 ZEABUR_TROUBLESHOOTING.md 中的對應錯誤

---

**最後更新**: 2024-11-11
**狀態**: 準備部署
**關鍵**: 環境變數必須在 Zeabur Dashboard 中設定！
