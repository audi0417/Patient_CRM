/**
 * 運動訓練模式
 * 適用於健身房、私人教練，專注於運動表現追蹤
 */

module.exports = {
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
    goals: '訓練目標',
    progress: '運動記錄',
    dashboard: '訓練目標'
  }
};