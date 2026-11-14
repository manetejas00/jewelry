import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db.js';
import { listKurtas, kurtaBySlug, adminListKurtas, updateKurta, KURTA_SIZES } from '../server/kurtas.js';

after(async () => {
  await db.destroy();
});

test('kurtas: KURTA_SIZES constant details all 7 sizes with full measurements', () => {
  const codes = KURTA_SIZES.map(s => s.code);
  assert.deepEqual(codes, ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], 'Must define exactly XS to XXXL');

  for (const size of KURTA_SIZES) {
    assert.ok(size.chest, `Size ${size.code} must have chest measurement`);
    assert.ok(size.waist, `Size ${size.code} must have waist measurement`);
    assert.ok(size.hip, `Size ${size.code} must have hip measurement`);
    assert.ok(size.shoulder, `Size ${size.code} must have shoulder measurement`);
    assert.ok(size.length, `Size ${size.code} must have length measurement`);
    assert.ok(size.sleeve, `Size ${size.code} must have sleeve measurement`);
  }
});

test('kurtas: listKurtas returns distinct styles with 7-size support and pricing', async () => {
  const kurtas = await listKurtas(db);
  assert.ok(Array.isArray(kurtas), 'listKurtas must return an array');
  assert.ok(kurtas.length >= 4, `Expected at least 4 seeded styles, found ${kurtas.length}`);

  const ivory = kurtas.find(k => k.product_code === 'lucknowi-ivory-chikankari-cotton-kurta');
  assert.ok(ivory, 'Noor-e-Awadh Ivory kurta must be present in listing');
  assert.equal(ivory.is_kurta, true, 'is_kurta flag must be true');
  assert.ok(ivory.price > 0, 'Must have calculated price');
  assert.ok(Array.isArray(ivory.sizes), 'sizes must be an array');
  assert.equal(ivory.sizes.length, 7, 'Must support all 7 sizes');

  // Verify size codes
  const sizeCodes = ivory.sizes.map(s => s.code);
  assert.ok(sizeCodes.includes('XS'), 'Must support XS');
  assert.ok(sizeCodes.includes('S'), 'Must support S');
  assert.ok(sizeCodes.includes('M'), 'Must support M');
  assert.ok(sizeCodes.includes('L'), 'Must support L');
  assert.ok(sizeCodes.includes('XL'), 'Must support XL');
  assert.ok(sizeCodes.includes('XXL'), 'Must support XXL');
  assert.ok(sizeCodes.includes('XXXL'), 'Must support XXXL');
});

test('kurtas: kurtaBySlug returns all 7 variants, multi-angle images, and size chart', async () => {
  const kurta = await kurtaBySlug(db, 'lucknowi-ivory-chikankari-cotton-kurta');
  assert.ok(kurta, 'Kurta must resolve by slug or product_code');
  assert.equal(kurta.product_code, 'lucknowi-ivory-chikankari-cotton-kurta');
  assert.equal(kurta.name, 'Noor-e-Awadh Ivory Chikankari Mulmul Kurta');
  assert.equal(kurta.is_kurta, true);

  // Check 7 size variants
  assert.ok(Array.isArray(kurta.variants), 'variants must be an array');
  assert.equal(kurta.variants.length, 7, 'Must return exactly 7 variants for all sizes');

  const xs = kurta.variants.find(v => v.size.startsWith('XS'));
  const xxxl = kurta.variants.find(v => v.size.startsWith('XXXL'));
  assert.ok(xs, 'Variant XS must exist');
  assert.ok(xxxl, 'Variant XXXL must exist');
  assert.equal(xs.sku, 'CCK-IVORY-XS');
  assert.equal(xxxl.sku, 'CCK-IVORY-XXXL');

  // Check multi-angle images
  assert.ok(Array.isArray(kurta.angle_images), 'angle_images must be an array');
  const roles = kurta.angle_images.map(img => img.role);
  assert.ok(roles.includes('hero'), 'Must contain hero angle');
  assert.ok(roles.includes('front'), 'Must contain front angle');
  assert.ok(roles.includes('right'), 'Must contain right angle');
  assert.ok(roles.includes('left'), 'Must contain left angle');
  assert.ok(roles.includes('back'), 'Must contain back angle');

  // Check size chart
  assert.ok(Array.isArray(kurta.size_chart), 'size_chart must be populated');
  assert.equal(kurta.size_chart.length, 7, 'size_chart must contain 7 rows');
});

test('kurtas: adminListKurtas returns kurtas with size stock breakdown', async () => {
  const adminKurtas = await adminListKurtas(db);
  assert.ok(Array.isArray(adminKurtas), 'adminListKurtas must return an array');
  assert.ok(adminKurtas.length >= 4);

  const style = adminKurtas[0];
  assert.ok(style.stocks, 'Admin kurta must contain size stocks map');
  assert.ok(style.stocks['XS (34)'] !== undefined, 'Stocks map must contain XS');
  assert.ok(style.stocks['XXXL (46)'] !== undefined, 'Stocks map must contain XXXL');
});

test('kurtas: updateKurta modifies per-size inventory accurately', async () => {
  const code = 'sky-blue-mulmul-chikankari-kurta';
  const updated = await updateKurta(db, code, {
    stocks: {
      'XS (34)': 11,
      'S (36)': 14,
      'M (38)': 20,
      'L (40)': 22,
      'XL (42)': 15,
      'XXL (44)': 9,
      'XXXL (46)': 0 // test out-of-stock size
    }
  });

  assert.equal(updated.product_code, code);
  const detail = await kurtaBySlug(db, code);
  const xxxl = detail.variants.find(v => v.size.startsWith('XXXL'));
  assert.equal(xxxl.stock, 0, 'XXXL stock should be updated to 0');
  assert.equal(xxxl.checkout_available, false, 'Out-of-stock variant must have checkout_available false');

  const m = detail.variants.find(v => v.size.startsWith('M'));
  assert.equal(m.stock, 20, 'M stock should be updated to 20');
  assert.equal(m.checkout_available, true, 'In-stock variant must be checkout available');
});
