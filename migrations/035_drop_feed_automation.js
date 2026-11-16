// Remove the retired feed-automation log and any leftover feed settings.
// Catalogue rows, import history, orders, and manual metal rates stay in place.
const FEED_SETTING_KEYS = [
  'GOLD_FEED_URL', 'GOLD_FEED_TOKEN', 'PRODUCT_FEED_URL', 'PRODUCT_FEED_TOKEN',
  'PRODUCT_FEED_FILE', 'COIN_FEED_URL', 'COIN_FEED_TOKEN', 'COIN_FEED_FILE',
  'COIN_FEED_ENABLED', 'PRODUCT_FEED_ENABLED', 'GOLD_FEED_ENABLED', 'FEED_STATUS',
  'INVENTORY_MODE', 'COIN_INVENTORY_MODE', 'KURTA_INVENTORY_MODE',
  'SUPPLIER_OVERWRITE_FIELDS', 'SUPPLIER_NAME', 'CRON_EXPRESSION',
  'GOLD_AUTO_CONVERSION_APPROVED'
];

export async function up(k) {
  await k.schema.dropTableIfExists('daily_runs');
  if (await k.schema.hasTable('import_locks')) {
    await k('import_locks').where({ name: 'daily' }).del();
  }
  if (await k.schema.hasTable('settings')) {
    await k('settings').whereIn('key', FEED_SETTING_KEYS).del();
  }
}

export async function down(k) {
  if (!await k.schema.hasTable('daily_runs')) {
    await k.schema.createTable('daily_runs', t => {
      t.increments('id');
      t.string('started_at');
      t.string('finished_at');
      t.string('trigger');
      t.text('result');
    });
  }
}
