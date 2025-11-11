/**
 * Database Adapter Factory
 *
 * 根據環境變數自動選擇正確的資料庫適配器
 */

const path = require('path');
const SQLiteAdapter = require('./sqlite');
const PostgresAdapter = require('./postgres');

/**
 * 建立資料庫適配器
 * @returns {DatabaseAdapter}
 */
function createDatabaseAdapter() {
  // 自動偵測：如果有 POSTGRES_HOST，自動使用 PostgreSQL
  const hasPostgres = process.env.POSTGRES_HOST;
  const dbType = process.env.DATABASE_TYPE || (hasPostgres ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL 配置 - Zeabur 自動注入的環境變數
    const config = {
      host: process.env.POSTGRES_HOST,           // Zeabur 自動注入
      port: parseInt(process.env.POSTGRES_PORT || '5432'),           // Zeabur 自動注入
      database: process.env.POSTGRES_DATABASE,   // Zeabur 自動注入
      user: process.env.POSTGRES_USERNAME,       // Zeabur 自動注入
      password: process.env.POSTGRES_PASSWORD    // Zeabur 自動注入
    };

    console.log(`🔗 連接到 PostgreSQL: ${config.user}@${config.host}:${config.port}/${config.database}`);
    return new PostgresAdapter(config);
  } else {
    // SQLite 配置
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/patient_crm.db');
    console.log(`🔗 使用 SQLite: ${dbPath}`);
    return new SQLiteAdapter(dbPath);
  }
}

module.exports = {
  createDatabaseAdapter,
  SQLiteAdapter,
  PostgresAdapter
};
