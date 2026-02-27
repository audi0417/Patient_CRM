# 數據記錄模式模組化架構

## 概述

本系統採用模組化設計，每個數據記錄模式都是獨立的 JavaScript 模組文件，支援動態載入和快速擴展。

## 文件結構

```
server/config/
├── dataRecordingModes.js  # 主配置文件（載入器介面）
└── modes/
    ├── index.js           # 模組載入器
    ├── nutrition.js       # 營養管理模式
    ├── medical.js         # 醫療監護模式
    ├── fitness.js         # 運動訓練模式
    ├── rehabilitation.js  # 復健追蹤模式
    └── mental_health.js.example # 新模式範例（未啟用）
```

## 現有模式

| 模式ID | 名稱 | 圖標 | 分類 | 說明 |
|--------|------|------|------|------|
| `nutrition` | 營養管理 | 🥗 | wellness | 適用於營養師、減重中心，專注於飲食與營養追蹤 |
| `medical` | 醫療監護 | 🏥 | medical | 適用於醫院、診所，專注於生命徵象監測 |
| `fitness` | 運動訓練 | 💪 | fitness | 適用於健身房、私人教練，專注於運動表現追蹤 |
| `rehabilitation` | 復健追蹤 | 🏃‍♂️ | rehabilitation | 適用於復健科、物理治療所，專注於復健進度追蹤 |

## 模式配置結構

每個模式文件必須導出包含以下欄位的物件：

```javascript
module.exports = {
  // 基本資訊
  id: 'mode_id',                    // 唯一識別碼
  name: '模式名稱',                 // 顯示名稱
  description: '模式說明',          // 詳細描述
  icon: '🎯',                      // 圖標（emoji或字符）
  category: 'category_name',        // 分類（wellness, medical, fitness, care, rehabilitation等）
  
  // 生命徵象欄位映射
  vitalSignsMapping: {
    bloodPressureSystolic: {
      label: '欄位標籤',
      unit: '單位',
      type: 'number',
      required: false,
      min: 0,                       // 最小值（可選）
      max: 100,                    // 最大值（可選）
      step: '0.1',                 // 步長（可選）
      normalRange: '正常範圍說明'   // 正常範圍（可選）
    },
    // ... 其他生命徵象欄位
  },
  
  // 目標分類
  goalCategories: [
    { value: 'category_id', label: '分類名稱', unit: '單位' },
    // ... 更多分類
  ],
  
  // 圖表標題
  chartTitles: {
    vitalSigns: '數據趨勢',
    goals: '目標追蹤',
    progress: '進度報告',
    dashboard: '目標總覽'
  }
};
```

## 新增模式

### 1. 創建模式文件

在 `server/config/modes/` 目錄下創建新的 `.js` 文件，例如 `mental_health.js`：

```javascript
/**
 * 心理健康模式
 * 適用於心理諮商中心、身心科診所
 */

module.exports = {
  id: 'mental_health',
  name: '心理健康',
  description: '適用於心理諮商中心、身心科診所，專注於心理健康狀態追蹤',
  icon: '🧠',
  category: 'mental',
  
  vitalSignsMapping: {
    bloodPressureSystolic: {
      label: '壓力指數',
      unit: '分',
      type: 'number',
      required: false,
      min: 1,
      max: 10,
      normalRange: '1-5分'
    },
    // ... 其他欄位
  },
  
  goalCategories: [
    { value: 'stress_management', label: '壓力管理', unit: '分' },
    // ... 其他分類
  ],
  
  chartTitles: {
    vitalSigns: '心理健康指標',
    goals: '心理健康目標',
    progress: '心理狀態記錄', 
    dashboard: '心理健康目標'
  }
};
```

### 2. 系統自動載入

- 系統會自動掃描 `modes/` 目錄下的所有 `.js` 文件（除了 `index.js`）
- 新模式會立即生效，無需重啟應用程序（支援熱載入）
- 後端API和前端UI會自動識別新模式

### 3. 驗證配置

系統會自動驗證模式配置的完整性：
- 必需欄位：`id`, `name`, `description`, `icon`, `category`
- 結構驗證：`vitalSignsMapping`, `goalCategories`, `chartTitles`

## 使用方法

### 後端使用

```javascript
const { 
  getDataRecordingModes, 
  getDataRecordingModeById,
  getAllDataRecordingModes 
} = require('./config/dataRecordingModes');

// 獲取所有模式
const modes = getDataRecordingModes();
console.log(Object.keys(modes)); // ['nutrition', 'medical', 'fitness', 'rehabilitation']

// 獲取特定模式
const nutritionMode = getDataRecordingModeById('nutrition');
console.log(nutritionMode.name); // '營養管理'

// 獲取模式陣列
const allModes = getAllDataRecordingModes();
allModes.forEach(mode => console.log(mode.name));
```

### 開發工具

```javascript
const { reloadMode, validateModeConfig } = require('./config/modes');

// 熱載入特定模式（開發用）
const reloadedMode = reloadMode('mental_health');

// 驗證配置
const isValid = validateModeConfig(modeConfig);
```

## 優勢

1. **模組化設計**：每個模式獨立維護，降低耦合度
2. **動態載入**：支援運行時載入新模式，無需重啟應用
3. **易於擴展**：添加新模式只需創建單一文件
4. **配置隔離**：模式間配置獨立，修改不影響其他模式
5. **版本控制友好**：每個模式獨立提交，便於追蹤變更
6. **熱載入支援**：開發模式支援動態重載模組
7. **自動驗證**：系統自動驗證配置完整性

## 注意事項

1. 模式ID必須唯一，建議使用蛇形命名法（snake_case）
2. 避免修改現有模式的ID，可能影響現有組織的配置
3. 新模式文件名必須與模式ID一致（如 `mental_health.js` 對應 `id: 'mental_health'`）
4. `.example` 後綴的文件不會被載入，可用作範例或暫時停用
5. 建議在新增模式前先創建 `.example` 文件進行測試

## 測試

```bash
# 測試模組載入器
cd server && node -e "
const { getAllDataRecordingModes } = require('./config/dataRecordingModes');
const modes = getAllDataRecordingModes();
console.log('Available modes:', modes.map(m => m.id));
"
```