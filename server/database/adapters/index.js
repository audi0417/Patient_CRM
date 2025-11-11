/**
 * Database Adapter Factory
 *
 * 根據環境變數自動選擇正確的資料庫適配器
 */

const path = require('path');
const { URL } = require('url');
const SQLiteAdapter = require('./sqlite');
const PostgresAdapter = require('./postgres');

/**
 * 建立資料庫適配器
 * @returns {DatabaseAdapter}
 */
function createDatabaseAdapter() {
  // 決定資料庫類型（支援 DB_TYPE 與 DATABASE_TYPE）
  const hasPostgresHint =
    process.env.POSTGRES_CONNECTION_STRING ||
    process.env.POSTGRES_URI ||
    process.env.DB_POSTGRESDB_HOST ||
    process.env.POSTGRES_HOST;

  const dbTypeRaw = (process.env.DB_TYPE || process.env.DATABASE_TYPE || '').toLowerCase();
  const dbType = dbTypeRaw || (hasPostgresHint ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // 直接依 Zeabur 文件：
    // 1) 優先使用連線字串（POSTGRES_CONNECTION_STRING/POSTGRES_URI/DATABASE_URL）
    const connectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI || process.env.DATABASE_URL;
    if (connectionString) {
      console.log('🔗 使用連線字串連接 PostgreSQL');
      return new PostgresAdapter(connectionString);
    }

    // 2) 若無連線字串，使用分開參數（優先 DB_POSTGRESDB_*，其次 POSTGRES_*，最後支援 DATABASE_*）
    const user =
      process.env.DB_POSTGRESDB_USER ||
      process.env.POSTGRES_USERNAME ||
      process.env.DATABASE_USER;
    const password =
      process.env.DB_POSTGRESDB_PASSWORD ||
      process.env.POSTGRES_PASSWORD ||
      process.env.DATABASE_PASSWORD;
    const database =
      process.env.DB_POSTGRESDB_DATABASE ||
      process.env.POSTGRES_DATABASE ||
      process.env.DATABASE_NAME ||
      process.env.DATABASE;
    const port = parseInt(
      process.env.DB_POSTGRESDB_PORT ||
        process.env.POSTGRES_PORT ||
        process.env.DATABASE_PORT ||
        '5432',
      10
    );
    const host =
      process.env.DB_POSTGRESDB_HOST ||
      process.env.POSTGRES_HOST ||
      process.env.POSTGRESQL_HOST ||
      process.env.DATABASE_HOST;

    if (!host || !user || !password || !database) {
      console.error('❌ PostgreSQL 參數不足。請在 Zeabur：');
      console.error('   - 使用 Exposed variable: POSTGRES_CONNECTION_STRING，或');
      console.error('   - 設定 DB_POSTGRESDB_HOST/PORT/DATABASE/USER/PASSWORD（或 POSTGRES_* / DATABASE_* 對應變數）');
      console.error('   - 如需私網 Hostname，請至資料庫服務的 Networking 分頁查詢 FQDN');
      throw new Error('PostgreSQL configuration incomplete');
    }

    const config = { host, port, database, user, password };
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
