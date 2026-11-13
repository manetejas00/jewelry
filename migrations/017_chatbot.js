export async function up(k) {
  await k.schema.createTable('chat_daily_usage', t => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE');
    t.string('usage_date', 10).notNullable();
    t.integer('message_count').notNullable().defaultTo(0);
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
    t.unique(['user_id', 'usage_date']);
  });

  await k.schema.createTable('chat_conversations', t => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE');
    t.string('title', 120).nullable();
    t.string('status', 20).notNullable().defaultTo('active').index();
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable().index();
    t.index(['user_id', 'updated_at']);
  });

  await k.schema.createTable('chat_messages', t => {
    t.increments('id');
    t.integer('conversation_id').unsigned().notNullable().references('id').inTable('chat_conversations').onDelete('CASCADE');
    t.string('role', 20).notNullable();
    t.text('message').notNullable();
    t.string('status', 20).notNullable().defaultTo('completed').index();
    t.integer('input_tokens').nullable();
    t.integer('output_tokens').nullable();
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
    t.index(['conversation_id', 'id']);
  });

  await k.schema.createTable('chatbot_user_settings', t => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().unique().references('id').inTable('customers').onDelete('CASCADE');
    t.integer('daily_message_limit').nullable();
    t.boolean('chatbot_access_enabled').notNullable().defaultTo(true);
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
  });

  await k.schema.createTable('chatbot_usage_logs', t => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE');
    t.integer('conversation_id').unsigned().nullable().references('id').inTable('chat_conversations').onDelete('SET NULL');
    t.string('usage_date', 10).notNullable().index();
    t.string('idempotency_key', 80).notNullable();
    t.string('request_status', 20).notNullable().index();
    t.text('user_message').nullable();
    t.text('assistant_message').nullable();
    t.string('model', 80).nullable();
    t.integer('input_tokens').nullable();
    t.integer('output_tokens').nullable();
    t.decimal('estimated_cost', 12, 6).nullable();
    t.string('error_code', 40).nullable();
    t.string('created_at').notNullable().index();
    t.unique(['user_id', 'idempotency_key']);
    t.index(['user_id', 'usage_date']);
  });

  await k.schema.createTable('chatbot_admin_audit_logs', t => {
    t.increments('id');
    t.integer('admin_id').unsigned().nullable().references('id').inTable('staff').onDelete('SET NULL');
    t.integer('target_user_id').unsigned().nullable().references('id').inTable('customers').onDelete('SET NULL');
    t.string('action', 80).notNullable().index();
    t.text('old_value').nullable();
    t.text('new_value').nullable();
    t.string('created_at').notNullable().index();
  });
}

export async function down(k) {
  await k.schema.dropTableIfExists('chatbot_admin_audit_logs');
  await k.schema.dropTableIfExists('chatbot_usage_logs');
  await k.schema.dropTableIfExists('chat_messages');
  await k.schema.dropTableIfExists('chat_conversations');
  await k.schema.dropTableIfExists('chatbot_user_settings');
  await k.schema.dropTableIfExists('chat_daily_usage');
}
