# 獨立 Demo 體驗系統

## 📋 概述

這是一個**完全獨立**的互動式 Demo 體驗系統，不會干擾原有的 CRM 系統功能。

## 🎯 特點

✅ **完全獨立** - 與現有系統完全分離，不影響任何現有功能  
✅ **模擬 UI** - 使用相似的 UI 設計，但數據完全模擬  
✅ **無需登入** - 可直接訪問，無需認證  
✅ **完整流程** - 問卷調查 → 互動模擬 → 價值轉換  

## 🚀 如何使用

### 方法 1: 直接訪問
```
http://localhost:5173/demo
```

### 方法 2: 從登入頁添加入口（可選）
在登入頁添加一個「體驗Demo」按鈕，連結到 `/demo`

## 📂 檔案結構

```
src/
├── pages/
│   └── DemoExperience.tsx              # Demo 主頁面（路由：/demo）
├── components/
│   └── demo/
│       ├── DemoSurveyOverlay.tsx       # Phase 1: 問卷調查
│       ├── DemoSimulationPage.tsx      # Phase 2: 互動模擬
│       ├── DemoGuideTooltip.tsx        # 引導提示（保留，未使用）
│       └── DemoConversionPage.tsx      # Phase 3: 價值轉換
├── hooks/
│   └── useDemoGuide.ts                 # Zustand 狀態管理
├── utils/
│   └── demoEffects.ts                  # 特效工具函數
└── types/
    └── demoGuide.ts                    # 類型定義
```

## 🎬 體驗流程

### Phase 1: 問卷調查（約 30 秒）
用戶回答三個問題：
1. **診所規模**：單一診所 / 連鎖體系
2. **診所類型**：醫美 / 中醫 / 減重
3. **痛點調查**：預約混亂 / 病歷追蹤困難 / 容易漏單

### Phase 2: 互動模擬（約 2-3 分鐘）
在**模擬的預約行事曆**上進行兩個場景：

#### Scenario A: 拖拉預約
- 📱 觸發：「陳小姐來電：想改約到下午 4 點」
- 👆 操作：拖曳陳小姐的卡片到 16:00 時段
- ✨ 效果：撒花 + 打勾 + Toast 通知

#### Scenario B: 智慧標籤
- 💬 觸發：「王先生提及最近有失眠狀況」
- 👆 操作：點擊 + 按鈕，選擇「失眠調理」標籤
- 🤖 效果：AI 推薦療程提示

### Phase 3: 價值轉換（約 1 分鐘）
顯示效能分析：
- 📊 溝通效率提升 40%
- 👥 回訪率預估提升 20%
- 🎯 漏單率減少 60%
- 📈 整體效能提升 35%

## 🎨 視覺效果

- ✅ 撒花動畫（canvas-confetti）
- ✅ 成功打勾（SVG + CSS）
- ✅ 高亮脈衝效果
- ✅ Toast 通知
- ✅ 數字計數動畫
- ✅ 卡片拖放動畫（framer-motion）

## 🔧 技術實現

### 狀態管理
```typescript
// 使用 Zustand 管理全局狀態
const { 
  isActive,        // Demo 是否啟動
  phase,           // 當前階段：survey | simulation | conversion
  config,          // 問卷配置
  scenarios,       // 場景列表
  startDemo,       // 啟動 Demo
  completeScenario // 完成場景
} = useDemoGuide();
```

### 模擬數據
```typescript
// 不使用真實的 API，所有數據都是模擬的
const patients = [
  { id: '1', name: '陳小姐', time: '14:00', ... },
  { id: '2', name: '王先生', time: '15:00', ... },
  ...
];
```

### 特效觸發
```typescript
// 場景完成時觸發
triggerConfetti();           // 撒花
showSuccessCheckmark();      // 打勾
showDemoToast(title, desc);  // 通知
```

## 🛠️ 開發指南

### 修改問卷問題
編輯 `DemoSurveyOverlay.tsx` 中的 `questions` 陣列

### 新增場景
1. 在 `useDemoGuide.ts` 的 `scenarios` 中新增
2. 在 `DemoSimulationPage.tsx` 中實現場景邏輯
3. 添加對應的觸發條件和完成邏輯

### 調整模擬數據
在 `DemoSimulationPage.tsx` 中修改 `patients` 和 `treatmentMap`

### 客製化樣式
使用 Tailwind CSS 類別，與系統保持一致

## 📊 與原系統的區別

| 特性 | 原系統 | Demo 系統 |
|------|--------|-----------|
| 路由 | `/appointments` | `/demo` |
| 認證 | ✅ 需要登入 | ❌ 無需登入 |
| 數據 | 真實數據庫 | 模擬數據 |
| 功能 | 完整功能 | 引導式體驗 |
| 目的 | 實際使用 | 展示和體驗 |

## 🎯 未來增強（可選）

- [ ] 添加更多診所類型選項
- [ ] 根據問卷答案動態調整場景內容
- [ ] 記錄用戶完成率（使用 localStorage）
- [ ] 整合 Google Analytics
- [ ] 支援手機端拖放（touch events）
- [ ] 添加音效反饋
- [ ] 多語言支援

## 🐛 疑難排解

### 問題：無法訪問 /demo
**解決**：確認路由已正確添加到 App.tsx

### 問題：狀態沒有更新
**解決**：檢查 zustand store 是否正確初始化

### 問題：特效沒有顯示
**解決**：確認已安裝 `canvas-confetti` 和 `framer-motion`

### 問題：拖放不生效
**解決**：檢查瀏覽器是否支援 HTML5 Drag & Drop API

## 📞 聯絡資訊

如需協助，請聯繫：
- 📧 Email: support@clinic-crm.com
- 📞 電話: 02-1234-5678

---

**建立時間**: 2026年1月24日  
**版本**: 2.0.0 (獨立版本)  
**維護者**: Patient CRM Team
