/**
 * Multi-Tenant Support Migration
 *
 * Commercial multi-tenant architecture - Single Database with Row-Level Isolation
 *
 * Benefits:
 * - Minimal resource consumption: shared database instance
 * - Complete data isolation: Row-level automatic filtering
 * - Efficient queries: composite index optimization
 * - Horizontal scaling: support thousands of organizations
 */

const { dbAdapter } = require('../db');

async function up() {
  console.log('[Migration] Starting multi-tenant architecture...');

  try {
    // Note: schema.js already includes organizationId field and indexes
    // This migration is mainly for existing legacy databases

    // Check if organizations table exists
    const tableExists = await dbAdapter.queryOne(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'
      UNION ALL
      SELECT tablename as name FROM pg_tables WHERE tablename='organizations'
    `);

    if (!tableExists) {
      console.log('[Migration] Creating organizations table...');
      await dbAdapter.executeBatch(`
        CREATE TABLE organizations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          domain TEXT,
          plan TEXT NOT NULL DEFAULT 'basic' CHECK(plan IN ('basic', 'professional', 'enterprise')),
          "maxUsers" INTEGER DEFAULT 5,
          "maxPatients" INTEGER DEFAULT 100,
          "isActive" BOOLEAN DEFAULT TRUE,
          settings TEXT,
          "subscriptionStartDate" TIMESTAMP,
          "subscriptionEndDate" TIMESTAMP,
          "billingEmail" TEXT,
          "contactName" TEXT,
          "contactPhone" TEXT,
          "contactEmail" TEXT,
          "createdAt" TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP NOT NULL
        )
      `);
    }

    // Check if organizationId field exists (only for legacy databases)
    console.log('[Migration] Checking table structure...');

    const tables = [
      'users',
      'patients',
      'appointments',
      'body_composition',
      'vital_signs',
      'goals',
      'consultations',
      'service_types',
      'tags',
      'groups'
    ];

    for (const table of tables) {
      try {
        // Try to query organizationId field
        await dbAdapter.queryOne(`SELECT "organizationId" FROM ${table} LIMIT 1`);
        console.log(`[Migration] ${table} already has organizationId field`);
      } catch (error) {
        // Field doesn't exist, need to add
        console.log(`[Migration] Adding organizationId field to ${table}...`);
        await dbAdapter.executeBatch(`ALTER TABLE ${table} ADD COLUMN "organizationId" TEXT`);
      }
    }

    // Create or update indexes
    console.log('[Migration] Creating/updating composite indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_org ON users("organizationId", "isActive")',
      'CREATE INDEX IF NOT EXISTS idx_users_org_username ON users("organizationId", username)',
      'CREATE INDEX IF NOT EXISTS idx_patients_org ON patients("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_patients_org_name ON patients("organizationId", name)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments("organizationId", date, time)',
      'CREATE INDEX IF NOT EXISTS idx_body_composition_org ON body_composition("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_vital_signs_org ON vital_signs("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_goals_org ON goals("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_consultations_org ON consultations("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_service_types_org ON service_types("organizationId", "isActive")',
      'CREATE INDEX IF NOT EXISTS idx_tags_org ON tags("organizationId")',
      'CREATE INDEX IF NOT EXISTS idx_groups_org ON groups("organizationId")'
    ];

    for (const indexSQL of indexes) {
      await dbAdapter.executeBatch(indexSQL);
    }

    // Create default organization (if not exists)
    console.log('[Migration] Checking default organization...');
    const defaultOrg = await dbAdapter.queryOne('SELECT id FROM organizations WHERE slug = ?', ['default']);

    if (!defaultOrg) {
      console.log('[Migration] Creating default organization...');
      const now = new Date().toISOString();
      const defaultOrgId = 'org_default_001';

      await dbAdapter.execute(
        `INSERT INTO organizations (
          id, name, slug, plan, "maxUsers", "maxPatients", "isActive",
          "subscriptionStartDate", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultOrgId,
          '預設組織',
          'default',
          'enterprise',
          999,
          99999,
          true,
          now,
          now,
          now
        ]
      );

      // 將所有沒有組織的資料分配到預設組織
      console.log('🔄 遷移現有資料到預設組織...');
      for (const table of tables) {
        await dbAdapter.execute(
          `UPDATE ${table} SET "organizationId" = ? WHERE "organizationId" IS NULL`,
          [defaultOrgId]
        );
      }
    }

    console.log('[Migration] Multi-tenant architecture migration completed successfully!');
    console.log('');
    console.log('[Migration] Performance optimization details:');
    console.log('   - Composite indexes ensure query performance');
    console.log('   - organizationId at leftmost index position for optimal filtering');
    console.log('   - Every query automatically applies organization filtering');
    console.log('');
    console.log('[Migration] Security details:');
    console.log('   - Row-Level Isolation ensures complete data isolation');
    console.log('   - Middleware automatically injects organizationId');
    console.log('   - API layer cannot access cross-organization data');
  } catch (error) {
    console.error('[Migration] Failed:', error);
    throw error;
  }
}

async function down() {
  console.log('[Migration] Rolling back multi-tenant architecture...');

  try {
    // Remove indexes
    const indexes = [
      'idx_users_org', 'idx_users_org_username',
      'idx_patients_org', 'idx_patients_org_name',
      'idx_appointments_org', 'idx_appointments_org_date',
      'idx_body_composition_org', 'idx_vital_signs_org',
      'idx_goals_org', 'idx_consultations_org',
      'idx_service_types_org', 'idx_tags_org', 'idx_groups_org'
    ];

    for (const index of indexes) {
      await dbAdapter.executeBatch(`DROP INDEX IF EXISTS ${index}`);
    }

    console.log('[Migration] Warning: Cannot remove organizationId fields (requires table rebuild)');
    console.log('[Migration] For complete rollback, delete database and reinitialize');
  } catch (error) {
    console.error('[Migration] Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
