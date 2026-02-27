/**
 * 營養管理模式
 * 適用於營養師、減重中心，專注於飲食與營養追蹤
 */

module.exports = {
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
};