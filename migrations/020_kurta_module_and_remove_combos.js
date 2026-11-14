export async function up(k) {
  // 1. Add is_kurta flag to products table if missing
  const hasIsKurta = await k.schema.hasColumn('products', 'is_kurta');
  if (!hasIsKurta) {
    await k.schema.table('products', t => {
      t.boolean('is_kurta').defaultTo(false).index();
    });
  }

  // Set is_kurta = true for all existing chicken curry kurta products
  await k('products')
    .where('category', 'like', '%Kurta%')
    .orWhere('product_code', 'like', '%kurta%')
    .update({ is_kurta: true });

  // 2. Remove all combo-related tables (Phase 10)
  await k.schema.dropTableIfExists('combo_items');
  await k.schema.dropTableIfExists('combos');

  // 3. Clean up combo entries from categories table
  if (await k.schema.hasTable('categories')) {
    await k('categories')
      .whereIn('slug', ['kurta-jewellery-combos', 'premium-jewellery-kurta-sets'])
      .del();
  }
}

export async function down(k) {
  const hasIsKurta = await k.schema.hasColumn('products', 'is_kurta');
  if (hasIsKurta) {
    await k.schema.table('products', t => {
      t.dropColumn('is_kurta');
    });
  }
}
