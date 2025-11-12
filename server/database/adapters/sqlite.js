/**
 * SQLite Database Adapter
 *
 * 使用 better-sqlite3 的 SQLite 適配器
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const DatabaseAdapter = require('./base');

class SQLiteAdapter extends DatabaseAdapter {
  constructor(dbPath) {
    super();
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      console.warn('[SQLite] Unable to create directory, may lack write permissions:', e.message);
    }
    this.db = new Database(dbPath);
    try {
      this.db.pragma('journal_mode = WAL');
    } catch (e) {
      console.warn('[SQLite] Failed to set WAL mode (using default journal mode):', e.message);
    }
  }

  /**
   * 參數正規化：
   * - boolean 轉為 1/0（SQLite 無原生 boolean）
   * - Date 轉為 ISO 字串
   * - undefined 轉為 null
   * - 一般物件（非 Buffer）序列化為 JSON 字串
   */
  _normalizeParams(params = []) {
    return params.map((p) => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p instanceof Date) return p.toISOString();
      if (Buffer.isBuffer(p)) return p;
      if (typeof p === 'object' && p !== null) return JSON.stringify(p);
      return p;
    });
  }

  /**
   * 執行查詢並返回所有結果
   */
  async query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const norm = this._normalizeParams(params);
      return stmt.all(...norm);
    } catch (error) {
      console.error('[SQLite] Query error:', error);
      throw error;
    }
  }

  /**
   * 執行查詢並返回單一結果
   */
  async queryOne(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const norm = this._normalizeParams(params);
      return stmt.get(...norm) || null;
    } catch (error) {
      console.error('[SQLite] QueryOne error:', error);
      throw error;
    }
  }

  /**
   * 執行 INSERT/UPDATE/DELETE
   */
  async execute(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const norm = this._normalizeParams(params);
      const info = stmt.run(...norm);
      return {
        changes: info.changes,
        lastID: info.lastInsertRowid
      };
    } catch (error) {
      console.error('[SQLite] Execute error:', error);
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
      console.error('[SQLite] ExecuteBatch error:', error);
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
