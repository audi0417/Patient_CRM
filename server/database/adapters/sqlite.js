/**
 * SQLite Database Adapter
 *
 * 使用 better-sqlite3 的 SQLite 適配器
 */

const Database = require('better-sqlite3');
const DatabaseAdapter = require('./base');

class SQLiteAdapter extends DatabaseAdapter {
  constructor(dbPath) {
    super();
    this.db = new Database(dbPath);
    // 啟用 WAL 模式以提高性能
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * 執行查詢並返回所有結果
   */
  async query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      console.error('SQLite query error:', error);
      throw error;
    }
  }

  /**
   * 執行查詢並返回單一結果
   */
  async queryOne(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(...params) || null;
    } catch (error) {
      console.error('SQLite queryOne error:', error);
      throw error;
    }
  }

  /**
   * 執行 INSERT/UPDATE/DELETE
   */
  async execute(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(...params);
      return {
        changes: info.changes,
        lastID: info.lastInsertRowid
      };
    } catch (error) {
      console.error('SQLite execute error:', error);
      throw error;
    }
  }

  /**
   * 執行多個 SQL 語句
   */
  async executeBatch(sql) {
    try {
      this.db.exec(sql);
    } catch (error) {
      console.error('SQLite executeBatch error:', error);
      throw error;
    }
  }

  /**
   * 開始事務
   */
  async beginTransaction() {
    this.db.prepare('BEGIN').run();
  }

  /**
   * 提交事務
   */
  async commit() {
    this.db.prepare('COMMIT').run();
  }

  /**
   * 回滾事務
   */
  async rollback() {
    this.db.prepare('ROLLBACK').run();
  }

  /**
   * 關閉資料庫連線
   */
  async close() {
    this.db.close();
  }

  /**
   * 取得原始資料庫實例（用於特殊操作）
   */
  getRawDb() {
    return this.db;
  }
}

module.exports = SQLiteAdapter;
