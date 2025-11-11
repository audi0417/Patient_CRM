# 🔍 Zeabur 部署調試指南

## 當前問題

錯誤：`ECONNREFUSED ::1:5432`

**這表示**：應用正在嘗試連接到 localhost（::1 是 IPv6 的 localhost），而不是 Zeabur 的 PostgreSQL 服務。

## 🎯 根本原因

環境變數未被正確讀取。日誌中沒有看到「🔍 環境變數檢查」的輸出，表示：

1. ❌ 環境變數沒有在 Zeabur Dashboard 中設定
2. ❌ 或者設定了但沒有生效
3. ❌ 或者應用在環境變數載入前就崩潰了

## ✅ 解決步驟

### 步驟 1：在 Zeabur Dashboard 設定環境變數

**這是最關鍵的步驟！**

1. 登入 [Zeabur Dashboard](https://dash.zeabur.com)
2. 選擇你的專案
3. 點擊你的**應用服務**（不是 PostgreSQL 服務）
4. 找到「**Variables**」或「**Environment Variables**」標籤
5. 點擊「**Add Variable**」或「**+**」按鈕

### 步驟 2：逐一新增以下變數

**複製貼上以下內容**：

| Name | Value |
|------|-------|
| `DATABASE_TYPE` | `postgres` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `JWT_SECRET` | `your-secret-key-at-least-32-chars` |
| `SUPER_ADMIN_PASSWORD` | `YourPassword123!` |

### 步驟 3：檢查 DATABASE_URL

在同一個 Variables 頁面：

1. **查看是否有 `DATABASE_URL` 變數**
2. 如果有，它的值應該類似：
   ```
   postgresql://username:password@postgres.something:5432/patient_crm
   ```
3. 如果**沒有** `DATABASE_URL`：

#### 方案 A：連接 PostgreSQL 服務

1. 在應用服務頁面尋找「**Connect Service**」或「**連接服務**」
2. 選擇你的 PostgreSQL 服務
3. 連接後，`DATABASE_URL` 會自動出現

#### 方案 B：手動新增資料庫參數

如果無法自動連接，手動新增：

| Name | Value |
|------|-------|
| `DATABASE_HOST` | `postgres` 或你的 PostgreSQL 服務名稱 |
| `DATABASE_PORT` | `5432` |
| `DATABASE_NAME` | `patient_crm` |
| `DATABASE_USER` | 從 PostgreSQL 服務取得 |
| `DATABASE_PASSWORD` | 從 PostgreSQL 服務取得 |

**獲取 PostgreSQL 連線資訊**：
1. 點擊 PostgreSQL 服務
2. 查看「Instructions」或「Connection Info」
3. 複製相關資訊

### 步驟 4：儲存並重新部署

1. 點擊「**Save**」（如果有）
2. 回到應用服務頁面
3. 點擊「**Redeploy**」按鈕
4. **等待完整部署**（約 2-5 分鐘）

### 步驟 5：檢查新的日誌

部署完成後，查看日誌應該會看到：

```
🔍 環境變數檢查:
  NODE_ENV: production
  DATABASE_TYPE: postgres
  DATABASE_HOST: postgres （或其他主機名）
  DATABASE_URL: defined

📊 資料庫類型: postgres
🔗 使用 DATABASE_URL 連接 PostgreSQL
```

如果仍然沒有看到這些輸出，繼續下一步。

## 🔧 進階調試

### 檢查 1：確認變數在正確的服務

**常見錯誤**：在 PostgreSQL 服務設定了變數，而不是在應用服務。

**正確做法**：
- `DATABASE_TYPE` 等變數應該設定在**應用服務**（app）
- 不要設定在 PostgreSQL 服務

### 檢查 2：變數名稱正確

確認變數名稱**完全一致**（區分大小寫）：
- ✅ `DATABASE_TYPE`
- ❌ `database_type`
- ❌ `Database_Type`

### 檢查 3：沒有多餘的空格

變數值前後不要有空格：
- ✅ `postgres`
- ❌ ` postgres `（前後有空格）

### 檢查 4：PostgreSQL 服務正在運行

1. 點擊 PostgreSQL 服務
2. 確認狀態是「**Running**」（綠色）
3. 如果是「Stopped」或「Error」，點擊「Start」

## 📸 截圖指南

如果仍然失敗，請檢查：

1. **應用服務的 Variables 頁面截圖**
   - 顯示所有設定的環境變數
   - 確認 `DATABASE_TYPE=postgres` 存在

2. **PostgreSQL 服務狀態**
   - 確認服務正在運行

3. **完整的部署日誌**
   - 從開始到錯誤發生的所有日誌

## 🎯 快速檢查清單

在重新部署前，確認：

- [ ] 已在**應用服務**（不是 PostgreSQL）的 Variables 中設定環境變數
- [ ] `DATABASE_TYPE` 設為 `postgres`（不是 `postgresql`）
- [ ] `NODE_ENV` 設為 `production`
- [ ] PostgreSQL 服務狀態為 Running
- [ ] 已點擊 Save（如果需要）
- [ ] 已點擊 Redeploy
- [ ] 等待至少 3 分鐘讓部署完成

## 💡 替代方案：使用 Docker Compose

如果 Zeabur 的環境變數設定有問題，可以考慮：

1. 檢查 Zeabur 文件關於環境變數的說明
2. 使用 Zeabur CLI 設定環境變數
3. 或改用 Railway、Render 等其他平台

## 📞 聯繫支援

如果以上都無法解決：

1. Zeabur Discord: https://discord.gg/zeabur
2. Zeabur 文件: https://zeabur.com/docs
3. 提供以下資訊：
   - 完整錯誤日誌
   - Variables 頁面截圖
   - PostgreSQL 服務狀態

---

**關鍵提示**：環境變數**必須**在 Zeabur Dashboard 的 Variables 介面中設定，設定後**必須** Redeploy！

**更新時間**: 2024-11-11
