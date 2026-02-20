# 診所數據洞察儀表板設計文件

## 目錄

- [背景與問題](#背景與問題)
- [設計目標](#設計目標)
- [功能模組](#功能模組)
  - [1. 今日摘要卡片](#1-今日摘要卡片)
  - [2. 病患分析](#2-病患分析)
  - [3. 預約分析](#3-預約分析)
  - [4. 療程方案分析](#4-療程方案分析)
  - [5. LINE 通訊分析](#5-line-通訊分析)
  - [6. 員工績效](#6-員工績效)
- [視覺呈現](#視覺呈現)
- [技術實作](#技術實作)
- [實作順序建議](#實作順序建議)

---

## 背景與問題

目前系統的統計報表頁面（`Analytics.tsx`）僅供 `super_admin`（平台管理員）使用，內容為全平台層級的統計：

- 全平台組織數、用戶數、病患數
- 訂閱方案分布（Basic / Professional / Enterprise）
- 配額警告（接近上限的組織）

**核心問題：診所的 admin 和一般員工完全看不到任何分析數據。**

資料庫中已有大量可用資料（預約、病患、療程、LINE 訊息、諮詢記錄），但這些資料目前只能以列表形式逐筆查看，缺乏彙總與趨勢分析。

---

## 設計目標

1. **讓診所管理者不用自己翻資料，就能一眼看到經營狀況**
2. **所有指標皆從現有資料表計算，不需要新增任何資料欄位**
3. **根據使用者角色顯示對應內容**（admin 看全診所、user 看個人相關）

---

## 功能模組

### 1. 今日摘要卡片

一進入儀表板就能看到今天最重要的 4 個數字。

| 卡片 | 資料來源 | 查詢方式 |
|------|----------|----------|
| 今日預約數 | `appointments` | `WHERE date = TODAY AND status = 'scheduled'` |
| 未讀 LINE 訊息 | `conversations` | `SUM(unreadCount) WHERE unreadCount > 0` |
| 本月新病患 | `patients` | `COUNT WHERE createdAt >= 本月1號` |
| 即將到期療程 | `treatment_packages` | `COUNT WHERE expiryDate 在 7 天內 AND status = 'active'` |

### 2. 病患分析

了解診所的客群結構與客戶黏著度。

| 指標 | 計算方式 | 商業意義 |
|------|----------|----------|
| **新客 vs 回訪比例** | 本月 appointments 中，patientId 是否有過去紀錄 | 了解新客佔比，判斷行銷效果 |
| **回訪率** | 有 ≥2 次預約的病患 / 所有病患 | 客戶黏著度指標 |
| **沉睡客戶** | 最後一次 appointment 超過 90 天的病患 | 需要主動聯繫的客戶清單 |
| **性別分布** | `patients` 的 `gender` 欄位 GROUP BY | 了解客群結構 |
| **年齡分布** | 根據 `birthDate` 計算年齡區間 | 了解客群結構 |
| **病患成長趨勢** | 按月 COUNT `patients.createdAt` | 成長趨勢折線圖 |

### 3. 預約分析

掌握營運效率與熱門時段。

| 指標 | 計算方式 | 商業意義 |
|------|----------|----------|
| **預約完成率** | `completed / (completed + cancelled + scheduled)` | 營運穩定度 |
| **取消率** | `cancelled / total` | 偏高需檢討原因 |
| **熱門時段分布** | `GROUP BY time` 的 appointment COUNT | 排班與時段調整參考 |
| **熱門服務類型** | `GROUP BY type` 的 appointment COUNT | 了解哪些服務最受歡迎 |
| **每日/每週/每月趨勢** | 按日期 GROUP BY | 折線圖觀察忙閒週期 |
| **No-show 分析** | 狀態為 scheduled 但日期已過的預約 | 追蹤未到診情況 |

### 4. 療程方案分析

與營收直接相關的核心數據。

| 指標 | 計算方式 | 商業意義 |
|------|----------|----------|
| **進行中方案數** | `treatment_packages WHERE status = 'active'` | 活躍業務量 |
| **方案使用率** | `package_usage_logs` 消耗量 / 方案總量 | 客戶是否在積極使用 |
| **即將到期方案** | `expiryDate` 在 30 天內但未用完 | 提醒客戶續約或加速使用 |
| **已完成方案數** | `status = 'completed'` | 歷史完成量 |
| **熱門服務項目排行** | `package_usage_logs GROUP BY serviceItemId` | 哪些服務項目最常被使用 |

### 5. LINE 通訊分析

衡量客戶溝通品質與效率。

| 指標 | 計算方式 | 商業意義 |
|------|----------|----------|
| **未讀對話數** | `conversations WHERE unreadCount > 0` | 待處理量 |
| **平均回覆時間** | ADMIN 回覆的 `sentAt` - 上一則 PATIENT 訊息的 `sentAt` | 服務回應速度 |
| **每日訊息量趨勢** | `line_messages GROUP BY DATE(sentAt)` | 溝通頻率趨勢 |
| **活躍對話數** | `conversations WHERE status = 'ACTIVE'` 且近 7 天有訊息 | 客戶互動程度 |
| **訊息類型分布** | `GROUP BY messageType` | 了解溝通模式（文字/圖片/貼圖）|

### 6. 員工績效

僅 admin 角色可見。

| 指標 | 計算方式 | 商業意義 |
|------|----------|----------|
| **療程執行數 / 人** | `package_usage_logs GROUP BY performedBy` | 員工服務產出 |
| **預約處理數 / 人** | `appointments` 關聯操作者（需擴充欄位） | 員工工作量 |

> 備註：諮詢記錄目前沒有 `createdBy` 欄位，如需「諮詢記錄數/人」指標，需在 `consultations` 表新增 `createdBy` 欄位。

---

## 視覺呈現

### 整體版面配置

```
┌─────────────────────────────────────────────────────────────┐
│  診所營運儀表板                                     日期篩選 ▼ │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│   12     │    3     │    8     │    2     │                 │
│ 今日預約  │ 未讀訊息  │ 本月新客  │ 到期療程  │                 │
│ +2 vs 昨日│          │ ↑15%     │ ⚠ 需處理  │                 │
├──────────┴──────────┴──────────┴──────────┘                 │
│                                                             │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   預約趨勢 (折線圖)       │   服務類型分布 (圓餅圖)           │
│                          │                                  │
│    ╱╲    ╱╲              │        ■ 諮詢  40%              │
│   ╱  ╲  ╱  ╲             │        ■ 治療  35%              │
│  ╱    ╲╱    ╲╱           │        ■ 複診  25%              │
│                          │                                  │
├──────────────────────────┼──────────────────────────────────┤
│                          │                                  │
│   病患成長 (長條圖)       │   沉睡客戶清單                    │
│                          │                                  │
│   ██ ███ ████ █████      │   王小明 - 120 天未回訪           │
│   10  11   12   1月      │   李小華 -  95 天未回訪           │
│                          │   張大方 -  92 天未回訪           │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│                                                             │
│   療程方案狀態                                               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│   │ 進行中 24 │  │ 即將到期 3│  │ 已完成 15 │                 │
│   └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│   熱門服務項目排行                                            │
│   1. 體態雕塑  ████████████████  156 次                      │
│   2. 營養諮詢  ██████████████    132 次                      │
│   3. 體組成量測 ████████████      108 次                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 圖表類型對應

| 數據類型 | 建議圖表 | 使用元件 |
|----------|----------|----------|
| 時間趨勢（預約/病患成長）| 折線圖 LineChart | Recharts |
| 分類佔比（服務類型/性別）| 圓餅圖 PieChart | Recharts |
| 數量比較（月度成長）| 長條圖 BarChart | Recharts |
| 單一數值 | 摘要卡片 StatCard | shadcn/ui Card |
| 清單資料（沉睡客戶）| 表格 / 列表 | shadcn/ui Table |
| 進度指標（療程使用率）| 進度條 Progress | shadcn/ui Progress |

---

## 技術實作

### 資料來源

所有指標皆從以下現有資料表查詢，**不需要新增任何資料表或欄位**：

| 資料表 | 提供的指標 |
|--------|-----------|
| `patients` | 病患成長、性別/年齡分布、沉睡客戶 |
| `appointments` | 預約趨勢、完成率、取消率、熱門時段、服務類型 |
| `treatment_packages` | 方案狀態、即將到期 |
| `package_usage_logs` | 服務使用量、熱門項目、員工績效 |
| `service_items` | 服務項目名稱對應 |
| `conversations` | 未讀訊息數 |
| `line_messages` | 訊息量趨勢、回覆時間 |
| `consultations` | 諮詢記錄統計 |

### 後端：新增 API

新增 `server/routes/clinicAnalytics.js`，提供以下端點：

```
GET /api/analytics/clinic-dashboard
  Query params: ?period=7d|30d|90d|1y
  Auth: admin, user（依角色過濾組織資料）
  Response: 上述所有指標的彙總 JSON
```

回傳結構範例：

```json
{
  "summary": {
    "todayAppointments": 12,
    "unreadMessages": 3,
    "newPatientsThisMonth": 8,
    "expiringPackages": 2
  },
  "patients": {
    "total": 350,
    "growthTrend": [
      { "month": "2025-09", "count": 15 },
      { "month": "2025-10", "count": 22 }
    ],
    "genderDistribution": { "male": 140, "female": 195, "other": 15 },
    "ageDistribution": [
      { "range": "0-18", "count": 20 },
      { "range": "19-35", "count": 120 },
      { "range": "36-50", "count": 130 },
      { "range": "51+", "count": 80 }
    ],
    "returningRate": 0.62,
    "dormant": [
      { "id": "p1", "name": "王小明", "daysSinceLastVisit": 120 },
      { "id": "p2", "name": "李小華", "daysSinceLastVisit": 95 }
    ]
  },
  "appointments": {
    "completionRate": 0.85,
    "cancellationRate": 0.08,
    "trend": [
      { "date": "2025-10-01", "count": 8 },
      { "date": "2025-10-02", "count": 12 }
    ],
    "byTimeSlot": [
      { "time": "09:00", "count": 45 },
      { "time": "10:00", "count": 62 }
    ],
    "byServiceType": [
      { "type": "諮詢", "count": 120, "color": "#4CAF50" },
      { "type": "治療", "count": 95, "color": "#2196F3" }
    ]
  },
  "packages": {
    "active": 24,
    "expiringSoon": 3,
    "completed": 15,
    "topServices": [
      { "name": "體態雕塑", "usageCount": 156 },
      { "name": "營養諮詢", "usageCount": 132 }
    ]
  },
  "line": {
    "unreadConversations": 3,
    "avgReplyMinutes": 15,
    "dailyMessageTrend": [
      { "date": "2025-10-01", "sent": 25, "received": 30 }
    ]
  }
}
```

### 前端：新增頁面與元件

| 檔案 | 類型 | 說明 |
|------|------|------|
| `src/pages/ClinicDashboard.tsx` | 頁面 | 主儀表板頁面，組合所有圖表元件 |
| `src/components/dashboard/SummaryCards.tsx` | 元件 | 今日摘要的 4 張卡片 |
| `src/components/dashboard/AppointmentTrend.tsx` | 元件 | 預約趨勢折線圖 |
| `src/components/dashboard/ServiceDistribution.tsx` | 元件 | 服務類型圓餅圖 |
| `src/components/dashboard/PatientGrowth.tsx` | 元件 | 病患成長長條圖 |
| `src/components/dashboard/DormantPatients.tsx` | 元件 | 沉睡客戶清單 |
| `src/components/dashboard/PackageStatus.tsx` | 元件 | 療程方案狀態摘要 |

### 需修改的現有檔案

| 檔案 | 修改內容 |
|------|----------|
| `src/App.tsx` | 新增 `/dashboard` 路由 |
| `src/components/Header.tsx` | 導航列新增「營運儀表板」選單項目 |
| `server/index.js` | 註冊 `clinicAnalytics` 路由 |

### 使用的現有套件

- **Recharts** — 圖表繪製（已安裝）
- **shadcn/ui Card / Badge / Progress / Table** — UI 元件（已安裝）
- **TanStack React Query** — 資料獲取與快取（已安裝）
- **Lucide React** — 圖示（已安裝）

---

## 實作順序建議

### Phase 1：核心摘要（最小可用版本）

- [ ] 後端 API：今日摘要 + 預約統計 + 病患統計
- [ ] 前端：SummaryCards + AppointmentTrend 折線圖
- [ ] 路由與導航整合

### Phase 2：病患洞察

- [ ] 後端 API：病患成長趨勢、性別/年齡分布、回訪率、沉睡客戶
- [ ] 前端：PatientGrowth 長條圖 + DormantPatients 清單

### Phase 3：療程與服務分析

- [ ] 後端 API：療程方案狀態、熱門服務排行、使用率
- [ ] 前端：PackageStatus + ServiceDistribution 圓餅圖

### Phase 4：LINE 通訊與員工績效

- [ ] 後端 API：未讀統計、回覆時間、訊息趨勢
- [ ] 前端：LINE 分析區塊 + 員工績效表格

### Phase 5：進階功能

- [ ] 日期範圍篩選器（7 天 / 30 天 / 90 天 / 1 年）
- [ ] 資料匯出為 Excel / PDF
- [ ] 自動排程 Email 週報
