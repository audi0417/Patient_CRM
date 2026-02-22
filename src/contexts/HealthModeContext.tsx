import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// 健康模式配置類型
interface VitalSignsMapping {
  [key: string]: {
    label: string;
    unit: string;
    type: string;
    required: boolean;
    step?: string;
  };
}

interface GoalCategory {
  value: string;
  label: string;
  unit: string;
}

interface ChartTitles {
  vitalSigns: string;
  dashboard: string;
  records: string;
}

interface HealthModeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  vitalSignsMapping: VitalSignsMapping;
  goalCategories: GoalCategory[];
  chartTitles: ChartTitles;
}

interface HealthModeContextType {
  healthMode: string;
  modeConfig: HealthModeConfig | null;
  customizations: any;
  isLoading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  
  // 便利方法
  getVitalSignLabel: (field: string) => string;
  getVitalSignUnit: (field: string) => string;
  getGoalCategories: () => GoalCategory[];
  getChartTitle: (type: 'vitalSigns' | 'dashboard' | 'records') => string;
}

const HealthModeContext = createContext<HealthModeContextType | undefined>(undefined);

// 預設配置（備用）
const DEFAULT_CONFIG: HealthModeConfig = {
  id: 'nutrition',
  name: '營養管理',
  description: '適用於營養師、減重中心，專注於飲食與營養追蹤',
  icon: '🥗',
  category: 'wellness',
  vitalSignsMapping: {
    bloodPressureSystolic: { label: '卡路里攝取', unit: 'kcal', type: 'number', required: false },
    bloodPressureDiastolic: { label: '蛋白質', unit: 'g', type: 'number', required: false },
    heartRate: { label: '碳水化合物', unit: 'g', type: 'number', required: false },
    temperature: { label: '脂肪攝取', unit: 'g', type: 'number', required: false, step: '0.1' },
    respiratoryRate: { label: '纖維', unit: 'g', type: 'number', required: false },
    oxygenSaturation: { label: '水分攝取', unit: 'ml', type: 'number', required: false },
    bloodGlucose: { label: '血糖', unit: 'mg/dL', type: 'number', required: false }
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
};

interface HealthModeProviderProps {
  children: React.ReactNode;
}

export const HealthModeProvider: React.FC<HealthModeProviderProps> = ({ children }) => {
  const [healthMode, setHealthMode] = useState<string>('nutrition');
  const [modeConfig, setModeConfig] = useState<HealthModeConfig | null>(DEFAULT_CONFIG);
  const [customizations, setCustomizations] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHealthModeConfig = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 獲取組織的健康模式配置
      const response = await fetch('/api/organizations/me/health-mode', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        // 如果無權限或其他錯誤，使用預設配置
        console.warn('Failed to load health mode config, using default');
        setModeConfig(DEFAULT_CONFIG);
        setHealthMode('nutrition');
        setCustomizations({});
        return;
      }

      const data = await response.json();
      
      setHealthMode(data.healthMode || 'nutrition');
      
      // 合併基礎配置和自訂配置
      let finalConfig = data.modeConfig || DEFAULT_CONFIG;
      
      if (data.customizations && Object.keys(data.customizations).length > 0) {
        // 應用自訂配置
        finalConfig = {
          ...finalConfig,
          name: data.customizations.name || finalConfig.name,
          description: data.customizations.description || finalConfig.description,
          vitalSignsMapping: {
            ...finalConfig.vitalSignsMapping,
            ...(data.customizations.vitalSignsMapping || {})
          },
          goalCategories: data.customizations.goalCategories || finalConfig.goalCategories,
          chartTitles: {
            ...finalConfig.chartTitles,
            ...(data.customizations.chartTitles || {})
          }
        };
      }
      
      setModeConfig(finalConfig);
      setCustomizations(data.customizations || {});
    } catch (err) {
      console.error('Error loading health mode config:', err);
      setError('載入健康模式配置失敗');
      // 使用預設配置作為備用
      setModeConfig(DEFAULT_CONFIG);
      setHealthMode('nutrition');
      setCustomizations({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealthModeConfig();
  }, []);

  // 便利方法
  const getVitalSignLabel = (field: string): string => {
    return modeConfig?.vitalSignsMapping[field]?.label || field;
  };

  const getVitalSignUnit = (field: string): string => {
    return modeConfig?.vitalSignsMapping[field]?.unit || '';
  };

  const getGoalCategories = (): GoalCategory[] => {
    return modeConfig?.goalCategories || DEFAULT_CONFIG.goalCategories;
  };

  const getChartTitle = (type: 'vitalSigns' | 'dashboard' | 'records'): string => {
    return modeConfig?.chartTitles[type] || DEFAULT_CONFIG.chartTitles[type];
  };

  const refreshConfig = (): Promise<void> => {
    return loadHealthModeConfig();
  };

  const contextValue: HealthModeContextType = {
    healthMode,
    modeConfig,
    customizations,
    isLoading,
    error,
    refreshConfig,
    getVitalSignLabel,
    getVitalSignUnit,
    getGoalCategories,
    getChartTitle
  };

  return (
    <HealthModeContext.Provider value={contextValue}>
      {children}
    </HealthModeContext.Provider>
  );
};

// Hook for using health mode context
export const useHealthMode = (): HealthModeContextType => {
  const context = useContext(HealthModeContext);
  if (context === undefined) {
    throw new Error('useHealthMode must be used within a HealthModeProvider');
  }
  return context;
};

// Hook for vital signs mapping
export const useVitalSignsMapping = () => {
  const { modeConfig, getVitalSignLabel, getVitalSignUnit } = useHealthMode();
  
  return {
    mapping: modeConfig?.vitalSignsMapping || {},
    getLabel: getVitalSignLabel,
    getUnit: getVitalSignUnit,
    
    // 常用欄位的快速取得方法
    labels: {
      bloodPressureSystolic: getVitalSignLabel('bloodPressureSystolic'),
      bloodPressureDiastolic: getVitalSignLabel('bloodPressureDiastolic'),
      heartRate: getVitalSignLabel('heartRate'),
      temperature: getVitalSignLabel('temperature'),
      respiratoryRate: getVitalSignLabel('respiratoryRate'),
      oxygenSaturation: getVitalSignLabel('oxygenSaturation'),
      bloodGlucose: getVitalSignLabel('bloodGlucose')
    },
    
    units: {
      bloodPressureSystolic: getVitalSignUnit('bloodPressureSystolic'),
      bloodPressureDiastolic: getVitalSignUnit('bloodPressureDiastolic'),
      heartRate: getVitalSignUnit('heartRate'),
      temperature: getVitalSignUnit('temperature'),
      respiratoryRate: getVitalSignUnit('respiratoryRate'),
      oxygenSaturation: getVitalSignUnit('oxygenSaturation'),
      bloodGlucose: getVitalSignUnit('bloodGlucose')
    }
  };
};

export default HealthModeContext;