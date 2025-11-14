import { useState, useEffect } from 'react';
import { tokenManager } from '../lib/api';

export interface ModuleConfig {
  enabled: boolean;
  name: string;
  description?: string;
  features?: string[];
}

export interface OrganizationModules {
  healthManagement?: ModuleConfig;
  appointments?: ModuleConfig;
}

interface ModulesResponse {
  modules: OrganizationModules;
}

/**
 * 使用組織模組配置的 Hook
 */
export function useModules() {
  const [modules, setModules] = useState<OrganizationModules>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = tokenManager.get();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await fetch('/api/modules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('無法獲取模組配置');
      }

      const data = await response.json();
      setModules(data.modules || {});
    } catch (err: any) {
      console.error('獲取模組配置失敗:', err);
      setError(err.message || '獲取模組配置失敗');
      // 預設所有模組都啟用（降級處理）
      setModules({
        healthManagement: { enabled: true, name: '健康管理' },
        appointments: { enabled: true, name: '預約管理' }
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 檢查指定模組是否啟用
   */
  const isModuleEnabled = (moduleId: keyof OrganizationModules): boolean => {
    return modules[moduleId]?.enabled ?? false;
  };

  return {
    modules,
    loading,
    error,
    isModuleEnabled,
    refetch: fetchModules
  };
}
