/**
 * License Check Middleware Tests
 *
 * Tests for license verification middleware:
 * - requireFeature blocks unlicensed features in on-premise mode
 * - requireFeature passes through in SaaS mode
 * - checkUserQuota / checkPatientQuota enforcement
 * - getLicenseInfo returns correct data
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';

const { mockRequest, mockResponse, mockNext } = require('../setup');

// Mock deployment config
jest.mock('../../config/deployment', () => ({
  isOnPremise: jest.fn(),
  getDeploymentMode: jest.fn(() => 'saas'),
}));

// Mock license service
jest.mock('../../services/licenseService', () => ({
  hasFeature: jest.fn(),
  periodicCheck: jest.fn(),
  isExpiringSoon: jest.fn(() => false),
  getDaysUntilExpiry: jest.fn(() => 365),
  getLicenseInfo: jest.fn(),
  checkUserLimit: jest.fn(),
  checkPatientLimit: jest.fn(),
}));

// Mock database helpers
jest.mock('../../database/helpers', () => ({
  queryOne: jest.fn(),
}));

// Mock sqlHelpers
jest.mock('../../database/sqlHelpers', () => ({
  whereBool: jest.fn((col, val) => `${col} = ${val ? 1 : 0}`),
}));

const { isOnPremise } = require('../../config/deployment');
const licenseService = require('../../services/licenseService');
const { queryOne } = require('../../database/helpers');

const {
  requireFeature,
  checkUserQuota,
  checkPatientQuota,
  getLicenseInfo,
} = require('../../middleware/licenseCheck');

describe('License Check Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireFeature', () => {
    it('should pass through in SaaS mode', () => {
      isOnPremise.mockReturnValue(false);

      const middleware = requireFeature('audit_logs');
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow licensed feature in on-premise mode', () => {
      isOnPremise.mockReturnValue(true);
      licenseService.hasFeature.mockReturnValue(true);

      const middleware = requireFeature('audit_logs');
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware(req, res, next);

      expect(licenseService.hasFeature).toHaveBeenCalledWith('audit_logs');
      expect(next).toHaveBeenCalled();
    });

    it('should block unlicensed feature in on-premise mode', () => {
      isOnPremise.mockReturnValue(true);
      licenseService.hasFeature.mockReturnValue(false);
      licenseService.getLicenseInfo.mockReturnValue({ features: ['basic'] });

      const middleware = requireFeature('audit_logs');
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FEATURE_NOT_LICENSED',
          feature: 'audit_logs',
        })
      );
    });
  });

  describe('checkUserQuota', () => {
    it('should pass through in SaaS mode', () => {
      isOnPremise.mockReturnValue(false);

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      checkUserQuota(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow when under user quota', async () => {
      isOnPremise.mockReturnValue(true);
      queryOne.mockResolvedValue({ count: 5 });
      licenseService.checkUserLimit.mockResolvedValue(true);

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      checkUserQuota(req, res, next);

      // Wait for promise chain
      await new Promise(resolve => setImmediate(resolve));

      expect(next).toHaveBeenCalled();
    });

    it('should block when user quota exceeded', async () => {
      isOnPremise.mockReturnValue(true);
      queryOne.mockResolvedValue({ count: 50 });
      licenseService.checkUserLimit.mockRejectedValue(new Error('User limit exceeded'));
      licenseService.getLicenseInfo.mockReturnValue({ max_users: 50 });

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      checkUserQuota(req, res, next);

      await new Promise(resolve => setImmediate(resolve));

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'USER_QUOTA_EXCEEDED',
        })
      );
    });
  });

  describe('checkPatientQuota', () => {
    it('should pass through in SaaS mode', () => {
      isOnPremise.mockReturnValue(false);

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      checkPatientQuota(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block when patient quota exceeded', async () => {
      isOnPremise.mockReturnValue(true);
      queryOne.mockResolvedValue({ count: 10000 });
      licenseService.checkPatientLimit.mockRejectedValue(new Error('Patient limit exceeded'));
      licenseService.getLicenseInfo.mockReturnValue({ max_patients: 10000 });

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      checkPatientQuota(req, res, next);

      await new Promise(resolve => setImmediate(resolve));

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PATIENT_QUOTA_EXCEEDED',
        })
      );
    });
  });

  describe('getLicenseInfo', () => {
    it('should return SaaS message when not on-premise', () => {
      isOnPremise.mockReturnValue(false);

      const req = mockRequest();
      const res = mockResponse();

      getLicenseInfo(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'saas',
        })
      );
    });

    it('should return license info in on-premise mode', () => {
      isOnPremise.mockReturnValue(true);
      licenseService.getLicenseInfo.mockReturnValue({
        customer_name: 'Test Hospital',
        license_type: 'enterprise',
        features: ['audit_logs'],
        max_users: 100,
        max_patients: 50000,
      });
      licenseService.getDaysUntilExpiry.mockReturnValue(300);
      licenseService.isExpiringSoon.mockReturnValue(false);

      const req = mockRequest();
      const res = mockResponse();

      getLicenseInfo(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: 'Test Hospital',
          status: expect.objectContaining({
            valid: true,
            days_until_expiry: 300,
          }),
        })
      );
    });
  });
});
