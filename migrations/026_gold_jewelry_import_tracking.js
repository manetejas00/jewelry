#!/usr/bin/env node
/**
 * PHASE 2 migration: Add source_pdf, source_page, price_source columns to jewelries
 */
export async function up(k) {
  const hasSrcPdf  = await k.schema.hasColumn('jewelries', 'source_pdf');
  const hasSrcPage = await k.schema.hasColumn('jewelries', 'source_page');
  const hasPriceSrc = await k.schema.hasColumn('jewelries', 'price_source');
  const hasOrigPdfPrice = await k.schema.hasColumn('jewelries', 'original_pdf_price');
  const hasImportBatch = await k.schema.hasColumn('jewelries', 'import_batch');
  const hasGenStatus = await k.schema.hasColumn('jewelry_images', 'generation_status');
  const hasGenNote = await k.schema.hasColumn('jewelry_images', 'generation_note');

  if (!hasSrcPdf || !hasSrcPage || !hasPriceSrc || !hasOrigPdfPrice || !hasImportBatch) {
    await k.schema.alterTable('jewelries', t => {
      if (!hasSrcPdf)      t.string('source_pdf', 500).nullable();
      if (!hasSrcPage)     t.integer('source_page').nullable();
      if (!hasPriceSrc)    t.string('price_source', 20).defaultTo('DEFAULT').nullable(); // PDF | DEFAULT
      if (!hasOrigPdfPrice) t.decimal('original_pdf_price', 14, 2).nullable();
      if (!hasImportBatch) t.string('import_batch', 100).nullable();
    });
  }

  if (await k.schema.hasTable('jewelry_images')) {
    if (!hasGenStatus || !hasGenNote) {
      await k.schema.alterTable('jewelry_images', t => {
        if (!hasGenStatus) t.string('generation_status', 30).defaultTo('manual').nullable();
        if (!hasGenNote)   t.text('generation_note').nullable();
      });
    }
  }

  // Create jewelry_import_sessions table if missing
  if (!await k.schema.hasTable('jewelry_import_sessions')) {
    await k.schema.createTable('jewelry_import_sessions', t => {
      t.increments('id').primary();
      t.string('batch_id', 100).unique().notNullable();
      t.string('status', 30).defaultTo('pending').index(); // pending|processing|complete|failed
      t.integer('total_pdfs').defaultTo(0);
      t.integer('processed_pdfs').defaultTo(0);
      t.integer('total_products').defaultTo(0);
      t.integer('imported_products').defaultTo(0);
      t.integer('failed_products').defaultTo(0);
      t.integer('duplicate_products').defaultTo(0);
      t.text('notes').nullable();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('jewelry_import_jobs')) {
    await k.schema.createTable('jewelry_import_jobs', t => {
      t.increments('id').primary();
      t.string('batch_id', 100).notNullable().index();
      t.string('pdf_file', 500).notNullable();
      t.integer('page_number').nullable();
      t.string('status', 30).defaultTo('pending').index(); // pending|processing|done|failed|skipped
      t.string('jewelry_sku', 100).nullable().index();
      t.text('extracted_data').nullable();
      t.text('error_message').nullable();
      t.integer('retry_count').defaultTo(0);
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('jewelry_image_jobs')) {
    await k.schema.createTable('jewelry_image_jobs', t => {
      t.increments('id').primary();
      t.string('batch_id', 100).notNullable().index();
      t.integer('jewelry_id').unsigned().nullable().references('id').inTable('jewelries').onDelete('CASCADE').index();
      t.string('jewelry_sku', 100).notNullable().index();
      t.string('image_role', 50).notNullable(); // front|left|right|model|detail
      t.string('status', 30).defaultTo('pending').index(); // pending|generating|done|failed
      t.text('image_url').nullable();
      t.text('prompt').nullable();
      t.text('error_message').nullable();
      t.integer('retry_count').defaultTo(0);
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }
}

export async function down(k) {
  await k.schema.dropTableIfExists('jewelry_image_jobs');
  await k.schema.dropTableIfExists('jewelry_import_jobs');
  await k.schema.dropTableIfExists('jewelry_import_sessions');
}
