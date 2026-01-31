/**
 * Cross-Database SQL Helpers
 *
 * Provides database-agnostic SQL fragments that work with both SQLite and PostgreSQL.
 * Automatically detects the database type from environment variables.
 */

// Cache the database type for performance
let _dbType = null;

/**
 * Get the current database type
 * @returns {'sqlite'|'postgres'} Database type
 */
function getDbType() {
  if (_dbType) {
    return _dbType;
  }

  const hasPostgresHint =
    process.env.POSTGRES_CONNECTION_STRING ||
    process.env.POSTGRES_URI ||
    process.env.DB_POSTGRESDB_HOST ||
    process.env.POSTGRES_HOST ||
    process.env.DATABASE_URL?.startsWith('postgres');

  const dbTypeRaw = (process.env.DB_TYPE || process.env.DATABASE_TYPE || '').toLowerCase();
  const dbType = dbTypeRaw || (hasPostgresHint ? 'postgres' : 'sqlite');

  _dbType = (dbType === 'postgres' || dbType === 'postgresql') ? 'postgres' : 'sqlite';
  return _dbType;
}

/**
 * SQL fragment for boolean TRUE value
 * @returns {string} 'TRUE' for PostgreSQL, '1' for SQLite
 */
function boolTrue() {
  return getDbType() === 'postgres' ? 'TRUE' : '1';
}

/**
 * SQL fragment for boolean FALSE value
 * @returns {string} 'FALSE' for PostgreSQL, '0' for SQLite
 */
function boolFalse() {
  return getDbType() === 'postgres' ? 'FALSE' : '0';
}

/**
 * SQL fragment for current timestamp
 * @returns {string} 'NOW()' for PostgreSQL, "datetime('now')" for SQLite
 */
function now() {
  return getDbType() === 'postgres' ? 'NOW()' : "datetime('now')";
}

/**
 * SQL fragment for current date
 * @returns {string} 'CURRENT_DATE' for PostgreSQL, "date('now')" for SQLite
 */
function currentDate() {
  return getDbType() === 'postgres' ? 'CURRENT_DATE' : "date('now')";
}

/**
 * SQL fragment for truncating date to month
 * @param {string} column - Column name (will be quoted for PostgreSQL if needed)
 * @returns {string} DATE_TRUNC or date() fragment
 */
function dateTruncMonth(column) {
  const quotedCol = quoteIdentifier(column);
  if (getDbType() === 'postgres') {
    return `DATE_TRUNC('month', ${quotedCol})`;
  } else {
    return `date(${quotedCol}, 'start of month')`;
  }
}

/**
 * SQL fragment for truncating current date to month
 * @returns {string} DATE_TRUNC or date() fragment for 'now'
 */
function currentMonthStart() {
  if (getDbType() === 'postgres') {
    return "DATE_TRUNC('month', CURRENT_DATE)";
  } else {
    return "date('now', 'start of month')";
  }
}

/**
 * SQL fragment for formatting date as YYYY-MM
 * @param {string} column - Column name (will be quoted for PostgreSQL if needed)
 * @returns {string} TO_CHAR or strftime fragment
 */
function formatMonth(column) {
  const quotedCol = quoteIdentifier(column);
  if (getDbType() === 'postgres') {
    return `TO_CHAR(${quotedCol}, 'YYYY-MM')`;
  } else {
    return `strftime('%Y-%m', ${quotedCol})`;
  }
}

/**
 * SQL fragment for date equality comparison
 * @param {string} column - Column name
 * @param {string} dateExpr - Date expression (e.g., 'CURRENT_DATE' or a parameter placeholder)
 * @returns {string} Date comparison fragment
 */
function dateEquals(column, dateExpr) {
  const quotedCol = quoteIdentifier(column);
  if (getDbType() === 'postgres') {
    return `DATE(${quotedCol}) = ${dateExpr}`;
  } else {
    return `date(${quotedCol}) = ${dateExpr}`;
  }
}

/**
 * Quote an identifier (column name, table name) if needed for PostgreSQL
 * Handles camelCase column names that require quoting in PostgreSQL
 * @param {string} identifier - Column or table name
 * @returns {string} Quoted identifier or raw identifier
 */
function quoteIdentifier(identifier) {
  if (getDbType() === 'postgres') {
    // Check if identifier needs quoting (contains uppercase, reserved words, etc.)
    const needsQuoting = /[A-Z]/.test(identifier) || identifier.includes('.');

    if (needsQuoting && !identifier.includes('"')) {
      // Handle table.column notation
      if (identifier.includes('.')) {
        const parts = identifier.split('.');
        return parts.map(p => `"${p}"`).join('.');
      }
      return `"${identifier}"`;
    }
  }
  return identifier;
}

/**
 * SQL fragment for querying database metadata
 * Returns query to get all table names
 * @returns {string} Query to get table names
 */
function getTablesQuery() {
  if (getDbType() === 'postgres') {
    return "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name";
  } else {
    return "SELECT name as table_name FROM sqlite_master WHERE type='table' ORDER BY name";
  }
}

/**
 * SQL fragment for checking if a table exists
 * @param {string} tableName - Table name to check
 * @returns {string} Query that returns count > 0 if table exists
 */
function tableExistsQuery(tableName) {
  if (getDbType() === 'postgres') {
    return `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}'`;
  } else {
    return `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name = '${tableName}'`;
  }
}

/**
 * Convert a JavaScript boolean to SQL boolean value
 * @param {boolean} value - Boolean value
 * @returns {string|number} SQL boolean representation
 */
function toBool(value) {
  if (getDbType() === 'postgres') {
    return value ? 'TRUE' : 'FALSE';
  } else {
    return value ? 1 : 0;
  }
}

/**
 * Build a WHERE clause for boolean column comparison
 * @param {string} column - Column name
 * @param {boolean} value - Boolean value to compare
 * @returns {string} WHERE clause fragment
 */
function whereBool(column, value) {
  const quotedCol = quoteIdentifier(column);
  if (getDbType() === 'postgres') {
    return `${quotedCol} = ${value ? 'TRUE' : 'FALSE'}`;
  } else {
    return `${quotedCol} = ${value ? 1 : 0}`;
  }
}

/**
 * SQL fragment for ILIKE (case-insensitive LIKE) that works on both databases
 * @param {string} column - Column name
 * @param {string} pattern - LIKE pattern (use ? for parameter placeholder)
 * @returns {string} ILIKE or LIKE LOWER() fragment
 */
function ilike(column, pattern) {
  const quotedCol = quoteIdentifier(column);
  if (getDbType() === 'postgres') {
    return `${quotedCol} ILIKE ${pattern}`;
  } else {
    // SQLite LIKE is case-insensitive by default for ASCII characters
    return `${quotedCol} LIKE ${pattern}`;
  }
}

/**
 * SQL fragment for date subtraction
 * @param {string} baseDate - Base date expression (e.g., CURRENT_DATE or a column name)
 * @param {number} days - Number of days to subtract
 * @returns {string} Date subtraction fragment
 */
function dateSubtractDays(baseDate, days) {
  if (getDbType() === 'postgres') {
    return `${baseDate} - INTERVAL '${days} days'`;
  } else {
    return `date(${baseDate}, '-${days} days')`;
  }
}

/**
 * SQL fragment for current date minus N days
 * @param {number} days - Number of days to subtract from current date
 * @returns {string} Date subtraction fragment
 */
function daysAgo(days) {
  if (getDbType() === 'postgres') {
    return `CURRENT_DATE - INTERVAL '${days} days'`;
  } else {
    return `date('now', '-${days} days')`;
  }
}

/**
 * SQL fragment for current date minus N weeks
 * @param {number} weeks - Number of weeks to subtract
 * @returns {string} Week subtraction fragment
 */
function weeksAgo(weeks) {
  const days = weeks * 7;
  return daysAgo(days);
}

module.exports = {
  getDbType,
  boolTrue,
  boolFalse,
  now,
  currentDate,
  dateTruncMonth,
  currentMonthStart,
  formatMonth,
  dateEquals,
  quoteIdentifier,
  getTablesQuery,
  tableExistsQuery,
  toBool,
  whereBool,
  ilike,
  dateSubtractDays,
  daysAgo,
  weeksAgo
};
