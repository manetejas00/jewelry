export async function up(k) {
  if (!await k.schema.hasTable('categories')) {
    await k.schema.createTable('categories', t => {
      t.increments('id');
      t.string('slug', 100).unique().notNullable().index();
      t.string('name', 150).notNullable();
      t.text('description').nullable();
      t.text('thumbnail').nullable();
      t.text('banner').nullable();
      t.string('status', 20).notNullable().defaultTo('active').index();
      t.integer('sort_order').defaultTo(0).index();
      t.string('seo_title', 150).nullable();
      t.string('meta_description', 255).nullable();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('combos')) {
    await k.schema.createTable('combos', t => {
      t.increments('id');
      t.string('slug', 100).unique().notNullable().index();
      t.string('sku', 100).unique().notNullable().index();
      t.string('name', 200).notNullable();
      t.text('description').nullable();
      t.string('category', 100).nullable().index();
      t.text('image').nullable();
      t.string('status', 20).notNullable().defaultTo('published').index();
      t.decimal('combo_price', 14, 2).notNullable();
      t.decimal('original_price', 14, 2).nullable();
      t.decimal('discount_percent', 5, 2).nullable();
      t.decimal('savings', 14, 2).nullable();
      t.integer('stock').defaultTo(10);
      t.string('seo_title', 150).nullable();
      t.string('meta_description', 255).nullable();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('combo_items')) {
    await k.schema.createTable('combo_items', t => {
      t.increments('id');
      t.integer('combo_id').unsigned().notNullable().references('id').inTable('combos').onDelete('CASCADE').index();
      t.string('product_sku', 100).notNullable().index();
      t.integer('quantity').notNullable().defaultTo(1);
      t.boolean('is_primary').notNullable().defaultTo(false);
    });
  }
}

export async function down(k) {
  await k.schema.dropTableIfExists('combo_items');
  await k.schema.dropTableIfExists('combos');
  await k.schema.dropTableIfExists('categories');
}
