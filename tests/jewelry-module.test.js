import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, migrate } from '../server/db.js';
import { JewelryCategorySeeder } from '../seeders/JewelryCategorySeeder.js';
import { JewelrySeeder } from '../seeders/JewelrySeeder.js';
import { seedRates } from '../scripts/seed.js';
import { JewelryService } from '../server/modules/jewelry/Services/JewelryService.js';
import { JewelryRepository } from '../server/modules/jewelry/Repositories/JewelryRepository.js';
import { JewelryRequest } from '../server/modules/jewelry/Requests/JewelryRequest.js';
import { JewelryMapper } from '../server/modules/jewelry/Mappers/JewelryMapper.js';
import { JewelryPolicy } from '../server/modules/jewelry/Policies/JewelryPolicy.js';

const db = createDb(':memory:');
before(async () => {
  await migrate(db);
  await seedRates(db);
  await JewelryCategorySeeder(db);
  await JewelrySeeder(db);
});
after(() => db.destroy());

test('jewelry: policies correctly enforce staff role permissions', () => {
  assert.equal(JewelryPolicy.canView({ role: 'viewer' }), true);
  assert.equal(JewelryPolicy.canView({ role: 'manager' }), true);
  assert.equal(JewelryPolicy.canView({ role: 'owner' }), true);
  assert.equal(JewelryPolicy.canView(null), false);

  assert.equal(JewelryPolicy.canCreate({ role: 'viewer' }), false);
  assert.equal(JewelryPolicy.canCreate({ role: 'manager' }), true);
  assert.equal(JewelryPolicy.canCreate({ role: 'owner' }), true);

  assert.equal(JewelryPolicy.canDelete({ role: 'viewer' }), false);
  assert.equal(JewelryPolicy.canDelete({ role: 'owner' }), true);
});

test('jewelry: requests validate create and update schemas strictly', () => {
  assert.throws(() => JewelryRequest.validateCreate({}), /SKU is required/);
  assert.throws(() => JewelryRequest.validateCreate({ sku: 'SOL-01' }), /Name is required/);
  assert.throws(() => JewelryRequest.validateCreate({ name: 'Ring', sku: 'R1', net_weight_g: -5 }), /positive net_weight_g/);
  assert.throws(() => JewelryRequest.validateCreate({ name: 'Ring', sku: 'R1', net_weight_g: 4.5, stock: -1 }), /Stock must be an integer >= 0/);

  assert.equal(JewelryRequest.validateCreate({ name: 'Aurelia Ring', sku: 'AUR-001', net_weight_g: 4.5 }), true);
  assert.equal(JewelryRequest.validateCreate({ name: 'Aurelia Ring', sku: 'AUR-001', net_weight_g: 4.5, size: '12' }), true);
  assert.throws(() => JewelryRequest.validateCreate({ name: 'Ring', sku: 'R1', net_weight_g: 4.5, size: 'XS,S,M,L,XL,XXL,XXXL' }), /one size per row/);
  assert.equal(JewelryRequest.validateUpdate({ name: 'Aurelia Grand Ring', stock: 15 }), true);
});

test('jewelry: service lists published catalogue and categories', async () => {
  const service = new JewelryService(db);
  const catalogue = await service.getPublishedCatalogue();
  assert.ok(Array.isArray(catalogue), 'Catalogue must be an array');
  assert.ok(catalogue.length > 0, 'Seeded catalogue must not be empty');

  const first = catalogue[0];
  assert.ok(first.id, 'Must have ID');
  assert.ok(first.sku, 'Must have SKU');
  assert.ok(first.name, 'Must have Name');
  assert.ok(first.slug, 'Must have Slug');
  assert.ok(first.price > 0 || first.fixed_price > 0, 'Must have price');

  const categories = await service.getCategories();
  assert.ok(Array.isArray(categories), 'Categories must be an array');
  assert.ok(categories.length > 0, 'Categories must exist');
});

test('jewelry: complete CRUD lifecycle in dedicated tables', async () => {
  const service = new JewelryService(db);
  const testSku = 'TEST-JW-SOLITAIRE';

  // 1. Create
  const created = await service.createJewelry({
    name: 'Test Solitaire Diamond Ring',
    sku: testSku,
    product_code: 'test-jw-solitaire',
    category: 'Rings',
    description: 'A handcrafted diamond ring for testing.',
    metal: 'Gold',
    purity: '18K',
    net_weight_g: 3.5,
    gross_weight_g: 3.8,
    diamond_details: '0.50 ct VVS1 E',
    making_charges: 1200,
    pricing_mode: 'FIXED',
    fixed_price: 65000,
    stock: 5,
    status: 'published',
    image: '/assets/products/rings/solitaire.webp'
  }, 1);

  assert.ok(created, 'Jewelry must be created');
  assert.equal(created.sku, testSku);
  assert.equal(created.name, 'Test Solitaire Diamond Ring');
  assert.equal(created.stock, 5);
  assert.equal(created.variants.length, 1, 'Default variant must be created');
  assert.equal(created.images.length, 1, 'Hero image must be created in jewelry_images');

  // Verify inventory log
  const invLog = await db('jewelry_inventory').where({ sku: testSku }).first();
  assert.ok(invLog, 'Inventory log must exist');
  assert.equal(invLog.quantity_change, 5);

  // 2. Read by SKU and Slug
  const bySku = await service.getBySku(testSku);
  assert.ok(bySku, 'Must retrieve by SKU');
  assert.equal(bySku.id, created.id);

  const bySlug = await service.getPublishedBySlug(created.slug);
  assert.ok(bySlug, 'Must retrieve storefront detail by slug');
  assert.equal(bySlug.sku, testSku);

  // 3. Update
  const updated = await service.updateJewelry(testSku, {
    name: 'Updated Solitaire Ring',
    stock: 8,
    fixed_price: 68000
  }, 1);

  assert.equal(updated.name, 'Updated Solitaire Ring');
  assert.equal(updated.stock, 8);

  // 4. Stock deduction and restoration
  await db.transaction(async trx => {
    const deducted = await service.deductStock(trx, testSku, 2);
    assert.equal(deducted, true, 'Stock deduction must succeed');
  });

  const afterDeduct = await service.getBySku(testSku);
  assert.equal(afterDeduct.stock, 6, 'Stock must decrease from 8 to 6');

  await db.transaction(async trx => {
    const restored = await service.restoreStock(trx, testSku, 2, 'ORD-TEST-1');
    assert.equal(restored, true, 'Stock restore must succeed');
  });

  const afterRestore = await service.getBySku(testSku);
  assert.equal(afterRestore.stock, 8, 'Stock must restore to 8');

  // 5. Export CSV
  const csv = await service.exportCsv();
  assert.ok(typeof csv === 'string', 'CSV export must return string');
  assert.ok(csv.includes(testSku), 'CSV must contain test SKU');

  // 6. Delete
  const deleted = await service.deleteJewelry(testSku);
  assert.equal(deleted, true, 'Delete must succeed');

  const afterDelete = await service.getBySku(testSku);
  assert.equal(afterDelete, null, 'Deleted item must not exist');
});
