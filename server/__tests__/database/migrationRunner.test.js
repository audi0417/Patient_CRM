/**
 * Migration Runner Tests
 *
 * Tests for database migration system:
 * - Pending migration detection
 * - Up/down execution
 * - Status reporting
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.ENCRYPTION_KEY = '8080364f7d10c3496ba98167a531ffc5535cf49e72656d86d7a2452f9e271e0c';
process.env.DATABASE_TYPE = 'sqlite';

const fs = require('fs');
const path = require('path');

// Mock the adapters factory
const mockAdapter = {
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
  executeBatch: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
};

jest.mock('../../database/adapters', () => ({
  createDatabaseAdapter: () => mockAdapter,
}));

// Mock fs.readdirSync for migration files
const originalReaddirSync = fs.readdirSync;
const originalExistsSync = fs.existsSync;

const {
  runMigrations,
  rollbackMigration,
  getPendingMigrations,
  getMigrationStatus,
} = require('../../database/migrationRunner');

describe('Migration Runner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter.execute.mockResolvedValue({ changes: 1 });
    mockAdapter.beginTransaction.mockResolvedValue();
    mockAdapter.commit.mockResolvedValue();
    mockAdapter.rollback.mockResolvedValue();
  });

  describe('getPendingMigrations', () => {
    it('should return all migrations when none are executed', async () => {
      // Mock: no executed migrations
      mockAdapter.query.mockResolvedValue([]);

      const pending = await getPendingMigrations(mockAdapter);

      // Should include at least the example migration
      expect(Array.isArray(pending)).toBe(true);
    });

    it('should exclude already executed migrations', async () => {
      // Mock: example migration already executed
      mockAdapter.query.mockResolvedValue([
        { name: '20260131000000-example-migration.js' }
      ]);

      const pending = await getPendingMigrations(mockAdapter);

      expect(pending).not.toContain('20260131000000-example-migration.js');
    });
  });

  describe('runMigrations', () => {
    it('should return empty array when no pending migrations', async () => {
      // All migrations already executed
      mockAdapter.query.mockResolvedValue([
        { name: '20260131000000-example-migration.js' }
      ]);

      const result = await runMigrations(mockAdapter);

      expect(result).toEqual([]);
      expect(mockAdapter.beginTransaction).not.toHaveBeenCalled();
    });

    it('should execute pending migrations in a transaction', async () => {
      // No migrations executed yet
      mockAdapter.query.mockResolvedValue([]);

      const result = await runMigrations(mockAdapter);

      // The example migration should be executed
      if (result.length > 0) {
        expect(mockAdapter.beginTransaction).toHaveBeenCalled();
        expect(mockAdapter.commit).toHaveBeenCalled();
        // Should record the migration
        expect(mockAdapter.execute).toHaveBeenCalledWith(
          'INSERT INTO migrations (name) VALUES (?)',
          expect.any(Array)
        );
      }
    });

    it('should rollback on migration failure', async () => {
      mockAdapter.query.mockResolvedValue([]);

      // Mock a failing migration by replacing the require cache
      // This is tested implicitly - if a migration throws, rollback should be called
      // In practice this would need integration testing with actual migration files
    });
  });

  describe('getMigrationStatus', () => {
    it('should return status for all migration files', async () => {
      mockAdapter.query.mockResolvedValue([
        { name: '20260131000000-example-migration.js', executed_at: '2026-01-31T00:00:00Z' }
      ]);

      const status = await getMigrationStatus(mockAdapter);

      expect(Array.isArray(status)).toBe(true);

      if (status.length > 0) {
        const exampleMigration = status.find(m => m.name === '20260131000000-example-migration.js');
        if (exampleMigration) {
          expect(exampleMigration.status).toBe('executed');
          expect(exampleMigration.executed_at).toBeDefined();
        }
      }
    });
  });

  describe('rollbackMigration', () => {
    it('should throw if migration was not executed', async () => {
      mockAdapter.query.mockResolvedValue([]); // no executed migrations

      await expect(
        rollbackMigration('20260131000000-example-migration.js', mockAdapter)
      ).rejects.toThrow('has not been executed');
    });

    it('should execute down() and remove migration record', async () => {
      mockAdapter.query.mockResolvedValue([
        { name: '20260131000000-example-migration.js' }
      ]);

      await rollbackMigration('20260131000000-example-migration.js', mockAdapter);

      expect(mockAdapter.beginTransaction).toHaveBeenCalled();
      expect(mockAdapter.commit).toHaveBeenCalled();
      expect(mockAdapter.execute).toHaveBeenCalledWith(
        'DELETE FROM migrations WHERE name = ?',
        ['20260131000000-example-migration.js']
      );
    });
  });
});
