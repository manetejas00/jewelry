export async function up(k) {
  if (!await k.schema.hasTable('categories')) return;
  if (!await k.schema.hasColumn('categories', 'parent_id')) await k.schema.alterTable('categories', t => t.integer('parent_id').unsigned().nullable().references('id').inTable('categories').onDelete('RESTRICT').index());
  if (!await k.schema.hasColumn('categories', 'route_path')) await k.schema.alterTable('categories', t => t.string('route_path', 255).nullable());
  await k('categories').where({slug:'kurtas'}).whereNull('route_path').update({route_path:'/kurtas'});
  await k('categories').where({slug:'coins'}).whereNull('route_path').update({route_path:'/coins'});
  const collectionPath = k.client.config.client === 'mysql2'
    ? k.raw("CONCAT('/collections/', slug)")
    : k.raw("'/collections/' || slug");
  await k('categories').whereNull('route_path').update({route_path:collectionPath});
}
export async function down(k) {
  if (!await k.schema.hasTable('categories')) return;
  if (await k.schema.hasColumn('categories', 'parent_id')) await k.schema.alterTable('categories', t => t.dropColumn('parent_id'));
  if (await k.schema.hasColumn('categories', 'route_path')) await k.schema.alterTable('categories', t => t.dropColumn('route_path'));
}
