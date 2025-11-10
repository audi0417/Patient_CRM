# Seed API 使用指南

## 概述

Seed API 提供了在雲端部署環境中快速加入模擬數據的功能，適用於開發和測試環境。

## API 端點

### 1. 加入模擬數據

**端點：** `POST /api/seed`

**說明：** 在數據庫中加入模擬的患者、預約、健康記錄等數據。

**請求範例：**

```bash
# 使用 curl
curl -X POST https://your-deployment-url.com/api/seed \
  -H "Content-Type: application/json"

# 如果是生產環境，需要加上 force 參數
curl -X POST https://your-deployment-url.com/api/seed \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

**使用 Postman 或 Thunder Client：**
- Method: POST
- URL: `https://your-deployment-url.com/api/seed`
- Headers:
  - Content-Type: application/json
- Body (可選):
  ```json
  {
    "force": true
  }
  ```

**回應範例：**

```json
{
  "success": true,
  "message": "模擬數據插入成功",
  "results": {
    "patients": 5,
    "users": 2,
    "appointments": 15,
    "health_records": 20
  }
}
```

### 2. 檢查數據庫狀態

**端點：** `GET /api/seed/status`

**說明：** 查看當前數據庫中各類數據的數量。

**請求範例：**

```bash
curl https://your-deployment-url.com/api/seed/status
```

**回應範例：**

```json
{
  "success": true,
  "stats": {
    "users": 2,
    "patients": 5,
    "appointments": 15,
    "vital_signs": 20
  }
}
```

### 3. 清空數據（僅開發環境）

**端點：** `DELETE /api/seed`

**說明：** 清空所有測試數據（保留 admin 用戶）。僅在非生產環境可用。

**請求範例：**

```bash
curl -X DELETE https://your-deployment-url.com/api/seed
```

**回應範例：**

```json
{
  "success": true,
  "message": "所有數據已清空"
}
```

## 加入的模擬數據

### 測試用戶
- **admin** / password123（管理員）
- **doctor1** / password123（醫師）

### 患者資料（5 位）
1. 王小明（男，糖尿病、高血壓）
2. 李美玲（女，減重計畫、健身）
3. 張大偉（男，運動傷害、復健）
4. 陳雅婷（女，孕婦照護）
5. 林志明（男，慢性疾病、定期追蹤）

### 其他數據
- 每位患者：2-4 個預約記錄
- 每位患者：3-5 筆健康記錄

## 使用場景

### 場景 1：首次部署到雲端
```bash
# 1. 檢查當前狀態
curl https://your-zeabur-url.com/api/seed/status

# 2. 加入模擬數據
curl -X POST https://your-zeabur-url.com/api/seed

# 3. 再次檢查確認
curl https://your-zeabur-url.com/api/seed/status
```

### 場景 2：重置測試數據
```bash
# 1. 清空現有數據（僅開發環境）
curl -X DELETE https://your-zeabur-url.com/api/seed

# 2. 重新加入模擬數據
curl -X POST https://your-zeabur-url.com/api/seed
```

### 場景 3：使用 JavaScript 觸發
```javascript
// 加入模擬數據
async function seedDatabase() {
  const response = await fetch('https://your-zeabur-url.com/api/seed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();
  console.log('Seed 結果:', result);
}

seedDatabase();
```

## 安全注意事項

1. **生產環境保護**：API 會自動檢查環境變數，生產環境需要額外的 `force` 參數
2. **建議用途**：僅用於開發、測試和展示環境
3. **數據保護**：生產環境建議完全禁用此 API 或設置額外的認證保護

## 環境變數設定

在 `.env` 文件中設定：

```env
NODE_ENV=development  # 或 production
```

- `development`：允許執行 seed 操作
- `production`：需要 `force: true` 參數才能執行

## 錯誤處理

### 常見錯誤

**錯誤 1：生產環境禁止操作**
```json
{
  "error": "生產環境禁止執行 seed 操作，請在請求中加入 { \"force\": true } 參數"
}
```
**解決方法**：在請求 body 中加入 `{"force": true}`

**錯誤 2：數據庫連接失敗**
```json
{
  "error": "Seed 操作失敗",
  "details": "SQLITE_ERROR: ..."
}
```
**解決方法**：檢查數據庫配置和連接狀態

## 本地測試

在本地環境測試 API：

```bash
# 1. 啟動後端服務器
npm run server

# 2. 在另一個終端執行測試
curl -X POST http://localhost:3001/api/seed

# 3. 檢查狀態
curl http://localhost:3001/api/seed/status
```

## 整合到部署流程

### Zeabur 部署後自動執行

可以在部署完成後通過 webhook 或手動執行：

```bash
# 部署完成後執行
curl -X POST https://$(zeabur-service-url)/api/seed
```

或在 Zeabur 環境中設定啟動腳本。

## 技術細節

- **數據生成**：使用隨機函數生成真實感的測試數據
- **日期範圍**：預約和健康記錄涵蓋過去 60-180 天
- **數據關聯**：自動建立患者、預約和健康記錄之間的關聯
- **ID 生成**：使用時間戳和隨機字串確保唯一性

## 相關指令

除了 API 端點，也可以使用 npm 指令（僅本地）：

```bash
# SQLite 版本
npm run seed-sql

# 原始版本
npm run seed-db
```

---

**最後更新：** 2025-11-10
**版本：** 1.0.0
