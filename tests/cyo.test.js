import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import knex from 'knex';
import {
  getCustomerQuota,
  reserveImageQuota,
  refundImageQuota,
  extractJewelleryAttributes,
  evaluateDesignFeasibility,
  generateMatchingJewelleryRecommendations,
  createNewDesign,
  listCustomerDesigns,
  getCustomerDesignDetail,
  deleteCustomerDesign,
  executeDesignGeneration,
  uploadReferenceImage,
  submitDesignForQuotation,
  acceptQuotation,
  adminListDesigns,
  adminGetDesign,
  adminUpdateDesignStatus,
  adminCreateQuotation,
  adminUpdateCustomerQuota
} from '../server/cyo.js';

// Setup isolated in-memory SQLite database for unit tests
async function createTestDb() {
  const k = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true
  });

  // Create minimal schema for CYO
  await k.schema.createTable('customers', t => {
    t.increments('id').primary();
    t.string('email', 254).notNullable().unique();
    t.string('name', 100).notNullable();
    t.string('password_hash').notNullable();
    t.integer('cyo_image_generations_count').notNullable().defaultTo(0);
    t.integer('cyo_image_generations_limit').notNullable().defaultTo(3);
    t.string('created_at').notNullable();
  });

  await k.schema.createTable('cyo_designs', t => {
    t.increments('id').primary();
    t.integer('customer_id').unsigned().notNullable();
    t.string('title', 255).notNullable();
    t.string('category', 100).notNullable().defaultTo('Necklace');
    t.text('initial_prompt').notNullable();
    t.integer('current_version_id').unsigned().nullable();
    t.string('status', 50).notNullable().defaultTo('Draft');
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
  });

  await k.schema.createTable('cyo_design_versions', t => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable();
    t.integer('version_number').notNullable().defaultTo(1);
    t.text('prompt').notNullable();
    t.text('attributes').nullable();
    t.string('ai_provider', 100).nullable();
    t.string('ai_model', 100).nullable();
    t.string('generation_status', 50).notNullable().defaultTo('completed');
    t.string('created_at').notNullable();
  });

  await k.schema.createTable('cyo_design_images', t => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable();
    t.integer('version_id').unsigned().nullable();
    t.string('view_type', 50).notNullable().defaultTo('front');
    t.string('image_url', 1000).notNullable();
    t.string('reference_image_url', 1000).nullable();
    t.text('prompt').nullable();
    t.string('status', 50).notNullable().defaultTo('active');
    t.string('created_at').notNullable();
  });

  await k.schema.createTable('cyo_conversations', t => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable();
    t.integer('customer_id').unsigned().notNullable();
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
  });

  await k.schema.createTable('cyo_messages', t => {
    t.increments('id').primary();
    t.integer('conversation_id').unsigned().notNullable();
    t.string('role', 20).notNullable();
    t.text('content').notNullable();
    t.text('attachments').nullable();
    t.integer('design_version_id').unsigned().nullable();
    t.string('created_at').notNullable();
  });

  await k.schema.createTable('cyo_quotations', t => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable();
    t.integer('customer_id').unsigned().notNullable();
    t.decimal('quoted_amount', 12, 2).notNullable();
    t.decimal('estimated_weight_g', 8, 3).nullable();
    t.decimal('material_cost', 12, 2).nullable();
    t.decimal('gemstone_cost', 12, 2).nullable();
    t.decimal('making_cost', 12, 2).nullable();
    t.decimal('tax_cost', 12, 2).nullable();
    t.text('specifications').nullable();
    t.text('admin_notes').nullable();
    t.string('status', 50).notNullable().defaultTo('quotation_sent');
    t.string('valid_until').nullable();
    t.string('created_at').notNullable();
    t.string('updated_at').notNullable();
  });

  await k.schema.createTable('cyo_ai_usage', t => {
    t.increments('id').primary();
    t.integer('customer_id').unsigned().notNullable();
    t.integer('design_id').unsigned().nullable();
    t.integer('version_id').unsigned().nullable();
    t.string('operation', 100).notNullable();
    t.string('provider', 100).nullable();
    t.string('model', 100).nullable();
    t.integer('tokens_in').defaultTo(0);
    t.integer('tokens_out').defaultTo(0);
    t.decimal('cost_inr', 8, 4).defaultTo(0);
    t.string('status', 50).notNullable().defaultTo('success');
    t.string('created_at').notNullable();
  });

  await k.schema.createTable('cyo_audit_logs', t => {
    t.increments('id').primary();
    t.integer('staff_id').unsigned().nullable();
    t.string('action', 100).notNullable();
    t.string('target_id', 100).nullable();
    t.text('details').nullable();
    t.string('created_at').notNullable();
  });

  return k;
}

test('CYO Quota: strict limit of 3 images enforced atomically on the database', async () => {
  const k = await createTestDb();

  // Create customer with default 3-image quota
  const [customerId] = await k('customers').insert({
    name: 'Ananya Sharma',
    email: 'ananya@example.com',
    password_hash: 'hash',
    cyo_image_generations_count: 0,
    cyo_image_generations_limit: 3,
    created_at: new Date().toISOString()
  });

  // Initial check: 3 remaining
  let q = await getCustomerQuota(k, customerId);
  assert.equal(q.count, 0);
  assert.equal(q.limit, 3);
  assert.equal(q.remaining, 3);
  assert.equal(q.exhausted, false);

  // 1st generation reservation
  q = await reserveImageQuota(k, customerId);
  assert.equal(q.count, 1);
  assert.equal(q.remaining, 2);

  // 2nd generation reservation
  q = await reserveImageQuota(k, customerId);
  assert.equal(q.count, 2);
  assert.equal(q.remaining, 1);

  // 3rd generation reservation (consumes quota completely)
  q = await reserveImageQuota(k, customerId);
  assert.equal(q.count, 3);
  assert.equal(q.remaining, 0);
  assert.equal(q.exhausted, true);

  // 4th generation request: MUST BE REJECTED with 429
  await assert.rejects(
    () => reserveImageQuota(k, customerId),
    (err) => {
      assert.equal(err.status, 429);
      assert.equal(err.code, 'QUOTA_EXHAUSTED');
      assert.match(err.message, /maximum limit of 3 AI-generated images/i);
      return true;
    }
  );

  // Verify DB state remains unchanged at 3
  const row = await k('customers').where({ id: customerId }).first();
  assert.equal(row.cyo_image_generations_count, 3);

  // Refund test: if generation failed, quota is returned
  await refundImageQuota(k, customerId);
  q = await getCustomerQuota(k, customerId);
  assert.equal(q.count, 2);
  assert.equal(q.remaining, 1);
  assert.equal(q.exhausted, false);

  await k.destroy();
});

test('CYO Natural Language Attribute Extraction & Feasibility Analysis', () => {
  // 1. Traditional Kundan Bridal Necklace with Emeralds
  const attrs = extractJewelleryAttributes(
    'Create a royal traditional Maharashtrian necklace in antique gold with kundan craftsmanship and zambian emerald drops'
  );
  assert.equal(attrs.category, 'Necklace');
  assert.equal(attrs.material, 'Gold');
  assert.equal(attrs.craftsmanship, 'Kundan');
  assert.equal(attrs.finish, 'Antique Gold Finish');
  assert.match(attrs.gemstones, /Emerald/i);

  // 2. Feasibility evaluation
  const evalResult = evaluateDesignFeasibility('Necklace', attrs);
  assert.equal(evalResult.feasible, true);
  assert.ok(evalResult.estimatedWeightG > 20);
  assert.ok(evalResult.structuralNotes.length > 0);

  // 3. Complete-the-set matching
  const matching = generateMatchingJewelleryRecommendations('Necklace', attrs);
  assert.ok(matching.length >= 2);
  assert.ok(matching.some(m => m.category === 'Earrings'));
});

test('CYO Full Design Lifecycle: Create, Multi-Angle Concept Generation, Quote, and Acceptance', async () => {
  const k = await createTestDb();

  const [customerId] = await k('customers').insert({
    name: 'Pooja Hegde',
    email: 'pooja@example.com',
    password_hash: 'hash',
    cyo_image_generations_count: 0,
    cyo_image_generations_limit: 3,
    created_at: new Date().toISOString()
  });

  // 1. Customer creates a bespoke design
  const design = await createNewDesign(k, customerId, {
    title: 'Heritage Polki Choker',
    category: 'Necklace',
    prompt: 'Design an exquisite 22K gold Polki choker with green emerald drops and Basra pearls'
  });
  assert.ok(design.id);
  assert.equal(design.status, 'Draft');

  // 2. Execute Image Generation (generates 4 photorealistic angles: front, side, detail, showcase)
  const genResult = await executeDesignGeneration(k, customerId, design.id, {
    prompt: design.prompt,
    attributes: design.attributes
  });
  assert.equal(genResult.ok, true);
  assert.equal(genResult.images.length, 4);
  assert.equal(genResult.quota.remaining, 2);

  const angles = genResult.images.map(i => i.view_type);
  assert.ok(angles.includes('front'));
  assert.ok(angles.includes('side'));
  assert.ok(angles.includes('detail'));
  assert.ok(angles.includes('showcase'));

  // 3. Customer submits design for technical review
  await submitDesignForQuotation(k, customerId, design.id, 'Please quote for wedding delivery.');
  const submittedDesign = await k('cyo_designs').where({ id: design.id }).first();
  assert.equal(submittedDesign.status, 'Submitted for Review');

  // 4. Admin inspects and issues formal quotation
  const quoteResult = await adminCreateQuotation(k, 1, design.id, {
    quoted_amount: 145000,
    estimated_weight_g: 28.5,
    material_cost: 95000,
    gemstone_cost: 25000,
    making_cost: 20000,
    tax_cost: 5000,
    admin_notes: 'Crafted in certified 22K hallmarked gold with natural Zambian emeralds.',
    valid_until: '2026-12-31'
  });
  assert.equal(quoteResult.ok, true);

  const designAfterQuote = await k('cyo_designs').where({ id: design.id }).first();
  assert.equal(designAfterQuote.status, 'Quotation Sent');

  // 5. Customer accepts quotation
  await acceptQuotation(k, customerId, quoteResult.quotationId);
  const acceptedQuote = await k('cyo_quotations').where({ id: quoteResult.quotationId }).first();
  assert.equal(acceptedQuote.status, 'quotation_accepted');

  const finalDesign = await k('cyo_designs').where({ id: design.id }).first();
  assert.equal(finalDesign.status, 'Quotation Accepted');

  // Clean up any test generated images
  for (const img of genResult.images) {
    const p = path.resolve(`public${img.image_url}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  await k.destroy();
});

test('CYO Security: Customer Data Privacy & IDOR Protection', async () => {
  const k = await createTestDb();

  const [userA] = await k('customers').insert({
    name: 'Customer A',
    email: 'userA@example.com',
    password_hash: 'hash',
    created_at: new Date().toISOString()
  });

  const [userB] = await k('customers').insert({
    name: 'Customer B',
    email: 'userB@example.com',
    password_hash: 'hash',
    created_at: new Date().toISOString()
  });

  // User A creates design
  const designA = await createNewDesign(k, userA, {
    title: 'Secret Diamond Ring',
    category: 'Ring',
    prompt: 'Exclusive ring concept'
  });

  // User B tries to retrieve User A's design -> MUST FAIL
  await assert.rejects(
    () => getCustomerDesignDetail(k, userB, designA.id),
    (err) => {
      assert.match(err.message, /not found or unauthorized/i);
      return true;
    }
  );

  // User B tries to delete User A's design -> MUST FAIL
  await assert.rejects(
    () => deleteCustomerDesign(k, userB, designA.id),
    (err) => {
      assert.match(err.message, /not found or unauthorized/i);
      return true;
    }
  );

  await k.destroy();
});

test('CYO Admin Controls: Quota Inspection, Override, and Audit Logging', async () => {
  const k = await createTestDb();

  const [customerId] = await k('customers').insert({
    name: 'Kavita Rao',
    email: 'kavita@example.com',
    password_hash: 'hash',
    cyo_image_generations_count: 3,
    cyo_image_generations_limit: 3,
    created_at: new Date().toISOString()
  });

  // Admin resets customer quota to 0 with audit reason
  const updated = await adminUpdateCustomerQuota(k, 1, customerId, {
    count: 0,
    limit: 5,
    reason: 'Complimentary bridal consultation extension'
  });

  assert.equal(updated.count, 0);
  assert.equal(updated.limit, 5);
  assert.equal(updated.remaining, 5);

  // Verify audit log entry
  const audit = await k('cyo_audit_logs').where({ target_id: String(customerId) }).first();
  assert.ok(audit);
  assert.equal(audit.action, 'update_customer_quota');
  assert.match(audit.details, /bridal consultation extension/i);

  await k.destroy();
});
