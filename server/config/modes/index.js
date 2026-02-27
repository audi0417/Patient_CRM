/**
 * 數據記錄模式載入器
 * 動態載入所有模組文件，支援快速擴展新模式
 */

const fs = require('fs');
const path = require('path');

/**
 * 動態載入所有數據記錄模式模組
 * @returns {Object} 所有載入的模式配置
 */
const loadDataRecordingModes = () => {
  const modesDir = __dirname; // 當前目錄就是 modes 目錄
  const modes = {};
  
  try {
    // 讀取 modes 目錄下所有 .js 文件
    const modeFiles = fs.readdirSync(modesDir)
      .filter(file => file.endsWith('.js') && file !== 'index.js');
    
    // 載入每個模式模組
    modeFiles.forEach(file => {
      const modulePath = path.join(modesDir, file);
      const modeConfig = require(modulePath);
      
      // 驗證模式配置完整性
      if (validateModeConfig(modeConfig)) {
        modes[modeConfig.id] = modeConfig;
      } else {
        console.warn(`Invalid mode configuration in ${file}`);
      }
    });
    
    console.log(`Loaded ${Object.keys(modes).length} data recording modes: [${Object.keys(modes).join(', ')}]`);
    
  } catch (error) {
    console.error('Error loading data recording modes:', error);
    // 如果載入失敗，返回空物件
    return {};
  }
  
  return modes;
};

/**
 * 驗證模式配置的完整性
 * @param {Object} config 模式配置物件
 * @returns {boolean} 是否為有效配置
 */
const validateModeConfig = (config) => {
  // 必需欄位檢查
  const requiredFields = ['id', 'name', 'description', 'icon', 'category'];
  const hasRequiredFields = requiredFields.every(field => config[field]);
  
  if (!hasRequiredFields) {
    return false;
  }
  
  // 結構檢查
  const hasValidStructure = config.vitalSignsMapping && 
                           config.goalCategories && 
                           Array.isArray(config.goalCategories) &&
                           config.chartTitles;
  
  return hasValidStructure;
};

/**
 * 獲取指定 ID 的模式配置
 * @param {string} modeId 模式 ID
 * @returns {Object|null} 模式配置或 null
 */
const getDataRecordingModeById = (modeId) => {
  const modes = loadDataRecordingModes();
  return modes[modeId] || null;
};

/**
 * 獲取所有可用模式
 * @returns {Array} 所有模式配置的陣列
 */
const getAllDataRecordingModes = () => {
  const modes = loadDataRecordingModes();
  return Object.values(modes);
};

/**
 * 熱載入：重新載入指定模組（開發用）
 * @param {string} modeId 模式 ID
 * @returns {Object|null} 重新載入的模式配置
 */
const reloadMode = (modeId) => {
  const modeFile = path.join(__dirname, `${modeId}.js`);
  
  try {
    // 清除 require cache
    delete require.cache[require.resolve(modeFile)];
    
    // 重新載入模式
    const modeConfig = require(modeFile);
    
    if (validateModeConfig(modeConfig)) {
      console.log(`Successfully reloaded mode: ${modeId}`);
      return modeConfig;
    } else {
      console.error(`Invalid configuration for mode: ${modeId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error reloading mode ${modeId}:`, error);
    return null;
  }
};

// 快取載入的模式（可選的性能優化）
let cachedModes = null;
let lastLoadTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取

/**
 * 帶快取的模式載入器
 * @param {boolean} forceReload 是否強制重載
 * @returns {Object} 所有模式配置
 */
const loadDataRecordingModesWithCache = (forceReload = false) => {
  const now = Date.now();
  
  if (!cachedModes || forceReload || (now - lastLoadTime) > CACHE_DURATION) {
    cachedModes = loadDataRecordingModes();
    lastLoadTime = now;
  }
  
  return cachedModes;
};

module.exports = {
  loadDataRecordingModes,
  getDataRecordingModeById,
  getAllDataRecordingModes,
  validateModeConfig,
  reloadMode,
  loadDataRecordingModesWithCache
};