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

/**
 * API 錯誤類別
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
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
 * 統一的 API 請求方法
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

      // 儲存 token
      if (response.success && response.token) {
        setToken(response.token);
      }

      return response;
    },

    /**
     * 登出
     */
    logout: async (): Promise<void> => {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
        });
      } finally {
        // 無論 API 是否成功，都清除本地 token
        clearToken();
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
    getByPatientId: async (patientId: string): Promise<any[]> => {
      return apiRequest(`/consultations?patientId=${patientId}`);
    },

    /**
     * 獲取所有諮詢記錄
     */
    getAll: async (): Promise<any[]> => {
      return apiRequest('/consultations');
    },

    /**
     * 根據 ID 獲取諮詢記錄
     */
    getById: async (id: string): Promise<any> => {
      return apiRequest(`/consultations/${id}`);
    },

    /**
     * 創建諮詢記錄
     */
    create: async (consultation: any): Promise<any> => {
      return apiRequest('/consultations', {
        method: 'POST',
        body: JSON.stringify(consultation),
      });
    },

    /**
     * 更新諮詢記錄
     */
    update: async (id: string, consultation: any): Promise<any> => {
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
};

/**
 * 匯出 token 管理方法供其他模組使用
 */
export const tokenManager = {
  get: getToken,
  set: setToken,
  clear: clearToken,
};
