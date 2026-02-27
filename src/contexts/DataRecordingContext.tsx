import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// 數據記錄模式配置類型
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

interface DataRecordingModeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  vitalSignsMapping: VitalSignsMapping;
  goalCategories: GoalCategory[];
  chartTitles: ChartTitles;
}

interface DataRecordingContextType {
  dataRecordingMode: string;
  modeConfig: DataRecordingModeConfig | null;
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

// 預設配置（向後兼容營養管理模式）
const DEFAULT_CONFIG: DataRecordingModeConfig = {
  id: 'nutrition',
  name: '營養管理',
  description: '營養師和減重中心的營養管理',
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
};

interface DataRecordingProviderProps {
  children: React.ReactNode;
}

const DataRecordingContext = createContext<DataRecordingContextType | undefined>(undefined);

export const DataRecordingProvider: React.FC<DataRecordingProviderProps> = ({ children }) => {
  const [dataRecordingMode, setDataRecordingMode] = useState<string>('nutrition');
  const [modeConfig, setModeConfig] = useState<DataRecordingModeConfig | null>(DEFAULT_CONFIG);
  const [customizations, setCustomizations] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDataRecordingModeConfig = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/organizations/me/data-recording-mode', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        // 如果無權限或其他錯誤，使用預設配置
        console.warn('Failed to load data recording mode config, using default');
        setModeConfig(DEFAULT_CONFIG);
        setDataRecordingMode('nutrition');
        setCustomizations({});
        return;
      }

      const data = await response.json();
      
      // 設置數據記錄模式
      setDataRecordingMode(data.dataRecordingMode || 'nutrition');
      
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
      
    } catch (error) {
      console.error('Error loading data recording mode config:', error);
      setError('載入數據記錄模式配置失敗');
      // 使用預設配置
      setModeConfig(DEFAULT_CONFIG);
      setDataRecordingMode('nutrition');
      setCustomizations({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataRecordingModeConfig();
  }, []);

  const getVitalSignLabel = (field: string): string => {
    return modeConfig?.vitalSignsMapping[field]?.label || field;
  };

  const getVitalSignUnit = (field: string): string => {
    return modeConfig?.vitalSignsMapping[field]?.unit || '';
  };

  const getGoalCategories = (): GoalCategory[] => {
    return modeConfig?.goalCategories || [];
  };

  const getChartTitle = (type: 'vitalSigns' | 'dashboard' | 'records'): string => {
    return modeConfig?.chartTitles[type] || '';
  };

  const value: DataRecordingContextType = {
    dataRecordingMode,
    modeConfig,
    customizations,
    isLoading,
    error,
    refreshConfig: loadDataRecordingModeConfig,
    getVitalSignLabel,
    getVitalSignUnit,
    getGoalCategories,
    getChartTitle
  };

  return (
    <DataRecordingContext.Provider value={value}>
      {children}
    </DataRecordingContext.Provider>
  );
};

export const useDataRecording = (): DataRecordingContextType => {
  const context = useContext(DataRecordingContext);
  if (context === undefined) {
    throw new Error('useDataRecording must be used within a DataRecordingProvider');
  }
  return context;
};

export default DataRecordingContext;