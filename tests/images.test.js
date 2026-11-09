import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createDb,migrate} from '../server/db.js';
import {seedProductImages} from '../scripts/seed.js';
import {catalogue} from '../server/pricing.js';

let k;

before(async () => {
  k = createDb(':memory:');
  await migrate(k);
  // Insert test product
  await k('products').insert({
    supplier: 'Test Supplier',
    product_code: 'test-ring',
    slug: 'test-ring',
    sku: 'TEST-R-12',
    name: 'Test Ring',
    category: 'Rings',
    description: 'A test ring description',
    metal: 'Gold',
    purity: '18K',
    net_weight_g: 3.5,
    size: '12',
    finish: 'Gold',
    image: 'https://example.com/test-ring.png',
    pricing_mode: 'FIXED',
    fixed_price: 25000,
    stock: 5,
    status: 'published',
    source_timestamp: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  await seedProductImages(k);
});

after(async () => {
  await k.destroy();
});

test('product_images table exists and seeds multi-angle shots with roles', async () => {
  const hasTable = await k.schema.hasTable('product_images');
  assert.equal(hasTable, true);

  const images = await k('product_images');
  assert.ok(images.length >= 10);

  // Check that the required roles are present: hero, front, left, right, model
  const roles = new Set(images.map(img => img.role));
  assert.ok(roles.has('hero'), 'Must have hero role');
  assert.ok(roles.has('front'), 'Must have front role');
  assert.ok(roles.has('left'), 'Must have left role');
  assert.ok(roles.has('right'), 'Must have right role');
  assert.ok(roles.has('model'), 'Must have model role');

  // Verify eclipse-ring has all 5 angles
  const eclipseImages = images.filter(img => img.product_code === 'eclipse-ring');
  assert.ok(eclipseImages.length >= 5);
  const eclipseRoles = eclipseImages.map(img => img.role);
  assert.ok(eclipseRoles.includes('hero'));
  assert.ok(eclipseRoles.includes('front'));
  assert.ok(eclipseRoles.includes('left'));
  assert.ok(eclipseRoles.includes('right'));
  assert.ok(eclipseRoles.includes('model'));
});

test('catalogue attaches multi-angle images array to products', async () => {
  // Insert multi-angle images for test-ring
  const now = new Date().toISOString();
  await k('product_images').insert([
    {product_code: 'test-ring', role: 'hero', url: 'https://example.com/hero.jpg', sort_order: 1, created_at: now, updated_at: now},
    {product_code: 'test-ring', role: 'front', url: 'https://example.com/front.jpg', sort_order: 2, created_at: now, updated_at: now},
    {product_code: 'test-ring', role: 'left', url: 'https://example.com/left.jpg', sort_order: 3, created_at: now, updated_at: now},
    {product_code: 'test-ring', role: 'right', url: 'https://example.com/right.jpg', sort_order: 4, created_at: now, updated_at: now},
    {product_code: 'test-ring', role: 'model', url: 'https://example.com/model.jpg', sort_order: 5, created_at: now, updated_at: now}
  ]);

  const products = await catalogue(k);
  const ring = products.find(p => p.product_code === 'test-ring');
  assert.ok(ring, 'Product should be in catalogue');
  assert.ok(Array.isArray(ring.images), 'Product should have images array');
  assert.equal(ring.images.length, 5);
  
  const roles = ring.images.map(i => i.role);
  assert.deepEqual(roles, ['hero', 'front', 'left', 'right', 'model']);
});

test('can add and update product angle shots and delete by id', async () => {
  const now = new Date().toISOString();
  const [id] = await k('product_images').insert({
    product_code: 'test-ring',
    role: 'detail',
    url: 'https://example.com/detail.jpg',
    sort_order: 6,
    created_at: now,
    updated_at: now
  });

  let img = await k('product_images').where({id}).first();
  assert.equal(img.url, 'https://example.com/detail.jpg');

  // Update
  await k('product_images').where({id}).update({
    url: 'https://example.com/detail-updated.jpg',
    updated_at: new Date().toISOString()
  });
  img = await k('product_images').where({id}).first();
  assert.equal(img.url, 'https://example.com/detail-updated.jpg');

  // Delete
  await k('product_images').where({id}).del();
  const deleted = await k('product_images').where({id}).first();
  assert.equal(deleted, undefined);
});

test('a selected SKU photo leads its gallery while keeping shared angles',async()=>{
 const stamp=new Date().toISOString();await k('product_images').insert({sku:'TEST-R-12',product_code:null,role:'hero',url:'/uploads/chosen-photo.png',sort_order:-1,created_at:stamp,updated_at:stamp});
 const product=(await catalogue(k)).find(p=>p.sku==='TEST-R-12');assert.equal(product.images[0].url,'/uploads/chosen-photo.png');assert.ok(product.images.some(i=>i.product_code==='test-ring'));
});
