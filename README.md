# 患者管理系統 (Patient CRM)

一款專為醫療機構設計的單機版客戶關係管理軟體，提供完整的患者資料管理、健康記錄追蹤、預約排程等功能。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 主要功能

### 📋 患者資料管理
- **完整的患者資訊**：姓名、性別、出生日期、聯絡方式
- **醫療資料**：血型、過敏史
- **緊急聯絡人**：緊急聯絡人姓名及電話
- **標籤分類**：自訂標籤進行患者分類

### 💊 健康記錄追蹤
- **生理數據記錄**：體重、身高、體脂率
- **生命徵象**：血壓（收縮壓/舒張壓）、心率、體溫
- **歷史記錄**：完整的健康數據歷史追蹤
- **趨勢分析**：自動計算健康數據變化趨勢

### 📅 預約管理
- **預約排程**：日期、時間、類型、狀態管理
- **提醒功能**：預約提醒狀態追蹤
- **狀態管理**：已排程、已完成、已取消

### 📊 數據分析
- **健康分析儀表板**：視覺化健康數據
- **趨勢圖表**：使用 Recharts 進行數據視覺化
- **統計資訊**：患者統計、健康趨勢分析

### 💾 資料管理
- **自動儲存**：使用 SQLite 本地資料庫
- **資料備份**：一鍵備份整個資料庫
- **資料還原**：從備份檔案快速還原
- **JSON 匯出**：匯出所有資料為 JSON 格式

## 🚀 技術架構

### 前端技術
- **框架**：React 18.3.1
- **語言**：TypeScript 5.8.3
- **建置工具**：Vite 5.4.19
- **UI 框架**：Tailwind CSS 3.4.17
- **組件庫**：Radix UI (shadcn/ui)
- **路由**：React Router DOM 6.30.1
- **狀態管理**：TanStack React Query 5.83.0
- **表單處理**：React Hook Form + Zod 驗證
- **圖表**：Recharts 2.15.4

### 桌面應用
- **框架**：Electron 39.0.0
- **打包工具**：Electron Builder 26.0.12
- **資料庫**：Better-SQLite3 12.4.1
- **跨平台**：支援 Windows、macOS、Linux

### 開發工具
- **程式碼品質**：ESLint + TypeScript ESLint
- **開發伺服器**：Vite Dev Server (熱重載)
- **並行執行**：Concurrently
- **環境變數**：Cross-env

## 📦 安裝與使用

### 開發環境需求
- Node.js 18.x 或更高版本
- npm 或 yarn 套件管理工具
- Git (選用)

### 安裝步驟

#### 1. 下載專案
```bash
git clone <repository-url>
cd Patient_CRM
```

#### 2. 安裝依賴
```bash
npm install
```

#### 3. 開發模式運行

**Web 模式 (瀏覽器)**
```bash
npm run dev
```
開啟瀏覽器訪問：http://localhost:8080

**Electron 模式 (桌面應用)**
```bash
npm run electron:dev
```
將自動開啟桌面應用程式視窗

### 打包發布

#### 建置所有平台
```bash
npm run electron:build
```

#### 建置特定平台
```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

#### 打包產出
打包完成後，安裝檔案位於 `release/` 目錄：

- **Windows**：`患者管理系統-1.0.0-win.exe` (安裝程式) / `.exe` (可攜版)
- **macOS**：`患者管理系統-1.0.0-mac.dmg`
- **Linux**：`患者管理系統-1.0.0-linux.AppImage` / `.deb`

## 🖥️ 使用說明

### 首次啟動

1. **雙擊執行檔**啟動應用程式
2. 應用程式會自動建立 SQLite 資料庫
3. 資料庫位置：
   - Windows：`C:\Users\<用戶>\AppData\Roaming\patient-crm\patient_crm.db`
   - macOS：`~/Library/Application Support/patient-crm/patient_crm.db`
   - Linux：`~/.config/patient-crm/patient_crm.db`

### 基本操作

#### 患者管理
1. 點擊「新增患者」建立患者資料
2. 填寫基本資訊（姓名、性別、出生日期、聯絡方式）
3. 可選填醫療資訊（血型、過敏史）及緊急聯絡人
4. 點擊「儲存」完成新增

#### 健康記錄
1. 進入患者詳情頁面
2. 切換至「健康記錄」分頁
3. 點擊「新增記錄」
4. 填寫生理數據（體重、身高、體脂率、血壓、心率、體溫）
5. 系統會自動計算健康趨勢

#### 預約管理
1. 進入患者詳情頁面
2. 切換至「預約記錄」分頁
3. 點擊「新增預約」
4. 設定預約日期、時間、類型
5. 追蹤預約狀態

#### 資料備份
1. 點擊右上角「設定」
2. 進入「資料庫管理」區塊
3. 點擊「備份資料庫」
4. 選擇儲存位置
5. 備份檔案為 `.db` 格式

#### 資料還原
1. 點擊右上角「設定」
2. 進入「資料庫管理」區塊
3. 點擊「還原資料庫」
4. **注意**：還原會覆蓋現有資料，建議先備份
5. 選擇備份檔案進行還原

## 🔧 開發指南

### 專案結構
```
Patient_CRM/
├── electron/              # Electron 主程序
│   ├── main.js           # Electron 入口點
│   └── preload.js        # 預載腳本 (IPC 通訊)
├── src/
│   ├── components/       # React 組件
│   │   ├── ui/          # shadcn-ui 基礎組件
│   │   ├── Header.tsx   # 頁面導航
│   │   ├── DatabaseManagement.tsx
│   │   └── ...
│   ├── pages/           # 頁面組件
│   │   ├── PatientList.tsx
│   │   ├── PatientDetail.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   ├── lib/             # 工具函式
│   │   ├── storage.ts   # 資料持久化層
│   │   └── utils.ts
│   ├── types/           # TypeScript 型別定義
│   │   ├── patient.ts
│   │   └── electron.d.ts
│   ├── App.tsx          # 應用程式根組件
│   └── main.tsx         # React 入口點
├── public/              # 靜態資源
├── build/               # 打包資源 (icon 等)
├── electron-builder.json # Electron Builder 配置
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

### 資料流架構

```
┌─────────────┐
│   React UI  │
└──────┬──────┘
       │ (通過 storage.ts)
       ↓
┌──────────────────────┐
│  環境檢測 (isElectron) │
└─────────┬────────────┘
          ↓
    ┌─────┴─────┐
    │           │
    ↓           ↓
┌──────┐   ┌──────────┐
│Local │   │ Electron │
│Storage│   │   IPC    │
└──────┘   └────┬─────┘
                ↓
           ┌─────────┐
           │ SQLite  │
           │Database │
           └─────────┘
```

### 新增功能

#### 1. 新增頁面
```typescript
// 1. 建立頁面組件
// src/pages/NewPage.tsx
export default function NewPage() {
  return <div>新頁面內容</div>;
}

// 2. 在 App.tsx 中加入路由
import NewPage from "./pages/NewPage";
<Route path="/new-page" element={<NewPage />} />

// 3. 在 Header.tsx 中加入導航連結
<Link to="/new-page">新頁面</Link>
```

#### 2. 新增資料庫欄位
```javascript
// 1. 修改 electron/main.js 的資料庫結構
db.exec(`
  ALTER TABLE patients ADD COLUMN newField TEXT;
`);

// 2. 更新 TypeScript 型別定義
// src/types/patient.ts
export interface Patient {
  // ... 現有欄位
  newField?: string;
}

// 3. 更新 storage.ts 的 API
```

### 除錯技巧

#### Electron 開發模式
開發模式下會自動開啟 DevTools，可查看：
- Console 日誌
- Network 請求
- React DevTools
- SQLite 資料庫操作日誌

#### 常見問題

**Q: Electron 視窗無法開啟**
A: 檢查 `electron/main.js` 的路徑設定，確保 preload.js 路徑正確

**Q: 資料庫連接失敗**
A: 檢查資料庫檔案權限，或刪除資料庫檔案讓系統重新建立

**Q: 打包後無法執行**
A: 確認 electron-builder.json 配置正確，特別是 files 和 extraResources 設定

## 📝 授權

本專案採用 MIT 授權條款

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

## 📧 聯絡方式

如有任何問題或建議，請透過以下方式聯絡：
- Email: support@patient-crm.com
- GitHub Issues: [提交問題](https://github.com/your-repo/Patient_CRM/issues)

## 🔄 更新日誌

### Version 1.0.0 (2025-11-04)
- ✨ 初版發布
- 🎯 完整的患者資料管理功能
- 💊 健康記錄追蹤系統
- 📅 預約管理功能
- 📊 健康數據分析視覺化
- 💾 資料備份與還原
- 🖥️ 跨平台桌面應用程式 (Windows/macOS/Linux)
- 🗄️ SQLite 本地資料庫持久化

---

**患者管理系統 v1.0.0** - 打造專業、高效的醫療資訊管理體驗 🏥
