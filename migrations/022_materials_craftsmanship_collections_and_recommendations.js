export async function up(k) {
  // 1. Materials Master Table
  if (!await k.schema.hasTable('materials')) {
    await k.schema.createTable('materials', (t) => {
      t.increments('id').primary();
      t.string('name', 100).notNullable();
      t.string('slug', 100).notNullable().unique().index();
      t.text('description').nullable();
      t.string('thumbnail', 1000).nullable();
      t.string('status', 20).defaultTo('active').index();
      t.integer('sort_order').defaultTo(0);
      t.string('seo_title', 255).nullable();
      t.string('meta_description', 500).nullable();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  // 2. Craftsmanship Master Table
  if (!await k.schema.hasTable('craftsmanship')) {
    await k.schema.createTable('craftsmanship', (t) => {
      t.increments('id').primary();
      t.string('name', 100).notNullable();
      t.string('slug', 100).notNullable().unique().index();
      t.text('description').nullable();
      t.string('thumbnail', 1000).nullable();
      t.string('status', 20).defaultTo('active').index();
      t.integer('sort_order').defaultTo(0);
      t.string('seo_title', 255).nullable();
      t.string('meta_description', 500).nullable();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  // 3. Finishes Master Table
  if (!await k.schema.hasTable('finishes')) {
    await k.schema.createTable('finishes', (t) => {
      t.increments('id').primary();
      t.string('name', 100).notNullable();
      t.string('slug', 100).notNullable().unique().index();
      t.text('description').nullable();
      t.string('thumbnail', 1000).nullable();
      t.string('status', 20).defaultTo('active').index();
      t.integer('sort_order').defaultTo(0);
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  // 4. Collections Master Table
  if (!await k.schema.hasTable('collections')) {
    await k.schema.createTable('collections', (t) => {
      t.increments('id').primary();
      t.string('name', 100).notNullable();
      t.string('slug', 100).notNullable().unique().index();
      t.text('description').nullable();
      t.string('banner', 1000).nullable();
      t.string('thumbnail', 1000).nullable();
      t.string('status', 20).defaultTo('active').index();
      t.integer('sort_order').defaultTo(0);
      t.string('seo_title', 255).nullable();
      t.string('meta_description', 500).nullable();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  // 5. Product Materials Junction Table
  if (!await k.schema.hasTable('product_materials')) {
    await k.schema.createTable('product_materials', (t) => {
      t.increments('id').primary();
      t.integer('product_id').nullable().index();
      t.string('product_code', 100).nullable().index();
      t.string('sku', 100).nullable().index();
      t.integer('material_id').notNullable().index();
      t.boolean('is_primary').defaultTo(false).index();
      t.string('created_at').notNullable();
    });
  }

  // 6. Product Craftsmanship Junction Table
  if (!await k.schema.hasTable('product_craftsmanship')) {
    await k.schema.createTable('product_craftsmanship', (t) => {
      t.increments('id').primary();
      t.integer('product_id').nullable().index();
      t.string('product_code', 100).nullable().index();
      t.string('sku', 100).nullable().index();
      t.integer('craftsmanship_id').notNullable().index();
      t.string('created_at').notNullable();
    });
  }

  // 7. Product Finishes Junction Table
  if (!await k.schema.hasTable('product_finishes')) {
    await k.schema.createTable('product_finishes', (t) => {
      t.increments('id').primary();
      t.integer('product_id').nullable().index();
      t.string('product_code', 100).nullable().index();
      t.string('sku', 100).nullable().index();
      t.integer('finish_id').notNullable().index();
      t.string('created_at').notNullable();
    });
  }

  // 8. Product Collections Junction Table
  if (!await k.schema.hasTable('product_collections')) {
    await k.schema.createTable('product_collections', (t) => {
      t.increments('id').primary();
      t.integer('product_id').nullable().index();
      t.string('product_code', 100).nullable().index();
      t.string('sku', 100).nullable().index();
      t.integer('collection_id').notNullable().index();
      t.string('created_at').notNullable();
    });
  }

  // 9. Product Recommendations Table
  if (!await k.schema.hasTable('product_recommendations')) {
    await k.schema.createTable('product_recommendations', (t) => {
      t.increments('id').primary();
      t.string('source_code', 100).notNullable().index();
      t.string('target_code', 100).notNullable().index();
      t.string('recommendation_type', 50).notNullable().index(); // 'similar' | 'you_may_like' | 'complete_look'
      t.decimal('relevance_score', 5, 2).defaultTo(1.00);
      t.string('source_type', 20).defaultTo('rule').index(); // 'ai' | 'rule' | 'manual'
      t.integer('admin_priority').defaultTo(0);
      t.string('status', 20).defaultTo('active').index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  // 10. Recommendation Settings Table
  if (!await k.schema.hasTable('recommendation_settings')) {
    await k.schema.createTable('recommendation_settings', (t) => {
      t.increments('id').primary();
      t.string('key', 100).notNullable().unique().index();
      t.text('value').nullable();
      t.string('updated_at').notNullable();
    });
  }
}

export async function down(k) {
  await k.schema.dropTableIfExists('recommendation_settings');
  await k.schema.dropTableIfExists('product_recommendations');
  await k.schema.dropTableIfExists('product_collections');
  await k.schema.dropTableIfExists('product_finishes');
  await k.schema.dropTableIfExists('product_craftsmanship');
  await k.schema.dropTableIfExists('product_materials');
  await k.schema.dropTableIfExists('collections');
  await k.schema.dropTableIfExists('finishes');
  await k.schema.dropTableIfExists('craftsmanship');
  await k.schema.dropTableIfExists('materials');
}
