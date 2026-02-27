/**
 * 復健追蹤模式
 * 適用於復健科、物理治療所，專注於復健進度追蹤
 */

module.exports = {
  id: 'rehabilitation',
  name: '復健追蹤',
  description: '適用於復健科、物理治療所，專注於復健進度追蹤',
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
    { value: 'mobility', label: '活動度改善', unit: '度' },
    { value: 'strength', label: '肌力訓練', unit: '級' },
    { value: 'pain_management', label: '疼痛控制', unit: '分' },
    { value: 'functional', label: '功能恢復', unit: '%' },
    { value: 'balance', label: '平衡協調', unit: '秒' },
    { value: 'custom', label: '自訂', unit: '' }
  ],
  
  chartTitles: {
    vitalSigns: '復健追蹤數據',
    goals: '復健目標進度',
    progress: '復健療效報告',
    dashboard: '復健目標'
  }
};