export async function up(k) {
  await k.schema.createTable('offers', t => {
    t.increments('id');
    t.string('name').notNullable();
    t.string('code').nullable();
    t.string('badge_text').notNullable().defaultTo('50% OFF ON MC');
    t.string('discount_type').notNullable().defaultTo('making_percent'); // 'making_percent', 'total_percent', 'flat_amount', 'badge_only'
    t.decimal('discount_value', 10, 2).notNullable().defaultTo(0);
    t.string('applies_to').notNullable().defaultTo('all'); // 'all', 'products', 'coins', 'gold', 'silver', 'category', 'sku'
    t.string('target_value').nullable(); // category name or SKU if applies_to is category/sku
    t.string('banner_headline').nullable();
    t.string('banner_subtext').nullable();
    t.string('status').index().notNullable().defaultTo('active'); // 'active', 'paused'
    t.integer('priority').defaultTo(0);
    t.boolean('show_in_banner').defaultTo(true);
    t.boolean('show_in_grid').defaultTo(true);
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('offers');
}
