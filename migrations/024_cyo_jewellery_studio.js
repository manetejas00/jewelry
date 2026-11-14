export const now = () => new Date().toISOString();

export async function up(k) {
  for (const table of [
    'cyo_audit_logs',
    'cyo_ai_usage',
    'cyo_quotations',
    'cyo_messages',
    'cyo_conversations',
    'cyo_design_images',
    'cyo_design_versions',
    'cyo_designs'
  ]) {
    await k.schema.dropTableIfExists(table);
  }
}

export async function down(k) {
  for (const table of [
    'cyo_audit_logs',
    'cyo_ai_usage',
    'cyo_quotations',
    'cyo_messages',
    'cyo_conversations',
    'cyo_design_images',
    'cyo_design_versions',
    'cyo_designs'
  ]) {
    await k.schema.dropTableIfExists(table);
  }
}
