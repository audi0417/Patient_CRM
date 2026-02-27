# 醫美管理模式設計文件

> 日期：2026-02-27
> 狀態：已確認，待實作

## 概述

在現有的「數據記錄模組」架構下，新增「醫美管理」產業模式。組織選擇此模式後，除了皮膚分析數據記錄外，還會獲得 Before/After 照片管理和療程記錄功能。

## 核心決策

| 決策項 | 選擇 | 理由 |
|--------|------|------|
| 模式定位 | 標準版（照片 + 文字版療程記錄） | 覆蓋核心剛需，快速上線驗證 |
| 照片儲存 | 混合式 adapter（本地 + 預留 S3） | 複用現有 adapter 模式思路 |
| 拍攝角度 | 臉部 5 角度 + 身體 4 角度 | 涵蓋微整與體雕兩大市場 |
| 注射記錄 | 文字記錄（下拉 + 輸入） | YAGNI，圖形化標記留 v2 |
| 數據指標 | 皮膚分析導向 | 客觀可量測，趨勢圖有意義 |
| 功能隔離 | 綁定數據記錄模式 | 選醫美模式才出現照片/療程功能 |

## 架構：功能隔離 + 多租戶隔離

### 功能模組隔離

照片/療程記錄功能僅在組織的 `dataRecordingMode === 'aesthetic'` 時可用：

- **前端**：`useDataRecording()` context 判斷 `dataRecordingMode`，非 `aesthetic` 不 render 相關 Tab
- **後端**：新增 `requireAestheticMode` middleware，檢查組織模式，非 `aesthetic` 回傳 403

### 多租戶資料隔離

- `patient_photos` 和 `treatment_records` 表都有 `organizationId` 欄位
- 新增到 `TenantQuery.ALLOWED_TABLES` 白名單
- 所有查詢透過 `TenantQuery` 強制注入 `organizationId` 過濾
- 照片檔案路徑按 `data/photos/{organizationId}/{patientId}/` 物理隔離
- 照片不用 `express.static` 暴露，走 API + auth + tenant 驗證
- PostgreSQL 環境新增 RLS policy

## 模式定義

### `server/config/modes/aesthetic.js`

```js
module.exports = {
  id: 'aesthetic',
  name: '醫美管理',
  description: '適用於醫美診所，專注於皮膚分析與療程追蹤',
  icon: '💉',
  category: 'medical',

  vitalSignsMapping: {
    bloodPressureSystolic: { label: '皮膚含水度', unit: '%', type: 'number', required: false },
    bloodPressureDiastolic: { label: '皮膚油脂度', unit: '%', type: 'number', required: false },
    heartRate: { label: '皮膚彈性度', unit: '%', type: 'number', required: false },
    temperature: { label: '膚色均勻度', unit: '分', type: 'number', required: false, step: '0.1' },
    respiratoryRate: { label: '毛孔評分', unit: '分', type: 'number', required: false },
    oxygenSaturation: { label: '皺紋評分', unit: '分', type: 'number', required: false },
    bloodGlucose: { label: '色素沉澱度', unit: '分', type: 'number', required: false }
  },

  goalCategories: [
    { value: 'skinQuality', label: '膚質改善', unit: '分' },
    { value: 'wrinkleReduction', label: '皺紋減少', unit: '%' },
    { value: 'whitening', label: '美白淡斑', unit: '分' },
    { value: 'firming', label: '緊緻拉提', unit: '分' },
    { value: 'bodyContouring', label: '體雕塑身', unit: 'cm' },
    { value: 'recovery', label: '術後恢復', unit: '天' },
    { value: 'custom', label: '自訂', unit: '' }
  ],

  chartTitles: {
    vitalSigns: '皮膚分析趨勢',
    goals: '美容目標',
    progress: '膚質記錄',
    dashboard: '美容目標'
  }
};
```

## 新增資料表

### `patient_photos`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | TEXT PK | UUID |
| patientId | TEXT FK | 關聯患者 |
| organizationId | TEXT FK | 多租戶隔離 |
| sessionId | TEXT | 同一次拍攝的群組 ID |
| type | TEXT | `before` / `after` / `during` |
| bodyRegion | TEXT | `face` / `body` |
| angle | TEXT | 臉部：`frontal` / `left_oblique` / `right_oblique` / `left_lateral` / `right_lateral`；身體：`front` / `back` / `left` / `right` |
| storagePath | TEXT | 檔案路徑或雲端 URL |
| thumbnailPath | TEXT | 縮圖路徑 |
| mimeType | TEXT | `image/jpeg` 等 |
| fileSize | INTEGER | 檔案大小 (bytes) |
| notes | TEXT | 備註 |
| consentGiven | BOOLEAN | 已取得照片同意 |
| marketingApproved | BOOLEAN | 允許行銷使用 |
| treatmentId | TEXT | 關聯療程紀錄（可選） |
| capturedAt | DATETIME | 拍攝時間 |
| capturedBy | TEXT FK | 拍攝人員 |
| createdAt | DATETIME | 建立時間 |
| updatedAt | DATETIME | 更新時間 |

### `treatment_records`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | TEXT PK | UUID |
| patientId | TEXT FK | 關聯患者 |
| organizationId | TEXT FK | 多租戶隔離 |
| sessionId | TEXT | 關聯照片拍攝組（可選） |
| treatmentDate | DATETIME | 療程日期 |
| treatmentType | TEXT | `injection` / `laser` / `skincare` / `body_contouring` / `surgery` |
| bodyArea | TEXT | 治療部位 |
| productName | TEXT | 產品名稱 |
| productLotNumber | TEXT | 批號 |
| productExpiry | DATE | 產品效期 |
| dosage | DECIMAL | 劑量/單位數 |
| dosageUnit | TEXT | `units` / `ml` / `cc` |
| deviceName | TEXT | 設備名稱（雷射療程用） |
| deviceSettings | TEXT | 設備參數 JSON |
| provider | TEXT FK | 操作醫師 |
| notes | TEXT | 術後備註 |
| nextFollowUp | DATE | 建議回診日 |
| createdAt | DATETIME | 建立時間 |
| updatedAt | DATETIME | 更新時間 |

## 儲存層 Adapter

```
server/services/storage/
  ├── index.js            # adapter 載入器（依 STORAGE_TYPE 環境變數切換）
  ├── localAdapter.js     # 本地：data/photos/{orgId}/{patientId}/{sessionId}_{angle}_{timestamp}.jpg
  └── s3Adapter.js        # S3 空殼介面（預留）
```

- 上傳時用 `sharp` 自動產生縮圖
- `multer` 處理 multipart 上傳
- 照片不走 `express.static`，走 authenticated API 路由回傳檔案

## API 端點

### 照片 API (`/api/photos`)

Middleware 鏈：`authenticateToken → requireTenant → injectTenantQuery → requireAestheticMode`

| Method | Route | 說明 |
|--------|-------|------|
| POST | `/api/photos/upload` | 上傳照片（multipart/form-data） |
| GET | `/api/photos/patient/:patientId` | 取得患者所有照片 |
| GET | `/api/photos/session/:sessionId` | 取得同一拍攝組 |
| GET | `/api/photos/compare/:patientId` | Before/After 對比 |
| GET | `/api/photos/:id/file` | 取得照片檔案（驗證後回傳） |
| DELETE | `/api/photos/:id` | 刪除照片 |

### 療程記錄 API (`/api/treatment-records`)

Middleware 鏈同上。

| Method | Route | 說明 |
|--------|-------|------|
| POST | `/api/treatment-records` | 新增療程記錄 |
| GET | `/api/treatment-records/patient/:patientId` | 取得患者療程記錄 |
| GET | `/api/treatment-records/:id` | 取得單筆 |
| PUT | `/api/treatment-records/:id` | 更新 |
| DELETE | `/api/treatment-records/:id` | 刪除 |

## 前端元件

### 新增

| 檔案 | 說明 |
|------|------|
| `src/components/PhotoUpload.tsx` | 拍攝組建立、選擇 bodyRegion、逐角度上傳 |
| `src/components/PhotoCompare.tsx` | 左右並排 Before/After 對比 |
| `src/components/PhotoGallery.tsx` | 照片時間軸，以 session 分組 |
| `src/components/TreatmentRecordForm.tsx` | 療程記錄表單，可關聯 session |

### 修改

| 檔案 | 修改 |
|------|------|
| `src/pages/PatientDetail.tsx` | 新增「照片」「療程記錄」tab，`dataRecordingMode === 'aesthetic'` 時顯示 |
| `src/lib/api.ts` | 新增照片/療程記錄 API 函式 |

## 前端照片對比 UI 流程

```
患者詳情 → 照片 Tab
  → [+ 新增拍攝組] → 選臉部/身體 → 逐角度上傳（顯示 checklist）→ 儲存
  → 照片時間軸（按日期分組顯示縮圖）
  → [對比] → 選擇兩個日期 → 左右並排同角度照片
```

## 拍攝角度定義

### 臉部（5 角度）

| 角度 ID | 名稱 |
|---------|------|
| `frontal` | 正面 |
| `left_oblique` | 左側 45° |
| `right_oblique` | 右側 45° |
| `left_lateral` | 左側面 |
| `right_lateral` | 右側面 |

### 身體（4 角度）

| 角度 ID | 名稱 |
|---------|------|
| `front` | 正面 |
| `back` | 背面 |
| `left` | 左側 |
| `right` | 右側 |

## 新增依賴

| 套件 | 用途 |
|------|------|
| `sharp` | 伺服器端縮圖產生 |
| `multer` | multipart 檔案上傳 |

## 不在此次範圍（v2）

- 照片標註/畫圖功能
- 注射點位圖形化（SVG 臉部圖 + 點擊標記）
- S3 adapter 實際實作
- 照片浮水印
- VISIA 皮膚分析儀整合
- 照片 morphing / slider 動畫對比

## 檔案清單

### 後端新增
- `server/config/modes/aesthetic.js`
- `server/routes/photos.js`
- `server/routes/treatmentRecords.js`
- `server/services/storage/index.js`
- `server/services/storage/localAdapter.js`
- `server/services/storage/s3Adapter.js`

### 後端修改
- `server/database/schema.js` — 新增 `patient_photos` + `treatment_records` 表
- `server/index.js` — 掛載新路由
- `server/middleware/tenantContext.js` — `ALLOWED_TABLES` 加入新表

### 前端新增
- `src/components/PhotoUpload.tsx`
- `src/components/PhotoCompare.tsx`
- `src/components/PhotoGallery.tsx`
- `src/components/TreatmentRecordForm.tsx`

### 前端修改
- `src/pages/PatientDetail.tsx` — 新增 Tab
- `src/lib/api.ts` — 新增 API 函式
