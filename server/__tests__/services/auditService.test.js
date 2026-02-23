/**
 * Audit Service Tests
 *
 * 測試稽核日誌服務
 * - 日誌寫入
 * - 日誌查詢
 * - 非同步操作
 */

process.env.JWT_SECRET = 'test-jwt-secret';

jest.mock('../../database/helpers', () => ({
  queryAll: jest.fn(),
  execute: jest.fn(),
}));

const { queryAll, execute } = require('../../database/helpers');
const AuditLogger = require('../../services/auditService');

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should write audit log asynchronously', async () => {
      execute.mockResolvedValue({ changes: 1 });

      await AuditLogger.log({
        userId: 'user_1',
        username: 'admin',
        userRole: 'admin',
        organizationId: 'org_1',
        action: 'CREATE',
        resource: 'patients',
        resourceId: 'patient_1',
        details: { name: 'Test Patient' },
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
        status: 'SUCCESS',
      });

      // setImmediate 是非同步的，需要等待
      await new Promise((resolve) => setImmediate(resolve));

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('audit_logs'),
        expect.arrayContaining(['user_1', 'admin', 'admin', 'org_1', 'CREATE', 'patients', 'patient_1'])
      );
    });

    it('should not throw when database write fails', async () => {
      execute.mockRejectedValue(new Error('DB error'));

      // 應該不會拋出異常
      await AuditLogger.log({
        userId: 'user_1',
        username: 'admin',
        userRole: 'admin',
        organizationId: 'org_1',
        action: 'LOGIN',
        resource: 'auth',
      });

      await new Promise((resolve) => setImmediate(resolve));
      // 即使 execute 失敗，也不應影響程式
      expect(true).toBe(true);
    });

    it('should stringify details as JSON', async () => {
      execute.mockResolvedValue({ changes: 1 });

      const details = { changed: ['name', 'phone'], ip: '10.0.0.1' };

      await AuditLogger.log({
        userId: 'user_1',
        username: 'admin',
        userRole: 'admin',
        action: 'UPDATE',
        resource: 'patients',
        resourceId: 'p1',
        details,
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(details)])
      );
    });
  });

  describe('query', () => {
    it('should query audit logs with filters', async () => {
      const mockLogs = [
        { id: 1, action: 'CREATE', resource: 'patients', timestamp: '2025-01-01T00:00:00Z' },
        { id: 2, action: 'UPDATE', resource: 'patients', timestamp: '2025-01-02T00:00:00Z' },
      ];

      queryAll.mockResolvedValue(mockLogs);

      const result = await AuditLogger.query({
        organizationId: 'org_1',
        resource: 'patients',
        limit: 50,
        offset: 0,
      });

      expect(result).toHaveLength(2);
      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('organizationId'),
        expect.arrayContaining(['org_1', 'patients', 50, 0])
      );
    });

    it('should query with date range filters', async () => {
      queryAll.mockResolvedValue([]);

      await AuditLogger.query({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        limit: 100,
        offset: 0,
      });

      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('timestamp'),
        expect.arrayContaining(['2025-01-01', '2025-12-31'])
      );
    });

    it('should query without any filters', async () => {
      queryAll.mockResolvedValue([]);

      await AuditLogger.query({ limit: 100, offset: 0 });

      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        expect.arrayContaining([100, 0])
      );
    });

    it('should filter by userId', async () => {
      queryAll.mockResolvedValue([]);

      await AuditLogger.query({ userId: 'user_1', limit: 100, offset: 0 });

      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('userId'),
        expect.arrayContaining(['user_1'])
      );
    });

    it('should filter by action', async () => {
      queryAll.mockResolvedValue([]);

      await AuditLogger.query({ action: 'DELETE', limit: 100, offset: 0 });

      expect(queryAll).toHaveBeenCalledWith(
        expect.stringContaining('action'),
        expect.arrayContaining(['DELETE'])
      );
    });
  });
});
