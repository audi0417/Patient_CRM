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

  console.log(`[Database] Type: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // Direct Zeabur documentation:
    // 1) Prioritize connection string (POSTGRES_CONNECTION_STRING/POSTGRES_URI/DATABASE_URL)
    const connectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI || process.env.DATABASE_URL;
    if (connectionString) {
      console.log('[Database] Using connection string for PostgreSQL');
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
      console.error('[Database] PostgreSQL configuration incomplete. Configure in Zeabur:');
      console.error('   - Use Exposed variable: POSTGRES_CONNECTION_STRING, or');
      console.error('   - Set DB_POSTGRESDB_HOST/PORT/DATABASE/USER/PASSWORD (or POSTGRES_* / DATABASE_* variants)');
      console.error('   - For private hostname, check database service Networking tab for FQDN');
      throw new Error('PostgreSQL configuration incomplete');
    }

    const config = { host, port, database, user, password };
    console.log(`[Database] Connecting to PostgreSQL: ${config.user}@${config.host}:${config.port}/${config.database}`);
    return new PostgresAdapter(config);
  } else {
    // SQLite configuration
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/patient_crm.db');
    console.log(`[Database] Using SQLite: ${dbPath}`);
    return new SQLiteAdapter(dbPath);
  }
}

module.exports = {
  createDatabaseAdapter,
  SQLiteAdapter,
  PostgresAdapter
};
