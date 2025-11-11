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
  // 決定資料庫類型
  const hasPostgresHint = process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI || process.env.POSTGRES_HOST;
  const dbType = process.env.DATABASE_TYPE || (hasPostgresHint ? 'postgres' : 'sqlite');

  console.log(`📊 資料庫類型: ${dbType}`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    // 1) 優先使用連線字串（Zeabur 自動注入）
    const baseConnStr = process.env.POSTGRES_CONNECTION_STRING || process.env.POSTGRES_URI || process.env.DATABASE_URL;

    // 產生候選連線字串
    const candidates = [];

    if (baseConnStr) {
      try {
        const u = new URL(baseConnStr);
        const originalHost = u.hostname;

        // 原始連線字串
        candidates.push(baseConnStr);

        // 若主機是 service-* 或沒有點號（例如僅有服務名），嘗試更多候選
        const looksLikeServiceId = originalHost.startsWith('service-');
        const looksLikeBareName = !originalHost.includes('.');

        if (looksLikeServiceId) {
          // 嘗試添加內部網域後綴
          const u1 = new URL(baseConnStr);
          u1.hostname = `${originalHost}.zeabur.internal`;
          candidates.push(u1.toString());
        }

        if (looksLikeBareName || looksLikeServiceId) {
          // 嘗試標準服務名稱
          const u2 = new URL(baseConnStr);
          u2.hostname = 'postgresql';
          candidates.push(u2.toString());

          // 嘗試完整 FQDN
          const u3 = new URL(baseConnStr);
          u3.hostname = 'postgresql.zeabur.internal';
          candidates.push(u3.toString());
        }
      } catch (e) {
        console.warn('⚠️ 無法解析 POSTGRES_CONNECTION_STRING/URI，將改用分開參數:', e.message);
      }
    }

    // 2) 分開參數（Zeabur 自動注入）
    const user = process.env.POSTGRES_USERNAME;
    const password = process.env.POSTGRES_PASSWORD;
    const database = process.env.POSTGRES_DATABASE;
    const port = process.env.POSTGRES_PORT || '5432';
    const hostEnv = process.env.POSTGRES_HOST || process.env.POSTGRESQL_HOST || '';

    if (user && password && database) {
      const hostCandidates = [];

      if (hostEnv) hostCandidates.push(hostEnv);
      if (hostEnv && hostEnv.startsWith('service-') && !hostEnv.includes('.')) {
        hostCandidates.push(`${hostEnv}.zeabur.internal`);
      }
      // Zeabur 同專案服務名與其 FQDN
      hostCandidates.push('postgresql');
      hostCandidates.push('postgresql.zeabur.internal');

      const uniqueHosts = Array.from(new Set(hostCandidates));

      // 基於分開參數，為每個主機產生一組候選連線字串
      uniqueHosts.forEach(h => {
        candidates.push(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${h}:${port}/${encodeURIComponent(database)}`);
      });
    }

    // 去除重複
    const uniqCandidates = Array.from(new Set(candidates));

    if (uniqCandidates.length === 0) {
      console.error('❌ 無法組裝 PostgreSQL 連線參數，請檢查環境變數 POSTGRES_* 或 POSTGRES_CONNECTION_STRING');
      throw new Error('PostgreSQL configuration not found');
    }

    console.log('🔍 將依序嘗試以下 PostgreSQL 連線候選（由高到低）:');
    uniqCandidates.forEach((c, i) => {
      try {
        const u = new URL(c);
        console.log(`  ${i + 1}. ${u.username}@${u.hostname}:${u.port || '5432'}/${u.pathname.replace('/', '')}`);
      } catch {
        console.log(`  ${i + 1}. ${c}`);
      }
    });

    // 以啟發式方式挑選最可能可用的候選（無需立即連線）
    const score = (cand) => {
      try {
        const u = new URL(cand);
        const h = u.hostname;
        if (h.endsWith('.zeabur.internal')) return 4; // 最佳：FQDN
        if (h === 'postgresql') return 3;            // 其次：服務名稱
        if (h.includes('.')) return 2;               // 一般可解析主機
        if (h.startsWith('service-')) return 0;      // 最差：服務 ID
        return 1;
      } catch {
        return 0;
      }
    };

    const sorted = uniqCandidates
      .map((c, i) => ({ c, i }))
      .sort((a, b) => {
        const sa = score(a.c);
        const sb = score(b.c);
        if (sb !== sa) return sb - sa; // 高分優先
        return a.i - b.i; // 分數相同保留原順序
      })
      .map(x => x.c);

    const chosen = sorted[0];
    try {
      const u = new URL(chosen);
      console.log(`✅ 已選用候選: ${u.username}@${u.hostname}:${u.port || '5432'}/${u.pathname.replace('/', '')}`);
    } catch {
      console.log(`✅ 已選用候選: ${chosen}`);
    }

    return new PostgresAdapter(chosen);
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
