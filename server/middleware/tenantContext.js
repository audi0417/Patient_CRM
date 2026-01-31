/**
 * Tenant Context Middleware
 *
 * 商業化多租戶核心中介層
 *
 * 功能：
 * 1. 自動從 JWT 提取 organizationId
 * 2. 注入到 req.tenantContext
 * 3. 提供安全的查詢輔助函數
 * 4. 防止跨組織資料存取
 *
 * 使用方式：
 * - 在需要租戶隔離的路由上使用 requireTenant 中介層
 * - 使用 req.tenantContext.organizationId 過濾查詢
 */

const { db } = require('../database/db');
const { queryOne, queryAll, execute } = require('../database/helpers');
const { quoteIdentifier, whereBool, toBool } = require('../database/sqlHelpers');

/**
 * 租戶上下文中介層
 * 必須在 authenticateToken 之後使用
 */
async function requireTenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: '未認證',
      code: 'UNAUTHORIZED'
    });
  }

  if (!req.user.organizationId) {
    return res.status(403).json({
      error: '使用者未分配組織',
      code: 'NO_ORGANIZATION'
    });
  }

  try {
    // 驗證組織是否存在且啟用
    const org = await queryOne(`
      SELECT id, name, slug, plan, ${quoteIdentifier('isActive')}, ${quoteIdentifier('maxUsers')}, ${quoteIdentifier('maxPatients')}
      FROM organizations
      WHERE id = ?
    `, [req.user.organizationId]);

    if (!org) {
      return res.status(403).json({
        error: '組織不存在',
        code: 'ORGANIZATION_NOT_FOUND'
      });
    }

    if (!org.isActive) {
      return res.status(403).json({
        error: '組織已停用，請聯繫管理員',
        code: 'ORGANIZATION_INACTIVE'
      });
    }

    // 注入租戶上下文
    req.tenantContext = {
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      plan: org.plan,
      limits: {
        maxUsers: org.maxUsers,
        maxPatients: org.maxPatients
      }
    };

    // 設定 PostgreSQL RLS 上下文（僅在 PostgreSQL 環境下）
    // 這提供資料庫層的第二道防線
    const dbType = process.env.DB_TYPE || 'sqlite';
    if (dbType === 'postgres' && db.adapter && typeof db.adapter.setOrgContext === 'function') {
      try {
        await db.adapter.setOrgContext(org.id);
        // console.log(`[RLS] 已設定組織上下文: ${org.id}`);
      } catch (rlsError) {
        console.error('[RLS] 設定組織上下文失敗:', rlsError);
        // RLS 設定失敗不應阻止請求，應用層過濾仍有效
        // 但應該記錄警告以便監控
      }
    }

    next();
  } catch (error) {
    console.error('RequireTenant error:', error);
    return res.status(500).json({
      error: '驗證租戶資訊失敗',
      code: 'TENANT_VERIFICATION_ERROR'
    });
  }
}

/**
 * 租戶感知的查詢輔助函數
 * 自動注入 organizationId 過濾條件
 */
class TenantQuery {
  constructor(organizationId) {
    this.organizationId = organizationId;
  }

  /**
   * 查詢單一記錄
   * @param {string} table - 表名
   * @param {string} id - 記錄 ID
   * @returns {Promise<Object|null>}
   */
  async findById(table, id) {
    return await queryOne(`
      SELECT * FROM ${table}
      WHERE id = ? AND organizationId = ?
    `, [id, this.organizationId]);
  }

  /**
   * 查詢所有記錄
   * @param {string} table - 表名
   * @param {Object} options - 查詢選項 { orderBy, limit, offset }
   * @returns {Promise<Array>}
   */
  async findAll(table, options = {}) {
    let query = `SELECT * FROM ${table} WHERE organizationId = ?`;
    const params = [this.organizationId];

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }

    return await queryAll(query, params);
  }

  /**
   * 條件查詢
   * @param {string} table - 表名
   * @param {Object} where - WHERE 條件 (物件格式)
   * @param {Object} options - 查詢選項
   * @returns {Promise<Array>}
   */
  async findWhere(table, where = {}, options = {}) {
    const conditions = ['organizationId = ?'];
    const params = [this.organizationId];

    // 建立 WHERE 條件
    Object.entries(where).forEach(([key, value]) => {
      conditions.push(`${key} = ?`);
      params.push(value);
    });

    let query = `SELECT * FROM ${table} WHERE ${conditions.join(' AND ')}`;

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    return await queryAll(query, params);
  }

  /**
   * 計數
   * @param {string} table - 表名
   * @param {Object} where - WHERE 條件
   * @returns {Promise<number>}
   */
  async count(table, where = {}) {
    const conditions = ['organizationId = ?'];
    const params = [this.organizationId];

    Object.entries(where).forEach(([key, value]) => {
      conditions.push(`${key} = ?`);
      params.push(value);
    });

    const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${conditions.join(' AND ')}`;
    const result = await queryOne(query, params);
    return result.count;
  }

  /**
   * 插入記錄（自動加入 organizationId）
   * @param {string} table - 表名
   * @param {Object} data - 資料物件
   * @returns {Promise<Object>} 插入的記錄
   */
  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    // 自動加入 organizationId
    columns.push('organizationId');
    values.push(this.organizationId);

    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    await execute(query, values);

    // 返回插入的記錄
    return await this.findById(table, data.id);
  }

  /**
   * 更新記錄（自動驗證 organizationId）
   * @param {string} table - 表名
   * @param {string} id - 記錄 ID
   * @param {Object} data - 更新資料
   * @returns {Promise<Object|null>} 更新後的記錄
   */
  async update(table, id, data) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);

    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = ? AND organizationId = ?
    `;

    const result = await execute(query, [...values, id, this.organizationId]);

    if (result.changes === 0) {
      return null;
    }

    return await this.findById(table, id);
  }

  /**
   * 刪除記錄（自動驗證 organizationId）
   * @param {string} table - 表名
   * @param {string} id - 記錄 ID
   * @returns {Promise<boolean>} 是否成功刪除
   */
  async delete(table, id) {
    const result = await execute(`
      DELETE FROM ${table}
      WHERE id = ? AND organizationId = ?
    `, [id, this.organizationId]);

    return result.changes > 0;
  }

  /**
   * 執行原始查詢（必須手動加入 organizationId 條件）
   * @param {string} query - SQL 查詢
   * @param {Array} params - 參數
   * @returns {Promise<Array|Object>}
   */
  async raw(query, params = []) {
    const lowerQuery = query.toLowerCase();

    // 安全檢查 1：檢查是否在 WHERE 子句中使用 organizationId
    const hasWhereClause = /where\s+.*(organizationid|"organizationid")\s*=/.test(lowerQuery);

    if (!hasWhereClause) {
      console.error('[TenantQuery] Raw query missing organizationId filter:', query);
      throw new Error('Raw query must include organizationId in WHERE clause for tenant isolation');
    }

    // 安全檢查 2：驗證 params 中是否包含當前組織的 organizationId
    if (!params.includes(this.organizationId)) {
      console.error('[TenantQuery] Raw query params missing organizationId:', params);
      throw new Error('Raw query params must include current organizationId');
    }

    // 記錄警告（應盡量避免使用 raw 查詢）
    console.warn('[TenantQuery] Raw query used:', {
      organizationId: this.organizationId,
      query: query.substring(0, 100) // 僅記錄前 100 字元
    });

    return await queryAll(query, params);
  }
}

/**
 * 為請求增加租戶查詢輔助函數
 */
function injectTenantQuery(req, res, next) {
  if (req.tenantContext) {
    req.tenantQuery = new TenantQuery(req.tenantContext.organizationId);
  }
  next();
}

/**
 * 超級管理員檢查（可跨組織操作）
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: '需要超級管理員權限',
      code: 'REQUIRE_SUPER_ADMIN'
    });
  }
  next();
}

/**
 * 租戶配額檢查中介層
 */
function checkTenantQuota(resourceType) {
  return async (req, res, next) => {
    if (!req.tenantContext) {
      return res.status(403).json({ error: '缺少租戶上下文' });
    }

    const { organizationId, limits } = req.tenantContext;
    const query = new TenantQuery(organizationId);

    try {
      let currentCount = 0;
      let maxLimit = 0;

      switch (resourceType) {
        case 'users':
          // 直接查詢活躍用戶數，避免使用 count() 的布林值問題
          const activeUsers = await queryOne(`
            SELECT COUNT(*) as count FROM users
            WHERE ${quoteIdentifier('organizationId')} = ? AND ${whereBool('isActive', true)}
          `, [organizationId]);
          currentCount = activeUsers.count;
          maxLimit = limits.maxUsers;
          break;

        case 'patients':
          currentCount = await query.count('patients');
          maxLimit = limits.maxPatients;
          break;

        default:
          return next();
      }

      if (currentCount >= maxLimit) {
        return res.status(403).json({
          error: `已達到 ${resourceType} 數量上限 (${maxLimit})`,
          code: 'QUOTA_EXCEEDED',
          current: currentCount,
          limit: maxLimit
        });
      }

      next();
    } catch (error) {
      console.error('[Quota] Error checking quota:', error);
      next();
    }
  };
}

/**
 * 訂閱到期檢查中介層
 * 檢查組織訂閱是否已過期，自動禁用過期組織
 */
async function checkSubscriptionExpiry(req, res, next) {
  if (!req.tenantContext) {
    return res.status(403).json({
      error: '缺少租戶上下文',
      code: 'NO_TENANT_CONTEXT'
    });
  }

  const { organizationId } = req.tenantContext;

  try {
    // 查詢組織的訂閱資訊
    const org = await queryOne(`
      SELECT id, name, ${quoteIdentifier('subscriptionEndDate')}, ${quoteIdentifier('isActive')}
      FROM organizations
      WHERE id = ?
    `, [organizationId]);

    if (!org) {
      return res.status(403).json({
        error: '組織不存在',
        code: 'ORGANIZATION_NOT_FOUND'
      });
    }

    // 檢查訂閱是否過期
    if (org.subscriptionEndDate) {
      const now = new Date();
      const endDate = new Date(org.subscriptionEndDate);

      if (now > endDate && org.isActive) {
        // 自動禁用過期組織
        await execute(`
          UPDATE organizations
          SET ${quoteIdentifier('isActive')} = ${toBool(false)}
          WHERE id = ?
        `, [organizationId]);

        console.log(`[Subscription] Auto-disabled expired organization: ${org.name} (${organizationId})`);

        return res.status(403).json({
          error: '訂閱已過期，帳戶已被停用，請聯繫管理員續訂',
          code: 'SUBSCRIPTION_EXPIRED',
          organizationName: org.name,
          expiredDate: org.subscriptionEndDate
        });
      }

      if (now > endDate && !org.isActive) {
        // 組織已被禁用且過期
        return res.status(403).json({
          error: '訂閱已過期，請聯繫管理員續訂',
          code: 'SUBSCRIPTION_EXPIRED',
          organizationName: org.name,
          expiredDate: org.subscriptionEndDate
        });
      }
    }

    // 訂閱有效，繼續
    next();
  } catch (error) {
    console.error('[Subscription] Error checking subscription expiry:', error);
    // 發生錯誤時不阻擋請求，記錄錯誤並繼續
    next();
  }
}

module.exports = {
  requireTenant,
  injectTenantQuery,
  requireSuperAdmin,
  checkTenantQuota,
  checkSubscriptionExpiry,
  TenantQuery
};
