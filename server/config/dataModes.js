/**
 * 數據記錄模組配置 - 簡化版本
 * 
 * 專注於兩種實際有明確需求的數據記錄模式：
 * 1. 營養健康 - 身高體重血糖等健康管理指標
 * 2. 復健追蹤 - 關節角度肌力疼痛等復健指標
 */

const DEFAULT_DATA_MODES = {
  // 營養管理模式 - 適用於營養師、減重中心，專注於飲食與營養追蹤
  nutrition: {
    id: 'nutrition',
    name: '營養管理',
    description: '適用於營養師、減重中心，專注於飲食與營養追蹤',
    icon: '🥗',
    category: 'wellness',
    
    // 利用生命徵象欄位來記錄營養相關數據
    vitalSignsMapping: {
      bloodPressureSystolic: {
        label: '卡路里攝取',
        unit: 'kcal',
        type: 'number',
        required: false
      },
      bloodPressureDiastolic: {
        label: '蛋白質',
        unit: 'g',
        type: 'number',
        required: false
      },
      heartRate: {
        label: '碳水化合物',
        unit: 'g',
        type: 'number',
        required: false
      },
      temperature: {
        label: '脂肪攝取',
        unit: 'g',
        type: 'number',
        required: false,
        step: '0.1'
      },
      respiratoryRate: {
        label: '纖維',
        unit: 'g',
        type: 'number',
        required: false
      },
      oxygenSaturation: {
        label: '水分攝取',
        unit: 'ml',
        type: 'number',
        required: false
      },
      bloodGlucose: {
        label: '血糖',
        unit: 'mg/dL',
        type: 'number',
        required: false
      }
    },
    
    goalCategories: [
      { value: 'weight', label: '減重目標', unit: 'kg' },
      { value: 'bodyFat', label: '體脂率', unit: '%' },
      { value: 'muscleMass', label: '增肌目標', unit: 'kg' },
      { value: 'bmi', label: 'BMI', unit: '' },
      { value: 'exercise', label: '每週運動', unit: '次/週' },
      { value: 'health', label: '每日卡路里', unit: 'kcal' },
      { value: 'custom', label: '自訂', unit: '' }
    ],
    
    chartTitles: {
      vitalSigns: '營養攝取趨勢',
      goals: '營養目標',
      progress: '營養記錄',
      dashboard: '營養目標'
    }
  },

  // 復健追蹤模式 - 適用於復健科、物理治療所
  rehabilitation: {
    id: 'rehabilitation',
    name: '復健追蹤',
    description: '記錄關節活動度、肌力等級、疼痛指數等復健相關指標，適用於復健科和物理治療',
    icon: '🏃‍♂️', 
    category: 'rehabilitation',
    
    vitalSignsMapping: {
      bloodPressureSystolic: {
        label: '右肩關節角度',
        unit: '度',
        type: 'number', 
        required: false,
        normalRange: '0-180度'
      },
      bloodPressureDiastolic: {
        label: '左肩關節角度',
        unit: '度',
        type: 'number',
        required: false,
        normalRange: '0-180度'
      }, 
      heartRate: {
        label: '肌力等級',
        unit: 'Level',
        type: 'number',
        required: false,
        normalRange: '1-5級',
        min: 1,
        max: 5
      },
      temperature: {
        label: '疼痛指數(VAS)',
        unit: '分',
        type: 'number',
        required: false,
        normalRange: '0-10分',
        min: 0,
        max: 10
      },
      respiratoryRate: {
        label: '關節僵硬度',
        unit: '分',
        type: 'number',
        required: false,
        min: 0,
        max: 10
      },
      oxygenSaturation: {
        label: '平衡能力',
        unit: '秒',
        type: 'number', 
        required: false,
        normalRange: '10-60秒'
      }
    },
    
    goalCategories: [
      {
        id: 'mobility',
        name: '活動度改善',
        description: '關節活動範圍擴大目標'
      },
      {
        id: 'strength',
        name: '肌力訓練',
        description: '肌肉力量提升目標'
      },
      {
        id: 'pain_management',
        name: '疼痛控制',
        description: '疼痛減輕和舒緩目標'
      },
      {
        id: 'functional',
        name: '功能恢復',
        description: '日常生活功能恢復目標'
      },
      {
        id: 'balance',
        name: '平衡協調',
        description: '平衡能力和協調性改善目標'
      }
    ],
    
    chartTitles: {
      vitalSigns: '復健追蹤數據',
      goals: '復健目標進度',
      progress: '復健療效報告'
    }
  }
};

// 根據ID獲取數據模式
const getDataModeById = (id) => {
  return DEFAULT_DATA_MODES[id] || null;
};

// 獲取所有可用模式
const getAllDataModes = () => {
  return Object.values(DEFAULT_DATA_MODES);
};

// 獲取模式的生命徵象映射
const getVitalSignsMapping = (modeId) => {
  const mode = getDataModeById(modeId);
  return mode ? mode.vitalSignsMapping : {};
};

// 獲取模式的目標分類
const getGoalCategories = (modeId) => {
  const mode = getDataModeById(modeId);
  return mode ? mode.goalCategories : [];
};

// 獲取模式的圖表標題
const getChartTitles = (modeId) => {
  const mode = getDataModeById(modeId);
  return mode ? mode.chartTitles : {
    vitalSigns: '數據記錄',
    goals: '目標追蹤', 
    progress: '進度報告'
  };
};

module.exports = {
  DEFAULT_DATA_MODES,
  getDataModeById,
  getAllDataModes,
  getVitalSignsMapping,
  getGoalCategories,
  getChartTitles
};