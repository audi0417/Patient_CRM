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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    permissions: null,
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 初始化認證狀態
  useEffect(() => {
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
    <AuthContext.Provider value={{ ...authState, login, logout, refreshUser }}>
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
