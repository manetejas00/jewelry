export async function up(k) {
  await k.schema.createTable('coins', t => {
    t.increments('id');
    t.string('sku').unique().notNullable();
    t.string('name').notNullable();
    t.string('metal').notNullable();
    t.string('coin_type').index().notNullable();
    t.string('purity').notNullable();
    t.decimal('weight_g', 10, 3).notNullable();
    t.string('dimension').nullable();
    t.decimal('making_charge', 14, 2).defaultTo(0);
    t.string('pricing_mode').defaultTo('METAL_LINKED');
    t.decimal('fixed_price', 14, 2).nullable();
    t.integer('stock').defaultTo(0);
    t.text('description').nullable();
    t.text('image').nullable();
    t.string('status').defaultTo('published').index();
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('coins');
}
