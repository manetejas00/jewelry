import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDb,migrate} from '../server/db.js';
import {validate,schemas,previewImport,publishImport,exportCsv} from '../server/importer.js';
import {stringify} from 'csv-stringify/sync';

const stamp = new Date(Date.now() - 1000).toISOString();
const sampleKurta = {
  supplier: 'Lucknow Heritage Maison',
  product_code: 'CCK-TEST-NOOR',
  sku: 'CCK-TEST-NOOR-M',
  name: 'Noor Lucknowi Chikankari Kurta',
  category: 'Chicken Curry Kurtas',
  description: 'Handcrafted pure mulmul cotton kurta with delicate floral Chikankari embroidery.',
  fabric: 'Pure Mulmul Cotton',
  craftsmanship: 'Handcrafted Lucknowi Chikankari',
  size: 'M (38)',
  color: 'Ivory',
  finish: 'Hand Embroidered',
  image: '/assets/products/cck-noor-ivory/hero.webp',
  pricing_mode: 'FIXED',
  fixed_price: '3499.00',
  stock: '25',
  status: 'published',
  source_timestamp: stamp
};

const csv = rows => stringify(rows, { header: true, columns: schemas.kurtas });

test('kurta validation accepts standard format and rejects malformed data', () => {
  // Valid CSV
  const validRes = validate('kurtas', csv([sampleKurta]));
  assert.deepEqual(validRes.errors, [], 'Valid kurta row must have zero validation errors');

  // Rejects invalid pricing mode
  assert.ok(
    validate('kurtas', csv([{ ...sampleKurta, pricing_mode: 'GOLD_LINKED' }])).errors.some(e => e.field === 'pricing_mode'),
    'Should reject pricing_mode other than FIXED'
  );

  // Rejects invalid prices
  for (const badPrice of ['0', '-100', 'abc', '10.999']) {
    assert.ok(
      validate('kurtas', csv([{ ...sampleKurta, fixed_price: badPrice }])).errors.some(e => e.field === 'fixed_price'),
      `Should reject invalid price: ${badPrice}`
    );
  }

  // Rejects negative or non-integer stock
  for (const badStock of ['-1', '10.5', 'many']) {
    assert.ok(
      validate('kurtas', csv([{ ...sampleKurta, stock: badStock }])).errors.some(e => e.field === 'stock'),
      `Should reject invalid stock: ${badStock}`
    );
  }

  // Rejects duplicate SKU within batch
  const dupCheck = validate('kurtas', csv([sampleKurta, sampleKurta]));
  assert.ok(dupCheck.errors.some(e => e.field === 'sku'), 'Should reject duplicate SKU in batch');

  // Rejects invalid source_timestamp
  assert.ok(
    validate('kurtas', csv([{ ...sampleKurta, source_timestamp: 'invalid-date' }])).errors.some(e => e.field === 'source_timestamp'),
    'Should reject invalid source_timestamp'
  );

  // Rejects bad image path with traversal or javascript:
  assert.ok(
    validate('kurtas', csv([{ ...sampleKurta, image: '/assets/../secret.png' }])).errors.some(e => e.field === 'image'),
    'Should reject image with parent traversal'
  );

  // Rejects wrong headers
  assert.ok(validate('kurtas', 'wrong,headers\n1,2').errors.length, 'Should reject CSV with mismatched headers');
});

test('kurta import preview and publication pipeline writes is_kurta products safely', async () => {
  const k = createDb(':memory:');
  try {
    await migrate(k);

    // Preview
    const staged = await previewImport(k, 'kurtas', csv([sampleKurta]));
    assert.equal(staged.status, 'staged', 'Preview status must be staged');
    assert.equal(staged.summary.created, 1);
    assert.equal(await k('products').first(), undefined, 'No rows inserted during preview');

    // Publish
    const pubResult = await publishImport(k, staged.id);
    assert.equal(pubResult.created, 1);

    const inserted = await k('products').where({ sku: sampleKurta.sku }).first();
    assert.ok(inserted, 'Product must be inserted into products table');
    assert.equal(Boolean(inserted.is_kurta), true, 'is_kurta flag must be true');
    assert.equal(inserted.category, 'Chicken Curry Kurtas');
    assert.equal(inserted.pricing_mode, 'FIXED');
    assert.equal(Number(inserted.fixed_price), 3499);
    assert.equal(inserted.stock, 25);
    assert.equal(inserted.metal, 'Pure Mulmul Cotton');
    assert.equal(inserted.purity, 'Handcrafted Lucknowi Chikankari');
    assert.equal(inserted.size, 'M (38)');

    // Repeat publish is idempotent
    const repeatPub = await publishImport(k, staged.id);
    assert.equal(repeatPub.duplicate, true, 'Repeat publish must return duplicate: true');

    // Re-previewing the exact same checksum is recognized as duplicate
    const repeatPrev = await previewImport(k, 'kurtas', csv([sampleKurta]));
    assert.equal(repeatPrev.duplicate, true, 'Re-previewing same checksum must return duplicate: true');

    // Export round-trip
    const allKurtas = await k('products').where({ is_kurta: true });
    const exported = exportCsv('kurtas', allKurtas);
    const validatedExport = validate('kurtas', exported);
    assert.deepEqual(validatedExport.errors, [], 'Exported kurta CSV must validate cleanly against schemas.kurtas');

    // Update existing kurta with a fresh snapshot
    const newerStamp = new Date().toISOString();
    const updatedKurta = {
      ...sampleKurta,
      fixed_price: '3699.00',
      stock: '40',
      source_timestamp: newerStamp
    };

    const updatePreview = await previewImport(k, 'kurtas', csv([updatedKurta]));
    assert.equal(updatePreview.status, 'staged');
    assert.equal(updatePreview.summary.updated, 1);

    await publishImport(k, updatePreview.id);
    const updatedRow = await k('products').where({ sku: sampleKurta.sku }).first();
    assert.equal(Number(updatedRow.fixed_price), 3699);
    assert.equal(updatedRow.stock, 40);
  } finally {
    await k.destroy();
  }
});

test('kurta stock snapshot deducts later paid orders', async () => {
  const k = createDb(':memory:');
  try {
    await migrate(k);

    const initialStamp = new Date(Date.now() - 50000).toISOString();
    const kurta = { ...sampleKurta, source_timestamp: initialStamp, stock: '50' };

    const first = await previewImport(k, 'kurtas', csv([kurta]));
    await publishImport(k, first.id);

    // Simulate an order placed after the snapshot
    await k('orders').insert({
      id: 'order-kurta-test',
      status: 'confirmed',
      total: 3499,
      created_at: new Date(Date.now() - 10000).toISOString()
    });
    await k('order_items').insert({
      order_id: 'order-kurta-test',
      sku: kurta.sku,
      quantity: 5,
      snapshot: 'test snapshot'
    });

    // Re-importing a snapshot dated BEFORE the order should deduct the 5 sold pieces
    const nextStamp = new Date(Date.now() - 20000).toISOString();
    const nextBatch = await previewImport(k, 'kurtas', csv([{ ...kurta, stock: '50', source_timestamp: nextStamp }]));
    await publishImport(k, nextBatch.id);

    const currentKurta = await k('products').where({ sku: kurta.sku }).first();
    assert.equal(currentKurta.stock, 45, 'Stock should be 50 - 5 sold = 45');
  } finally {
    await k.destroy();
  }
});

test('sample kurta files exist and conform to schemas.kurtas', () => {
  const templatePath = 'samples/kurtas-template.csv';
  const examplePath = 'samples/kurtas-example.csv';

  assert.ok(fs.existsSync(templatePath), 'samples/kurtas-template.csv must exist');
  assert.ok(fs.existsSync(examplePath), 'samples/kurtas-example.csv must exist');

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const exampleContent = fs.readFileSync(examplePath, 'utf8');

  assert.deepEqual(templateContent.trim().split(','), schemas.kurtas, 'Template header must match schemas.kurtas exactly');
  assert.deepEqual(validate('kurtas', exampleContent).errors, [], 'Example CSV must validate with 0 errors');
});
