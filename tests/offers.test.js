import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createDb,migrate} from '../server/db.js';
import {seedOffers} from '../scripts/seed.js';
import {calculatePrice,calculateCoinPrice,matchOffer,catalogue,coinCatalogue} from '../server/pricing.js';

let k;

before(async () => {
  k = createDb(':memory:');
  await migrate(k);
  await seedOffers(k);
  // Insert test rate
  await k('rates').insert({
    supplier: 'Test Supplier',
    purity: '18K',
    currency: 'INR',
    original_unit: '1g',
    original_rate: 6000,
    inr_per_gram: 6000,
    effective_date: new Date().toISOString().slice(0, 10),
    source_timestamp: new Date().toISOString(),
    published_at: new Date().toISOString()
  });
  // Insert test product
  await k('products').insert({
    supplier: 'Test Supplier',
    product_code: 'offer-ring',
    slug: 'offer-ring',
    sku: 'OFFER-R-12',
    name: 'Offer Ring',
    category: 'Rings',
    description: 'A test ring with offer',
    metal: 'Gold',
    purity: '18K',
    net_weight_g: 5.0,
    size: '12',
    finish: 'Gold',
    image: 'https://example.com/ring.png',
    pricing_mode: 'GOLD_LINKED',
    making_flat: 2000,
    making_percent: 0,
    stock: 5,
    status: 'published',
    source_timestamp: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  // Insert test silver coin
  await k('coins').insert({
    sku: 'COIN-AG-TEST',
    name: 'Silver Coin Test',
    metal: 'Silver',
    coin_type: 'Silver Coin',
    purity: '999',
    weight_g: 10.0,
    dimension: '28 mm',
    making_charge: 200,
    pricing_mode: 'METAL_LINKED',
    stock: 10,
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
});

after(async () => {
  await k.destroy();
});

test('offers table exists and seeds active festive offers', async () => {
  const hasOffers = await k.schema.hasTable('offers');
  assert.equal(hasOffers, true);

  const offers = await k('offers');
  assert.ok(offers.length >= 2);

  const festiveOffer = offers.find(o => o.badge_text === '50% OFF ON MC');
  assert.ok(festiveOffer, 'Festive making charge offer should exist');
  assert.equal(festiveOffer.discount_type, 'making_percent');
  assert.equal(Number(festiveOffer.discount_value), 50);
});

test('calculatePrice computes 50% discount on making charges correctly', async () => {
  const rate = { inr_per_gram: 6000, effective_date: '2026-11-10' };
  const p = {
    net_weight_g: 5.0,
    making_flat: 2000,
    making_percent: 0,
    pricing_mode: 'GOLD_LINKED'
  };
  const offer = {
    id: 1,
    name: 'Festive 50% Off MC',
    badge_text: '50% OFF ON MC',
    discount_type: 'making_percent',
    discount_value: 50
  };

  // Metal: 5g * 6000 = 30000
  // Full making: 2000
  // Discount: 50% of 2000 = 1000
  // Effective making: 1000
  // Subtotal without discount: 32000
  // Subtotal with discount: 31000
  const priced = calculatePrice(p, rate, { tax_percent: 0, rounding: 1, tax_treatment: 'exclusive' }, offer);
  assert.equal(priced.original_total, 32000);
  assert.equal(priced.total, 31000);
  assert.equal(priced.discount_amount, 1000);
  assert.equal(priced.making, 1000);
  assert.equal(priced.original_making, 2000);
  assert.equal(priced.offer.badge_text, '50% OFF ON MC');
});

test('calculateCoinPrice computes 100% discount on silver coin making charge', async () => {
  const c = {
    metal: 'Silver',
    purity: '999',
    weight_g: 10.0,
    making_charge: 200,
    pricing_mode: 'METAL_LINKED'
  };
  const offer = {
    id: 2,
    name: 'Zero MC on Silver',
    badge_text: '100% OFF ON MC',
    discount_type: 'making_percent',
    discount_value: 100
  };

  // Metal: 10g * 98 = 980
  // Making: 200 -> discounted to 0
  // Total: 980
  const priced = calculateCoinPrice(c, {}, 98, { tax_percent: 0, rounding: 1, tax_treatment: 'exclusive' }, offer);
  assert.equal(priced.original_total, 1180);
  assert.equal(priced.total, 980);
  assert.equal(priced.discount_amount, 200);
  assert.equal(priced.making, 0);
  assert.equal(priced.original_making, 200);
});

test('catalogue and coinCatalogue attach offers and discounted prices', async () => {
  const products = await catalogue(k);
  const ring = products.find(p => p.sku === 'OFFER-R-12');
  assert.ok(ring, 'Product should exist in catalogue');
  assert.ok(ring.offer, 'Product should have offer attached');
  assert.equal(ring.offer.badge_text, '50% OFF ON MC');
  assert.equal(ring.price, 31000);
  assert.equal(ring.original_price, 32000);
  assert.equal(ring.discount_amount, 1000);

  const coins = await coinCatalogue(k);
  const silverCoin = coins.find(c => c.sku === 'COIN-AG-TEST');
  assert.ok(silverCoin, 'Silver coin should exist in coin catalogue');
  assert.ok(silverCoin.offer, 'Coin should have offer attached');
  assert.equal(silverCoin.offer.badge_text, '100% OFF ON MC');
  assert.equal(silverCoin.price, 980);
  assert.equal(silverCoin.original_price, 1180);
});

test('a making-charge offer stays hidden when the price does not change', () => {
  const offer = {id:1,name:'Festive',badge_text:'50% OFF ON MC',discount_type:'making_percent',discount_value:50,applies_to:'all',status:'active'};
  const priced = calculatePrice({pricing_mode:'FIXED',fixed_price:10000,net_weight_g:1}, null, {tax_percent:0,rounding:1,tax_treatment:'exclusive',margin_type:'FIXED',margin_value:0}, offer);
  assert.equal(priced.discount_amount, 0);
  assert.equal(priced.offer, null);
});
