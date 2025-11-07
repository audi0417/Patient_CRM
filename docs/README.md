# 患者管理系統 (Patient CRM)

一款專為醫療機構設計的單機版客戶關係管理軟體，提供完整的患者資料管理、健康記錄追蹤、預約排程等功能。

## 主要功能

- 患者資料管理：姓名、性別、生日、聯絡方式、醫療資訊、緊急聯絡人、標籤分類
- 健康記錄追蹤：身體組成、生命徵象、健康目標、初始評估
- 預約管理：日曆排程、狀態追蹤、提醒
- 健康數據分析：視覺化趨勢圖表、統計資訊
- 多角色權限控管：超級管理員、管理員、一般使用者
- 資料備份與還原：一鍵備份、還原本地資料庫
- 安全認證機制：密碼加密、JWT Token、路由保護
- 本地化儲存：SQLite（桌面）、localStorage（Web）

## 安裝與啟動

### 桌面版

1. 下載並安裝對應平台的安裝檔（.exe/.dmg/.AppImage）
2. 雙擊執行檔啟動程式
3. 首次啟動自動建立本地 SQLite 資料庫

### 開發模式

1. 安裝 Node.js 與 npm
2. 終端機執行：

   ```bash
   npm install
   npm run dev
   ```

   前端開發伺服器預設 [http://localhost:8080](http://localhost:8080)
3. 若需啟動後端 API：

   ```bash
   npm run server
   ```

   或同時啟動前後端：

   ```bash
   npm run dev:full
   ```

## 新手快速上手

1. 啟動系統後，訪問 [http://localhost:8080](http://localhost:8080)
2. 同步測試帳號（於瀏覽器 Console 執行）：

   ```javascript
   fetch('/data/users.json').then(r=>r.json()).then(users=>{localStorage.setItem('hospital_crm_users',JSON.stringify(users));location.reload()})
   ```

3. 登入：
   - 使用者名稱：`admin`
   - 密碼：`Admin123`
4. 登入後請務必修改密碼，或建立新 Super Admin 並刪除預設帳號

## 技術架構

- 前端：React 18 + TypeScript + Vite
- 桌面：Electron + SQLite
- 安全性：bcrypt 密碼加密、JWT 權杖

## 聯絡與支援

- Email: support@patient-crm.com
- GitHub Issues: [提交問題](https://github.com/your-repo/Patient_CRM/issues)

---

**患者管理系統 v1.0.0** —— 打造專業、高效、安全的醫療資訊管理體驗！
