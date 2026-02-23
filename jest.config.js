/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server/__tests__'],
  testMatch: ['**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/__tests__/**',
    '!server/database/schema.js',
    '!server/database/migrate.js',
    '!server/database/adapters/**',
    '!server/start.js',
    '!server/scripts/**',
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
};
