/**
 * Database Helper Functions
 *
 * 提供簡化的資料庫操作介面
 */

const { dbAdapter } = require('./db');

/**
 * 執行查詢並返回所有結果
 * @param {string} sql - SQL 查詢語句
 * @param {Array} params - 查詢參數
 * @returns {Promise<Array>}
 */
async function queryAll(sql, params = []) {
  return await dbAdapter.query(sql, params);
}

/**
 * 執行查詢並返回單一結果
 * @param {string} sql - SQL 查詢語句
 * @param {Array} params - 查詢參數
 * @returns {Promise<Object|null>}
 */
async function queryOne(sql, params = []) {
  return await dbAdapter.queryOne(sql, params);
}

/**
 * 執行 INSERT/UPDATE/DELETE
 * @param {string} sql - SQL 語句
 * @param {Array} params - 參數
 * @returns {Promise<Object>} { changes, lastID }
 */
async function execute(sql, params = []) {
  return await dbAdapter.execute(sql, params);
}

/**
 * 執行事務
 * @param {Function} callback - 事務回調函數
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  try {
    await dbAdapter.beginTransaction();
    const result = await callback(dbAdapter);
    await dbAdapter.commit();
    return result;
  } catch (error) {
    await dbAdapter.rollback();
    throw error;
  }
}

/**
 * 同步包裝器 - 將異步操作包裝為同步風格（用於漸進式遷移）
 * 注意：這只是過渡方案，最終應該將所有 routes 改為異步
 */
const dbSync = {
  prepare: (sql) => ({
    all: (...params) => {
      // 返回 Promise，但標記為需要 await
      console.warn('⚠️  警告：使用同步風格調用異步操作，請盡快遷移為 async/await');
      return dbAdapter.query(sql, params);
    },
    get: (...params) => {
      console.warn('⚠️  警告：使用同步風格調用異步操作，請盡快遷移為 async/await');
      return dbAdapter.queryOne(sql, params);
    },
    run: (...params) => {
      console.warn('⚠️  警告：使用同步風格調用異步操作，請盡快遷移為 async/await');
      return dbAdapter.execute(sql, params);
    }
  })
};

module.exports = {
  queryAll,
  queryOne,
  execute,
  transaction,
  dbSync,
  dbAdapter
};
