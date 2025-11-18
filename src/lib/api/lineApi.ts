/**
 * LINE 訊息整合 API 客戶端
 */

// ============================================================
// 型別定義
// ============================================================

/**
 * LINE 配置資料
 */
export interface LineConfig {
  id: string;
  organizationId: string;
  channelId: string;
  channelSecret?: string; // 不會從後端返回完整值
  accessToken?: string; // 不會從後端返回完整值
  accessTokenPreview?: string; // 顯示部分 Token 用於確認
  webhookUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  messagesSentToday: number;
  messagesSentThisMonth: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  dailyMessageLimit: number;
  monthlyMessageLimit: number;
  lastActivityAt?: string;
  lastError?: string;
  errorCount: number;
  lastErrorAt?: string;
  configuredById?: string;
  configuredAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 建立/更新 LINE 配置的請求資料
 */
export interface LineConfigInput {
  channelId: string;
  channelSecret: string;
  accessToken: string;
  webhookUrl?: string;
  dailyMessageLimit?: number;
  monthlyMessageLimit?: number;
}

/**
 * 對話資料
 */
export interface Conversation {
  id: string;
  lineUserId: string; // LINE 用戶 ID（line_users.id）
  patientId: string | null;  // 可選的患者綁定
  patientName?: string; // 從 JOIN 查詢取得
  lineUser?: {
    displayName: string;
    pictureUrl?: string;
    lineUserId: string;
    isActive: boolean;
  };
  organizationId: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  unreadCount: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  displayName?: string;  // 顯示名稱（優先患者名稱，其次 LINE 顯示名稱）
  createdAt: string;
  updatedAt: string;
}

/**
 * 訊息資料
 */
export interface LineMessage {
  id: string;
  conversationId: string;
  organizationId: string;
  messageType: 'TEXT' | 'STICKER' | 'IMAGE' | 'SYSTEM';
  messageContent: any; // JSON 物件
  senderId: string;
  recipientId: string;
  senderType: 'USER' | 'PATIENT' | 'SYSTEM';
  recipientType: 'USER' | 'PATIENT' | 'SYSTEM';
  lineMessageId?: string;
  replyToken?: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  isReply: boolean;
  quotedMessageId?: string;
  metadata?: any;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
}

/**
 * 發送文字訊息請求
 */
export interface SendTextMessageRequest {
  lineUserId: string;  // LINE 用戶 ID（line_users.id）
  text: string;
}

/**
 * 發送貼圖訊息請求
 */
export interface SendStickerMessageRequest {
  lineUserId: string;  // LINE 用戶 ID（line_users.id）
  packageId: string;
  stickerId: string;
}

/**
 * API 回應格式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================
// API 客戶端
// ============================================================

/**
 * 取得 API Base URL
 */
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * 取得認證 Token
 */
const getToken = (): string | null => {
  return localStorage.getItem('hospital_crm_auth_token');
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

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }

  return data as T;
}

// ============================================================
// LINE API 端點
// ============================================================

export const lineApi = {
  /**
   * 配置管理
   */
  config: {
    /**
     * 取得 LINE 配置
     */
    get: async (): Promise<ApiResponse<LineConfig>> => {
      return apiRequest('/line/config', {
        method: 'GET',
      });
    },

    /**
     * 建立或更新 LINE 配置
     */
    save: async (config: LineConfigInput): Promise<ApiResponse<LineConfig>> => {
      return apiRequest('/line/config', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * 停用 LINE 配置
     */
    disable: async (): Promise<ApiResponse<{ message: string }>> => {
      return apiRequest('/line/config', {
        method: 'DELETE',
      });
    },
  },

  /**
   * 訊息操作
   */
  messages: {
    /**
     * 發送文字訊息
     */
    sendText: async (request: SendTextMessageRequest): Promise<ApiResponse<LineMessage>> => {
      return apiRequest('/line/send/text', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    /**
     * 發送貼圖訊息
     */
    sendSticker: async (request: SendStickerMessageRequest): Promise<ApiResponse<LineMessage>> => {
      return apiRequest('/line/send/sticker', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },
  },

  /**
   * 對話管理
   */
  conversations: {
    /**
     * 取得對話列表
     */
    getAll: async (params?: {
      status?: 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<Conversation[]>> => {
      const queryParams = new URLSearchParams();

      if (params?.status) {
        queryParams.append('status', params.status);
      }
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params?.offset) {
        queryParams.append('offset', params.offset.toString());
      }

      const query = queryParams.toString();
      const url = query ? `/line/conversations?${query}` : '/line/conversations';

      return apiRequest(url, {
        method: 'GET',
      });
    },

    /**
     * 取得對話訊息
     */
    getMessages: async (
      conversationId: string,
      params?: {
        limit?: number;
        offset?: number;
      }
    ): Promise<ApiResponse<LineMessage[]>> => {
      const queryParams = new URLSearchParams();

      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params?.offset) {
        queryParams.append('offset', params.offset.toString());
      }

      const query = queryParams.toString();
      const url = query
        ? `/line/conversations/${conversationId}/messages?${query}`
        : `/line/conversations/${conversationId}/messages`;

      return apiRequest(url, {
        method: 'GET',
      });
    },
  },
};

export default lineApi;
