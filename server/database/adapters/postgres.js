/**
 * PostgreSQL Database Adapter
 *
 * 使用 pg (node-postgres) 的 PostgreSQL 適配器
 */

const { Pool } = require('pg');
const DatabaseAdapter = require('./base');

class PostgresAdapter extends DatabaseAdapter {
  constructor(config) {
    super();

    // Support DATABASE_URL or separate configuration
    if (typeof config === 'string') {
      console.log('[PostgreSQL] Configured with connection string');
      this.pool = new Pool({
        connectionString: config,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false // Zeabur requirement
        } : false,
        // Connection settings
        connectionTimeoutMillis: 10000, // 10 sec timeout
        idleTimeoutMillis: 30000,
        max: 10, // max connections
        // Error handling
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      });
    } else {
      console.log(`[PostgreSQL] Configured: ${config.user}@${config.host}:${config.port}/${config.database}`);
      this.pool = new Pool({
        host: config.host,
        port: config.port || 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false,
        // Connection settings
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      });
    }

    // Error handling
    this.pool.on('error', (err) => {
      console.error('[PostgreSQL] Pool error:', err);
    });

    this.client = null; // 用於事務
  }

  /**
   * Test connection with retries
   */
  async testConnection(maxRetries = 5, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[PostgreSQL] Attempting connection... (${i + 1}/${maxRetries})`);
        const client = await this.pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('[PostgreSQL] Connection successful!');
        console.log('[PostgreSQL] Server time:', result.rows[0].now);
        return true;
      } catch (error) {
        console.error(`[PostgreSQL] Connection failed (attempt ${i + 1}/${maxRetries}):`, error.message);

        if (i < maxRetries - 1) {
          console.log(`[PostgreSQL] Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          console.error('[PostgreSQL] All connection attempts failed');
          throw error;
        }
      }
    }
  }

  /**
   * 執行查詢並返回所有結果
   */
  async query(sql, params = []) {
    try {
      // 轉換 ? 為 $1, $2, ...
      const pgSql = DatabaseAdapter.convertPlaceholders(sql, 'postgres');
      const result = await this.pool.query(pgSql, params);
      return result.rows;
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * 執行查詢並返回單一結果
   */
  async queryOne(sql, params = []) {
    try {
      const pgSql = DatabaseAdapter.convertPlaceholders(sql, 'postgres');
      const result = await this.pool.query(pgSql, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('PostgreSQL queryOne error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * 執行 INSERT/UPDATE/DELETE
   */
  async execute(sql, params = []) {
    try {
      const pgSql = DatabaseAdapter.convertPlaceholders(sql, 'postgres');

      // 如果是 INSERT，嘗試返回 ID
      let finalSql = pgSql;
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        // 檢查是否已經有 RETURNING 子句
        if (!sql.toUpperCase().includes('RETURNING')) {
          finalSql = pgSql + ' RETURNING id';
        }
      }

      const result = await this.pool.query(finalSql, params);

      return {
        changes: result.rowCount,
        lastID: result.rows[0]?.id || null
      };
    } catch (error) {
      console.error('PostgreSQL execute error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * 執行多個 SQL 語句
   */
  async executeBatch(sql) {
    try {
      // PostgreSQL 需要分別執行每個語句
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        await this.pool.query(stmt);
      }
    } catch (error) {
      console.error('PostgreSQL executeBatch error:', error);
      throw error;
    }
  }

  /**
   * 開始事務
   */
  async beginTransaction() {
    if (!this.client) {
      this.client = await this.pool.connect();
    }
    await this.client.query('BEGIN');
  }

  /**
   * 提交事務
   */
  async commit() {
    if (this.client) {
      await this.client.query('COMMIT');
      this.client.release();
      this.client = null;
    }
  }

  /**
   * 回滾事務
   */
  async rollback() {
    if (this.client) {
      await this.client.query('ROLLBACK');
      this.client.release();
      this.client = null;
    }
  }

  /**
   * 關閉資料庫連線
   */
  async close() {
    await this.pool.end();
  }

  /**
   * 取得原始連接池（用於特殊操作）
   */
  getRawPool() {
    return this.pool;
  }
}

module.exports = PostgresAdapter;
