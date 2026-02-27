/**
 * 數據記錄模式主配置文件
 * 
 * 模組化架構：每個模式由獨立的文件定義，支援動態載入和擴展
 * 組織可以選擇不同的數據記錄模式來滿足其業務需求
 */

const { 
  loadDataRecordingModes, 
  getDataRecordingModeById,
  getAllDataRecordingModes,
  validateModeConfig 
} = require('./modes');

/**
 * 獲取所有數據記錄模式配置
 * 動態載入所有模組文件
 * @returns {Object} 所有模式配置
 */
const getDataRecordingModes = () => {
  return loadDataRecordingModes();
};

/**
 * 根據ID獲取指定數據記錄模式
 * @param {string} modeId 模式ID
 * @returns {Object|null} 模式配置或null
 */
const getDataRecordingMode = (modeId) => {
  return getDataRecordingModeById(modeId);
};

/**
 * 獲取所有可用模式的陣列
 * @returns {Array} 模式配置陣列
 */
const getAllModes = () => {
  return getAllDataRecordingModes();
};

/**
 * 將已載入的模式轉換為舊格式（向後兼容）
 * @deprecated 建議直接使用新的模組載入器
 * @returns {Object} 舊格式的模式物件
 */
const getDataRecordingModesLegacy = () => {
  const modes = loadDataRecordingModes();
  return modes;
};

/**
 * 驗證模式ID是否有效
 * @param {string} modeId 模式ID
 * @returns {boolean} 是否為有效模式
 */
const isValidMode = (modeId) => {
  return getDataRecordingModeById(modeId) !== null;
};

/**
 * 獲取預設模式
 * @returns {string} 預設模式ID  
 */
const getDefaultModeId = () => {
  return 'nutrition'; // 營養管理為預設模式
};

/**
 * 獲取模式列表（用於UI選擇）
 * @returns {Array} 簡化的模式列表
 */
const getModeSelectList = () => {
  const modes = getAllDataRecordingModes();
  return modes.map(mode => ({
    id: mode.id,
    name: mode.name,
    description: mode.description,
    icon: mode.icon,
    category: mode.category
  }));
};

/**
 * 根據分類獲取模式
 * @param {string} category 分類名稱
 * @returns {Array} 該分類下的所有模式
 */
const getModesByCategory = (category) => {
  const modes = getAllDataRecordingModes();
  return modes.filter(mode => mode.category === category);
};

/**
 * 獲取所有可用分類
 * @returns {Array} 分類列表
 */
const getAvailableCategories = () => {
  const modes = getAllDataRecordingModes();  
  const categories = [...new Set(modes.map(mode => mode.category))];
  return categories;
};

/**
 * 獲取模式的生命徵象映射
 * @param {string} modeId 模式ID
 * @returns {Object} 生命徵象映射
 */
const getVitalSignsMapping = (modeId) => {
  const mode = getDataRecordingModeById(modeId);
  return mode ? mode.vitalSignsMapping : {};
};

/**
 * 獲取模式的目標分類
 * @param {string} modeId 模式ID
 * @returns {Array} 目標分類陣列
 */
const getGoalCategories = (modeId) => {
  const mode = getDataRecordingModeById(modeId);
  return mode ? mode.goalCategories : [];
};

/**
 * 獲取模式的圖表標題
 * @param {string} modeId 模式ID
 * @returns {Object} 圖表標題物件
 */
const getChartTitles = (modeId) => {
  const mode = getDataRecordingModeById(modeId);
  return mode ? mode.chartTitles : {
    vitalSigns: '數據記錄',
    goals: '目標追蹤', 
    progress: '進度報告',
    dashboard: '目標追蹤'
  };
};

// 為了向後兼容，保持原有的導出名稱
const DEFAULT_DATA_RECORDING_MODES = getDataRecordingModesLegacy();

// 向後兼容：保留舊的函數名稱作為別名
const getDataModeById = getDataRecordingMode;
const getAllDataModes = getAllModes;

module.exports = {
  // 新的模組化方法（推薦）
  getDataRecordingModes,
  getDataRecordingMode,
  getAllModes,
  getDataRecordingModeById,
  getAllDataRecordingModes,
  getModeSelectList,
  getModesByCategory,
  getAvailableCategories,
  isValidMode,
  getDefaultModeId,
  validateModeConfig,
  getVitalSignsMapping,
  getGoalCategories,
  getChartTitles,

  // 向後兼容（已棄用）
  DEFAULT_DATA_RECORDING_MODES,
  DEFAULT_DATA_MODES: DEFAULT_DATA_RECORDING_MODES, // 舊名稱
  getDataModeById,
  getAllDataModes,
  getDataRecordingModesLegacy
};