import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface VitalSignsMapping {
  [key: string]: {
    label: string;
    unit: string;
    normalRange?: string;
    type?: string;
    required?: boolean;
    step?: string;
    min?: number;
    max?: number;
  };
}

interface GoalCategory {
  id: string;
  name: string;
  description: string;
}

interface ChartTitles {
  vitalSigns: string;
  goals: string;
  progress: string;
}

interface DataModeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  vitalSignsMapping: VitalSignsMapping;
  goalCategories: GoalCategory[];
  chartTitles: ChartTitles;
}

interface CurrentDataMode {
  modeId: string | null;
  modeName: string | null;
  customizations: {
    vitalSignsMapping?: VitalSignsMapping;
    goalCategories?: GoalCategory[];
    chartTitles?: ChartTitles;
  };
  baseConfig?: DataModeConfig;
}

interface DataModeContextType {
  currentMode: CurrentDataMode | null;
  loading: boolean;
  error: string | null;
  refreshMode: () => Promise<void>;
  getVitalSignsMapping: () => VitalSignsMapping;
  getGoalCategories: () => GoalCategory[];
  getChartTitles: () => ChartTitles;
}

const DataModeContext = createContext<DataModeContextType | undefined>(undefined);

export const useDataMode = (): DataModeContextType => {
  const context = useContext(DataModeContext);
  if (!context) {
    throw new Error('useDataMode must be used within a DataModeProvider');
  }
  return context;
};

// Hook 專門用於生命徵象映射
export const useVitalSignsMapping = () => {
  const { getVitalSignsMapping } = useDataMode();
  return getVitalSignsMapping();
};

// Hook 專門用於目標分類
export const useGoalCategories = () => {
  const { getGoalCategories } = useDataMode();
  return getGoalCategories();
};

// Hook 專門用於圖表標題  
export const useChartTitles = () => {
  const { getChartTitles } = useDataMode();
  return getChartTitles();
};

interface DataModeProviderProps {
  children: ReactNode;
}

export const DataModeProvider: React.FC<DataModeProviderProps> = ({ children }) => {
  const [currentMode, setCurrentMode] = useState<CurrentDataMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入當前組織的數據模式配置
  const loadCurrentMode = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setCurrentMode(null);
        return;
      }

      const response = await fetch('/api/data-modes/me/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentMode(data);
      } else if (response.status === 401) {
        // Token 無效，清除當前模式
        setCurrentMode(null);
      } else {
        throw new Error('載入數據模式配置失敗');
      }
    } catch (error) {
      console.error('Load data mode error:', error);
      setError(error instanceof Error ? error.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  // 獲取生命徵象映射（優先使用自訂設定）
  const getVitalSignsMapping = (): VitalSignsMapping => {
    if (!currentMode?.baseConfig) {
      // 預設的基本映射
      return {
        bloodPressureSystolic: { label: '收縮壓', unit: 'mmHg' },
        bloodPressureDiastolic: { label: '舒張壓', unit: 'mmHg' },
        heartRate: { label: '心率', unit: 'bpm' },
        temperature: { label: '體溫', unit: '°C' },
        respiratoryRate: { label: '呼吸', unit: '/min' },
        oxygenSaturation: { label: '血氧', unit: '%' }
      };
    }

    const baseMapping = currentMode.baseConfig.vitalSignsMapping;
    const customMapping = currentMode.customizations?.vitalSignsMapping || {};

    // 合併基礎配置和自訂配置
    const result: VitalSignsMapping = {};
    
    Object.keys(baseMapping).forEach(key => {
      result[key] = {
        ...baseMapping[key],
        ...(customMapping[key] || {})
      };
      
      // 如果自訂配置有 label 或 unit，使用自訂的；沒有則使用基礎的
      if (customMapping[key]?.label) {
        result[key].label = customMapping[key].label;
      }
      if (customMapping[key]?.unit) {
        result[key].unit = customMapping[key].unit;
      }
    });

    return result;
  };

  // 獲取目標分類（優先使用自訂設定）
  const getGoalCategories = (): GoalCategory[] => {
    if (!currentMode?.baseConfig) {
      return [
        { id: 'general', name: '一般目標', description: '一般健康目標' },
        { id: 'lifestyle', name: '生活習慣', description: '生活方式改善' }
      ];
    }

    // 目前簡化實現，未來可支援更複雜的自訂
    return currentMode.customizations?.goalCategories || currentMode.baseConfig.goalCategories;
  };

  // 獲取圖表標題（優先使用自訂設定）
  const getChartTitles = (): ChartTitles => {
    if (!currentMode?.baseConfig) {
      return {
        vitalSigns: '生命徵象',
        goals: '目標追蹤',
        progress: '進度報告'
      };
    }

    const baseTitles = currentMode.baseConfig.chartTitles;
    const customTitles = currentMode.customizations?.chartTitles || {};

    return {
      vitalSigns: (customTitles as any)?.vitalSigns || baseTitles.vitalSigns,
      goals: (customTitles as any)?.goals || baseTitles.goals, 
      progress: (customTitles as any)?.progress || baseTitles.progress
    };
  };

  // 重新載入模式配置
  const refreshMode = async () => {
    await loadCurrentMode();
  };

  // 初始載入
  useEffect(() => {
    loadCurrentMode();
  }, []);

  const value: DataModeContextType = {
    currentMode,
    loading,
    error,
    refreshMode,
    getVitalSignsMapping,
    getGoalCategories,
    getChartTitles
  };

  return (
    <DataModeContext.Provider value={value}>
      {children}
    </DataModeContext.Provider>
  );
};