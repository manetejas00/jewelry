import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db.js';
import { KurtaService } from '../server/modules/kurta/Services/KurtaService.js';
import { KurtaRepository } from '../server/modules/kurta/Repositories/KurtaRepository.js';
import { KurtaRequest } from '../server/modules/kurta/Requests/KurtaRequest.js';
import { KurtaMapper } from '../server/modules/kurta/Mappers/KurtaMapper.js';
import { KurtaPolicy } from '../server/modules/kurta/Policies/KurtaPolicy.js';
import { KURTA_SIZES } from '../server/modules/kurta/Constants/KurtaConstants.js';

after(async () => {
  const code = 'test-festive-silk-kurta';
  await db('kurta_images').where({ product_code: code }).del().catch(() => {});
  await db('kurta_inventory').whereIn('sku', KURTA_SIZES.map(s => `CCK-TEST-FESTIVE-${s.code}`)).del().catch(() => {});
  await db('kurta_variants').where({ product_code: code }).del().catch(() => {});
  await db('kurtas').where({ product_code: code }).del().catch(() => {});
  await db.destroy();
});

test('kurta: policies enforce staff role permissions', () => {
  assert.equal(KurtaPolicy.canView({ role: 'viewer' }), true);
  assert.equal(KurtaPolicy.canCreate({ role: 'viewer' }), false);
  assert.equal(KurtaPolicy.canCreate({ role: 'manager' }), true);
  assert.equal(KurtaPolicy.canDelete({ role: 'owner' }), true);
});

test('kurta: requests validate create and update input strictly', () => {
  assert.throws(() => KurtaRequest.validateCreate({}), /Kurta name is required/);
  assert.throws(() => KurtaRequest.validateCreate({ name: 'Kurta', price: -10 }), /Price must be a non-negative number/);

  assert.equal(KurtaRequest.validateCreate({ name: 'Chanderi Silk Kurta', price: 4990 }), true);
  assert.equal(KurtaRequest.validateUpdate({ price: 5490 }), true);
});

test('kurta: service lists published kurtas and formats family cards with colors and sizes', async () => {
  const service = new KurtaService(db);
  const catalogue = await service.getPublishedCatalogue();
  assert.ok(Array.isArray(catalogue), 'Kurta catalogue must be an array');
  assert.ok(catalogue.length > 0, 'Seeded kurtas must exist');

  const first = catalogue[0];
  assert.ok(first.id, 'Must have ID');
  assert.ok(first.product_code, 'Must have product_code');
  assert.ok(first.name, 'Must have name');
  assert.ok(first.price > 0, 'Must have price');
  assert.ok(Array.isArray(first.sizes), 'sizes must be an array');
  assert.equal(first.sizes.length, 7, 'Must support 7 standard sizes');

  const categories = await service.getCategories();
  assert.ok(Array.isArray(categories));
});

test('kurta: complete CRUD lifecycle with 7-size auto-variant creation', async () => {
  const service = new KurtaService(db);
  const code = 'test-festive-silk-kurta';

  // 1. Create with sizes
  const created = await service.createKurta({
    name: 'Test Festive Silk Chikankari Kurta',
    product_code: code,
    description: 'A luxurious Chanderi silk kurta with delicate shadow work.',
    fabric: 'Chanderi Silk',
    pattern: 'Shadow Work Chikankari',
    fit: 'Straight Fit',
    sleeve_type: 'Full Sleeves',
    neck_type: 'Mandarin Collar',
    occasion: 'Weddings & Celebrations',
    gender: 'Women',
    price: 6490,
    status: 'published',
    sizes: {
      'XS (34)': 5,
      'S (36)': 8,
      'M (38)': 10,
      'L (40)': 12,
      'XL (42)': 8,
      'XXL (44)': 6,
      'XXXL (46)': 4
    }
  }, 1);

  assert.ok(created, 'Kurta must be created');
  assert.equal(created.product_code, code);
  assert.equal(created.stock, 53, 'Total stock must equal sum of sizes (5+8+10+12+8+6+4)');
  assert.equal(created.variants.length, 7, 'Must generate exactly 7 size variants');

  // Verify inventory logs
  const invCount = await db('kurta_inventory').where({ kurta_id: created.id }).count('id as c').first();
  assert.equal(Number(invCount.c), 7, 'Must log initial inventory for all 7 variants');

  // 2. Read by Code and Slug
  const byCode = await service.getByCode(code);
  assert.ok(byCode);
  assert.equal(byCode.id, created.id);

  const bySlug = await service.getPublishedBySlug(code);
  assert.ok(bySlug);
  assert.equal(bySlug.product_code, code);
  assert.equal(bySlug.size_chart.length, 7);

  // 3. Update sizes and stock
  const updated = await service.updateKurta(code, {
    name: 'Updated Festive Silk Kurta',
    sizes: {
      'XS (34)': 10,
      'M (38)': 15
    }
  }, 1);

  assert.equal(updated.name, 'Updated Festive Silk Kurta');
  assert.equal(updated.stock, 63, 'Stock must update to reflect modified sizes');

  // 4. Stock deduction and restoration for specific size variant
  const mVariant = updated.variants.find(v => v.size.startsWith('M'));
  assert.ok(mVariant, 'M size variant must exist');

  await db.transaction(async trx => {
    const deducted = await service.deductStock(trx, mVariant.sku, 3);
    assert.equal(deducted, true);
  });

  const afterDeduct = await service.getByCode(code);
  const afterDeductM = afterDeduct.variants.find(v => v.size.startsWith('M'));
  assert.equal(afterDeductM.stock, 12, 'M size stock must decrease from 15 to 12');
  assert.equal(afterDeduct.stock, 60, 'Parent kurta total stock must decrease from 63 to 60');

  await db.transaction(async trx => {
    const restored = await service.restoreStock(trx, mVariant.sku, 3, 'ORD-KURTA-1');
    assert.equal(restored, true);
  });

  const afterRestore = await service.getByCode(code);
  const afterRestoreM = afterRestore.variants.find(v => v.size.startsWith('M'));
  assert.equal(afterRestoreM.stock, 15, 'M size stock must restore to 15');

  // 5. Export CSV
  const csv = await service.exportCsv();
  assert.ok(typeof csv === 'string');
  assert.ok(csv.includes(code));

  // 6. Delete
  const deleted = await service.deleteKurta(code);
  assert.equal(deleted, true);

  const afterDelete = await service.getByCode(code);
  assert.equal(afterDelete, null);
});
