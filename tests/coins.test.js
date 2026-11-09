import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createDb,migrate} from '../server/db.js';
import {seedCoins} from '../scripts/seed.js';
import {activeRates,calculateCoinPrice,coinCatalogue,quote,getSilverRate} from '../server/pricing.js';
import {checkout} from '../server/orders.js';

let k;

before(async () => {
  k = createDb(':memory:');
  await migrate(k);
  await seedCoins(k);
  // Add a live rate for testing
  await k('rates').insert({
    supplier: 'Test Supplier',
    purity: '24K',
    currency: 'INR',
    original_unit: '10g',
    original_rate: 75000,
    inr_per_gram: 7500,
    effective_date: new Date().toISOString().slice(0, 10),
    source_timestamp: new Date().toISOString(),
    published_at: new Date().toISOString()
  });
});

after(async () => {
  await k.destroy();
});

test('coins table is separate from products table and seeds correctly', async () => {
  const hasCoins = await k.schema.hasTable('coins');
  const hasProducts = await k.schema.hasTable('products');
  assert.equal(hasCoins, true);
  assert.equal(hasProducts, true);

  const coins = await k('coins');
  assert.ok(coins.length >= 6);

  // Verify gold coins and silver coins are present in coins table
  const goldCoin = coins.find(c => c.metal === 'Gold');
  const silverCoin = coins.find(c => c.metal === 'Silver');
  assert.ok(goldCoin, 'Gold coin must exist in coins table');
  assert.ok(silverCoin, 'Silver coin must exist in coins table');

  // Verify none of the coins are in products table
  const coinSkus = coins.map(c => c.sku);
  const productsWithCoinSku = await k('products').whereIn('sku', coinSkus);
  assert.equal(productsWithCoinSku.length, 0, 'Coins must NOT be present in products table');
});

test('calculateCoinPrice computes gold and silver coin prices with metal-linked rates', async () => {
  const mockRates = {
    '24K': { inr_per_gram: 7500.0, effective_date: '2026-11-10', source_timestamp: new Date().toISOString() }
  };
  const silverRate = 95.0;

  // 1g 24K gold coin with 350 making charge
  const gold1g = {
    sku: 'TEST-AU-1G',
    metal: 'Gold',
    purity: '24K',
    weight_g: 1.0,
    making_charge: 350.0,
    pricing_mode: 'METAL_LINKED'
  };
  const priceGold = calculateCoinPrice(gold1g, mockRates, silverRate);
  // 1 * 7500 + 350 = 7850
  assert.equal(priceGold.metal, 7500);
  assert.equal(priceGold.making, 350);
  assert.equal(priceGold.total, 7850);

  // 10g 999 silver coin with 150 making charge
  const silver10g = {
    sku: 'TEST-AG-10G',
    metal: 'Silver',
    purity: '999',
    weight_g: 10.0,
    making_charge: 150.0,
    pricing_mode: 'METAL_LINKED'
  };
  const priceSilver = calculateCoinPrice(silver10g, mockRates, silverRate);
  // 10 * 95 + 150 = 950 + 150 = 1100
  assert.equal(priceSilver.metal, 950);
  assert.equal(priceSilver.making, 150);
  assert.equal(priceSilver.total, 1100);

  // Fixed price coin
  const fixedCoin = {
    sku: 'TEST-FIXED',
    pricing_mode: 'FIXED',
    fixed_price: 5000.0
  };
  const priceFixed = calculateCoinPrice(fixedCoin, mockRates, silverRate);
  assert.equal(priceFixed.total, 5000);
});

test('coinCatalogue returns published coins with calculated prices', async () => {
  const catalogue = await coinCatalogue(k);
  assert.ok(catalogue.length > 0);
  for (const c of catalogue) {
    assert.ok(c.sku);
    assert.ok(c.name);
    assert.ok(['Gold', 'Silver'].includes(c.metal));
    assert.ok(c.category.includes('Coin'));
  }
});

test('bag quote and checkout work with coins and decrement coin stock', async () => {
  const coin = await k('coins').where({sku: 'COIN-AU-1G'}).first();
  assert.ok(coin);
  const initialStock = coin.stock;

  const bagItems = [{ sku: 'COIN-AU-1G', quantity: 2 }];
  const q = await quote(k, bagItems);
  assert.ok(q.lines.length === 1);
  assert.equal(q.lines[0].sku, 'COIN-AU-1G');
  assert.equal(q.lines[0].quantity, 2);
  assert.ok(q.total > 0);

  const customer = {
    name: 'Tejas Mane',
    email: 'tejas@example.com',
    phone: '9876543210',
    address: 'Flat 101, Luxury Towers, MG Road',
    city: 'Mumbai',
    pincode: '400001'
  };

  const idempotencyKey = 'test-coin-order-' + Date.now();
  const order = await checkout(k, {
    items: bagItems,
    token: q.token,
    customer,
    idempotencyKey
  });

  assert.ok(order.id.startsWith('VEY-'));
  const updatedCoin = await k('coins').where({sku: 'COIN-AU-1G'}).first();
  assert.equal(updatedCoin.stock, initialStock - 2);
});

test('feed toggle stops and starts feed automation', async () => {
  // Stop feeds
  await k('settings').insert({key: 'FEED_STATUS', value: 'stopped'}).onConflict('key').merge();
  const {daily} = await import('../server/daily.js');
  
  // When stopped, manual daily run throws descriptive error
  await assert.rejects(daily(k, 'manual'), /STOPPED/);
  
  // When stopped, scheduled daily run safely logs skipped message
  const scheduledRun = await daily(k, 'scheduled');
  assert.ok(scheduledRun.result.message.includes('stopped'));

  // Restart feeds
  await k('settings').insert({key: 'FEED_STATUS', value: 'active'}).onConflict('key').merge();
});
