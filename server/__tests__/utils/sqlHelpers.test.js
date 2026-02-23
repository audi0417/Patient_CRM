/**
 * SQL Helpers Tests
 *
 * 測試跨資料庫 SQL 工具函式
 * - SQLite 模式
 * - PostgreSQL 模式
 * - 識別符號引用
 * - 布林值處理
 */

process.env.JWT_SECRET = 'test-jwt-secret';

// 重設 cached db type
beforeEach(() => {
  // 清除模組快取，確保每次測試都能重新載入
  jest.resetModules();
  delete process.env.DB_TYPE;
  delete process.env.DATABASE_TYPE;
  delete process.env.POSTGRES_CONNECTION_STRING;
  delete process.env.POSTGRES_URI;
  delete process.env.DB_POSTGRESDB_HOST;
  delete process.env.POSTGRES_HOST;
  delete process.env.DATABASE_URL;
});

describe('SQL Helpers - SQLite mode', () => {
  let sqlHelpers;

  beforeEach(() => {
    process.env.DB_TYPE = 'sqlite';
    sqlHelpers = require('../../database/sqlHelpers');
  });

  it('getDbType should return sqlite', () => {
    expect(sqlHelpers.getDbType()).toBe('sqlite');
  });

  it('boolTrue should return 1', () => {
    expect(sqlHelpers.boolTrue()).toBe('1');
  });

  it('boolFalse should return 0', () => {
    expect(sqlHelpers.boolFalse()).toBe('0');
  });

  it('toBool should convert boolean to integer', () => {
    expect(sqlHelpers.toBool(true)).toBe(1);
    expect(sqlHelpers.toBool(false)).toBe(0);
  });

  it('now should return SQLite datetime function', () => {
    expect(sqlHelpers.now()).toBe("datetime('now')");
  });

  it('currentDate should return SQLite date function', () => {
    expect(sqlHelpers.currentDate()).toBe("date('now')");
  });

  it('quoteIdentifier should not quote for SQLite', () => {
    expect(sqlHelpers.quoteIdentifier('organizationId')).toBe('organizationId');
    expect(sqlHelpers.quoteIdentifier('name')).toBe('name');
  });

  it('whereBool should produce SQLite-compatible clause', () => {
    expect(sqlHelpers.whereBool('isActive', true)).toBe('isActive = 1');
    expect(sqlHelpers.whereBool('isActive', false)).toBe('isActive = 0');
  });

  it('daysAgo should produce SQLite date subtraction', () => {
    expect(sqlHelpers.daysAgo(7)).toBe("date('now', '-7 days')");
  });

  it('weeksAgo should use daysAgo with multiplication', () => {
    expect(sqlHelpers.weeksAgo(2)).toBe("date('now', '-14 days')");
  });

  it('getTablesQuery should return SQLite metadata query', () => {
    const query = sqlHelpers.getTablesQuery();
    expect(query).toContain('sqlite_master');
  });

  it('currentMonthStart should return SQLite month start', () => {
    const sql = sqlHelpers.currentMonthStart();
    expect(sql).toContain("start of month");
  });
});

describe('SQL Helpers - PostgreSQL mode', () => {
  let sqlHelpers;

  beforeEach(() => {
    process.env.DB_TYPE = 'postgres';
    sqlHelpers = require('../../database/sqlHelpers');
  });

  it('getDbType should return postgres', () => {
    expect(sqlHelpers.getDbType()).toBe('postgres');
  });

  it('boolTrue should return TRUE', () => {
    expect(sqlHelpers.boolTrue()).toBe('TRUE');
  });

  it('boolFalse should return FALSE', () => {
    expect(sqlHelpers.boolFalse()).toBe('FALSE');
  });

  it('toBool should convert boolean to SQL boolean', () => {
    expect(sqlHelpers.toBool(true)).toBe('TRUE');
    expect(sqlHelpers.toBool(false)).toBe('FALSE');
  });

  it('now should return PostgreSQL NOW()', () => {
    expect(sqlHelpers.now()).toBe('NOW()');
  });

  it('quoteIdentifier should quote camelCase names', () => {
    expect(sqlHelpers.quoteIdentifier('organizationId')).toBe('"organizationId"');
    expect(sqlHelpers.quoteIdentifier('isActive')).toBe('"isActive"');
  });

  it('quoteIdentifier should not double-quote', () => {
    expect(sqlHelpers.quoteIdentifier('"alreadyQuoted"')).toBe('"alreadyQuoted"');
  });

  it('quoteIdentifier should not quote all-lowercase names', () => {
    expect(sqlHelpers.quoteIdentifier('name')).toBe('name');
    expect(sqlHelpers.quoteIdentifier('id')).toBe('id');
  });

  it('whereBool should produce PostgreSQL-compatible clause', () => {
    const result = sqlHelpers.whereBool('isActive', true);
    expect(result).toContain('TRUE');
    expect(result).toContain('"isActive"');
  });

  it('daysAgo should produce PostgreSQL interval', () => {
    expect(sqlHelpers.daysAgo(7)).toContain("INTERVAL '7 days'");
  });

  it('getTablesQuery should return PostgreSQL metadata query', () => {
    const query = sqlHelpers.getTablesQuery();
    expect(query).toContain('information_schema');
  });

  it('currentMonthStart should return PostgreSQL DATE_TRUNC', () => {
    const sql = sqlHelpers.currentMonthStart();
    expect(sql).toContain('DATE_TRUNC');
  });

  it('ilike should use ILIKE for PostgreSQL', () => {
    const result = sqlHelpers.ilike('name', '?');
    expect(result).toContain('ILIKE');
  });
});
