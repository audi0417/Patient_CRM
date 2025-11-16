/**
 * Migration: Remove default service types
 *
 * This migration removes all default service types that were created during
 * database initialization. Service types should now be organization-specific
 * and created by users themselves.
 */

const { dbAdapter } = require('../db');

async function up() {
  console.log('[Migration 008] Removing default service types...');

  try {
    // Remove all service types (users will create their own)
    const result = await dbAdapter.execute('DELETE FROM service_types');
    console.log(`[Migration 008] Removed ${result.changes || 0} default service types`);

    console.log('[Migration 008] Complete - Service types table cleared');
  } catch (error) {
    console.error('[Migration 008] Error:', error);
    throw error;
  }
}

async function down() {
  console.log('[Migration 008] Rollback - Creating default service types...');

  try {
    const now = new Date().toISOString();
    const orgIdForTypes = 'org_default_001';
    const defaultServiceTypes = [
      { name: '初診', color: '#6366f1', description: '首次就診評估', order: 0 },
      { name: '營養諮詢', color: '#22c55e', description: '營養評估與飲食建議', order: 1 },
      { name: '運動指導', color: '#f97316', description: '運動計畫與指導', order: 2 },
      { name: '複診', color: '#8b5cf6', description: '定期追蹤回診', order: 3 },
      { name: '健康評估', color: '#06b6d4', description: '綜合健康狀況評估', order: 4 }
    ];

    for (const type of defaultServiceTypes) {
      await dbAdapter.execute(
        `INSERT INTO service_types (id, name, description, color, "isActive", "displayOrder", "organizationId", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `service_type_${Date.now()}_${Math.random().toString(36).substring(2,11)}`,
          type.name,
          type.description,
          type.color,
          true,
          type.order,
          orgIdForTypes,
          now,
          now
        ]
      );
    }

    console.log('[Migration 008] Rollback complete - Default service types restored');
  } catch (error) {
    console.error('[Migration 008] Rollback error:', error);
    throw error;
  }
}

module.exports = { up, down };
