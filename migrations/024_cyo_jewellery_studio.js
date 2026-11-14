export async function up(k) {
  // 1. Quota columns on customers
  if (await k.schema.hasTable('customers')) {
    const hasCount = await k.schema.hasColumn('customers', 'cyo_image_generations_count');
    if (!hasCount) {
      await k.schema.alterTable('customers', t => {
        t.integer('cyo_image_generations_count').notNullable().defaultTo(0).index();
      });
    }
    const hasLimit = await k.schema.hasColumn('customers', 'cyo_image_generations_limit');
    if (!hasLimit) {
      await k.schema.alterTable('customers', t => {
        t.integer('cyo_image_generations_limit').notNullable().defaultTo(3);
      });
    }
  }

  // 2. cyo_designs
  if (!await k.schema.hasTable('cyo_designs')) {
    await k.schema.createTable('cyo_designs', t => {
      t.increments('id').primary();
      t.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE').index();
      t.string('title', 255).notNullable();
      t.string('category', 100).notNullable().defaultTo('Necklace').index();
      t.text('initial_prompt').notNullable();
      t.integer('current_version_id').unsigned().nullable();
      t.string('status', 50).notNullable().defaultTo('Draft').index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  // 3. cyo_design_versions
  if (!await k.schema.hasTable('cyo_design_versions')) {
    await k.schema.createTable('cyo_design_versions', t => {
      t.increments('id').primary();
      t.integer('design_id').unsigned().notNullable().references('id').inTable('cyo_designs').onDelete('CASCADE').index();
      t.integer('version_number').notNullable().defaultTo(1);
      t.text('prompt').notNullable();
      t.text('attributes').nullable(); // JSON object
      t.string('ai_provider', 100).nullable();
      t.string('ai_model', 100).nullable();
      t.string('generation_status', 50).notNullable().defaultTo('completed').index();
      t.string('created_at').notNullable();
    });
  }

  // 4. cyo_design_images
  if (!await k.schema.hasTable('cyo_design_images')) {
    await k.schema.createTable('cyo_design_images', t => {
      t.increments('id').primary();
      t.integer('design_id').unsigned().notNullable().references('id').inTable('cyo_designs').onDelete('CASCADE').index();
      t.integer('version_id').unsigned().nullable().references('id').inTable('cyo_design_versions').onDelete('SET NULL').index();
      t.string('view_type', 50).notNullable().defaultTo('front').index(); // 'front', 'side', 'detail', 'showcase'
      t.string('image_url', 1000).notNullable();
      t.string('reference_image_url', 1000).nullable();
      t.text('prompt').nullable();
      t.string('status', 50).notNullable().defaultTo('active').index();
      t.string('created_at').notNullable();
    });
  }

  // 5. cyo_conversations
  if (!await k.schema.hasTable('cyo_conversations')) {
    await k.schema.createTable('cyo_conversations', t => {
      t.increments('id').primary();
      t.integer('design_id').unsigned().notNullable().references('id').inTable('cyo_designs').onDelete('CASCADE').index();
      t.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE').index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  // 6. cyo_messages
  if (!await k.schema.hasTable('cyo_messages')) {
    await k.schema.createTable('cyo_messages', t => {
      t.increments('id').primary();
      t.integer('conversation_id').unsigned().notNullable().references('id').inTable('cyo_conversations').onDelete('CASCADE').index();
      t.string('role', 20).notNullable().index(); // 'user', 'assistant', 'system'
      t.text('content').notNullable();
      t.text('attachments').nullable(); // JSON array
      t.integer('design_version_id').unsigned().nullable();
      t.string('created_at').notNullable();
    });
  }

  // 7. cyo_quotations
  if (!await k.schema.hasTable('cyo_quotations')) {
    await k.schema.createTable('cyo_quotations', t => {
      t.increments('id').primary();
      t.integer('design_id').unsigned().notNullable().references('id').inTable('cyo_designs').onDelete('CASCADE').index();
      t.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE').index();
      t.decimal('quoted_amount', 12, 2).notNullable();
      t.decimal('estimated_weight_g', 8, 3).nullable();
      t.decimal('material_cost', 12, 2).nullable();
      t.decimal('gemstone_cost', 12, 2).nullable();
      t.decimal('making_cost', 12, 2).nullable();
      t.decimal('tax_cost', 12, 2).nullable();
      t.text('specifications').nullable(); // JSON object
      t.text('admin_notes').nullable();
      t.string('status', 50).notNullable().defaultTo('quotation_sent').index(); // 'pending', 'quotation_sent', 'quotation_accepted', 'quotation_rejected'
      t.string('valid_until').nullable();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  // 8. cyo_ai_usage
  if (!await k.schema.hasTable('cyo_ai_usage')) {
    await k.schema.createTable('cyo_ai_usage', t => {
      t.increments('id').primary();
      t.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE').index();
      t.integer('design_id').unsigned().nullable().references('id').inTable('cyo_designs').onDelete('SET NULL').index();
      t.integer('version_id').unsigned().nullable();
      t.string('operation', 100).notNullable().index();
      t.string('provider', 100).nullable();
      t.string('model', 100).nullable();
      t.integer('tokens_in').defaultTo(0);
      t.integer('tokens_out').defaultTo(0);
      t.decimal('cost_inr', 8, 4).defaultTo(0);
      t.string('status', 50).notNullable().defaultTo('success').index();
      t.string('created_at').notNullable();
    });
  }

  // 9. cyo_audit_logs
  if (!await k.schema.hasTable('cyo_audit_logs')) {
    await k.schema.createTable('cyo_audit_logs', t => {
      t.increments('id').primary();
      t.integer('staff_id').unsigned().nullable().index();
      t.string('action', 100).notNullable().index();
      t.string('target_id', 100).nullable();
      t.text('details').nullable(); // JSON
      t.string('created_at').notNullable();
    });
  }
}

export async function down(k) {
  if (await k.schema.hasTable('cyo_audit_logs')) await k.schema.dropTable('cyo_audit_logs');
  if (await k.schema.hasTable('cyo_ai_usage')) await k.schema.dropTable('cyo_ai_usage');
  if (await k.schema.hasTable('cyo_quotations')) await k.schema.dropTable('cyo_quotations');
  if (await k.schema.hasTable('cyo_messages')) await k.schema.dropTable('cyo_messages');
  if (await k.schema.hasTable('cyo_conversations')) await k.schema.dropTable('cyo_conversations');
  if (await k.schema.hasTable('cyo_design_images')) await k.schema.dropTable('cyo_design_images');
  if (await k.schema.hasTable('cyo_design_versions')) await k.schema.dropTable('cyo_design_versions');
  if (await k.schema.hasTable('cyo_designs')) await k.schema.dropTable('cyo_designs');
  if (await k.schema.hasTable('customers')) {
    if (await k.schema.hasColumn('customers', 'cyo_image_generations_count')) {
      await k.schema.alterTable('customers', t => { t.dropColumn('cyo_image_generations_count'); });
    }
    if (await k.schema.hasColumn('customers', 'cyo_image_generations_limit')) {
      await k.schema.alterTable('customers', t => { t.dropColumn('cyo_image_generations_limit'); });
    }
  }
}
