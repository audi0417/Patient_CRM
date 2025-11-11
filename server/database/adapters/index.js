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
  // 自動偵測：如果有 Zeabur PostgreSQL 變數，自動使用 PostgreSQL
  const hasPostgres = process.env.DATABASE_HOST || process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI;
  const dbType = process.env.DATABASE_TYPE || (hasPostgres ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL 配置
    // 優先使用標準命名（DATABASE_*）或連線字串

    // 優先使用連線字串（如果有的話）
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI;
    
    if (connectionString) {
      console.log('🔗 使用連線字串連接 PostgreSQL');
      return new PostgresAdapter(connectionString);
    }

    // 使用標準命名的環境變數（Zeabur 標準輸出）
    const config = {
      host: process.env.DATABASE_HOST || 'postgresql',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'patient_crm',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || ''
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
