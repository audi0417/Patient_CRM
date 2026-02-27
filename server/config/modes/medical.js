/**
 * 醫療監護模式
 * 適用於醫院、診所，專注於生命徵象監測
 */

module.exports = {
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
    goals: '健康目標',
    progress: '生命徵象記錄',
    dashboard: '健康目標'
  }
};