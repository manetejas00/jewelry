export async function up(k) {
 await k.schema.createTable('staff',t=>{t.increments('id');t.string('email').unique().notNullable();t.string('password_hash').notNullable();t.string('role').notNullable();});
 await k.schema.createTable('sessions',t=>{t.string('sid').primary();t.text('data').notNullable();t.bigInteger('expires').index();});
 await k.schema.createTable('settings',t=>{t.string('key').primary();t.text('value').notNullable();});
 await k.schema.createTable('products',t=>{t.increments('id');t.string('sku').unique().notNullable();t.string('product_code').index().notNullable();t.string('slug').index().notNullable();t.string('name').notNullable();t.string('category').index();t.text('description');t.string('metal');t.string('purity');t.decimal('net_weight_g',12,3);t.string('size');t.string('finish');t.text('image');t.string('pricing_mode');t.decimal('fixed_price',14,2);t.decimal('making_flat',14,2);t.decimal('making_percent',8,4);t.decimal('stone_charge',14,2);t.decimal('other_charge',14,2);t.integer('stock');t.string('status').index();t.string('supplier').index();t.string('source_timestamp').index();t.string('updated_at');});
 await k.schema.createTable('supplier_skus',t=>{t.increments('id');t.string('supplier');t.string('supplier_sku');t.string('sku').index();t.unique(['supplier','supplier_sku']);});
 await k.schema.createTable('rates',t=>{t.increments('id');t.string('supplier');t.string('purity').index();t.string('currency');t.string('original_unit');t.decimal('original_rate',14,4);t.decimal('inr_per_gram',14,4);t.string('effective_date').index();t.string('source_timestamp').index();t.string('published_at');t.integer('batch_id');});
 await k.schema.createTable('pricing_rules',t=>{t.increments('id');t.decimal('tax_percent',8,4);t.decimal('rounding',10,2);t.string('tax_treatment');t.string('changed_at');t.integer('changed_by');});
 await k.schema.createTable('import_batches',t=>{t.increments('id');t.string('kind');t.string('supplier').index();t.string('checksum');t.string('source_timestamp');t.string('status').index();t.text('summary');t.text('private_payload','longtext');t.string('created_at');t.string('published_at');t.integer('staff_id');t.unique(['kind','supplier','checksum']);});
 await k.schema.createTable('import_errors',t=>{t.increments('id');t.integer('batch_id').index();t.integer('row');t.string('field');t.text('value');t.text('correction');});
 await k.schema.createTable('import_locks',t=>{t.string('name').primary();t.string('acquired_at');});
 await k.schema.createTable('orders',t=>{t.string('id').primary();t.string('idempotency_key').unique();t.string('status').index();t.text('customer');t.decimal('subtotal',14,2);t.decimal('shipping',14,2);t.decimal('total',14,2);t.string('payment_mode');t.string('created_at').index();});
 await k.schema.createTable('order_items',t=>{t.increments('id');t.string('order_id').index();t.string('sku').index();t.integer('quantity');t.text('snapshot');});
 await k.schema.createTable('payment_events',t=>{t.string('event_id').primary();t.string('order_id');t.string('created_at');});
 await k.schema.createTable('audit',t=>{t.increments('id');t.integer('staff_id');t.string('action');t.text('details');t.string('created_at');});
 await k.schema.createTable('daily_runs',t=>{t.increments('id');t.string('started_at');t.string('finished_at');t.string('trigger');t.text('result');});
 await k('pricing_rules').insert({tax_percent:0,rounding:1,tax_treatment:'exclusive',changed_at:new Date().toISOString()});
}
export async function down(k) {for(const table of ['daily_runs','audit','payment_events','order_items','orders','import_locks','import_errors','import_batches','pricing_rules','rates','supplier_skus','products','settings','sessions','staff']) await k.schema.dropTableIfExists(table);}
