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
  const hasZeaburPostgres = process.env.POSTGRES_HOST || process.env.POSTGRESQL_HOST;
  const dbType = process.env.DATABASE_TYPE || (hasZeaburPostgres ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL 配置 - 支援多種環境變數命名方式

    // 優先順序 1: 標準 DATABASE_URL
    let databaseUrl = process.env.DATABASE_URL;

    // 優先順序 2: Zeabur 提供的連線字串
    if (!databaseUrl) {
      databaseUrl = process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI;
    }

    if (databaseUrl) {
      console.log('🔗 使用連線字串連接 PostgreSQL');
      return new PostgresAdapter(databaseUrl);
    } else {
      // 優先順序 3: 使用分開的配置
      const config = {
        // 支援 Zeabur 的環境變數名稱
        host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST || process.env.POSTGRESQL_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432'),
        database: process.env.DATABASE_NAME || process.env.POSTGRES_DATABASE || 'patient_crm',
        user: process.env.DATABASE_USER || process.env.POSTGRES_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD || ''
      };

      console.log(`🔗 連接到 PostgreSQL: ${config.user}@${config.host}:${config.port}/${config.database}`);
      return new PostgresAdapter(config);
    }
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
