/**
 * 數據記錄模組配置 - 簡化版本
 * 
 * 專注於兩種實際有明確需求的數據記錄模式：
 * 1. 營養健康 - 身高體重血糖等健康管理指標
 * 2. 復健追蹤 - 關節角度肌力疼痛等復健指標
 */

const DEFAULT_DATA_MODES = {
  // 營養健康模式 - 適用於營養診所、減重中心、健康管理中心
  nutrition: {
    id: 'nutrition',
    name: '營養健康',
    description: '記錄身高、體重、血糖、腰圍、體脂等健康管理指標，適用於營養診所和健康管理中心',
    icon: '🥗',
    category: 'wellness',
    
    vitalSignsMapping: {
      bloodPressureSystolic: {
        label: '身高',
        unit: 'cm',
        type: 'number',
        required: false,
        normalRange: '150-200cm'
      },
      bloodPressureDiastolic: {
        label: '體重',
        unit: 'kg', 
        type: 'number',
        required: false,
        step: '0.1',
        normalRange: '40-150kg'
      },
      heartRate: {
        label: '血糖',
        unit: 'mg/dL',
        type: 'number',
        required: false,
        normalRange: '70-140mg/dL'
      },
      temperature: {
        label: '腰圍',
        unit: 'cm',
        type: 'number',
        required: false,
        step: '0.1',
        normalRange: '60-120cm'
      },
      respiratoryRate: {
        label: '臀圍',
        unit: 'cm',
        type: 'number',
        required: false
      },
      oxygenSaturation: {
        label: '體脂率',
        unit: '%',
        type: 'number',
        required: false,
        step: '0.1',
        normalRange: '10-40%'
      }
    },
    
    goalCategories: [
      {
        id: 'weight',
        name: '體重管理',
        description: '設定理想體重和體型目標'
      },
      {
        id: 'nutrition',
        name: '營養攝取', 
        description: '日常飲食和營養均衡目標'
      },
      {
        id: 'body_composition',
        name: '體脂控制',
        description: '體脂率和肌肉量改善目標'
      },
      {
        id: 'blood_sugar',
        name: '血糖管理',
        description: '血糖控制和代謝健康目標'
      },
      {
        id: 'lifestyle',
        name: '生活習慣',
        description: '健康生活方式養成目標'
      }
    ],
    
    chartTitles: {
      vitalSigns: '營養健康數據',
      goals: '健康目標追蹤', 
      progress: '健康進度報告'
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

// 根據ID獲取健康模式
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