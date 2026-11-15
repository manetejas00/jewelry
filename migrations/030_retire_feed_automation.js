// Retire configuration for automatic supplier/feed ingestion without dropping
// historic batches, products, orders, or the legacy source columns they retain.
export async function up(k) {
  if (!await k.schema.hasTable('settings')) return;
  await k('settings').whereIn('key', [
    'GOLD_FEED_URL', 'GOLD_FEED_TOKEN', 'PRODUCT_FEED_URL', 'PRODUCT_FEED_TOKEN',
    'PRODUCT_FEED_FILE', 'COIN_FEED_URL', 'COIN_FEED_TOKEN', 'COIN_FEED_FILE',
    'COIN_FEED_ENABLED', 'PRODUCT_FEED_ENABLED', 'GOLD_FEED_ENABLED', 'FEED_STATUS',
    'INVENTORY_MODE', 'COIN_INVENTORY_MODE', 'SUPPLIER_OVERWRITE_FIELDS'
  ]).del();
}

// Deliberately non-destructive: a rollback does not recreate credentials.
export async function down() {}
