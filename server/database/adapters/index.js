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
  // Zeabur PostgreSQL 配置
  // 在同一專案內的服務可以通過服務名稱相互通訊
  // 連線字串格式：postgresql://user:password@postgresql:5432/database
  
  const hasPostgres = process.env.POSTGRES_HOST || process.env.POSTGRES_CONNECTION_STRING;
  const dbType = process.env.DATABASE_TYPE || (hasPostgres ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL 配置 - 使用服務名稱進行通訊
    
    // 構建正確的連線字串：使用服務名稱 'postgresql' 而非 service ID
    const connectionString = 
      `postgresql://${process.env.POSTGRES_USERNAME}:${process.env.POSTGRES_PASSWORD}@postgresql:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE}`;

    console.log(`🔗 連接到 PostgreSQL: ${process.env.POSTGRES_USERNAME}@postgresql:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE}`);
    return new PostgresAdapter(connectionString);
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
