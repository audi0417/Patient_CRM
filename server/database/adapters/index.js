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

    // 檢查是否有 Zeabur 提供的分開參數（更可靠）
    const hasZeaburParams = process.env.POSTGRES_DATABASE && process.env.POSTGRES_USERNAME && process.env.POSTGRES_PASSWORD;

    if (hasZeaburParams) {
      // 優先使用分開的配置（更可靠，可以修改主機名稱）
      let host = process.env.DATABASE_HOST || process.env.POSTGRES_HOST || process.env.POSTGRESQL_HOST;

      // 如果主機名稱看起來像 Zeabur 的 service ID (以 'service-' 開頭)，嘗試替代方案
      if (host && host.startsWith('service-')) {
        console.log(`⚠️  偵測到 Zeabur service ID 主機名稱: ${host}`);
        console.log('🔄 嘗試使用簡化的主機名稱...');
        // 嘗試常見的 PostgreSQL 主機名稱
        const alternativeHosts = ['postgresql', 'postgres', 'db', host];
        host = alternativeHosts[0]; // 先嘗試 'postgresql'
        console.log(`📍 使用主機名稱: ${host}`);
      }

      const config = {
        host: host || 'postgresql',
        port: parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432'),
        database: process.env.DATABASE_NAME || process.env.POSTGRES_DATABASE,
        user: process.env.DATABASE_USER || process.env.POSTGRES_USERNAME,
        password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD
      };

      console.log(`🔗 連接到 PostgreSQL: ${config.user}@${config.host}:${config.port}/${config.database}`);
      return new PostgresAdapter(config);
    }

    // 嘗試使用連線字串
    let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI;

    if (databaseUrl) {
      console.log('🔗 使用連線字串連接 PostgreSQL');
      return new PostgresAdapter(databaseUrl);
    }

    // 最後的備用方案
    const config = {
      host: process.env.DATABASE_HOST || 'postgresql',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'patient_crm',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || ''
    };

    console.log(`🔗 連接到 PostgreSQL (備用): ${config.user}@${config.host}:${config.port}/${config.database}`);
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
