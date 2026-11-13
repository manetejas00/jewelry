export async function up(k) {
  await k.schema.alterTable('customers', t => {
    t.string('phone', 16).nullable();
    t.string('phone_verified_at').nullable();
    t.string('email_verified_at').nullable();
  });
  await k.schema.createTable('otp_challenges', t => {
    t.string('id', 64).primary();
    t.string('purpose', 40).notNullable().index();
    t.string('channel', 20).notNullable();
    t.string('destination_hash', 64).notNullable().index();
    t.integer('customer_id').unsigned().nullable().references('id').inTable('customers').onDelete('CASCADE');
    t.bigInteger('sent_at').notNullable();
    t.bigInteger('verified_at').nullable();
    t.bigInteger('consumed_at').nullable();
    t.bigInteger('expires_at').notNullable().index();
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('otp_challenges');
  await k.schema.alterTable('customers', t => {
    t.dropColumn('phone');
    t.dropColumn('phone_verified_at');
    t.dropColumn('email_verified_at');
  });
}
