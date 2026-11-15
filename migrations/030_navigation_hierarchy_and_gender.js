/**
 * Adds navigation metadata without changing or deleting catalogue records.
 * The nullable fields make this safe for existing installations: products that
 * have not been classified remain visible in their module's "All" listing.
 */
export async function up(k) {
  const addColumn = async (table, column, add) => {
    if (await k.schema.hasTable(table) && !(await k.schema.hasColumn(table, column))) {
      await k.schema.table(table, add);
    }
  };

  for (const table of ['categories', 'jewelry_categories', 'kurta_categories', 'coin_categories']) {
    await addColumn(table, 'parent_id', t => t.integer('parent_id').unsigned().nullable().index());
    await addColumn(table, 'show_in_nav', t => t.boolean('show_in_nav').notNullable().defaultTo(true).index());
    await addColumn(table, 'gender', t => t.string('gender', 20).nullable().index());
  }
  await addColumn('jewelries', 'gender', t => t.string('gender', 20).notNullable().defaultTo('Not Specified').index());
  // Kurta already has gender; the index keeps gender/category browsing fast.
  if (await k.schema.hasTable('kurtas')) {
    await k.schema.table('kurtas', t => t.index(['gender', 'category'], 'kurtas_gender_category_idx'));
  }
}

export async function down(k) {
  for (const table of ['categories', 'jewelry_categories', 'kurta_categories', 'coin_categories']) {
    if (await k.schema.hasTable(table)) await k.schema.table(table, t => {
      t.dropColumn('parent_id'); t.dropColumn('show_in_nav'); t.dropColumn('gender');
    });
  }
  if (await k.schema.hasTable('jewelries')) await k.schema.table('jewelries', t => t.dropColumn('gender'));
  if (await k.schema.hasTable('kurtas')) await k.schema.table('kurtas', t => t.dropIndex(['gender', 'category'], 'kurtas_gender_category_idx'));
}
