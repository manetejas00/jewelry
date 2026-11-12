export async function up(k) {
  await k.schema.createTable('ai_drafts', t => {
    t.increments('id');
    t.string('skill').notNullable().index();
    t.string('sku').notNullable().index();
    t.string('status').notNullable().index();
    t.string('tone').notNullable();
    t.text('input_json').notNullable();
    t.text('output_json').nullable();
    t.text('error').nullable();
    t.text('published_fields').nullable();
    t.integer('staff_id').nullable();
    t.integer('reviewed_by').nullable();
    t.string('created_at').notNullable();
    t.string('reviewed_at').nullable();
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('ai_drafts');
}
