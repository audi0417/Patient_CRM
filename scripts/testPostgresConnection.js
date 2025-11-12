#!/usr/bin/env node

/**
 * PostgreSQL Connection Test Script
 *
 * Usage:
 * DATABASE_TYPE=postgres DATABASE_URL=your-connection-string node scripts/testPostgresConnection.js
 */

require('dotenv').config();
const { createDatabaseAdapter } = require('../server/database/adapters');

async function testConnection() {
  console.log('\n[Test] PostgreSQL Connection Test\n');
  console.log('=====================================\n');

  // Check environment variables
  console.log('[Test] Environment variables:');
  console.log(`   DATABASE_TYPE: ${process.env.DATABASE_TYPE || 'Not set'}`);

  if (process.env.DATABASE_URL) {
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`); // Hide password
  } else {
    console.log(`   DATABASE_HOST: ${process.env.DATABASE_HOST || 'Not set'}`);
    console.log(`   DATABASE_PORT: ${process.env.DATABASE_PORT || 'Not set'}`);
    console.log(`   DATABASE_NAME: ${process.env.DATABASE_NAME || 'Not set'}`);
    console.log(`   DATABASE_USER: ${process.env.DATABASE_USER || 'Not set'}`);
    console.log(`   DATABASE_PASSWORD: ${process.env.DATABASE_PASSWORD ? '****' : 'Not set'}`);
  }
  console.log('');

  try {
    // Create database adapter
    console.log('[Test] Establishing connection...');
    const adapter = createDatabaseAdapter();

    // Test simple query
    console.log('[Test] Running test query...');
    const result = await adapter.queryOne('SELECT 1 as test');

    if (result && result.test === 1) {
      console.log('[Test] Connection successful!');
      console.log('');

      // Check database version
      console.log('[Test] Database info:');
      try {
        const version = await adapter.queryOne('SELECT version()');
        console.log(`   Version: ${version.version}`);
      } catch (error) {
        console.log('   Unable to get version info');
      }

      // List existing tables
      console.log('');
      console.log('[Test] Existing tables:');
      try {
        const tables = await adapter.query(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename
        `);

        if (tables.length > 0) {
          tables.forEach(table => {
            console.log(`   - ${table.tablename}`);
          });
        } else {
          console.log('   (No tables, database is empty)');
        }
      } catch (error) {
        console.log('   Unable to list tables:', error.message);
      }

      console.log('');
      console.log('=====================================');
      console.log('[Test] All tests passed!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run database initialization: npm run server');
      console.log('2. Or run migration: node server/database/migrate.js up');
      console.log('');

    } else {
      throw new Error('Unexpected query result');
    }

    // Close connection
    await adapter.close();
    process.exit(0);

  } catch (error) {
    console.error('\n[Test] Connection failed!');
    console.error('\nError details:');
    console.error(`   ${error.message}`);
    console.error('');

    console.error('[Test] Troubleshooting:');
    console.error('1. Check if DATABASE_TYPE is set to "postgres"');
    console.error('2. Check if DATABASE_URL or connection parameters are correct');
    console.error('3. Confirm that PostgreSQL service is running');
    console.error('4. Check firewall settings allow connections');
    console.error('5. Confirm database user has sufficient privileges');
    console.error('');

    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }

    console.error('');
    process.exit(1);
  }
}

// Run test
testConnection();
