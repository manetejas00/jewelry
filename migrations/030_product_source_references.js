/**
 * Preserves page-level catalogue provenance without changing product pricing
 * or existing product rows. A reference can belong to a legacy product, a
 * coin, or one of the independent catalogue modules.
 */
export async function up(k) {
  if (await k.schema.hasTable('product_source_references')) return;

  await k.schema.createTable('product_source_references', t => {
    t.increments('id').primary();
    t.integer('product_id').unsigned().nullable().references('id').inTable('products').onDelete('CASCADE').index();
    t.integer('coin_id').unsigned().nullable().references('id').inTable('coins').onDelete('CASCADE').index();
    t.integer('jewelry_id').unsigned().nullable().references('id').inTable('jewelries').onDelete('CASCADE').index();
    t.integer('kurta_id').unsigned().nullable().references('id').inTable('kurtas').onDelete('CASCADE').index();
    t.string('source_pdf', 500).notNullable().index();
    t.text('source_pdf_path').nullable();
    t.integer('source_page_number').notNullable().index();
    t.string('source_printed_page_number', 100).nullable();
    t.string('source_product_code', 100).nullable();
    t.text('source_original_text').nullable();
    t.string('source_extraction_method', 20).notNullable().defaultTo('Text');
    t.string('source_verification_status', 30).notNullable().defaultTo('Needs Review');
    t.text('source_notes').nullable();
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
    t.index(['source_pdf', 'source_page_number'], 'idx_product_source_pdf_page');
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('product_source_references');
}
