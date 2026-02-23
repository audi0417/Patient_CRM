/**
 * Tenant Context Middleware Tests
 *
 * 測試多租戶隔離中介層
 * - requireTenant 驗證
 * - TenantQuery SQL 注入防護
 * - 配額檢查
 * - 超級管理員權限
 */

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';
process.env.DB_TYPE = 'sqlite';

const {
  mockRequest,
  mockResponse,
  mockNext,
  createTestOrganization,
  TEST_ORG_ID,
  TEST_USER_ID,
} = require('../setup');

// Mock database
jest.mock('../../database/db', () => ({
  db: { adapter: null },
}));

jest.mock('../../database/helpers', () => ({
  queryOne: jest.fn(),
  queryAll: jest.fn(),
  execute: jest.fn(),
}));

jest.mock('../../database/sqlHelpers', () => ({
  quoteIdentifier: jest.fn((id) => id),
  whereBool: jest.fn((col, val) => `${col} = ${val ? 1 : 0}`),
  toBool: jest.fn((val) => val ? 1 : 0),
}));

const { queryOne, queryAll, execute } = require('../../database/helpers');
const {
  requireTenant,
  injectTenantQuery,
  requireSuperAdmin,
  TenantQuery,
} = require('../../middleware/tenantContext');

describe('Tenant Context Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireTenant', () => {
    it('should reject unauthenticated request', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await requireTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject user without organizationId', async () => {
      const req = mockRequest({ user: { id: TEST_USER_ID, role: 'admin' } });
      const res = mockResponse();
      const next = mockNext();

      await requireTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_ORGANIZATION' }));
    });

    it('should reject if organization not found', async () => {
      const req = mockRequest({
        user: { id: TEST_USER_ID, role: 'admin', organizationId: 'nonexistent' },
      });
      const res = mockResponse();
      const next = mockNext();

      queryOne.mockResolvedValue(null);

      await requireTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ORGANIZATION_NOT_FOUND' }));
    });

    it('should reject if organization is inactive', async () => {
      const req = mockRequest({
        user: { id: TEST_USER_ID, role: 'admin', organizationId: TEST_ORG_ID },
      });
      const res = mockResponse();
      const next = mockNext();

      queryOne.mockResolvedValue(createTestOrganization({ isActive: false }));

      await requireTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ORGANIZATION_INACTIVE' }));
    });

    it('should inject tenantContext for valid organization', async () => {
      const org = createTestOrganization();
      const req = mockRequest({
        user: { id: TEST_USER_ID, role: 'admin', organizationId: TEST_ORG_ID },
      });
      const res = mockResponse();
      const next = mockNext();

      queryOne.mockResolvedValue(org);

      await requireTenant(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.tenantContext).toBeDefined();
      expect(req.tenantContext.organizationId).toBe(TEST_ORG_ID);
      expect(req.tenantContext.organizationName).toBe('Test Clinic');
      expect(req.tenantContext.limits.maxPatients).toBe(100);
    });
  });

  describe('injectTenantQuery', () => {
    it('should inject tenantQuery when tenantContext exists', () => {
      const req = mockRequest({
        tenantContext: { organizationId: TEST_ORG_ID },
      });
      const res = mockResponse();
      const next = mockNext();

      injectTenantQuery(req, res, next);

      expect(req.tenantQuery).toBeDefined();
      expect(req.tenantQuery).toBeInstanceOf(TenantQuery);
      expect(next).toHaveBeenCalled();
    });

    it('should not inject tenantQuery when tenantContext is missing', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      injectTenantQuery(req, res, next);

      expect(req.tenantQuery).toBeFalsy();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow super_admin', () => {
      const req = mockRequest({ user: { id: TEST_USER_ID, role: 'super_admin' } });
      const res = mockResponse();
      const next = mockNext();

      requireSuperAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-super_admin', () => {
      const req = mockRequest({ user: { id: TEST_USER_ID, role: 'admin' } });
      const res = mockResponse();
      const next = mockNext();

      requireSuperAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      requireSuperAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('TenantQuery', () => {
  let tq;

  beforeEach(() => {
    jest.clearAllMocks();
    tq = new TenantQuery(TEST_ORG_ID);
  });

  describe('table name validation (_validateTable)', () => {
    it('should accept allowed table names', () => {
      expect(() => tq._validateTable('patients')).not.toThrow();
      expect(() => tq._validateTable('users')).not.toThrow();
      expect(() => tq._validateTable('appointments')).not.toThrow();
      expect(() => tq._validateTable('consultations')).not.toThrow();
      expect(() => tq._validateTable('tags')).not.toThrow();
      expect(() => tq._validateTable('groups')).not.toThrow();
    });

    it('should reject invalid table names (SQL injection)', () => {
      expect(() => tq._validateTable('users; DROP TABLE users')).toThrow('Invalid table name');
      expect(() => tq._validateTable('unknown_table')).toThrow('Invalid table name');
      expect(() => tq._validateTable('')).toThrow('Invalid table name');
      expect(() => tq._validateTable('1patients')).toThrow('Invalid table name');
    });
  });

  describe('ORDER BY validation (_validateOrderBy)', () => {
    it('should accept allowed order columns', () => {
      expect(tq._validateOrderBy('name DESC')).toContain('name');
      expect(tq._validateOrderBy('createdAt ASC')).toContain('createdAt');
      expect(tq._validateOrderBy('updatedAt')).toContain('updatedAt');
    });

    it('should reject invalid order columns (SQL injection)', () => {
      expect(() => tq._validateOrderBy('1=1; DROP TABLE users --')).toThrow('Invalid ORDER BY');
      expect(() => tq._validateOrderBy('invalidColumn')).toThrow('Invalid ORDER BY');
    });

    it('should reject invalid directions', () => {
      expect(() => tq._validateOrderBy('name SIDEWAYS')).toThrow('Invalid ORDER BY direction');
    });

    it('should return null for empty input', () => {
      expect(tq._validateOrderBy(null)).toBeNull();
      expect(tq._validateOrderBy(undefined)).toBeNull();
      expect(tq._validateOrderBy('')).toBeNull();
    });
  });

  describe('column name validation (_validateColumnName)', () => {
    it('should accept valid column names', () => {
      expect(tq._validateColumnName('name')).toBe('name');
      expect(tq._validateColumnName('organizationId')).toBe('organizationId');
      expect(tq._validateColumnName('is_active')).toBe('is_active');
      expect(tq._validateColumnName('_private')).toBe('_private');
    });

    it('should reject invalid column names (SQL injection)', () => {
      expect(() => tq._validateColumnName('1=1')).toThrow('Invalid column name');
      expect(() => tq._validateColumnName('col; DROP')).toThrow('Invalid column name');
      expect(() => tq._validateColumnName('col name')).toThrow('Invalid column name');
      expect(() => tq._validateColumnName('')).toThrow('Invalid column name');
      expect(() => tq._validateColumnName('col-name')).toThrow('Invalid column name');
    });
  });

  describe('findById', () => {
    it('should query with organizationId filter', async () => {
      queryOne.mockResolvedValue({ id: 'p1', name: 'Test' });

      const result = await tq.findById('patients', 'p1');

      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('organizationId'),
        ['p1', TEST_ORG_ID]
      );
      expect(result).toEqual({ id: 'p1', name: 'Test' });
    });

    it('should reject invalid table name', async () => {
      await expect(tq.findById('evil_table', 'id')).rejects.toThrow('Invalid table name');
    });
  });

  describe('findAll', () => {
    it('should query all records with org filter', async () => {
      queryAll.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      const result = await tq.findAll('patients');

      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('organizationId'),
        [TEST_ORG_ID]
      );
      expect(result).toHaveLength(2);
    });

    it('should apply validated orderBy', async () => {
      queryAll.mockResolvedValue([]);

      await tq.findAll('patients', { orderBy: 'updatedAt DESC' });

      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        [TEST_ORG_ID]
      );
    });

    it('should reject invalid orderBy', async () => {
      await expect(
        tq.findAll('patients', { orderBy: 'EVIL_COL; DROP TABLE x' })
      ).rejects.toThrow('Invalid ORDER BY');
    });

    it('should apply limit and offset as numbers', async () => {
      queryAll.mockResolvedValue([]);

      await tq.findAll('patients', { limit: '10', offset: '20' });

      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        [TEST_ORG_ID, 10, 20]
      );
    });
  });

  describe('findWhere', () => {
    it('should apply where conditions with org filter', async () => {
      queryAll.mockResolvedValue([]);

      await tq.findWhere('patients', { gender: 'male' });

      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('AND'),
        [TEST_ORG_ID, 'male']
      );
    });

    it('should reject invalid where keys', async () => {
      await expect(
        tq.findWhere('patients', { '1=1; --': 'value' })
      ).rejects.toThrow('Invalid column name');
    });
  });

  describe('count', () => {
    it('should count with org filter', async () => {
      queryOne.mockResolvedValue({ count: 42 });

      const result = await tq.count('patients');

      expect(result).toBe(42);
      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [TEST_ORG_ID]
      );
    });
  });

  describe('insert', () => {
    it('should auto-inject organizationId', async () => {
      execute.mockResolvedValue({ changes: 1, lastID: 1 });
      queryOne.mockResolvedValue({ id: 'p1', name: 'Test', organizationId: TEST_ORG_ID });

      await tq.insert('patients', { id: 'p1', name: 'Test' });

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('organizationId'),
        expect.arrayContaining([TEST_ORG_ID])
      );
    });

    it('should reject invalid column names in data', async () => {
      await expect(
        tq.insert('patients', { '1=1': 'evil' })
      ).rejects.toThrow('Invalid column name');
    });
  });

  describe('update', () => {
    it('should update with org filter', async () => {
      execute.mockResolvedValue({ changes: 1 });
      queryOne.mockResolvedValue({ id: 'p1', name: 'Updated' });

      const result = await tq.update('patients', 'p1', { name: 'Updated' });

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('organizationId'),
        expect.arrayContaining(['Updated', 'p1', TEST_ORG_ID])
      );
      expect(result).toBeDefined();
    });

    it('should return null when no rows updated', async () => {
      execute.mockResolvedValue({ changes: 0 });

      const result = await tq.update('patients', 'nonexistent', { name: 'X' });

      expect(result).toBeNull();
    });

    it('should reject invalid column names in update data', async () => {
      await expect(
        tq.update('patients', 'p1', { 'DROP TABLE': 'evil' })
      ).rejects.toThrow('Invalid column name');
    });
  });

  describe('delete', () => {
    it('should delete with org filter', async () => {
      execute.mockResolvedValue({ changes: 1 });

      const result = await tq.delete('patients', 'p1');

      expect(result).toBe(true);
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('organizationId'),
        ['p1', TEST_ORG_ID]
      );
    });

    it('should return false when no rows deleted', async () => {
      execute.mockResolvedValue({ changes: 0 });

      const result = await tq.delete('patients', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('raw', () => {
    it('should allow queries with organizationId in WHERE', async () => {
      queryAll.mockResolvedValue([]);

      await tq.raw(
        'SELECT * FROM patients WHERE organizationId = ? AND name LIKE ?',
        [TEST_ORG_ID, '%test%']
      );

      expect(queryAll).toHaveBeenCalled();
    });

    it('should reject queries without organizationId in WHERE', async () => {
      await expect(
        tq.raw('SELECT * FROM patients WHERE name = ?', ['test'])
      ).rejects.toThrow('organizationId');
    });

    it('should reject queries where params miss organizationId', async () => {
      await expect(
        tq.raw('SELECT * FROM patients WHERE organizationId = ?', ['wrong-org-id'])
      ).rejects.toThrow('organizationId');
    });
  });
});
