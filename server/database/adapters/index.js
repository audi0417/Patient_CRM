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
  // 偵測是否有 PostgreSQL 連線字串（Zeabur 優先提供的方式）
  const connectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI;
  const hasPostgres = connectionString || process.env.POSTGRES_HOST;
  const dbType = process.env.DATABASE_TYPE || (hasPostgres ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL 配置
    // 優先使用連線字串（Zeabur 推薦的方式，避免 service ID 無法解析的問題）
    if (connectionString) {
      console.log('🔗 使用 POSTGRES_CONNECTION_STRING 連接 PostgreSQL');
      return new PostgresAdapter(connectionString);
    }

    // 備用：使用分開的環境變數
    const config = {
      host: process.env.POSTGRES_HOST,           // Zeabur 自動注入（但可能是 service ID）
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
