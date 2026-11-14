/**
 * Removes schema for retired Create Your Own and combo features.
 *
 * This is intentionally idempotent: older databases may still contain one or
 * more of these tables, while current databases have already removed them.
 */
const retiredTables = [
  'cyo_audit_logs',
  'cyo_ai_usage',
  'cyo_quotations',
  'cyo_messages',
  'cyo_conversations',
  'cyo_design_images',
  'cyo_design_versions',
  'cyo_designs',
  'combo_items',
  'combos'
];

export async function up(k) {
  for (const table of retiredTables) await k.schema.dropTableIfExists(table);
}

export async function down() {
  throw new Error('Migration 028 drops retired feature tables and cannot be rolled back. Restore a database backup instead.');
}
