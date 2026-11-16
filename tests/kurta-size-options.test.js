import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, migrate, now } from '../server/db.js';
import { quote } from '../server/pricing.js';
import { KurtaResource } from '../server/modules/kurta/Resources/KurtaResource.js';
import { splitCombinedKurtaSizes } from '../server/modules/kurta/split-combined-sizes.js';
import {
  expandCombinedKurtaVariant,
  kurtaSizeCode,
  kurtaSizesInValue,
  parentKurtaSku,
  sizedKurtaSku
} from '../shared/kurta-sizes.js';

const combined = 'XS,S,M,L,XL,XXL,XXXL';

test('kurta size lists stay one size unless several codes are packed together', () => {
  assert.deepEqual(kurtaSizesInValue('XS (34)').map(size => size.code), ['XS']);
  assert.deepEqual(kurtaSizesInValue('XXL (44)').map(size => size.code), ['XXL']);
  assert.equal(kurtaSizeCode('XL (42)'), 'XL');
  assert.deepEqual(kurtaSizesInValue(combined).map(size => size.code), ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
  assert.equal(sizedKurtaSku('CCK-MSK-016', 'S'), 'CCK-MSK-016-S');
  assert.equal(sizedKurtaSku('CCK-MSK-016-XS', 'XS'), 'CCK-MSK-016-XS');
  assert.equal(parentKurtaSku('CCK-MSK-016-XXXL'), 'CCK-MSK-016');
  assert.equal(parentKurtaSku('CCK-MSK-016-S'), 'CCK-MSK-016');
});

test('a packed size string becomes one selectable variant per size', () => {
  const [xs, s, m] = expandCombinedKurtaVariant({
    sku: 'CCK-MSK-016',
    slug: 'msk-016-rania-magenta-rayon-set',
    size: combined,
    stock: 25,
    price: 739
  });
  assert.equal(xs.sku, 'CCK-MSK-016');
  assert.equal(xs.size, 'XS (34)');
  assert.equal(s.sku, 'CCK-MSK-016-S');
  assert.equal(s.size, 'S (36)');
  assert.equal(m.size, 'M (38)');
  assert.equal(m.stock, 25);
  const detail = KurtaResource.toStorefrontDetail({
    id: 16,
    product_code: 'msk-016-rania-magenta-rayon-set',
    sku: 'CCK-MSK-016',
    slug: 'msk-016-rania-magenta-rayon-set',
    name: 'Rania Berry Magenta Rayon Chikankari Kurta & Palazzo Set',
    price: 739,
    stock: 25,
    status: 'published',
    variants: [{ sku: 'CCK-MSK-016', slug: 'msk-016-rania-magenta-rayon-set', size: combined, color: 'Berry Magenta', stock: 25, price: 739, fixed_price: 739, status: 'published' }]
  });
  assert.deepEqual(detail.variants.map(variant => variant.size), [
    'XS (34)', 'S (36)', 'M (38)', 'L (40)', 'XL (42)', 'XXL (44)', 'XXXL (46)'
  ]);
  assert.equal(detail.variants.find(variant => variant.size.startsWith('M')).sku, 'CCK-MSK-016-M');
});

test('split combined kurta rows and quote the chosen size', async () => {
  const k = createDb(':memory:');
  try {
    await migrate(k);
    const stamp = now();
    const [kurtaId] = await k('kurtas').insert({
      sku: 'CCK-MSK-016',
      product_code: 'msk-016-rania-magenta-rayon-set',
      slug: 'msk-016-rania-magenta-rayon-set',
      name: 'Rania Berry Magenta Rayon Chikankari Kurta & Palazzo Set',
      price: 739,
      fixed_price: 739,
      stock: 25,
      status: 'published',
      created_at: stamp,
      updated_at: stamp
    });
    await k('kurta_variants').insert({
      kurta_id: kurtaId,
      product_code: 'msk-016-rania-magenta-rayon-set',
      sku: 'CCK-MSK-016',
      slug: 'msk-016-rania-magenta-rayon-set-cck-msk-016',
      size: combined,
      color: 'Berry Magenta',
      price: 739,
      fixed_price: 739,
      stock: 25,
      status: 'published',
      created_at: stamp,
      updated_at: stamp
    });
    await k('products').insert({
      sku: 'CCK-MSK-016',
      product_code: 'msk-016-rania-magenta-rayon-set',
      slug: 'msk-016-rania-magenta-rayon-set-cck-msk-016',
      name: 'Rania Berry Magenta Rayon Chikankari Kurta & Palazzo Set',
      category: 'Chicken Curry Kurtas',
      is_kurta: 1,
      size: combined,
      pricing_mode: 'FIXED',
      fixed_price: 739,
      stock: 25,
      status: 'published',
      updated_at: stamp
    });

    const before = await quote(k, [{ sku: 'CCK-MSK-016-M', quantity: 1 }]);
    assert.equal(before.lines[0].size, 'M (38)');
    assert.equal(before.lines[0].name, 'Rania Berry Magenta Rayon Chikankari Kurta & Palazzo Set');

    await splitCombinedKurtaSizes(k);
    const rows = await k('kurta_variants').where({ product_code: 'msk-016-rania-magenta-rayon-set' }).orderBy('id');
    assert.deepEqual(rows.map(row => row.size), [
      'XS (34)', 'S (36)', 'M (38)', 'L (40)', 'XL (42)', 'XXL (44)', 'XXXL (46)'
    ]);
    assert.equal(rows[0].sku, 'CCK-MSK-016');
    assert.equal(rows.find(row => row.size === 'M (38)').sku, 'CCK-MSK-016-M');
    const parent = await k('kurtas').where({ id: kurtaId }).first();
    assert.equal(Number(parent.stock), 175);

    const after = await quote(k, [{ sku: 'CCK-MSK-016-XL', quantity: 1 }]);
    assert.equal(after.lines[0].size, 'XL (42)');
    await splitCombinedKurtaSizes(k);
    assert.equal(await k('kurta_variants').where({ product_code: 'msk-016-rania-magenta-rayon-set' }).count('* as total').first().then(row => Number(row.total)), 7);
  } finally {
    await k.destroy();
  }
});
