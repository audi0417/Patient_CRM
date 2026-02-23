/**
 * Test Setup & Helpers
 *
 * 提供測試用的共用工具函式和 mock 工廠
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// 測試用常數
const TEST_JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
const TEST_ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';
const TEST_ORG_ID = 'org_test_001';
const TEST_USER_ID = 'user_test_001';

/**
 * 設定測試環境變數
 */
function setupTestEnv() {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
}

/**
 * 產生測試用 JWT Token
 */
function generateTestToken(payload = {}, options = {}) {
  const defaultPayload = {
    id: TEST_USER_ID,
    username: 'testuser',
    role: 'admin',
    organizationId: TEST_ORG_ID,
    jti: crypto.randomBytes(16).toString('hex'),
    ...payload,
  };

  return jwt.sign(defaultPayload, TEST_JWT_SECRET, {
    expiresIn: '1h',
    ...options,
  });
}

/**
 * 建立 mock Express request 物件
 */
function mockRequest(overrides = {}) {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    user: null,
    tenantContext: null,
    tenantQuery: null,
    ip: '127.0.0.1',
    get: jest.fn((header) => {
      const h = header.toLowerCase();
      return overrides.headers?.[h] || null;
    }),
    ...overrides,
  };
}

/**
 * 建立 mock Express response 物件
 */
function mockResponse() {
  const res = {
    statusCode: 200,
    _json: null,
    _headers: {},
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res._json = data;
    return res;
  });
  res.send = jest.fn((data) => {
    res._data = data;
    return res;
  });
  res.setHeader = jest.fn((key, value) => {
    res._headers[key] = value;
    return res;
  });
  return res;
}

/**
 * 建立 mock next 函式
 */
function mockNext() {
  return jest.fn();
}

/**
 * 建立測試用組織資料
 */
function createTestOrganization(overrides = {}) {
  return {
    id: TEST_ORG_ID,
    name: 'Test Clinic',
    slug: 'test-clinic',
    plan: 'professional',
    isActive: 1,
    maxUsers: 10,
    maxPatients: 100,
    subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * 建立測試用使用者資料
 */
function createTestUser(overrides = {}) {
  return {
    id: TEST_USER_ID,
    username: 'testuser',
    password: '$2a$12$LJ3a4/v6W1qJ9.Kz3p1ZQOv6qQ2F1qQ2F1qQ2F1qQ2F1qQ2F1qQ2', // bcrypt hash
    role: 'admin',
    organizationId: TEST_ORG_ID,
    isActive: 1,
    isFirstLogin: 0,
    ...overrides,
  };
}

/**
 * 建立測試用患者資料
 */
function createTestPatient(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: `patient_${Date.now()}`,
    name: '測試患者',
    gender: 'male',
    birthDate: '1990-01-15',
    phone: '0912345678',
    email: 'test@example.com',
    address: '台北市信義區',
    emergencyContact: '緊急聯絡人',
    emergencyPhone: '0987654321',
    bloodType: 'A',
    medicalHistory: '無',
    allergies: '無',
    notes: '測試備註',
    tags: '[]',
    groups: '[]',
    healthProfile: 'null',
    organizationId: TEST_ORG_ID,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

module.exports = {
  TEST_JWT_SECRET,
  TEST_ENCRYPTION_KEY,
  TEST_ORG_ID,
  TEST_USER_ID,
  setupTestEnv,
  generateTestToken,
  mockRequest,
  mockResponse,
  mockNext,
  createTestOrganization,
  createTestUser,
  createTestPatient,
};
