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

/**
 * 租戶上下文中介層
 * 必須在 authenticateToken 之後使用
 */
function requireTenant(req, res, next) {
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

  // 驗證組織是否存在且啟用
  const org = db.prepare(`
    SELECT id, name, slug, plan, isActive, maxUsers, maxPatients
    FROM organizations
    WHERE id = ?
  `).get(req.user.organizationId);

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

  next();
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
   * @returns {Object|null}
   */
  findById(table, id) {
    return db.prepare(`
      SELECT * FROM ${table}
      WHERE id = ? AND organizationId = ?
    `).get(id, this.organizationId);
  }

  /**
   * 查詢所有記錄
   * @param {string} table - 表名
   * @param {Object} options - 查詢選項 { orderBy, limit, offset }
   * @returns {Array}
   */
  findAll(table, options = {}) {
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

    return db.prepare(query).all(...params);
  }

  /**
   * 條件查詢
   * @param {string} table - 表名
   * @param {Object} where - WHERE 條件 (物件格式)
   * @param {Object} options - 查詢選項
   * @returns {Array}
   */
  findWhere(table, where = {}, options = {}) {
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

    return db.prepare(query).all(...params);
  }

  /**
   * 計數
   * @param {string} table - 表名
   * @param {Object} where - WHERE 條件
   * @returns {number}
   */
  count(table, where = {}) {
    const conditions = ['organizationId = ?'];
    const params = [this.organizationId];

    Object.entries(where).forEach(([key, value]) => {
      conditions.push(`${key} = ?`);
      params.push(value);
    });

    const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${conditions.join(' AND ')}`;
    return db.prepare(query).get(...params).count;
  }

  /**
   * 插入記錄（自動加入 organizationId）
   * @param {string} table - 表名
   * @param {Object} data - 資料物件
   * @returns {Object} 插入的記錄
   */
  insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    // 自動加入 organizationId
    columns.push('organizationId');
    values.push(this.organizationId);

    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    db.prepare(query).run(...values);

    // 返回插入的記錄
    return this.findById(table, data.id);
  }

  /**
   * 更新記錄（自動驗證 organizationId）
   * @param {string} table - 表名
   * @param {string} id - 記錄 ID
   * @param {Object} data - 更新資料
   * @returns {Object|null} 更新後的記錄
   */
  update(table, id, data) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);

    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = ? AND organizationId = ?
    `;

    const result = db.prepare(query).run(...values, id, this.organizationId);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(table, id);
  }

  /**
   * 刪除記錄（自動驗證 organizationId）
   * @param {string} table - 表名
   * @param {string} id - 記錄 ID
   * @returns {boolean} 是否成功刪除
   */
  delete(table, id) {
    const result = db.prepare(`
      DELETE FROM ${table}
      WHERE id = ? AND organizationId = ?
    `).run(id, this.organizationId);

    return result.changes > 0;
  }

  /**
   * 執行原始查詢（必須手動加入 organizationId 條件）
   * @param {string} query - SQL 查詢
   * @param {Array} params - 參數
   * @returns {Array|Object}
   */
  raw(query, params = []) {
    // 安全檢查：確保查詢包含 organizationId 過濾
    if (!query.toLowerCase().includes('organizationid')) {
      throw new Error('Raw query must include organizationId filter for tenant isolation');
    }

    return db.prepare(query).all(...params);
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
          currentCount = query.count('users', { isActive: 1 });
          maxLimit = limits.maxUsers;
          break;

        case 'patients':
          currentCount = query.count('patients');
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
      console.error('Quota check error:', error);
      next();
    }
  };
}

module.exports = {
  requireTenant,
  injectTenantQuery,
  requireSuperAdmin,
  checkTenantQuota,
  TenantQuery
};
