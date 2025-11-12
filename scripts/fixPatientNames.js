/**
 * Fix Patient Names Script
 *
 * Removes organization names from patient name fields
 * Converts: "王小明 (台北仁愛醫院)" -> "王小明"
 */

const { db } = require('../server/database/db');
const { queryAll, execute } = require('../server/database/helpers');

async function fixPatientNames() {
  console.log('[Fix] Starting patient names cleanup...');

  try {
    // Get all patients with organization names in their names
    const patients = await queryAll(`
      SELECT id, name
      FROM patients
      WHERE name LIKE '% (%'
    `);

    console.log(`[Fix] Found ${patients.length} patients with organization names in their name field`);

    let fixed = 0;
    for (const patient of patients) {
      // Extract name without organization part
      // Convert "王小明 (台北仁愛醫院)" -> "王小明"
      const cleanName = patient.name.replace(/\s*\([^)]*\)\s*$/, '').trim();

      if (cleanName !== patient.name) {
        await execute(
          'UPDATE patients SET name = ? WHERE id = ?',
          [cleanName, patient.id]
        );
        console.log(`[Fix] ${patient.name} -> ${cleanName}`);
        fixed++;
      }
    }

    console.log(`[Fix] Successfully cleaned ${fixed} patient names`);

    // Verify the fix
    const remaining = await queryAll(`
      SELECT COUNT(*) as count
      FROM patients
      WHERE name LIKE '% (%'
    `);

    console.log(`[Fix] Remaining patients with organization in name: ${remaining[0].count}`);

  } catch (error) {
    console.error('[Fix] Error fixing patient names:', error);
    process.exit(1);
  }
}

// Run the fix
fixPatientNames()
  .then(() => {
    console.log('[Fix] Patient names cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Fix] Fatal error:', error);
    process.exit(1);
  });
