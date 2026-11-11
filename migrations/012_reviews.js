export async function up(k) {
  await k.schema.createTable('reviews', t => {
    t.increments('id');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE').index();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE').index();
    t.integer('rating').notNullable().index();
    t.string('title', 255).notNullable();
    t.text('comment').notNullable();
    t.string('status', 20).notNullable().defaultTo('pending').index(); // 'pending', 'approved', 'rejected'
    t.boolean('is_verified_purchase').notNullable().defaultTo(false);
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
    t.string('deleted_at').nullable().index();
    t.unique(['product_id', 'user_id']);
    t.index(['product_id', 'status']);
    t.index(['status', 'rating']);
  });

  await k.schema.createTable('review_images', t => {
    t.increments('id');
    t.integer('review_id').unsigned().notNullable().references('id').inTable('reviews').onDelete('CASCADE').index();
    t.text('image_url').notNullable();
    t.string('created_at').notNullable();
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('review_images');
  await k.schema.dropTableIfExists('reviews');
}
