import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 將 Date 物件格式化為 YYYY-MM-DD 字串，使用本地時區
 * 避免使用 toISOString() 造成的時區偏移問題
 */
export function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 取得今天的日期字串 (YYYY-MM-DD)，使用本地時區
 */
export function getTodayDateString(): string {
  return formatDateToLocal(new Date());
}
