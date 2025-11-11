/**
 * 服務類別顏色對應工具
 * 提供從服務類別名稱到 Tailwind CSS 類別的轉換
 */

import { ServiceType } from "@/hooks/useServiceTypes";

/**
 * 將 hex 顏色轉換為 Tailwind 背景顏色類別
 * 使用內聯樣式來確保顏色能正確顯示
 */
export const getServiceTypeColorClasses = (
  serviceType: string,
  serviceTypes: ServiceType[]
): string => {
  const type = serviceTypes.find((t) => t.name === serviceType);

  if (!type) {
    // 預設灰色
    return "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100";
  }

  // 根據顏色生成對應的 Tailwind 類別
  return getColorClasses(type.color);
};

/**
 * 根據 hex 顏色碼生成 Tailwind CSS 類別
 */
export const getColorClasses = (hexColor: string): string => {
  const colorMap: Record<string, string> = {
    // 紫色系 - 使用更飽和的顏色
    "#8b5cf6": "bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-100",
    "#a855f7": "bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-100",

    // 藍色系
    "#3b82f6": "bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
    "#2563eb": "bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-100",

    // 綠色系
    "#22c55e": "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100",
    "#16a34a": "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100",

    // 橙色系
    "#f97316": "bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
    "#ea580c": "bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100",

    // 靛青色系
    "#6366f1": "bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100",
    "#4f46e5": "bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100",

    // 青色系
    "#06b6d4": "bg-cyan-200 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100",
    "#0891b2": "bg-cyan-200 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100",

    // 粉色系
    "#ec4899": "bg-pink-200 text-pink-900 dark:bg-pink-900 dark:text-pink-100",
    "#db2777": "bg-pink-200 text-pink-900 dark:bg-pink-900 dark:text-pink-100",

    // 黃色系
    "#eab308": "bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100",
    "#ca8a04": "bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100",

    // 翠綠色系
    "#10b981": "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",
    "#059669": "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",

    // 紅色系
    "#ef4444": "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100",
    "#dc2626": "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100",

    // 灰色系
    "#64748b": "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
    "#475569": "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
  };

  // 轉換為小寫進行比對
  const normalizedColor = hexColor.toLowerCase();

  return colorMap[normalizedColor] || "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100";
};

/**
 * 獲取服務類別的內聯樣式（直接使用設定的顏色）
 * 淺色模式：使用較亮的背景色，深色的文字
 */
export const getServiceTypeInlineStyle = (
  serviceType: string,
  serviceTypes: ServiceType[]
): React.CSSProperties => {
  const type = serviceTypes.find((t) => t.name === serviceType);

  if (!type) {
    return {
      backgroundColor: "#f3f4f6",
      color: "#111827",
    };
  }

  // 使用較亮的背景（變亮 75%）和較暗的文字（變暗 60%）
  return {
    backgroundColor: lightenColor(type.color, 0.75),
    color: darkenColor(type.color, 0.6),
    borderColor: type.color,
  };
};

/**
 * 獲取服務類別的深色模式內聯樣式
 * 深色模式：使用較暗的背景色，亮色的文字
 */
export const getServiceTypeDarkInlineStyle = (
  serviceType: string,
  serviceTypes: ServiceType[]
): React.CSSProperties => {
  const type = serviceTypes.find((t) => t.name === serviceType);

  if (!type) {
    return {
      backgroundColor: "#1f2937",
      color: "#f9fafb",
    };
  }

  // 使用較暗的背景（變暗 60%）和較亮的文字（變亮 85%）
  return {
    backgroundColor: darkenColor(type.color, 0.6),
    color: lightenColor(type.color, 0.85),
    borderColor: lightenColor(type.color, 0.4),
  };
};

/**
 * 將顏色變亮
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * percent));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * percent));
  const b = Math.min(255, Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * percent));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * 將顏色變暗
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.floor((num >> 16) * (1 - percent));
  const g = Math.floor(((num >> 8) & 0x00ff) * (1 - percent));
  const b = Math.floor((num & 0x0000ff) * (1 - percent));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
