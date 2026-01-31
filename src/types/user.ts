export type UserRole = "super_admin" | "admin" | "user";

export interface User {
  id: string;
  username: string;
  password: string; // hashed password
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isFirstLogin?: boolean;
  lastLogin?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // ID of the user who created this user
}

export interface UserPermissions {
  canViewPatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canViewHealthRecords: boolean;
  canEditHealthRecords: boolean;
  canManageAppointments: boolean;
  canManageUsers: boolean; // Only super_admin and admin
  canAccessSettings: boolean;
  canExportData: boolean;
  canManageHospitalSettings: boolean; // Only super_admin
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  permissions: UserPermissions | null;
  token: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  isFirstLogin?: boolean;
  message?: string;
}

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  super_admin: {
    canViewPatients: true,
    canEditPatients: true,
    canDeletePatients: true,
    canViewHealthRecords: true,
    canEditHealthRecords: true,
    canManageAppointments: true,
    canManageUsers: false,
    canAccessSettings: true,
    canExportData: true,
    canManageHospitalSettings: true,
  },
  admin: {
    canViewPatients: true,
    canEditPatients: true,
    canDeletePatients: true,
    canViewHealthRecords: true,
    canEditHealthRecords: true,
    canManageAppointments: true,
    canManageUsers: true,
    canAccessSettings: true,
    canExportData: true,
    canManageHospitalSettings: false,
  },
  user: {
    canViewPatients: true,
    canEditPatients: true,
    canDeletePatients: false,
    canViewHealthRecords: true,
    canEditHealthRecords: true,
    canManageAppointments: true,
    canManageUsers: false,
    canAccessSettings: false,
    canExportData: true,
    canManageHospitalSettings: false,
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "超級管理員",
  admin: "管理員",
  user: "一般使用者",
};
