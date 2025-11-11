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
  const hasZeaburPostgres = process.env.POSTGRES_HOST || process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI;
  const dbType = process.env.DATABASE_TYPE || (hasZeaburPostgres ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL 配置
    // Zeabur 會自動注入以下環境變數：
    // - POSTGRES_HOST、POSTGRES_PORT、POSTGRES_DATABASE、POSTGRES_USERNAME、POSTGRES_PASSWORD
    // - 或 POSTGRES_CONNECTION_STRING / POSTGRES_URI

    // 優先使用連線字串（Zeabur 提供）
    const connectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI;
    
    if (connectionString) {
      console.log('🔗 使用 Zeabur 提供的連線字串連接 PostgreSQL');
      return new PostgresAdapter(connectionString);
    }

    // 使用分開的環境變數（如果連線字串不可用）
    const config = {
      host: process.env.POSTGRES_HOST || 'postgresql',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || 'patient_crm',
      user: process.env.POSTGRES_USERNAME || 'postgres',
      password: process.env.POSTGRES_PASSWORD || ''
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
