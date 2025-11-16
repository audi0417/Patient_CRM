/**
 * 服務項目（Service Item）
 */
export interface ServiceItem {
  id: number;
  organizationId: string;
  code?: string;
  name: string;
  category?: string;
  unit: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 療程方案項目（Package Item）
 */
export interface PackageItem {
  serviceItemId: number;
  serviceName: string;
  unit: string;
  totalQuantity: number;
  usedQuantity: number;
}

/**
 * 療程方案狀態
 */
export type PackageStatus = 'active' | 'suspended' | 'completed' | 'cancelled';

/**
 * 療程方案（Treatment Package）
 */
export interface TreatmentPackage {
  id: number;
  organizationId: string;
  patientId: string;
  packageName: string;
  packageNumber: string;
  items: PackageItem[];
  startDate?: string;
  expiryDate?: string;
  status: PackageStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 使用記錄（Usage Log）
 */
export interface PackageUsageLog {
  id: number;
  organizationId: string;
  packageId: number;
  serviceItemId: number;
  serviceName?: string;
  unit?: string;
  usageDate: string;
  quantity: number;
  performedBy?: string;
  performedByName?: string;
  notes?: string;
  appointmentId?: number;
  createdBy: string;
  createdAt: string;
}

/**
 * 方案摘要
 */
export interface PackageSummary {
  packageName: string;
  status: PackageStatus;
  expiryDate?: string;
  items: PackageSummaryItem[];
}

export interface PackageSummaryItem {
  serviceItemId: number;
  serviceName: string;
  unit: string;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  usagePercentage: number;
}

/**
 * 建立服務項目的表單資料
 */
export interface CreateServiceItemData {
  code?: string;
  name: string;
  category?: string;
  unit?: string;
  description?: string;
  displayOrder?: number;
}

/**
 * 建立療程方案的表單資料
 */
export interface CreatePackageData {
  patientId: string;
  packageName: string;
  items: {
    serviceItemId: number;
    totalQuantity: number;
  }[];
  startDate?: string;
  expiryDate?: string;
  notes?: string;
}

/**
 * 執行療程的表單資料
 */
export interface ExecutePackageData {
  serviceItemId: number;
  quantity: number;
  usageDate: string;
  performedBy?: string;
  notes?: string;
  appointmentId?: number;
}

/**
 * 療程方案詳情（含使用記錄）
 */
export interface PackageDetail extends TreatmentPackage {
  usageLogs: PackageUsageLog[];
}
