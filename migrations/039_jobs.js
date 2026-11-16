/**
 * Durable jobs for work Hostinger will not keep running inside a web request.
 * A cron command drains this table. The web process also drains it when it is awake.
 */
export async function up(k) {
  if (await k.schema.hasTable('jobs')) return;
  await k.schema.createTable('jobs', t => {
    t.increments('id');
    t.string('type', 64).notNullable().index();
    t.text('payload');
    t.string('status', 16).notNullable().index();
    t.integer('attempts').notNullable().defaultTo(0);
    t.integer('max_attempts').notNullable().defaultTo(3);
    t.string('run_at').notNullable().index();
    t.string('locked_at').nullable();
    t.string('locked_by', 64).nullable();
    t.string('dedupe_key', 160).nullable().index();
    t.text('last_error').nullable();
    t.text('result').nullable();
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
    t.string('finished_at').nullable();
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('jobs');
}
