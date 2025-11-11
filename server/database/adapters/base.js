/**
 * Database Adapter Base Class
 *
 * 定義資料庫適配器的通用介面
 */

class DatabaseAdapter {
  /**
   * 執行查詢並返回所有結果
   * @param {string} sql - SQL 查詢語句
   * @param {Array} params - 查詢參數
   * @returns {Promise<Array>} 查詢結果數組
   */
  async query(sql, params = []) {
    throw new Error('Method query() must be implemented');
  }

  /**
   * 執行查詢並返回單一結果
   * @param {string} sql - SQL 查詢語句
   * @param {Array} params - 查詢參數
   * @returns {Promise<Object|null>} 查詢結果物件或 null
   */
  async queryOne(sql, params = []) {
    throw new Error('Method queryOne() must be implemented');
  }

  /**
   * 執行 INSERT/UPDATE/DELETE 並返回受影響的行數
   * @param {string} sql - SQL 語句
   * @param {Array} params - 參數
   * @returns {Promise<Object>} { changes: number, lastID: string|number }
   */
  async execute(sql, params = []) {
    throw new Error('Method execute() must be implemented');
  }

  /**
   * 執行多個 SQL 語句（用於初始化）
   * @param {string} sql - 多個 SQL 語句
   * @returns {Promise<void>}
   */
  async executeBatch(sql) {
    throw new Error('Method executeBatch() must be implemented');
  }

  /**
   * 開始事務
   * @returns {Promise<void>}
   */
  async beginTransaction() {
    throw new Error('Method beginTransaction() must be implemented');
  }

  /**
   * 提交事務
   * @returns {Promise<void>}
   */
  async commit() {
    throw new Error('Method commit() must be implemented');
  }

  /**
   * 回滾事務
   * @returns {Promise<void>}
   */
  async rollback() {
    throw new Error('Method rollback() must be implemented');
  }

  /**
   * 關閉資料庫連線
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method close() must be implemented');
  }

  /**
   * 將參數化查詢轉換為適配器特定的格式
   * SQLite 使用 ?, PostgreSQL 使用 $1, $2, ...
   * @param {string} sql - SQL 語句
   * @param {string} targetType - 'sqlite' | 'postgres'
   * @returns {string} 轉換後的 SQL
   */
  static convertPlaceholders(sql, targetType) {
    if (targetType === 'postgres') {
      let index = 0;
      return sql.replace(/\?/g, () => `$${++index}`);
    }
    return sql;
  }
}

module.exports = DatabaseAdapter;
