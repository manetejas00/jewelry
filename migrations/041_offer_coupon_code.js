export async function up(k) {
  if (!(await k.schema.hasTable('offers'))) return;
  if (await k.schema.hasColumn('offers', 'code_required')) return;
  await k.schema.alterTable('offers', t => {
    t.boolean('code_required').notNullable().defaultTo(false);
  });
}

export async function down(k) {
  if (!(await k.schema.hasTable('offers'))) return;
  if (!(await k.schema.hasColumn('offers', 'code_required'))) return;
  await k.schema.alterTable('offers', t => { t.dropColumn('code_required'); });
}
