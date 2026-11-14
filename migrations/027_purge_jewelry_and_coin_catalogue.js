/**
 * Irreversibly removes all jewelry and coin catalogue data.
 *
 * Preserved: customers, orders and order snapshots, Kurtas, rates, offers, and
 * shared settings. In the legacy `products` table, only non-Kurta rows are
 * removed; rows with `is_kurta = 1` remain intact.
 *
 * Production guard: set CONFIRM_CATALOGUE_PURGE=true for a MySQL deployment.
 */
const hasTable = (k, name) => k.schema.hasTable(name);

const legacyJewelryIds = k => k('products')
  .select('id')
  .where(query => query.where('is_kurta', false).orWhereNull('is_kurta'));

const legacyJewelrySkus = k => k('products')
  .select('sku')
  .where(query => query.where('is_kurta', false).orWhereNull('is_kurta'));

const legacyJewelryCodes = k => k('products')
  .select('product_code')
  .where(query => query.where('is_kurta', false).orWhereNull('is_kurta'));

async function deleteIfPresent(k, table, applyWhere = query => query) {
  if (await hasTable(k, table)) await applyWhere(k(table)).del();
}

export async function up(k) {
  if (k.client.config.client === 'mysql2' && process.env.CONFIRM_CATALOGUE_PURGE !== 'true') {
    throw new Error('Refusing to purge a production catalogue. Set CONFIRM_CATALOGUE_PURGE=true to apply migration 027.');
  }

  await k.transaction(async trx => {
    // Legacy jewelry support rows are cleared first. The table also contains
    // legacy Kurta rows, so only non-Kurta product records are selected.
    if (await hasTable(trx, 'products')) {
      await deleteIfPresent(trx, 'product_images', query => query
        .whereIn('sku', legacyJewelrySkus(trx))
        .orWhereIn('product_code', legacyJewelryCodes(trx)));
      for (const table of ['product_collections', 'product_materials', 'product_craftsmanship', 'product_finishes']) {
        await deleteIfPresent(trx, table, query => query.whereIn('product_id', legacyJewelryIds(trx)));
      }
      await deleteIfPresent(trx, 'supplier_skus', query => query.whereIn('sku', legacyJewelrySkus(trx)));
      await deleteIfPresent(trx, 'product_recommendations', query => query
        .whereIn('source_code', legacyJewelryCodes(trx))
        .orWhereIn('target_code', legacyJewelryCodes(trx)));
    }

    // Reviews cascade to review_images. This includes legacy products,
    // independent jewelry, and coins, while retaining Kurta reviews.
    await deleteIfPresent(trx, 'reviews', query => query
      .whereIn('product_id', legacyJewelryIds(trx))
      .orWhereNotNull('jewelry_id')
      .orWhereNotNull('coin_id'));

    for (const table of ['jewelry_image_jobs', 'jewelry_import_jobs', 'jewelry_import_sessions']) {
      await deleteIfPresent(trx, table);
    }
    // Variants, images, inventory, and attribute values cascade from these
    // parent rows; the remaining lookup tables are then cleared explicitly.
    await deleteIfPresent(trx, 'jewelries');
    await deleteIfPresent(trx, 'jewelry_attributes');
    await deleteIfPresent(trx, 'jewelry_categories');

    await deleteIfPresent(trx, 'coins');
    await deleteIfPresent(trx, 'coin_attributes');
    await deleteIfPresent(trx, 'coin_categories');

    if (await hasTable(trx, 'products')) {
      await trx('products')
        .where(query => query.where('is_kurta', false).orWhereNull('is_kurta'))
        .del();
    }
  });
}

export async function down() {
  throw new Error('Migration 027 permanently deletes catalogue data and cannot be rolled back. Restore a database backup instead.');
}
