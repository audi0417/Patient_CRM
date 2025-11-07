# P0 功能快速啟動指南

**版本**: 1.0.0
**更新日期**: 2025-11-07

---

## 🚀 快速啟動

### 方式一: 同時啟動前後端 (推薦)

```bash
npm run dev:full
```

這將同時啟動:
- 後端 API 服務器 (Port 3001)
- 前端開發服務器 (Port 8080)

訪問: [http://localhost:8080](http://localhost:8080)

### 方式二: 分別啟動

**終端 1 - 啟動後端**:
```bash
npm run server
```

**終端 2 - 啟動前端**:
```bash
npm run dev
```

---

## 🔐 預設登入資訊

- **使用者名稱**: `admin`
- **密碼**: `Admin123`

---

## ✨ P0 新功能測試

### 1. 測試後端 API 連接

**健康檢查**:
```bash
curl http://localhost:3001/api/health-check
```

**應該返回**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T..."
}
```

### 2. 測試密碼修改功能

#### 步驟:
1. 登入系統 (使用 admin / Admin123)
2. 點擊右上角使用者頭像
3. 選擇「設定」
4. 在「帳號安全」區塊找到「修改密碼」按鈕
5. 點擊後會開啟對話框

#### 測試案例:

**案例 1: 舊密碼錯誤**
- 舊密碼: `WrongPass`
- 新密碼: `NewPass123`
- 確認密碼: `NewPass123`
- **預期**: 顯示「舊密碼錯誤」

**案例 2: 新密碼格式錯誤**
- 舊密碼: `Admin123`
- 新密碼: `short` (太短)
- 確認密碼: `short`
- **預期**: 顯示「密碼長度至少需要 8 個字元」

**案例 3: 新密碼與舊密碼相同**
- 舊密碼: `Admin123`
- 新密碼: `Admin123`
- 確認密碼: `Admin123`
- **預期**: 顯示「新密碼不能與舊密碼相同」

**案例 4: 密碼不一致**
- 舊密碼: `Admin123`
- 新密碼: `NewPass123`
- 確認密碼: `NewPass456`
- **預期**: 顯示「新密碼與確認密碼不一致」

**案例 5: 正常修改 (✅ 成功)**
- 舊密碼: `Admin123`
- 新密碼: `NewPass123`
- 確認密碼: `NewPass123`
- **預期**:
  - 顯示成功訊息
  - 對話框自動關閉
  - 下次登入需使用新密碼

### 3. 測試諮詢記錄功能

#### 前置條件:
先創建一個測試患者或使用現有患者。

#### 步驟:

**創建諮詢記錄**:
1. 進入患者列表
2. 點擊任一患者進入詳細頁面
3. 找到「諮詢記錄」區塊或標籤
4. 點擊「新增諮詢記錄」
5. 填寫資訊:
   ```
   日期: 2025-11-07
   類型: 初診/復診/追蹤
   主訴: 患者主要訴求
   評估: 營養師評估
   計畫: 治療或飲食計畫
   備註: 其他備註
   ```
6. 點擊「儲存」
7. **預期**: 記錄成功創建並顯示在列表中

**查看諮詢記錄**:
- 記錄應按日期降序排列
- 顯示所有欄位資訊

**編輯諮詢記錄**:
1. 點擊任一記錄的「編輯」按鈕
2. 修改任意欄位
3. 點擊「儲存」
4. **預期**: 記錄更新成功

**刪除諮詢記錄**:
1. 點擊任一記錄的「刪除」按鈕
2. 確認刪除
3. **預期**: 記錄從列表中移除

---

## 🧪 API 測試

### 使用 curl 測試

**1. 登入獲取 Token**:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123"
  }'
```

**保存返回的 token**:
```json
{
  "success": true,
  "user": {...},
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "登入成功"
}
```

**2. 測試修改密碼**:
```bash
export TOKEN="YOUR_TOKEN_HERE"

curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "oldPassword": "Admin123",
    "newPassword": "NewPass123"
  }'
```

**3. 測試諮詢記錄 API**:

**獲取所有諮詢記錄**:
```bash
curl http://localhost:3001/api/consultations \
  -H "Authorization: Bearer $TOKEN"
```

**創建諮詢記錄**:
```bash
curl -X POST http://localhost:3001/api/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "patientId": "patient_1234567890",
    "date": "2025-11-07",
    "type": "初診",
    "chiefComplaint": "體重管理",
    "assessment": "BMI 偏高",
    "plan": "飲食控制計畫",
    "notes": "每週追蹤"
  }'
```

**獲取特定患者的諮詢記錄**:
```bash
curl "http://localhost:3001/api/consultations?patientId=patient_1234567890" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 常見問題

### Q1: 無法連接到後端 API

**檢查清單**:
1. 確認後端正在運行: `ps aux | grep node`
2. 檢查端口: `lsof -i :3001`
3. 測試健康檢查: `curl http://localhost:3001/api/health-check`

**解決方案**:
```bash
# 重新啟動後端
npm run server
```

### Q2: 密碼修改後無法登入

**原因**: 密碼已成功更新,需使用新密碼登入

**解決方案**:
1. 使用新密碼登入
2. 如果忘記新密碼,聯繫管理員重設

### Q3: 諮詢記錄無法保存

**檢查清單**:
1. 確認 token 有效
2. 確認患者 ID 正確
3. 確認必填欄位已填寫 (patientId, date)

**查看錯誤**:
- 開啟瀏覽器開發者工具
- 查看 Console 和 Network 標籤
- 檢查 API 回應狀態碼

### Q4: 編譯錯誤

```bash
# 清除快取並重新安裝
rm -rf node_modules package-lock.json
npm install

# 重新編譯
npm run build
```

---

## 📊 系統狀態檢查

### 檢查腳本

創建 `check-system.sh`:
```bash
#!/bin/bash

echo "🔍 檢查 Patient CRM 系統狀態..."
echo ""

# 1. 檢查後端
echo "1️⃣ 檢查後端 API..."
if curl -s http://localhost:3001/api/health-check > /dev/null; then
    echo "✅ 後端 API 正常運行"
else
    echo "❌ 後端 API 無法連接"
fi
echo ""

# 2. 檢查前端
echo "2️⃣ 檢查前端..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ 前端正常運行"
else
    echo "❌ 前端無法連接"
fi
echo ""

# 3. 檢查資料庫
echo "3️⃣ 檢查資料庫..."
if [ -f "data/patient_crm.db" ]; then
    echo "✅ 資料庫檔案存在"
    echo "   檔案大小: $(du -h data/patient_crm.db | cut -f1)"
else
    echo "❌ 資料庫檔案不存在"
fi
echo ""

echo "✨ 檢查完成"
```

**執行**:
```bash
chmod +x check-system.sh
./check-system.sh
```

---

## 📝 功能清單

### ✅ 已完成的 P0 功能

- [x] 後端 API 完全遷移
  - [x] 認證 API (5 個端點)
  - [x] 使用者管理 API (6 個端點)
  - [x] 患者管理 API (5 個端點)
  - [x] 健康數據 API (8 個端點)
  - [x] 健康目標 API (6 個端點)
  - [x] 預約管理 API (5 個端點)
  - [x] 諮詢記錄 API (6 個端點)

- [x] 密碼修改功能
  - [x] 後端 API 端點
  - [x] 前端對話框組件
  - [x] 表單驗證
  - [x] 密碼規則檢查

- [x] 諮詢記錄功能
  - [x] 後端 CRUD API
  - [x] 前端整合
  - [x] 資料庫索引優化

---

## 🎯 下一步

完成 P0 測試後,可以開始實施 P1 優先級功能:

1. **數據匯入功能** - CSV/Excel 批量匯入
2. **報表生成系統** - PDF 報告生成
3. **通知系統強化** - Email/SMS 提醒

---

## 📞 支援

如遇問題,請查看:
- [P0_COMPLETION_REPORT.md](./P0_COMPLETION_REPORT.md) - 完整實施報告
- [BACKEND_MIGRATION_GUIDE.md](./BACKEND_MIGRATION_GUIDE.md) - 後端遷移指南
- [QUICK_START_BACKEND.md](./QUICK_START_BACKEND.md) - 後端快速指南

---

**祝測試順利!** 🎉
