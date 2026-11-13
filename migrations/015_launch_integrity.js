async function dedupeSlugs(k) {
  const rows = await k('products').select('id', 'slug').orderBy('id');
  const seen = new Set();
  for (const row of rows) {
    let slug = String(row.slug || `piece-${row.id}`).toLowerCase();
    if (seen.has(slug)) slug = `${slug}-${row.id}`;
    seen.add(slug);
    if (slug !== row.slug) await k('products').where({id: row.id}).update({slug});
  }
}

async function relaxReviews(k) {
  const client = k.client.config.client;
  if (client === 'better-sqlite3') {
    await k.raw('PRAGMA foreign_keys = OFF');
    await k.schema.createTable('reviews_next', t => {
      t.increments('id');
      t.integer('product_id').unsigned().nullable().references('id').inTable('products').onDelete('CASCADE').index();
      t.integer('coin_id').unsigned().nullable().references('id').inTable('coins').onDelete('CASCADE').index();
      t.string('subject_type', 20).notNullable().defaultTo('product').index();
      t.integer('user_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE').index();
      t.integer('rating').notNullable().index();
      t.string('title', 255).notNullable();
      t.text('comment').notNullable();
      t.string('status', 20).notNullable().defaultTo('pending').index();
      t.boolean('is_verified_purchase').notNullable().defaultTo(false);
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
      t.string('deleted_at').nullable().index();
      t.unique(['product_id', 'user_id']);
      t.unique(['coin_id', 'user_id']);
      t.index(['product_id', 'status']);
      t.index(['coin_id', 'status']);
      t.index(['status', 'rating']);
    });
    await k.raw(`INSERT INTO reviews_next (id, product_id, coin_id, subject_type, user_id, rating, title, comment, status, is_verified_purchase, created_at, updated_at, deleted_at)
      SELECT id, product_id, NULL, 'product', user_id, rating, title, comment, status, is_verified_purchase, created_at, updated_at, deleted_at FROM reviews`);
    await k.schema.dropTable('reviews');
    await k.raw('ALTER TABLE reviews_next RENAME TO reviews');
    await k.raw(`INSERT INTO sqlite_sequence (name, seq) SELECT 'reviews', COALESCE(MAX(id), 0) FROM reviews WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'reviews')`);
    await k.raw(`UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM reviews) WHERE name = 'reviews'`);
    await k.raw('PRAGMA foreign_keys = ON');
    return;
  }
  const [keys] = await k.raw(`SELECT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'product_id' AND REFERENCED_TABLE_NAME IS NOT NULL`);
  for (const row of keys) await k.raw('ALTER TABLE reviews DROP FOREIGN KEY ??', [row.name]);
  await k.raw('ALTER TABLE reviews MODIFY product_id INT UNSIGNED NULL');
  await k.schema.alterTable('reviews', t => {
    t.integer('coin_id').unsigned().nullable().references('id').inTable('coins').onDelete('CASCADE').index();
    t.string('subject_type', 20).notNullable().defaultTo('product').index();
    t.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
    t.unique(['coin_id', 'user_id']);
    t.index(['coin_id', 'status']);
  });
}

export async function up(k) {
  await k.schema.alterTable('staff', t => { t.string('disabled_at').nullable(); });
  await k.schema.alterTable('orders', t => {
    t.string('updated_at').nullable();
    t.string('status_note', 500).nullable();
  });
  await k.schema.alterTable('offers', t => {
    t.string('starts_at').nullable();
    t.string('ends_at').nullable();
    t.boolean('code_required').notNullable().defaultTo(false);
  });
  await dedupeSlugs(k);
  await k.schema.alterTable('products', t => { t.unique(['slug'], {indexName: 'products_slug_unique'}); });
  if (await k.schema.hasTable('reviews') && await k.schema.hasTable('coins')) await relaxReviews(k);
}

export async function down(k) {
  await k.schema.alterTable('products', t => { t.dropUnique(['slug'], 'products_slug_unique'); });
  await k.schema.alterTable('offers', t => { t.dropColumn('starts_at'); t.dropColumn('ends_at'); t.dropColumn('code_required'); });
  await k.schema.alterTable('orders', t => { t.dropColumn('updated_at'); t.dropColumn('status_note'); });
  await k.schema.alterTable('staff', t => { t.dropColumn('disabled_at'); });
}
