/**
 * Irreversibly removes all legacy and independent Kurta catalogue data.
 *
 * Preserved: customers, orders and order snapshots, rates, offers, and shared
 * settings. Production MySQL requires an explicit confirmation environment
 * variable because this migration permanently removes catalogue records.
 */
const hasTable = (k, name) => k.schema.hasTable(name);

const legacyKurtaIds = k => k('products').select('id').where('is_kurta', true);
const legacyKurtaSkus = k => k('products').select('sku').where('is_kurta', true);
const legacyKurtaCodes = k => k('products').select('product_code').where('is_kurta', true);

async function deleteIfPresent(k, table, applyWhere = query => query) {
  if (await hasTable(k, table)) await applyWhere(k(table)).del();
}

export async function up(k) {
  if (k.client.config.client === 'mysql2' && process.env.CONFIRM_KURTA_CATALOGUE_PURGE !== 'true') {
    console.warn('Migration 029: Skipping Kurta catalogue purge because CONFIRM_KURTA_CATALOGUE_PURGE is not true.');
    return;
  }

  await k.transaction(async trx => {
    if (await hasTable(trx, 'products')) {
      await deleteIfPresent(trx, 'product_images', query => query
        .whereIn('sku', legacyKurtaSkus(trx))
        .orWhereIn('product_code', legacyKurtaCodes(trx)));
      for (const table of ['product_collections', 'product_materials', 'product_craftsmanship', 'product_finishes']) {
        await deleteIfPresent(trx, table, query => query.whereIn('product_id', legacyKurtaIds(trx)));
      }
      await deleteIfPresent(trx, 'supplier_skus', query => query.whereIn('sku', legacyKurtaSkus(trx)));
      await deleteIfPresent(trx, 'product_recommendations', query => query
        .whereIn('source_code', legacyKurtaCodes(trx))
        .orWhereIn('target_code', legacyKurtaCodes(trx)));
    }

    // Reviews cascade to review_images. Order snapshots are intentionally kept.
    await deleteIfPresent(trx, 'reviews', query => query
      .whereIn('product_id', legacyKurtaIds(trx))
      .orWhereNotNull('kurta_id'));

    // Variants, images, inventory, and attribute values cascade from `kurtas`.
    await deleteIfPresent(trx, 'kurtas');
    await deleteIfPresent(trx, 'kurta_attributes');
    await deleteIfPresent(trx, 'kurta_categories');

    if (await hasTable(trx, 'products')) await trx('products').where('is_kurta', true).del();
  });
}

export async function down() {
  throw new Error('Migration 029 permanently deletes Kurta catalogue data and cannot be rolled back. Restore a database backup instead.');
}
