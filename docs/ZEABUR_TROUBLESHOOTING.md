# Zeabur 部署疑難排解指南

本指南幫助您解決在 Zeabur 上部署 Patient CRM 時可能遇到的問題。

## 常見問題

### 1. 構建失敗：找不到 vite 命令

**錯誤訊息**:
```
sh: vite: not found
ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 127
```

**原因**:
- Dockerfile 在構建階段沒有正確安裝 devDependencies
- vite 是在 devDependencies 中，構建前端需要

**解決方案**:

1. **確認 Dockerfile 正確** (已修復):
   ```dockerfile
   # 構建階段 - 必須安裝所有依賴
   RUN npm ci --include=dev
   ```

2. **檢查 package.json**:
   ```json
   {
     "devDependencies": {
       "vite": "^5.4.19"  // 確認 vite 存在
     }
   }
   ```

3. **重新提交並部署**:
   ```bash
   git add Dockerfile
   git commit -m "fix: 修正 Docker 構建配置"
   git push origin main
   ```

### 2. 資料庫連線失敗

**錯誤訊息**:
```
Error: Connection refused
ECONNREFUSED
```

**解決方案**:

#### 步驟 1: 確認 PostgreSQL 服務已啟動
1. 在 Zeabur Dashboard 檢查 PostgreSQL 服務狀態
2. 確保服務顯示為 "Running"

#### 步驟 2: 檢查環境變數
在 Zeabur 專案設定中確認以下環境變數：

```bash
DATABASE_TYPE=postgres
DATABASE_HOST=postgres  # Zeabur 內部服務名稱
DATABASE_PORT=5432
DATABASE_NAME=patient_crm
DATABASE_USER=patient_user
DATABASE_PASSWORD=your_password
```

#### 步驟 3: 使用 DATABASE_URL（推薦）
Zeabur 會自動注入 `DATABASE_URL`，只需設定：
```bash
DATABASE_TYPE=postgres
# DATABASE_URL 會自動提供
```

### 3. 應用啟動失敗

**錯誤訊息**:
```
Error: Cannot find module...
```

**解決方案**:

1. **確認所有檔案都已提交**:
   ```bash
   git status
   git add .
   git commit -m "確保所有檔案都已提交"
   git push
   ```

2. **檢查 Dockerfile COPY 指令**:
   ```dockerfile
   COPY server ./server
   COPY scripts ./scripts
   COPY package*.json ./
   ```

### 4. 健康檢查失敗

**錯誤訊息**:
```
Health check failed
```

**解決方案**:

1. **檢查端口設定**:
   ```javascript
   // server/index.js
   const PORT = process.env.PORT || 3001;
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

2. **測試健康檢查端點**:
   ```bash
   curl http://your-app.zeabur.app/api/health-check
   ```

   應返回:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-..."
   }
   ```

### 5. 環境變數未生效

**症狀**: 應用仍使用預設值

**解決方案**:

1. **在 Zeabur Dashboard 設定環境變數**
2. **重新部署應用**（環境變數變更需要重新部署）
3. **檢查日誌確認變數已載入**:
   ```bash
   # 在 Zeabur 日誌中應該看到
   📊 資料庫類型: postgres
   🔗 連接到 PostgreSQL: ...
   ```

### 6. 資料庫初始化失敗

**錯誤訊息**:
```
Error: relation "users" does not exist
```

**解決方案**:

1. **確認資料庫初始化執行**:
   - 檢查啟動日誌是否有 "🗄️ 初始化數據庫..."

2. **手動執行遷移** (如需要):
   ```bash
   # 在 Zeabur Terminal 中
   node server/database/migrate.js up
   ```

3. **檢查 PostgreSQL 權限**:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE patient_crm TO patient_user;
   GRANT ALL ON SCHEMA public TO patient_user;
   ```

### 7. 前端無法載入

**症狀**: 訪問網址顯示 404 或空白頁

**解決方案**:

1. **確認前端已構建**:
   - 檢查構建日誌是否成功
   - 確認 `dist` 目錄已創建

2. **檢查靜態文件服務**:
   ```javascript
   // server/index.js
   app.use(express.static(distPath));

   // React Router 支援
   app.get(/^(?!\/api).*/, (req, res) => {
     res.sendFile(path.join(distPath, 'index.html'));
   });
   ```

### 8. CORS 錯誤

**錯誤訊息**:
```
Access to fetch at ... has been blocked by CORS policy
```

**解決方案**:

確認 CORS 設定允許 Zeabur 域名：
```javascript
// server/index.js
app.use(cors({
  origin: true,  // 允許所有來源
  credentials: true
}));
```

## 部署檢查清單

在部署前確認以下項目：

### 1. 代碼準備
- [ ] 所有變更已提交到 Git
- [ ] `package.json` 包含所有必要的依賴
- [ ] `Dockerfile` 正確配置
- [ ] `.dockerignore` 排除不必要的檔案

### 2. Zeabur 配置
- [ ] PostgreSQL 服務已創建並運行
- [ ] 環境變數已正確設定
- [ ] `zeabur.json` 配置正確

### 3. 環境變數必填項
```bash
# 必須設定
DATABASE_TYPE=postgres
NODE_ENV=production
PORT=3001

# 推薦設定
JWT_SECRET=your-production-secret
SUPER_ADMIN_PASSWORD=your-secure-password
```

### 4. 資料庫配置
- [ ] PostgreSQL 服務正常運行
- [ ] 資料庫連線資訊正確
- [ ] 使用者權限已設定

## 查看日誌

### Zeabur Dashboard
1. 進入專案頁面
2. 點擊應用服務
3. 查看 "Logs" 標籤

### 常見日誌訊息

**成功啟動**:
```
🗄️  初始化數據庫...
✅ 數據庫初始化完成
📡 後端服務已啟動
🌐 前端已就緒
Server running on port 3001
```

**資料庫連線成功**:
```
📊 資料庫類型: postgres
🔗 連接到 PostgreSQL: user@host:5432/database
```

**錯誤示例**:
```
❌ 數據庫初始化失敗
PostgreSQL query error: ...
```

## 進階調試

### 1. 連線到 Zeabur Terminal

在 Zeabur Dashboard 中使用 Terminal 功能：

```bash
# 檢查環境變數
env | grep DATABASE

# 測試資料庫連線
node scripts/testPostgresConnection.js

# 查看資料表
node -e "const {dbAdapter} = require('./server/database/db'); dbAdapter.query('SELECT tablename FROM pg_tables WHERE schemaname = \\'public\\'').then(console.log)"
```

### 2. 本地模擬 Zeabur 環境

```bash
# 使用 Docker 本地測試
docker build -t patient-crm .
docker run -p 3001:3001 \
  -e DATABASE_TYPE=postgres \
  -e DATABASE_URL=your-local-postgres-url \
  patient-crm
```

### 3. 檢查構建產物

```bash
# 確認 dist 目錄存在
ls -la dist/

# 檢查關鍵檔案
ls -la dist/index.html
ls -la dist/assets/
```

## 效能優化

### 1. 資料庫連接池

PostgreSQL 適配器已配置連接池：
```javascript
// 預設設定
{
  min: 2,      // 最小連接數
  max: 10,     // 最大連接數
  idleTimeoutMillis: 30000
}
```

### 2. 快取靜態資源

在 Zeabur 中啟用 CDN 快取：
- 靜態資源自動快取
- 設定適當的 Cache-Control headers

### 3. 健康檢查調整

如果應用啟動較慢，調整健康檢查設定：
```json
{
  "healthcheck": {
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "start_period": 30  // 增加啟動寬限期
  }
}
```

## 回滾策略

如果新版本有問題：

### 方法 1: 使用 Git
```bash
# 回滾到上一個版本
git revert HEAD
git push origin main
```

### 方法 2: Zeabur Dashboard
1. 在 Deployments 頁面查看歷史部署
2. 選擇穩定版本
3. 點擊 "Redeploy"

## 監控與警報

### 設定監控

1. **應用監控**:
   - CPU 使用率
   - 記憶體使用率
   - 回應時間

2. **資料庫監控**:
   - 連線數
   - 查詢效能
   - 儲存空間

3. **日誌監控**:
   - 錯誤率
   - 異常日誌
   - 存取日誌

## 獲取幫助

如果問題仍未解決：

1. **檢查文件**:
   - [POSTGRESQL_QUICKSTART.md](../POSTGRESQL_QUICKSTART.md)
   - [POSTGRESQL_MIGRATION.md](./POSTGRESQL_MIGRATION.md)

2. **查看日誌**:
   - Zeabur 應用日誌
   - PostgreSQL 日誌

3. **測試本地環境**:
   ```bash
   # 使用相同配置在本地測試
   DATABASE_TYPE=postgres npm run server
   ```

4. **聯繫支援**:
   - Zeabur 支援: https://zeabur.com/docs
   - 專案 Issues: https://github.com/your-repo/issues

## 成功部署後

### 驗證清單

- [ ] 訪問應用 URL 正常載入
- [ ] 健康檢查端點返回 OK
- [ ] 可以正常登入
- [ ] API 端點正常運作
- [ ] 資料庫連線正常
- [ ] 前端功能正常

### 安全檢查

- [ ] 修改預設超級管理員密碼
- [ ] 設定強密碼策略
- [ ] 啟用 HTTPS（Zeabur 自動提供）
- [ ] 定期備份資料庫

### 維護建議

- 定期查看日誌
- 監控資源使用
- 定期更新依賴
- 定期備份資料庫
- 測試災難恢復流程

---

**更新時間**: 2024-11-11
**版本**: 1.0.0
