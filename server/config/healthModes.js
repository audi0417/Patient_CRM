/**
 * 健康管理模式配置
 * SuperAdmin 可以管理這些預設模式，組織可以選擇並自訂
 */

// 預設健康管理模式
const DEFAULT_HEALTH_MODES = {
  // 營養管理模式（當前實現）
  nutrition: {
    id: 'nutrition',
    name: '營養管理',
    description: '適用於營養師、減重中心，專注於飲食與營養追蹤',
    icon: '🥗',
    category: 'wellness',
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
      dashboard: '營養目標',
      records: '營養記錄'
    }
  },

  // 傳統健康管理模式
  medical: {
    id: 'medical',
    name: '醫療監護',
    description: '適用於醫院、診所，專注於生命徵象監測',
    icon: '🏥',
    category: 'medical',
    vitalSignsMapping: {
      bloodPressureSystolic: {
        label: '收縮壓',
        unit: 'mmHg',
        type: 'number',
        required: false
      },
      bloodPressureDiastolic: {
        label: '舒張壓',
        unit: 'mmHg',
        type: 'number',
        required: false
      },
      heartRate: {
        label: '心率',
        unit: 'bpm',
        type: 'number',
        required: false
      },
      temperature: {
        label: '體溫',
        unit: '°C',
        type: 'number',
        required: false,
        step: '0.1'
      },
      respiratoryRate: {
        label: '呼吸率',
        unit: '次/分',
        type: 'number',
        required: false
      },
      oxygenSaturation: {
        label: '血氧飽和度',
        unit: '%',
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
      { value: 'weight', label: '體重控制', unit: 'kg' },
      { value: 'bloodPressure', label: '血壓控制', unit: 'mmHg' },
      { value: 'bloodSugar', label: '血糖控制', unit: 'mg/dL' },
      { value: 'exercise', label: '運動目標', unit: '分鐘/週' },
      { value: 'health', label: '健康指標', unit: '' },
      { value: 'custom', label: '自訂', unit: '' }
    ],
    chartTitles: {
      vitalSigns: '生命徵象趨勢',
      dashboard: '健康目標',
      records: '生命徵象記錄'
    }
  },

  // 運動訓練模式
  fitness: {
    id: 'fitness',
    name: '運動訓練',
    description: '適用於健身房、私人教練，專注於運動表現追蹤',
    icon: '💪',
    category: 'fitness',
    vitalSignsMapping: {
      bloodPressureSystolic: {
        label: '訓練強度',
        unit: '級別',
        type: 'number',
        required: false
      },
      bloodPressureDiastolic: {
        label: '訓練時間',
        unit: '分鐘',
        type: 'number',
        required: false
      },
      heartRate: {
        label: '最大心率',
        unit: 'bpm',
        type: 'number',
        required: false
      },
      temperature: {
        label: '消耗熱量',
        unit: 'kcal',
        type: 'number',
        required: false
      },
      respiratoryRate: {
        label: '組數',
        unit: '組',
        type: 'number',
        required: false
      },
      oxygenSaturation: {
        label: '次數',
        unit: '次',
        type: 'number',
        required: false
      },
      bloodGlucose: {
        label: '疲勞指數',
        unit: '',
        type: 'number',
        required: false
      }
    },
    goalCategories: [
      { value: 'weight', label: '體重目標', unit: 'kg' },
      { value: 'bodyFat', label: '體脂率', unit: '%' },
      { value: 'muscleMass', label: '肌肉量', unit: 'kg' },
      { value: 'strength', label: '力量目標', unit: 'kg' },
      { value: 'cardio', label: '有氧目標', unit: '分鐘/週' },
      { value: 'exercise', label: '訓練頻率', unit: '次/週' },
      { value: 'custom', label: '自訂', unit: '' }
    ],
    chartTitles: {
      vitalSigns: '運動表現趨勢',
      dashboard: '訓練目標',
      records: '運動記錄'
    }
  },

  // 康復治療模式
  rehabilitation: {
    id: 'rehabilitation',
    name: '康復治療',
    description: '適用於復健中心、物理治療，專注於康復進度追蹤',
    icon: '🩺',
    category: 'medical',
    vitalSignsMapping: {
      bloodPressureSystolic: {
        label: '疼痛程度',
        unit: '分',
        type: 'number',
        required: false
      },
      bloodPressureDiastolic: {
        label: '治療時間',
        unit: '分鐘',
        type: 'number',
        required: false
      },
      heartRate: {
        label: '活動範圍',
        unit: '度',
        type: 'number',
        required: false
      },
      temperature: {
        label: '肌力等級',
        unit: '級',
        type: 'number',
        required: false
      },
      respiratoryRate: {
        label: '治療次數',
        unit: '次',
        type: 'number',
        required: false
      },
      oxygenSaturation: {
        label: '功能評分',
        unit: '分',
        type: 'number',
        required: false
      },
      bloodGlucose: {
        label: '康復指數',
        unit: '',
        type: 'number',
        required: false
      }
    },
    goalCategories: [
      { value: 'mobility', label: '活動能力', unit: '分' },
      { value: 'pain', label: '疼痛控制', unit: '分' },
      { value: 'strength', label: '肌力恢復', unit: '級' },
      { value: 'balance', label: '平衡能力', unit: '分' },
      { value: 'endurance', label: '耐力提升', unit: '分鐘' },
      { value: 'function', label: '功能復原', unit: '%' },
      { value: 'custom', label: '自訂', unit: '' }
    ],
    chartTitles: {
      vitalSigns: '康復進度趨勢',
      dashboard: '康復目標',
      records: '治療記錄'
    }
  },

  // 長者照護模式
  eldercare: {
    id: 'eldercare',
    name: '長者照護',
    description: '適用於養護機構、日照中心，專注於長者健康監護',
    icon: '👴',
    category: 'care',
    vitalSignsMapping: {
      bloodPressureSystolic: {
        label: '收縮壓',
        unit: 'mmHg',
        type: 'number',
        required: false
      },
      bloodPressureDiastolic: {
        label: '舒張壓',
        unit: 'mmHg',
        type: 'number',
        required: false
      },
      heartRate: {
        label: '心率',
        unit: 'bpm',
        type: 'number',
        required: false
      },
      temperature: {
        label: '體溫',
        unit: '°C',
        type: 'number',
        required: false,
        step: '0.1'
      },
      respiratoryRate: {
        label: '認知評分',
        unit: '分',
        type: 'number',
        required: false
      },
      oxygenSaturation: {
        label: '血氧飽和度',
        unit: '%',
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
      { value: 'health', label: '健康維持', unit: '' },
      { value: 'mobility', label: '行動能力', unit: '分' },
      { value: 'cognitive', label: '認知功能', unit: '分' },
      { value: 'social', label: '社交參與', unit: '次/週' },
      { value: 'medication', label: '用藥順從', unit: '%' },
      { value: 'safety', label: '安全指標', unit: '分' },
      { value: 'custom', label: '自訂', unit: '' }
    ],
    chartTitles: {
      vitalSigns: '健康監護趨勢',
      dashboard: '照護目標',
      records: '照護記錄'
    }
  }
};

/**
 * 獲取所有預設模式
 */
function getAllHealthModes() {
  return DEFAULT_HEALTH_MODES;
}

/**
 * 獲取特定模式
 */
function getHealthMode(modeId) {
  return DEFAULT_HEALTH_MODES[modeId] || null;
}

/**
 * 獲取模式的生命徵象標籤映射
 */
function getVitalSignsMapping(modeId) {
  const mode = DEFAULT_HEALTH_MODES[modeId];
  return mode ? mode.vitalSignsMapping : null;
}

/**
 * 獲取模式的目標類別
 */
function getGoalCategories(modeId) {
  const mode = DEFAULT_HEALTH_MODES[modeId];
  return mode ? mode.goalCategories : [];
}

/**
 * 獲取模式的圖表標題
 */
function getChartTitles(modeId) {
  const mode = DEFAULT_HEALTH_MODES[modeId];
  return mode ? mode.chartTitles : {
    vitalSigns: '數據趨勢',
    dashboard: '目標',
    records: '記錄'
  };
}

/**
 * 創建自訂模式（基於現有模式）
 */
function createCustomMode(baseMode, customizations) {
  const base = DEFAULT_HEALTH_MODES[baseMode];
  if (!base) return null;

  return {
    ...base,
    id: 'custom',
    name: customizations.name || `自訂 ${base.name}`,
    description: customizations.description || base.description,
    vitalSignsMapping: {
      ...base.vitalSignsMapping,
      ...(customizations.vitalSignsMapping || {})
    },
    goalCategories: customizations.goalCategories || base.goalCategories,
    chartTitles: {
      ...base.chartTitles,
      ...(customizations.chartTitles || {})
    }
  };
}

/**
 * 驗證模式配置
 */
function validateModeConfig(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // 檢查必要欄位
  const required = ['id', 'name', 'vitalSignsMapping'];
  for (const field of required) {
    if (!config[field]) {
      return false;
    }
  }

  // 檢查生命徵象映射格式
  const mapping = config.vitalSignsMapping;
  const validFields = [
    'bloodPressureSystolic',
    'bloodPressureDiastolic', 
    'heartRate',
    'temperature',
    'respiratoryRate',
    'oxygenSaturation',
    'bloodGlucose'
  ];

  for (const field of validFields) {
    if (mapping[field] && (!mapping[field].label || !mapping[field].unit)) {
      return false;
    }
  }

  return true;
}

module.exports = {
  DEFAULT_HEALTH_MODES,
  getAllHealthModes,
  getHealthMode,
  getVitalSignsMapping,
  getGoalCategories,
  getChartTitles,
  createCustomMode,
  validateModeConfig
};