/**
 * API 客戶端層
 * 統一管理所有後端 API 請求
 */

import {
  User,
  LoginCredentials,
  LoginResponse
} from "@/types/user";
import {
  Patient,
  Appointment,
  PatientGoal,
  BodyCompositionRecord,
  VitalSignsRecord
} from "@/types/patient";
import type {
  ServiceItem,
  TreatmentPackage,
  PackageDetail,
  PackageUsageLog,
  PackageSummary,
  CreateServiceItemData,
  CreatePackageData,
  ExecutePackageData
} from "@/types/treatment";
import type {
  Tag,
  PatientGroup,
  ConsultationRecord,
  Appointment as AppointmentType,
} from "@/types/patient";

/** Extends the global Window for demo-mode properties */
interface DemoWindow extends Window {
  __isDemoMode?: boolean;
  __demoData?: DemoData;
  __demoUpdateCallback?: (appointments: AppointmentType[]) => void;
}

interface DemoData {
  patients: Patient[];
  appointments: AppointmentType[];
  user: User | null;
}

/** Service type record returned from API */
interface ServiceType {
  id: string;
  name: string;
  color: string;
  isActive: number;
  displayOrder: number;
  description?: string;
}

/** LINE configuration status */
interface LineConfigStatus {
  isConfigured: boolean;
}

/** LINE conversation query parameters */
interface LineConversationParams {
  status?: string;
  limit?: string;
  offset?: string;
}

/** LINE message query parameters */
interface LineMessageParams {
  limit?: string;
  offset?: string;
}

/** LINE configuration input */
interface LineConfigInput {
  channelId: string;
  channelSecret: string;
  accessToken: string;
  webhookUrl?: string;
}

/** LINE send message response */
interface LineSendResponse {
  success: boolean;
  messageId?: string;
}

/**
 * 動態取得 API Base URL
 * 支援 localhost、外部 IP 和 devtunnel 存取
 */
const getApiBaseUrl = (): string => {
  // 如果設定了環境變數，優先使用
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 這樣可以支援 localhost、外部 IP 和 devtunnel
  if (import.meta.env.DEV) {
    return '/api';
  }

  // 生產環境中，使用相同的主機名（Zeabur 會自動路由）
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// 儲存 token 的 key
const AUTH_TOKEN_KEY = "hospital_crm_auth_token";
const REFRESH_TOKEN_KEY = "hospital_crm_refresh_token";

/**
 * API 錯誤類別
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 取得當前的認證 token
 */
const getToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * 設置認證 token
 */
const setToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

/**
 * 清除認證 token
 */
const clearToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

/**
 * 取得 refresh token
 */
const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * 設置 refresh token
 */
const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

/**
 * 清除 refresh token
 */
const clearRefreshToken = (): void => {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Demo 模式資料存取器
 * 用於從 DemoContext 獲取模擬資料
 */
const getDemoData = (): DemoData => {
  return (window as unknown as DemoWindow).__demoData || {
    patients: [],
    appointments: [],
    user: null,
  };
};

/**
 * 設置 Demo 資料（由 DemoContext 調用）
 */
export const setDemoData = (data: DemoData) => {
  (window as unknown as DemoWindow).__demoData = data;
};

/**
 * Demo 模式 API 攔截處理
 */
function handleDemoRequest<T>(endpoint: string, options: RequestInit = {}): T | null {
  const method = options.method || 'GET';
  const demoData = getDemoData();

  // 服務類型
  if (endpoint.includes('/service-types')) {
    return [
      { id: '1', name: '一般回診', color: '#3b82f6', isActive: 1, displayOrder: 1 },
      { id: '2', name: '初診', color: '#10b981', isActive: 1, displayOrder: 2 },
      { id: '3', name: '諮詢', color: '#8b5cf6', isActive: 1, displayOrder: 3 },
      { id: '4', name: '手術', color: '#ef4444', isActive: 1, displayOrder: 4 },
      { id: '5', name: '療程', color: '#f59e0b', isActive: 1, displayOrder: 5 },
    ] as T;
  }

  // 病患資料
  if (endpoint === '/patients' && method === 'GET') {
    return demoData.patients as T;
  }

  if (endpoint.match(/^\/patients\/[^/]+$/) && method === 'GET') {
    const id = endpoint.split('/').pop();
    return demoData.patients.find((p: Patient) => p.id === id) as T;
  }

  // 預約資料
  if (endpoint === '/appointments' && method === 'GET') {
    return demoData.appointments as T;
  }

  if (endpoint.includes('/appointments?patientId=')) {
    const patientId = endpoint.split('patientId=')[1];
    return demoData.appointments.filter((a: AppointmentType) => a.patientId === patientId) as T;
  }

  if (endpoint.match(/^\/appointments\/[^/]+$/) && method === 'PUT') {
    // 更新預約 - 觸發 demo 更新回調
    const body = options.body ? JSON.parse(options.body as string) : {};
    const id = endpoint.split('/').pop();
    const index = demoData.appointments.findIndex((a: AppointmentType) => a.id === id);
    if (index >= 0) {
      demoData.appointments[index] = { ...demoData.appointments[index], ...body };
      // 觸發更新回調
      if ((window as unknown as DemoWindow).__demoUpdateCallback) {
        (window as unknown as DemoWindow).__demoUpdateCallback!(demoData.appointments);
      }
    }
    return demoData.appointments[index] as T;
  }

  // 認證相關
  if (endpoint === '/auth/me' || endpoint === '/auth/verify') {
    return {
      valid: true,
      user: demoData.user,
      ...demoData.user,
    } as T;
  }

  // 群組資料
  if (endpoint === '/groups') {
    return [
      { id: 'demo-group-1', name: 'VIP 客戶', description: '高價值客戶群組', patientCount: 2 },
      { id: 'demo-group-2', name: '定期回診', description: '需要定期追蹤的客戶', patientCount: 3 },
    ] as T;
  }

  // 標籤資料
  if (endpoint === '/tags') {
    return [
      { id: 'demo-tag-1', name: 'VIP客戶', color: '#f59e0b' },
      { id: 'demo-tag-2', name: '初診', color: '#10b981' },
      { id: 'demo-tag-3', name: '會員', color: '#3b82f6' },
    ] as T;
  }

  // 健康記錄 - 返回空陣列
  if (endpoint.includes('/health/body-composition') || endpoint.includes('/health/vital-signs')) {
    if (method === 'GET') {
      return [] as T;
    }
    return { success: true } as T;
  }

  // 目標 - 返回空陣列
  if (endpoint.includes('/goals')) {
    if (method === 'GET') {
      return [] as T;
    }
    return { success: true } as T;
  }

  // 諮詢記錄 - 返回空陣列
  if (endpoint.includes('/consultations')) {
    if (method === 'GET') {
      return [] as T;
    }
    return { success: true } as T;
  }

  // LINE 相關 - 返回空資料
  if (endpoint.includes('/line/')) {
    if (endpoint.includes('/config')) {
      return { isConfigured: false } as T;
    }
    return [] as T;
  }

  // 服務項目
  if (endpoint.includes('/service-items')) {
    if (method === 'GET') {
      return [
        { id: 1, name: '皮秒雷射', category: '雷射', price: 3000, isActive: true, displayOrder: 1 },
        { id: 2, name: '玻尿酸填充', category: '注射', price: 8000, isActive: true, displayOrder: 2 },
        { id: 3, name: '肉毒桿菌', category: '注射', price: 5000, isActive: true, displayOrder: 3 },
      ] as T;
    }
    return { success: true } as T;
  }

  // 療程方案
  if (endpoint.includes('/treatment-packages')) {
    if (method === 'GET') {
      return [] as T;
    }
    return { success: true } as T;
  }

  // 使用者
  if (endpoint === '/users') {
    return [demoData.user].filter(Boolean) as T;
  }

  // 預設返回 null，表示需要執行真實請求
  return null;
}

// 防止無限重試的標記
let isRefreshing = false;

/**
 * 統一的 API 請求方法
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry: boolean = false
): Promise<T> {
  // Demo Mode Interception
  if ((window as unknown as DemoWindow).__isDemoMode) {
    console.log(`[Demo API] Intercepted: ${options.method || 'GET'} ${endpoint}`);

    const demoResult = handleDemoRequest<T>(endpoint, options);
    if (demoResult !== null) {
      return demoResult;
    }

    // 未處理的端點返回空物件
    console.log(`[Demo API] Unhandled endpoint: ${endpoint}`);
    return {} as T;
  }

  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 如果有 token，加入 Authorization header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // 處理非 JSON 回應
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(
          `API request failed: ${response.statusText}`,
          response.status
        );
      }
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      // 處理 401 未授權錯誤 - 嘗試使用 refresh token 刷新
      if (response.status === 401 && !_isRetry && !isRefreshing) {
        const refreshToken = getRefreshToken();

        // 如果有 refresh token，嘗試刷新
        if (refreshToken && endpoint !== '/auth/refresh') {
          isRefreshing = true;

          try {
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();

              if (refreshData.success && refreshData.token) {
                // 儲存新的 token
                setToken(refreshData.token);
                isRefreshing = false;

                // 重試原始請求
                return apiRequest<T>(endpoint, options, true);
              }
            }

            // Refresh 失敗，清除 tokens 並導向登入頁
            isRefreshing = false;
            clearToken();
            clearRefreshToken();
            window.location.href = '/login';
            throw new ApiError('登入已過期，請重新登入', 401);
          } catch (error) {
            isRefreshing = false;
            clearToken();
            clearRefreshToken();
            window.location.href = '/login';
            throw new ApiError('登入已過期，請重新登入', 401);
          }
        } else {
          // 沒有 refresh token，直接導向登入頁
          clearToken();
          clearRefreshToken();
          window.location.href = '/login';
        }
      }

      throw new ApiError(
        data.error || data.message || 'API request failed',
        response.status,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new ApiError('Network error: Unable to connect to server');
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * API 端點集合
 */
export const api = {
  /**
   * 認證相關 API
   */
  auth: {
    /**
     * 登入
     */
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      const response = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      // 儲存 token 和 refresh token
      if (response.success && response.token) {
        setToken(response.token);
        if (response.refreshToken) {
          setRefreshToken(response.refreshToken);
        }
      }

      return response;
    },

    /**
     * 登出
     */
    logout: async (): Promise<void> => {
      const refreshToken = getRefreshToken();

      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } finally {
        // 無論 API 是否成功，都清除本地 token 和 refresh token
        clearToken();
        clearRefreshToken();
      }
    },

    /**
     * 驗證 token
     */
    verify: async (): Promise<{ valid: boolean; user?: User }> => {
      return apiRequest('/auth/verify', {
        method: 'GET',
      });
    },

    /**
     * 獲取當前使用者資訊
     */
    me: async (): Promise<User> => {
      return apiRequest('/auth/me', {
        method: 'GET',
      });
    },

    /**
     * 修改密碼
     */
    changePassword: async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
    },

    /**
     * 首次登入修改密碼
     */
    firstLoginPassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest('/auth/first-login-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },
  },

  /**
   * 使用者管理 API
   */
  users: {
    /**
     * 獲取所有使用者
     */
    getAll: async (): Promise<User[]> => {
      return apiRequest('/users');
    },

    /**
     * 根據 ID 獲取使用者
     */
    getById: async (id: string): Promise<User> => {
      return apiRequest(`/users/${id}`);
    },

    /**
     * 創建使用者
     */
    create: async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
      return apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    /**
     * 更新使用者
     */
    update: async (id: string, userData: Partial<User>): Promise<User> => {
      return apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    },

    /**
     * 重設密碼
     */
    resetPassword: async (id: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
    },

    /**
     * 刪除使用者
     */
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/users/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * 患者管理 API
   */
  patients: {
    /**
     * 獲取所有患者
     */
    getAll: async (): Promise<Patient[]> => {
      return apiRequest('/patients');
    },

    /**
     * 根據 ID 獲取患者
     */
    getById: async (id: string): Promise<Patient> => {
      return apiRequest(`/patients/${id}`);
    },

    /**
     * 創建患者
     */
    create: async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> => {
      return apiRequest('/patients', {
        method: 'POST',
        body: JSON.stringify(patientData),
      });
    },

    /**
     * 更新患者
     */
    update: async (id: string, patientData: Partial<Patient>): Promise<Patient> => {
      return apiRequest(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patientData),
      });
    },

    /**
     * 刪除患者
     */
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/patients/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * 健康數據 API
   */
  health: {
    bodyComposition: {
      /**
       * 獲取體組成記錄
       */
      getByPatientId: async (patientId: string): Promise<BodyCompositionRecord[]> => {
        return apiRequest(`/health/body-composition?patientId=${patientId}`);
      },

      /**
       * 創建體組成記錄
       */
      create: async (record: Omit<BodyCompositionRecord, 'id'>): Promise<BodyCompositionRecord> => {
        return apiRequest('/health/body-composition', {
          method: 'POST',
          body: JSON.stringify(record),
        });
      },

      /**
       * 更新體組成記錄
       */
      update: async (id: string, record: Partial<BodyCompositionRecord>): Promise<BodyCompositionRecord> => {
        return apiRequest(`/health/body-composition/${id}`, {
          method: 'PUT',
          body: JSON.stringify(record),
        });
      },

      /**
       * 刪除體組成記錄
       */
      delete: async (id: string): Promise<{ success: boolean; message: string }> => {
        return apiRequest(`/health/body-composition/${id}`, {
          method: 'DELETE',
        });
      },

      /**
       * 導出體組成記錄為 Excel
       */
      exportExcel: async (patientId?: string): Promise<void> => {
        const token = getToken();
        const url = patientId
          ? `${API_BASE_URL}/health/body-composition/export/excel?patientId=${patientId}`
          : `${API_BASE_URL}/health/body-composition/export/excel`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new ApiError('導出失敗', response.status);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `體組成記錄_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      },

      /**
       * 匯入體組成記錄 Excel
       */
      importExcel: async (file: File, patientId: string): Promise<{ success: boolean; imported: number; errors?: string[] }> => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', patientId);

        const response = await fetch(`${API_BASE_URL}/health/body-composition/import/excel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new ApiError(error.error || '匯入失敗', response.status, error);
        }

        return response.json();
      },
    },

    vitalSigns: {
      /**
       * 獲取生命徵象記錄
       */
      getByPatientId: async (patientId: string): Promise<VitalSignsRecord[]> => {
        return apiRequest(`/health/vital-signs?patientId=${patientId}`);
      },

      /**
       * 創建生命徵象記錄
       */
      create: async (record: Omit<VitalSignsRecord, 'id'>): Promise<VitalSignsRecord> => {
        return apiRequest('/health/vital-signs', {
          method: 'POST',
          body: JSON.stringify(record),
        });
      },

      /**
       * 更新生命徵象記錄
       */
      update: async (id: string, record: Partial<VitalSignsRecord>): Promise<VitalSignsRecord> => {
        return apiRequest(`/health/vital-signs/${id}`, {
          method: 'PUT',
          body: JSON.stringify(record),
        });
      },

      /**
       * 刪除生命徵象記錄
       */
      delete: async (id: string): Promise<{ success: boolean; message: string }> => {
        return apiRequest(`/health/vital-signs/${id}`, {
          method: 'DELETE',
        });
      },

      /**
       * 導出生命徵象記錄為 Excel
       */
      exportExcel: async (patientId?: string): Promise<void> => {
        const token = getToken();
        const url = patientId
          ? `${API_BASE_URL}/health/vital-signs/export/excel?patientId=${patientId}`
          : `${API_BASE_URL}/health/vital-signs/export/excel`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new ApiError('導出失敗', response.status);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `營養記錄_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      },

      /**
       * 匯入生命徵象記錄 Excel
       */
      importExcel: async (file: File, patientId: string): Promise<{ success: boolean; imported: number; errors?: string[] }> => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', patientId);

        const response = await fetch(`${API_BASE_URL}/health/vital-signs/import/excel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new ApiError(error.error || '匯入失敗', response.status, error);
        }

        return response.json();
      },
    },
  },

  /**
   * 健康目標 API
   */
  goals: {
    /**
     * 獲取患者的健康目標
     */
    getByPatientId: async (patientId: string): Promise<PatientGoal[]> => {
      return apiRequest(`/goals?patientId=${patientId}`);
    },

    /**
     * 根據 ID 獲取目標
     */
    getById: async (id: string): Promise<PatientGoal> => {
      return apiRequest(`/goals/${id}`);
    },

    /**
     * 創建健康目標
     */
    create: async (goal: Omit<PatientGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<PatientGoal> => {
      return apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify(goal),
      });
    },

    /**
     * 更新健康目標
     */
    update: async (id: string, goal: Partial<PatientGoal>): Promise<PatientGoal> => {
      return apiRequest(`/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(goal),
      });
    },

    /**
     * 更新目標進度
     */
    updateProgress: async (id: string, currentValue: number): Promise<PatientGoal> => {
      return apiRequest(`/goals/${id}/update-progress`, {
        method: 'POST',
        body: JSON.stringify({ currentValue }),
      });
    },

    /**
     * 刪除健康目標
     */
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/goals/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * 預約管理 API
   */
  appointments: {
    /**
     * 獲取預約列表
     */
    getByPatientId: async (patientId: string): Promise<Appointment[]> => {
      return apiRequest(`/appointments?patientId=${patientId}`);
    },

    /**
     * 獲取所有預約
     */
    getAll: async (): Promise<Appointment[]> => {
      return apiRequest('/appointments');
    },

    /**
     * 創建預約
     */
    create: async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
      return apiRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify(appointment),
      });
    },

    /**
     * 更新預約
     */
    update: async (id: string, appointment: Partial<Appointment>): Promise<Appointment> => {
      return apiRequest(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(appointment),
      });
    },

    /**
     * 刪除預約
     */
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/appointments/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * 諮詢記錄 API
   */
  consultations: {
    /**
     * 獲取諮詢記錄列表
     */
    getByPatientId: async (patientId: string): Promise<ConsultationRecord[]> => {
      return apiRequest(`/consultations?patientId=${patientId}`);
    },

    /**
     * 獲取所有諮詢記錄
     */
    getAll: async (): Promise<ConsultationRecord[]> => {
      return apiRequest('/consultations');
    },

    /**
     * 根據 ID 獲取諮詢記錄
     */
    getById: async (id: string): Promise<ConsultationRecord> => {
      return apiRequest(`/consultations/${id}`);
    },

    /**
     * 創建諮詢記錄
     */
    create: async (consultation: Omit<ConsultationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConsultationRecord> => {
      return apiRequest('/consultations', {
        method: 'POST',
        body: JSON.stringify(consultation),
      });
    },

    /**
     * 更新諮詢記錄
     */
    update: async (id: string, consultation: Partial<ConsultationRecord>): Promise<ConsultationRecord> => {
      return apiRequest(`/consultations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(consultation),
      });
    },

    /**
     * 刪除諮詢記錄
     */
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/consultations/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * LINE 訊息整合 API
   */
  line: {
    /**
     * 取得 LINE 配置
     */
    getConfig: async (): Promise<LineConfigStatus> => {
      return apiRequest('/line/config');
    },

    /**
     * 儲存 LINE 配置
     */
    saveConfig: async (config: LineConfigInput): Promise<Record<string, unknown>> => {
      return apiRequest('/line/config', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * 停用 LINE 配置
     */
    disableConfig: async (): Promise<Record<string, unknown>> => {
      return apiRequest('/line/config', {
        method: 'DELETE',
      });
    },

    /**
     * 取得對話列表
     */
    getConversations: async (params?: LineConversationParams): Promise<Record<string, unknown>> => {
      const query = new URLSearchParams(params).toString();
      const url = query ? `/line/conversations?${query}` : '/line/conversations';
      return apiRequest(url);
    },

    /**
     * 取得對話訊息
     */
    getMessages: async (conversationId: string, params?: LineMessageParams): Promise<Record<string, unknown>> => {
      const query = new URLSearchParams(params).toString();
      const url = query
        ? `/line/conversations/${conversationId}/messages?${query}`
        : `/line/conversations/${conversationId}/messages`;
      return apiRequest(url);
    },

    /**
     * 發送文字訊息
     */
    sendText: async (patientId: string, text: string): Promise<LineSendResponse> => {
      return apiRequest('/line/send/text', {
        method: 'POST',
        body: JSON.stringify({ patientId, text }),
      });
    },

    /**
     * 發送貼圖
     */
    sendSticker: async (patientId: string, packageId: string, stickerId: string): Promise<LineSendResponse> => {
      return apiRequest('/line/send/sticker', {
        method: 'POST',
        body: JSON.stringify({ patientId, packageId, stickerId }),
      });
    },
  },

  /**
   * 服務類別 API
   */
  serviceTypes: {
    /**
     * 獲取所有服務類別
     */
    getAll: async (): Promise<Record<string, unknown>[]> => {
      return apiRequest('/service-types');
    },

    /**
     * 獲取啟用的服務類別
     */
    getActive: async (): Promise<Record<string, unknown>[]> => {
      return apiRequest('/service-types/active');
    },

    /**
     * 根據 ID 獲取服務類別
     */
    getById: async (id: string): Promise<Record<string, unknown>> => {
      return apiRequest(`/service-types/${id}`);
    },

    /**
     * 創建服務類別
     */
    create: async (serviceType: Record<string, unknown>): Promise<Record<string, unknown>> => {
      return apiRequest('/service-types', {
        method: 'POST',
        body: JSON.stringify(serviceType),
      });
    },

    /**
     * 更新服務類別
     */
    update: async (id: string, serviceType: Record<string, unknown>): Promise<Record<string, unknown>> => {
      return apiRequest(`/service-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(serviceType),
      });
    },

    /**
     * 刪除服務類別
     */
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/service-types/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * 批次更新排序順序
     */
    reorder: async (items: Array<{ id: string; displayOrder: number }>): Promise<Record<string, unknown>[]> => {
      return apiRequest('/service-types/batch/reorder', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
    },
  },
};

/**
 * 匯出 token 管理方法供其他模組使用
 */
export const tokenManager = {
  get: getToken,
  set: setToken,
  clear: clearToken,
};

/**
 * 療程追蹤模組 API
 */
export const treatmentApi = {
  // ========== 服務項目 ==========
  serviceItems: {
    /**
     * 取得所有服務項目
     */
    getAll: async (params?: { category?: string; isActive?: boolean }): Promise<ServiceItem[]> => {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

      const url = queryParams.toString()
        ? `/service-items?${queryParams}`
        : `/service-items`;

      return apiRequest<ServiceItem[]>(url);
    },

    /**
     * 取得所有分類
     */
    getCategories: async (): Promise<string[]> => {
      return apiRequest<string[]>(`/service-items/categories`);
    },

    /**
     * 取得啟用的服務項目
     */
    getActive: async (): Promise<ServiceItem[]> => {
      return apiRequest<ServiceItem[]>(`/service-items/active`);
    },

    /**
     * 取得單一服務項目
     */
    getById: async (id: number): Promise<ServiceItem> => {
      return apiRequest<ServiceItem>(`/service-items/${id}`);
    },

    /**
     * 建立服務項目
     */
    create: async (data: CreateServiceItemData): Promise<ServiceItem> => {
      return apiRequest<ServiceItem>(`/service-items`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * 更新服務項目
     */
    update: async (id: number, data: Partial<CreateServiceItemData> & { isActive?: boolean }): Promise<ServiceItem> => {
      return apiRequest<ServiceItem>(`/service-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * 刪除服務項目
     */
    delete: async (id: number): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/service-items/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * 批次重新排序
     */
    reorder: async (items: { id: number; displayOrder: number }[]): Promise<ServiceItem[]> => {
      return apiRequest<ServiceItem[]>(`/service-items/batch/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
    },
  },

  // ========== 療程方案 ==========
  packages: {
    /**
     * 取得所有療程方案
     */
    getAll: async (params?: {
      patientId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }): Promise<TreatmentPackage[]> => {
      const queryParams = new URLSearchParams();
      if (params?.patientId) queryParams.append('patientId', params.patientId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const url = queryParams.toString()
        ? `/treatment-packages?${queryParams}`
        : `/treatment-packages`;

      return apiRequest<TreatmentPackage[]>(url);
    },

    /**
     * 取得某病患的所有療程方案
     */
    getByPatient: async (patientId: string): Promise<TreatmentPackage[]> => {
      return apiRequest<TreatmentPackage[]>(`/treatment-packages/patient/${patientId}`);
    },

    /**
     * 取得單一療程方案（含使用記錄）
     */
    getById: async (id: number): Promise<PackageDetail> => {
      return apiRequest<PackageDetail>(`/treatment-packages/${id}`);
    },

    /**
     * 建立療程方案
     */
    create: async (data: CreatePackageData): Promise<TreatmentPackage> => {
      return apiRequest<TreatmentPackage>(`/treatment-packages`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * 更新療程方案
     */
    update: async (id: number, data: Partial<CreatePackageData> & { status?: string }): Promise<TreatmentPackage> => {
      return apiRequest<TreatmentPackage>(`/treatment-packages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * 刪除療程方案
     */
    delete: async (id: number): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/treatment-packages/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * 執行療程（核銷次數）
     */
    execute: async (id: number, data: ExecutePackageData): Promise<{
      message: string;
      log: PackageUsageLog;
      remainingQuantity: number;
    }> => {
      return apiRequest(`/treatment-packages/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * 取得使用記錄
     */
    getUsageLogs: async (id: number): Promise<PackageUsageLog[]> => {
      return apiRequest<PackageUsageLog[]>(`/treatment-packages/${id}/usage-logs`);
    },

    /**
     * 刪除使用記錄
     */
    deleteUsageLog: async (packageId: number, logId: number): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(
        `/treatment-packages/${packageId}/usage-logs/${logId}`,
        { method: 'DELETE' }
      );
    },

    /**
     * 取得方案摘要
     */
    getSummary: async (id: number): Promise<PackageSummary> => {
      return apiRequest<PackageSummary>(`/treatment-packages/${id}/summary`);
    },
  },

  /**
   * Tags (標籤) 相關 API
   */
  tags: {
    getAll: async () => {
      return apiRequest<Record<string, unknown>[]>('/tags');
    },
    getById: async (id: string) => {
      return apiRequest<Record<string, unknown>>(`/tags/${id}`);
    },
    create: async (data: Record<string, unknown>) => {
      return apiRequest<Record<string, unknown>>('/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Record<string, unknown>) => {
      return apiRequest<Record<string, unknown>>(`/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return apiRequest<{ success: boolean; message: string }>(`/tags/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * Groups (群組) 相關 API
   */
  groups: {
    getAll: async () => {
      return apiRequest<Record<string, unknown>[]>('/groups');
    },
    getById: async (id: string) => {
      return apiRequest<Record<string, unknown>>(`/groups/${id}`);
    },
    create: async (data: Record<string, unknown>) => {
      return apiRequest<Record<string, unknown>>('/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Record<string, unknown>) => {
      return apiRequest<Record<string, unknown>>(`/groups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return apiRequest<{ success: boolean; message: string }>(`/groups/${id}`, {
        method: 'DELETE',
      });
    },
  },
};
