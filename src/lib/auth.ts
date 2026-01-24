import { User, LoginCredentials, LoginResponse, ROLE_PERMISSIONS } from "@/types/user";
import { api, tokenManager } from "./api";

const CURRENT_USER_KEY = "hospital_crm_current_user";

// 密碼規則驗證
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: "密碼長度至少需要 8 個字元" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "密碼需包含至少一個大寫字母" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "密碼需包含至少一個小寫字母" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "密碼需包含至少一個數字" };
  }
  return { valid: true };
};

// 獲取所有使用者
export const getUsers = async (): Promise<User[]> => {
  try {
    return await api.users.getAll();
  } catch (error) {
    console.error('獲取使用者列表失敗:', error);
    return [];
  }
};

// 根據 ID 獲取使用者
export const getUserById = async (id: string): Promise<User | undefined> => {
  try {
    return await api.users.getById(id);
  } catch (error) {
    return undefined;
  }
};

// 根據使用者名稱獲取使用者
export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  const users = await getUsers();
  return users.find((u) => u.username === username);
};

// 建立使用者
export const createUser = async (userData: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> => {
  return api.users.create(userData);
};

// 更新使用者
export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
  return api.users.update(id, userData);
};

// 刪除使用者
export const deleteUser = async (id: string): Promise<void> => {
  await api.users.delete(id);
};

// 登入
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await api.auth.login(credentials);

    // 如果登入成功，儲存使用者資料到 localStorage
    if (response.success && response.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(response.user));
    }

    return response;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "登入失敗",
    };
  }
};

// 登出
export const logout = async (): Promise<void> => {
  try {
    await api.auth.logout();
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    // 清除本地儲存的使用者資料
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

// 獲取當前使用者
export const getCurrentUser = (): User | null => {
  const userData = localStorage.getItem(CURRENT_USER_KEY);
  if (!userData) return null;

  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
};

// 獲取當前 token
export const getCurrentToken = (): string | null => {
  return tokenManager.get();
};

// 檢查是否已登入
export const isAuthenticated = async (): Promise<boolean> => {
  const token = getCurrentToken();
  if (!token) return false;

  try {
    const result = await api.auth.verify();
    return result.valid;
  } catch (error) {
    return false;
  }
};

// 獲取使用者權限
export const getUserPermissions = (user: User | null) => {
  if (!user) return null;
  return ROLE_PERMISSIONS[user.role];
};

// 首次登入修改密碼
export const firstLoginChangePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  // 驗證新密碼規則
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, message: passwordValidation.message || "密碼格式不正確" };
  }

  try {
    const result = await api.auth.firstLoginPassword(currentPassword, newPassword);

    // 如果成功，更新本地使用者資料
    if (result.success) {
      const user = getCurrentUser();
      if (user) {
        user.isFirstLogin = false;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "密碼更新失敗"
    };
  }
};

// 修改密碼（使用者自己修改）
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  // 驗證新密碼規則
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, message: passwordValidation.message || "密碼格式不正確" };
  }

  try {
    const result = await api.auth.changePassword(oldPassword, newPassword);
    return result;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "密碼更新失敗"
    };
  }
};

// 重設密碼 (管理員功能)
export const resetPassword = async (userId: string, newPassword: string): Promise<void> => {
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message);
  }

  await api.users.resetPassword(userId, newPassword);
};
