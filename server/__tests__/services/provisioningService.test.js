/**
 * Provisioning Service Tests
 *
 * Tests for tenant provisioning:
 * - Full provisioning flow
 * - Validation (missing fields, slug format, email)
 * - Slug uniqueness check
 * - Suspend / reactivate
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';

// Mock database helpers
jest.mock('../../database/helpers', () => ({
  queryOne: jest.fn(),
  queryAll: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(async (cb) => {
    await cb();
  }),
}));

// Mock password utility
jest.mock('../../utils/password', () => ({
  hashPassword: jest.fn(async (pw) => `hashed_${pw}`),
}));

// Mock module settings
jest.mock('../../config/modules', () => ({
  getDefaultModuleSettings: jest.fn(() => ({
    consultation: true,
    bodyComposition: true,
  })),
}));

// Mock email service
jest.mock('../../services/emailService', () => ({
  isEnabled: jest.fn(() => false),
  sendUserCredentials: jest.fn(),
}));

const { queryOne, execute, transaction } = require('../../database/helpers');
const EmailService = require('../../services/emailService');

const {
  provisionTenant,
  suspendTenant,
  reactivateTenant,
} = require('../../services/provisioningService');

describe('Provisioning Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    execute.mockResolvedValue({ changes: 1 });
  });

  describe('provisionTenant', () => {
    const validInput = {
      name: 'Test Clinic',
      slug: 'test-clinic',
      contactName: 'Dr. Test',
      contactEmail: 'admin@test.com',
      plan: 'professional',
    };

    it('should validate required fields', async () => {
      await expect(provisionTenant({ name: '', slug: '', contactName: '', contactEmail: '' }))
        .rejects.toThrow('Missing required fields');
    });

    it('should validate slug format', async () => {
      await expect(provisionTenant({ ...validInput, slug: 'Invalid Slug!' }))
        .rejects.toThrow('Slug must contain only lowercase');
    });

    it('should validate email format', async () => {
      await expect(provisionTenant({ ...validInput, contactEmail: 'not-an-email' }))
        .rejects.toThrow('Invalid email format');
    });

    it('should check slug uniqueness', async () => {
      queryOne.mockResolvedValueOnce({ id: 'existing', name: 'Existing Org' }); // slug exists

      await expect(provisionTenant(validInput))
        .rejects.toThrow('already in use');
    });

    it('should provision tenant successfully', async () => {
      // slug check - not found
      queryOne.mockResolvedValueOnce(null);
      // org query after creation
      queryOne.mockResolvedValueOnce({
        id: 'org_123',
        name: 'Test Clinic',
        slug: 'test-clinic',
        plan: 'professional',
        settings: JSON.stringify({ modules: {} }),
      });

      const result = await provisionTenant(validInput);

      expect(result).toHaveProperty('organization');
      expect(result).toHaveProperty('adminCredentials');
      expect(result).toHaveProperty('provisioningDetails');
      expect(result.adminCredentials.username).toBe('test-clinic');
      expect(result.adminCredentials.password).toBeDefined();
      expect(result.provisioningDetails.emailSent).toBe(false); // email disabled

      // Verify transaction was used
      expect(transaction).toHaveBeenCalled();
    });

    it('should send welcome email when email service is enabled', async () => {
      queryOne.mockResolvedValueOnce(null);
      queryOne.mockResolvedValueOnce({
        id: 'org_123',
        name: 'Test Clinic',
        slug: 'test-clinic',
        plan: 'professional',
        settings: JSON.stringify({}),
      });

      EmailService.isEnabled.mockReturnValue(true);
      EmailService.sendUserCredentials.mockResolvedValue({ success: true });

      const result = await provisionTenant(validInput);

      expect(EmailService.sendUserCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@test.com',
          organizationName: 'Test Clinic',
        })
      );
      expect(result.provisioningDetails.emailSent).toBe(true);
    });

    it('should not fail if email sending fails', async () => {
      queryOne.mockResolvedValueOnce(null);
      queryOne.mockResolvedValueOnce({
        id: 'org_123',
        name: 'Test Clinic',
        slug: 'test-clinic',
        settings: null,
      });

      EmailService.isEnabled.mockReturnValue(true);
      EmailService.sendUserCredentials.mockRejectedValue(new Error('SMTP error'));

      const result = await provisionTenant(validInput);

      expect(result.provisioningDetails.emailSent).toBe(false);
    });
  });

  describe('suspendTenant', () => {
    it('should throw if organization not found', async () => {
      queryOne.mockResolvedValueOnce(null);

      await expect(suspendTenant('org_999'))
        .rejects.toThrow('Organization not found');
    });

    it('should suspend an organization', async () => {
      queryOne.mockResolvedValueOnce({ id: 'org_1', name: 'Test' }); // find org
      queryOne.mockResolvedValueOnce({ id: 'org_1', name: 'Test', isActive: 0 }); // return updated

      const result = await suspendTenant('org_1', 'user_admin');

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organizations'),
        expect.arrayContaining(['org_1'])
      );
      expect(result.isActive).toBe(0);
    });
  });

  describe('reactivateTenant', () => {
    it('should throw if organization not found', async () => {
      queryOne.mockResolvedValueOnce(null);

      await expect(reactivateTenant('org_999'))
        .rejects.toThrow('Organization not found');
    });

    it('should reactivate an organization', async () => {
      queryOne.mockResolvedValueOnce({ id: 'org_1', name: 'Test' });
      queryOne.mockResolvedValueOnce({ id: 'org_1', name: 'Test', isActive: 1 });

      const result = await reactivateTenant('org_1', 'user_admin');

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organizations'),
        expect.arrayContaining(['org_1'])
      );
      expect(result.isActive).toBe(1);
    });
  });
});
