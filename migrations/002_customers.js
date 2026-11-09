export async function up(k) {
  await k.schema.createTable('customers', t => {
    t.increments('id');
    t.string('email', 254).notNullable().unique();
    t.string('name', 100).notNullable();
    t.string('password_hash').notNullable();
    t.string('created_at').notNullable();
  });
  await k.schema.createTable('customer_state', t => {
    t.integer('customer_id').unsigned().primary().references('id').inTable('customers').onDelete('CASCADE');
    t.text('bag').notNullable();
    t.text('saved').notNullable();
    t.integer('revision').notNullable().defaultTo(0);
    t.string('updated_at').notNullable();
  });
  await k.schema.alterTable('orders', t => {
    t.integer('customer_id').unsigned().nullable().references('id').inTable('customers').index();
  });
}
export async function down(k) {
  await k.schema.alterTable('orders', t => { t.dropColumn('customer_id'); });
  await k.schema.dropTable('customer_state');
  await k.schema.dropTable('customers');
}
