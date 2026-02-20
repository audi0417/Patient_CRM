/**
 * 資料邊界處理工具函數
 */

/**
 * 安全除法 - 避免除以零
 */
export function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  if (denominator === 0 || !isFinite(denominator)) {
    return defaultValue;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : defaultValue;
}

/**
 * 安全百分比計算
 */
export function safePercentage(value: number, total: number, decimals: number = 1): number {
  return Number((safeDivide(value, total, 0) * 100).toFixed(decimals));
}

/**
 * 安全增長率計算
 */
export function safeGrowthRate(previous: number, current: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(safeDivide(current - previous, previous, 0) * 100);
}

/**
 * 確保數值有效
 */
export function ensureNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  return isFinite(num) ? num : defaultValue;
}

/**
 * 確保陣列有效
 */
export function ensureArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * 格式化數字顯示
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return ensureNumber(value).toFixed(decimals);
}

/**
 * 格式化百分比顯示
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${ensureNumber(value).toFixed(decimals)}%`;
}

/**
 * 驗證日期範圍
 */
export function isValidPeriod(period: string): boolean {
  return ['7d', '30d', '90d', '1y'].includes(period);
}

/**
 * 安全的物件屬性存取
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}
