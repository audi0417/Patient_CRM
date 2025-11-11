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
  // Zeabur PostgreSQL 優先提供連線字串，其次提供分開的環境變數
  // 參考：https://zeabur.com/docs/guides/postgresql
  const connectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI;
  const hasPostgres = connectionString || process.env.POSTGRES_HOST;
  const dbType = process.env.DATABASE_TYPE || (hasPostgres ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL 配置 - 使用 Zeabur 自動注入的環境變數
    
    // 優先使用連線字串（POSTGRES_CONNECTION_STRING）
    if (connectionString) {
      console.log('🔗 使用 POSTGRES_CONNECTION_STRING 連接 PostgreSQL');
      return new PostgresAdapter(connectionString);
    }

    // 備用：使用分開的環境變數
    // 注意：POSTGRES_HOST 需要從 Zeabur PostgreSQL 實例的 Networking 標籤查看
    // 它會是 hostname.zeabur.internal 的格式
    const config = {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD
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
