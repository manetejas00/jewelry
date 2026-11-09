export async function up(k) {
  await k.schema.createTable('product_images', t => {
    t.increments('id');
    t.string('product_code').index().nullable();
    t.string('sku').index().nullable();
    t.string('role').index().notNullable().defaultTo('front'); // 'hero', 'front', 'left', 'right', 'model', 'detail'
    t.text('url').notNullable();
    t.string('alt_text').nullable();
    t.integer('sort_order').defaultTo(0);
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('product_images');
}
