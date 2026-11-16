import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, migrate } from '../server/db.js';
import { CoinCategorySeeder } from '../seeders/CoinCategorySeeder.js';
import { CoinSeeder } from '../seeders/CoinSeeder.js';
import { seedRates } from '../scripts/seed.js';
import { CoinService } from '../server/modules/coin/Services/CoinService.js';
import { CoinRepository } from '../server/modules/coin/Repositories/CoinRepository.js';
import { CoinRequest } from '../server/modules/coin/Requests/CoinRequest.js';
import { CoinMapper } from '../server/modules/coin/Mappers/CoinMapper.js';
import { CoinPolicy } from '../server/modules/coin/Policies/CoinPolicy.js';

const db = createDb(':memory:');
before(async () => {
  await migrate(db);
  await seedRates(db);
  await CoinCategorySeeder(db);
  await CoinSeeder(db);
});
after(() => db.destroy());

test('coin: policies enforce staff role permissions', () => {
  assert.equal(CoinPolicy.canView({ role: 'viewer' }), true);
  assert.equal(CoinPolicy.canView({ role: 'manager' }), true);
  assert.equal(CoinPolicy.canCreate({ role: 'viewer' }), false);
  assert.equal(CoinPolicy.canCreate({ role: 'manager' }), true);
  assert.equal(CoinPolicy.canDelete({ role: 'viewer' }), false);
  assert.equal(CoinPolicy.canDelete({ role: 'owner' }), true);
});

test('coin: requests validate create and update input strictly', () => {
  assert.throws(() => CoinRequest.validateCreate({}), /SKU is required/);
  assert.throws(() => CoinRequest.validateCreate({ sku: 'C1' }), /Name is required/);
  assert.throws(() => CoinRequest.validateCreate({ name: 'Gold Coin', sku: 'C1', metal: 'Gold', weight_g: -1 }), /Positive weight in grams is required/);

  assert.equal(CoinRequest.validateCreate({ name: '24K Gold Coin 10g', sku: 'COIN-AU-10G', metal: 'Gold', weight_g: 10 }), true);
  assert.equal(CoinRequest.validateCreate({ name: '24K Gold Coin 10g', sku: 'COIN-AU-10G', metal: 'Gold', weight_g: 10, dimension: '22 mm' }), true);
  assert.throws(() => CoinRequest.validateCreate({ name: '24K Gold Coin 10g', sku: 'COIN-AU-10G', metal: 'Gold', weight_g: 10, dimension: 'XS,S,M,L,XL,XXL,XXXL' }), /one size per row/);
  assert.equal(CoinRequest.validateUpdate({ stock: 20 }), true);
});

test('coin: service lists published bullion coins and categories', async () => {
  const service = new CoinService(db);
  const catalogue = await service.getPublishedCatalogue();
  assert.ok(Array.isArray(catalogue), 'Coin catalogue must be an array');
  assert.ok(catalogue.length > 0, 'Seeded coins must exist');

  const first = catalogue[0];
  assert.ok(first.id, 'Must have ID');
  assert.ok(first.sku, 'Must have SKU');
  assert.ok(first.name, 'Must have Name');
  assert.ok(first.weight_g > 0, 'Must have positive weight');
  assert.ok(first.price > 0 || first.fixed_price > 0, 'Must have calculated bullion price');

  const categories = await service.getCategories();
  assert.ok(Array.isArray(categories), 'Categories must be an array');
});

test('coin: complete CRUD lifecycle in dedicated tables', async () => {
  const service = new CoinService(db);
  const testSku = 'TEST-COIN-AU-50G';

  // 1. Create
  const created = await service.createCoin({
    name: '50g 24K Royal Ganesha Gold Coin',
    sku: testSku,
    metal: 'Gold',
    coin_type: 'Gold Coin',
    purity: '24K',
    weight_g: 50,
    dimension: '38mm diameter',
    denomination: '50 Grams',
    mint: 'MMTC-PAMP',
    collection: 'Devotional Bullion',
    edition: 'Festive Edition 2026',
    year_of_issue: 2026,
    certification: 'NABL Accredited & BIS Hallmarked',
    making_charge: 1500,
    pricing_mode: 'FIXED',
    fixed_price: 375000,
    stock: 10,
    description: 'Special 50g 999.9 pure gold commemorative bullion.',
    image: '/assets/coins/test-coin.webp',
    status: 'published'
  }, 1);

  assert.ok(created, 'Coin must be created');
  assert.equal(created.sku, testSku);
  assert.equal(created.weight_g, 50);
  assert.equal(created.stock, 10);
  assert.equal(created.variants.length, 1, 'Default variant must be created');
  assert.equal(created.images.length, 1, 'Hero image must be created in coin_images');

  // Verify inventory log
  const invLog = await db('coin_inventory').where({ sku: testSku }).first();
  assert.ok(invLog, 'Coin inventory log must exist');
  assert.equal(invLog.quantity_change, 10);

  // 2. Read by SKU and Slug
  const bySku = await service.getBySku(testSku);
  assert.ok(bySku, 'Must retrieve by SKU');
  assert.equal(bySku.id, created.id);

  const bySlug = await service.getPublishedBySlug(created.slug);
  assert.ok(bySlug, 'Must retrieve storefront detail by slug');
  assert.equal(bySlug.sku, testSku);

  // 3. Update
  const updated = await service.updateCoin(testSku, {
    stock: 12,
    making_charge: 1800
  }, 1);

  assert.equal(updated.stock, 12);
  assert.equal(updated.making_charge, 1800);

  // 4. Stock deduction and restoration
  await db.transaction(async trx => {
    const deducted = await service.deductStock(trx, testSku, 3);
    assert.equal(deducted, true, 'Stock deduction must succeed');
  });

  const afterDeduct = await service.getBySku(testSku);
  assert.equal(afterDeduct.stock, 9, 'Stock must decrease from 12 to 9');

  await db.transaction(async trx => {
    const restored = await service.restoreStock(trx, testSku, 3, 'ORD-COIN-1');
    assert.equal(restored, true, 'Stock restore must succeed');
  });

  const afterRestore = await service.getBySku(testSku);
  assert.equal(afterRestore.stock, 12, 'Stock must restore to 12');

  // 5. Export CSV
  const csv = await service.exportCsv();
  assert.ok(typeof csv === 'string');
  assert.ok(csv.includes(testSku), 'CSV must contain test SKU');

  // 6. Delete
  const deleted = await service.deleteCoin(testSku);
  assert.equal(deleted, true);

  const afterDelete = await service.getBySku(testSku);
  assert.equal(afterDelete, null);
});
