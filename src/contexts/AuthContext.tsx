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
