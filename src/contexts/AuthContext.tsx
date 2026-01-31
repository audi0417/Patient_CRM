import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, AuthState, LoginCredentials, LoginResponse, UserPermissions } from "@/types/user";
import {
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
  getCurrentToken,
  isAuthenticated as checkAuthenticated,
  getUserPermissions,
} from "@/lib/auth";
import { api } from "@/lib/api";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo 用戶
const createDemoUser = (): User => ({
  id: 'demo-user',
  username: 'demo',
  password: '',
  email: 'demo@clinic.com',
  name: 'Demo 管理員',
  role: 'admin',
  isActive: true,
  organizationId: 'demo-org',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Demo 權限（使用 admin 角色的權限）
const getDemoPermissions = (): UserPermissions => ({
  canViewPatients: true,
  canEditPatients: true,
  canDeletePatients: true,
  canViewHealthRecords: true,
  canEditHealthRecords: true,
  canManageAppointments: true,
  canManageUsers: false,
  canAccessSettings: true,
  canExportData: true,
  canManageHospitalSettings: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const isDemoMode = !!(window as any).__isDemoMode;

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: isDemoMode,
    user: isDemoMode ? createDemoUser() : null,
    permissions: isDemoMode ? getDemoPermissions() : null,
    token: isDemoMode ? 'demo-token' : null,
  });
  const [isLoading, setIsLoading] = useState(!isDemoMode);

  // 初始化認證狀態
  useEffect(() => {
    // Demo 模式下直接跳過認證流程
    if ((window as any).__isDemoMode) {
      const demoUser = createDemoUser();
      setAuthState({
        isAuthenticated: true,
        user: demoUser,
        permissions: getDemoPermissions(),
        token: 'demo-token',
      });
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const isAuth = await checkAuthenticated();
        if (isAuth) {
          // 從後端 API 獲取最新的使用者資訊，而不是只依賴 localStorage
          try {
            const apiUser = await api.auth.me();
            if (apiUser) {
              // 更新 localStorage
              localStorage.setItem('hospital_crm_current_user', JSON.stringify(apiUser));
              const permissions = getUserPermissions(apiUser);
              setAuthState({
                isAuthenticated: true,
                user: apiUser,
                permissions,
                token: getCurrentToken(),
              });
              return;
            }
          } catch (apiError) {
            console.error("Failed to fetch user from API:", apiError);
          }

          // 如果 API 失敗，回退到 localStorage
          const user = getCurrentUser();
          if (user) {
            const permissions = getUserPermissions(user);
            setAuthState({
              isAuthenticated: true,
              user,
              permissions,
              token: getCurrentToken(),
            });
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          permissions: null,
          token: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await authLogin(credentials);

      if (response.success && response.user && response.token) {
        const permissions = getUserPermissions(response.user);
        setAuthState({
          isAuthenticated: true,
          user: response.user,
          permissions,
          token: response.token,
        });
      }

      return response;
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "登入過程發生錯誤",
      };
    }
  };

  const logout = async () => {
    await authLogout();
    setAuthState({
      isAuthenticated: false,
      user: null,
      permissions: null,
      token: null,
    });
  };

  const refreshUser = async () => {
    const user = getCurrentUser();
    if (user) {
      const permissions = getUserPermissions(user);
      setAuthState((prev) => ({
        ...prev,
        user,
        permissions,
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">載入中...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, refreshUser, isDemoMode: !!(window as any).__isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
