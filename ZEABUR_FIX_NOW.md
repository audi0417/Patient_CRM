# ⚡ Zeabur 立即修復步驟

## 🎯 問題
```
Error: connect ECONNREFUSED ::1:5432
```
應用程式正在嘗試連接 localhost，而不是 Zeabur 的 PostgreSQL。

## ✅ 解決方案（5 分鐘內完成）

### 步驟 1：開啟 Zeabur Dashboard
1. 前往 https://dash.zeabur.com
2. 選擇你的專案
3. 點擊你的 **app** 服務（不是 postgres 服務）

### 步驟 2：新增環境變數
點擊 **「Variables」** 或 **「Environment Variables」** 標籤

點擊 **「Add Variable」** 按鈕，逐一新增以下 5 個變數：

#### 變數 1:
```
Name:  DATABASE_TYPE
Value: postgres
```

#### 變數 2:
```
Name:  NODE_ENV
Value: production
```

#### 變數 3:
```
Name:  PORT
Value: 3001
```

#### 變數 4:
```
Name:  JWT_SECRET
Value: your-secret-key-at-least-32-characters-long
```
（請改成你自己的安全金鑰，至少 32 個字元）

#### 變數 5:
```
Name:  SUPER_ADMIN_PASSWORD
Value: YourSecurePassword123!
```
（請改成你自己的安全密碼）

### 步驟 3：連接 PostgreSQL 服務
1. 在 app 服務頁面，尋找 **「Service Connections」** 或 **「連接服務」**
2. 點擊 **「Connect Service」** 或 **「+」**
3. 選擇你的 **PostgreSQL** 服務
4. 點擊 **「Connect」** 或 **「連接」**

連接後，`DATABASE_URL` 會自動出現在環境變數中。

### 步驟 4：儲存並重新部署
1. 確認所有 5 個環境變數都已新增
2. 確認 PostgreSQL 服務已連接（會看到 DATABASE_URL）
3. 點擊 **「Redeploy」** 按鈕
4. 等待 2-3 分鐘

### 步驟 5：檢查日誌
部署完成後，查看日誌應該會看到：

```
🔍 環境變數檢查:
  NODE_ENV: production
  DATABASE_TYPE: postgres
  DATABASE_HOST: postgres
  DATABASE_URL: defined

📊 資料庫類型: postgres
🔗 使用 DATABASE_URL 連接 PostgreSQL

🗄️  初始化數據庫...
✅ 數據庫初始化完成

Server running on port 3001
```

## ⚠️ 重要提醒

1. **環境變數必須在 Dashboard 中設定**
   - `zeabur.json` 中的 env 設定不會自動生效
   - 必須手動在 Variables 介面中新增

2. **必須連接 PostgreSQL 服務**
   - 使用 Service Connections 功能連接
   - 這樣 DATABASE_URL 會自動注入

3. **設定後必須 Redeploy**
   - 環境變數變更不會自動生效
   - 必須手動點擊 Redeploy

## ❌ 如果仍然失敗

### 檢查 1：PostgreSQL 服務狀態
1. 點擊 PostgreSQL 服務
2. 確認狀態是 **「Running」**（綠色）
3. 如果不是，點擊 **「Start」**

### 檢查 2：環境變數位置
確認環境變數是設定在 **app 服務**，不是 PostgreSQL 服務：
- ✅ 在 app 服務的 Variables 中
- ❌ 在 postgres 服務的 Variables 中

### 檢查 3：DATABASE_URL 是否存在
在 app 服務的 Variables 中：
- ✅ 應該看到 `DATABASE_URL` 變數
- ✅ 值應該類似：`postgresql://user:password@postgres:5432/patient_crm`
- ❌ 如果沒有，表示服務連接失敗，重新執行步驟 3

### 檢查 4：日誌輸出
查看部署日誌：
- ✅ 應該看到 `🔍 環境變數檢查` 的輸出
- ✅ `DATABASE_TYPE` 應該是 `postgres`，不是 `undefined`
- ❌ 如果看到 `undefined`，表示環境變數沒有設定成功

## 📸 需要協助時提供的資訊

如果完成以上步驟仍然失敗，請提供：

1. **App 服務的 Variables 頁面截圖**
   - 顯示所有環境變數（可以遮蔽密碼）
   - 確認 DATABASE_TYPE 和 DATABASE_URL 都存在

2. **PostgreSQL 服務狀態截圖**
   - 顯示服務是否在運行

3. **完整的部署日誌**
   - 從開始到錯誤的所有輸出
   - 特別注意是否有 `🔍 環境變數檢查` 的輸出

---

**關鍵點**：zeabur.json 中的環境變數設定不會自動生效，你必須在 Zeabur Dashboard 的 Variables 介面中手動設定！

**更新時間**：2025-11-11
