/**
 * Access Control Matrix Tests
 *
 * 測試 RBAC 權限矩陣
 * - 角色權限檢查
 * - 資源操作權限
 * - 特殊規則
 * - 欄位級權限
 */

process.env.JWT_SECRET = 'test-jwt-secret';

const {
  Operation,
  Role,
  checkPermission,
  checkDataClassificationAccess,
  checkSpecialRule,
  getResourcePermissions,
} = require('../../config/accessControlMatrix');

describe('Access Control Matrix', () => {
  describe('checkPermission', () => {
    // Patients
    it('should allow admin CRUD on patients', () => {
      expect(checkPermission(Role.ADMIN, 'patients', Operation.CREATE)).toBe(true);
      expect(checkPermission(Role.ADMIN, 'patients', Operation.READ)).toBe(true);
      expect(checkPermission(Role.ADMIN, 'patients', Operation.UPDATE)).toBe(true);
      expect(checkPermission(Role.ADMIN, 'patients', Operation.DELETE)).toBe(true);
      expect(checkPermission(Role.ADMIN, 'patients', Operation.EXPORT)).toBe(true);
    });

    it('should allow user CRU but not DELETE on patients', () => {
      expect(checkPermission(Role.USER, 'patients', Operation.CREATE)).toBe(true);
      expect(checkPermission(Role.USER, 'patients', Operation.READ)).toBe(true);
      expect(checkPermission(Role.USER, 'patients', Operation.UPDATE)).toBe(true);
      expect(checkPermission(Role.USER, 'patients', Operation.DELETE)).toBe(false);
      expect(checkPermission(Role.USER, 'patients', Operation.EXPORT)).toBe(false);
    });

    it('should allow super_admin full access on patients', () => {
      expect(checkPermission(Role.SUPER_ADMIN, 'patients', Operation.CREATE)).toBe(true);
      expect(checkPermission(Role.SUPER_ADMIN, 'patients', Operation.DELETE)).toBe(true);
      expect(checkPermission(Role.SUPER_ADMIN, 'patients', Operation.EXPORT)).toBe(true);
    });

    // Users
    it('should allow admin CRUD on users', () => {
      expect(checkPermission(Role.ADMIN, 'users', Operation.CREATE)).toBe(true);
      expect(checkPermission(Role.ADMIN, 'users', Operation.DELETE)).toBe(true);
    });

    it('should allow user only READ on users', () => {
      expect(checkPermission(Role.USER, 'users', Operation.READ)).toBe(true);
      expect(checkPermission(Role.USER, 'users', Operation.CREATE)).toBe(false);
      expect(checkPermission(Role.USER, 'users', Operation.UPDATE)).toBe(false);
      expect(checkPermission(Role.USER, 'users', Operation.DELETE)).toBe(false);
    });

    // Organizations
    it('should allow only super_admin to create organizations', () => {
      expect(checkPermission(Role.SUPER_ADMIN, 'organizations', Operation.CREATE)).toBe(true);
      expect(checkPermission(Role.ADMIN, 'organizations', Operation.CREATE)).toBe(false);
      expect(checkPermission(Role.USER, 'organizations', Operation.CREATE)).toBe(false);
    });

    // Audit logs
    it('should deny user access to audit_logs', () => {
      expect(checkPermission(Role.USER, 'audit_logs', Operation.READ)).toBe(false);
      expect(checkPermission(Role.ADMIN, 'audit_logs', Operation.READ)).toBe(true);
      expect(checkPermission(Role.SUPER_ADMIN, 'audit_logs', Operation.READ)).toBe(true);
    });

    // Tags & Groups
    it('should allow user only READ on tags', () => {
      expect(checkPermission(Role.USER, 'tags', Operation.READ)).toBe(true);
      expect(checkPermission(Role.USER, 'tags', Operation.CREATE)).toBe(false);
    });

    // Unknown resource
    it('should return false for unknown resources', () => {
      expect(checkPermission(Role.ADMIN, 'nonexistent_resource', Operation.READ)).toBe(false);
    });
  });

  describe('getResourcePermissions', () => {
    it('should return all permissions for a role', () => {
      const perms = getResourcePermissions(Role.ADMIN, 'patients');
      expect(perms).toContain(Operation.CREATE);
      expect(perms).toContain(Operation.READ);
      expect(perms).toContain(Operation.DELETE);
    });

    it('should return empty array for undefined role', () => {
      const perms = getResourcePermissions('unknown_role', 'patients');
      expect(perms).toEqual([]);
    });
  });

  describe('checkSpecialRule', () => {
    it('should allow super_admin cross-organization access', () => {
      expect(checkSpecialRule('crossOrganizationAccess', Role.SUPER_ADMIN)).toBe(true);
      expect(checkSpecialRule('crossOrganizationAccess', Role.ADMIN)).toBe(false);
      expect(checkSpecialRule('crossOrganizationAccess', Role.USER)).toBe(false);
    });

    it('should allow admin to modify other users', () => {
      expect(checkSpecialRule('canModifyOtherUsers', Role.ADMIN)).toBe(true);
      expect(checkSpecialRule('canModifyOtherUsers', Role.USER)).toBe(false);
    });

    it('should deny user from deleting patients', () => {
      expect(checkSpecialRule('canDeletePatients', Role.USER)).toBe(false);
      expect(checkSpecialRule('canDeletePatients', Role.ADMIN)).toBe(true);
    });

    it('should deny user from exporting data', () => {
      expect(checkSpecialRule('canExportData', Role.USER)).toBe(false);
      expect(checkSpecialRule('canExportData', Role.ADMIN)).toBe(true);
    });

    it('should return false for unknown rule', () => {
      expect(checkSpecialRule('unknownRule', Role.ADMIN)).toBe(false);
    });
  });

  describe('checkDataClassificationAccess', () => {
    it('should allow admin access to all classifications', () => {
      expect(checkDataClassificationAccess(Role.ADMIN, 'PUBLIC')).toBe(true);
      expect(checkDataClassificationAccess(Role.ADMIN, 'INTERNAL')).toBe(true);
      expect(checkDataClassificationAccess(Role.ADMIN, 'CONFIDENTIAL')).toBe(true);
      expect(checkDataClassificationAccess(Role.ADMIN, 'RESTRICTED')).toBe(true);
    });

    it('should deny user access to RESTRICTED', () => {
      expect(checkDataClassificationAccess(Role.USER, 'PUBLIC')).toBe(true);
      expect(checkDataClassificationAccess(Role.USER, 'CONFIDENTIAL')).toBe(true);
      expect(checkDataClassificationAccess(Role.USER, 'RESTRICTED')).toBe(false);
    });
  });
});
