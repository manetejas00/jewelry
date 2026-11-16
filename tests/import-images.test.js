import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, migrate } from '../server/db.js';
import { validate, schemas, previewImport, publishImport, exportCsv } from '../server/importer.js';
import { rowsWithGallery } from '../shared/catalogue-images.js';
import { stringify } from 'csv-stringify/sync';

const stamp = new Date(Date.now() - 2000).toISOString();
const later = new Date(Date.now() - 1000).toISOString();
const front = '/assets/products/angle-ring/front.webp';
const back = '/assets/products/angle-ring/back.webp';
const detail = '/assets/products/angle-kurta/detail.webp';
const model = '/assets/coins/angle-coin/model.webp';

const jewelry = {
  product_code: 'angle-ring',
  sku: 'ANGLE-RING',
  name: 'Angle Ring',
  category: 'Rings',
  description: 'A ring with angle photos.',
  metal: 'Gold',
  purity: '18K',
  net_weight_g: '2.500',
  size: '12',
  finish: 'Gold',
  image: '/assets/products/angle-ring/hero.webp',
  pricing_mode: 'FIXED',
  fixed_price: '12000',
  making_flat: '0',
  making_percent: '0',
  stone_charge: '0',
  other_charge: '0',
  stock: '3',
  status: 'published',
  source_timestamp: stamp,
  image_front: front,
  image_back: back
};

const kurta = {
  product_code: 'angle-kurta',
  sku: 'ANGLE-KURTA-M',
  name: 'Angle Kurta',
  category: 'Kurtas',
  description: 'A kurta with a detail photo.',
  fabric: 'Pure Mulmul Cotton',
  craftsmanship: 'Handcrafted Lucknowi Chikankari',
  size: 'M (38)',
  color: 'Ivory',
  finish: 'Hand Embroidered',
  image: '',
  pricing_mode: 'FIXED',
  fixed_price: '3499.00',
  stock: '4',
  status: 'published',
  source_timestamp: stamp,
  image_detail: detail
};

const coin = {
  sku: 'ANGLE-COIN',
  name: 'Angle Coin',
  metal: 'Gold',
  coin_type: 'Gold Coin',
  purity: '24K',
  weight_g: '1.000',
  dimension: '12 mm',
  making_charge: '350',
  pricing_mode: 'FIXED',
  fixed_price: '10000',
  stock: '6',
  description: 'A coin with a model photo.',
  image: '/assets/coins/angle-coin/hero.webp',
  status: 'published',
  image_kind: 'photo',
  source_timestamp: stamp,
  image_model: model
};

const csv = (kind, rows) => stringify(rows, { header: true, columns: schemas[kind] });

test('import accepts optional angle photos and rejects an unsafe image path', () => {
  assert.deepEqual(validate('products', csv('products', [jewelry])).errors, []);
  assert.deepEqual(validate('kurtas', csv('kurtas', [kurta])).errors, []);
  assert.deepEqual(validate('coins', csv('coins', [coin])).errors, []);
  assert.ok(validate('products', csv('products', [{ ...jewelry, image_left: 'javascript:alert(1)' }])).errors.some(e => e.field === 'image_left'));
  assert.ok(validate('coins', csv('coins', [{ ...coin, image_back: '/assets/../secret.webp' }])).errors.some(e => e.field === 'image_back'));
  assert.deepEqual(validate('products', csv('products', [{ ...jewelry, image_front: '', image_back: '' }])).errors, []);
});

test('publishing jewelry, kurta, and coin imports stores each supplied angle', async () => {
  const k = createDb(':memory:');
  try {
    await migrate(k);
    const created = new Date().toISOString();
    await k('jewelries').insert({
      sku: jewelry.sku,
      product_code: jewelry.product_code,
      slug: jewelry.product_code,
      name: jewelry.name,
      image: '',
      created_at: created,
      updated_at: created
    });
    await k('kurtas').insert({
      sku: 'ANGLE-KURTA',
      product_code: kurta.product_code,
      slug: kurta.product_code,
      name: kurta.name,
      image: '/assets/products/angle-kurta/existing.webp',
      created_at: created,
      updated_at: created
    });

    const jewelryBatch = await previewImport(k, 'products', csv('products', [jewelry]));
    assert.equal(jewelryBatch.status, 'staged');
    await publishImport(k, jewelryBatch.id);
    const productImages = await k('product_images').where({ product_code: jewelry.product_code }).orderBy('role');
    assert.deepEqual(productImages.map(image => image.role).sort(), ['back', 'front', 'hero']);
    assert.equal(productImages.find(image => image.role === 'front').url, front);
    const jewelryImages = await k('jewelry_images').where({ sku: jewelry.sku });
    assert.equal(jewelryImages.find(image => image.role === 'back').url, back);
    assert.equal((await k('jewelries').where({ sku: jewelry.sku }).first()).image, jewelry.image);

    const kept = await previewImport(k, 'products', csv('products', [{ ...jewelry, source_timestamp: later, image_front: '', image_back: '' }]));
    await publishImport(k, kept.id);
    assert.equal((await k('product_images').where({ product_code: jewelry.product_code, role: 'front' }).first()).url, front);

    const kurtaBatch = await previewImport(k, 'kurtas', csv('kurtas', [kurta]));
    await publishImport(k, kurtaBatch.id);
    assert.equal((await k('product_images').where({ product_code: kurta.product_code, role: 'detail' }).first()).url, detail);
    assert.equal((await k('kurta_images').where({ product_code: kurta.product_code, role: 'detail' }).first()).url, detail);
    assert.equal((await k('products').where({ sku: kurta.sku }).first()).image, detail);
    assert.equal((await k('kurtas').where({ product_code: kurta.product_code }).first()).image, '/assets/products/angle-kurta/existing.webp');

    const coinBatch = await previewImport(k, 'coins', csv('coins', [coin]));
    await publishImport(k, coinBatch.id);
    assert.equal((await k('coins').where({ sku: coin.sku }).first()).image, coin.image);
    assert.equal((await k('product_images').where({ sku: coin.sku, role: 'model' }).first()).url, model);
    assert.equal((await k('coin_images').where({ sku: coin.sku, role: 'model' }).first()).url, model);
    const exported = exportCsv('coins', await rowsWithGallery(k, await k('coins').where({ sku: coin.sku }), 'coins'));
    assert.match(exported, /image_model/);
    assert.match(exported, /angle-coin\/model\.webp/);

    const cleared = await previewImport(k, 'coins', csv('coins', [{ ...coin, source_timestamp: later, image_model: '' }]));
    await publishImport(k, cleared.id);
    assert.equal((await k('coin_images').where({ sku: coin.sku, role: 'model' }).first()).url, model);
  } finally {
    await k.destroy();
  }
});
