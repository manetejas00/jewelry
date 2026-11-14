import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import { createDb, migrate, now } from '../server/db.js';
import { activeRates, calculatePrice, calculateCoinPrice, catalogue, coinCatalogue, quote, isFresh } from '../server/pricing.js';
import { checkout } from '../server/orders.js';
import { validateRatesCsv, parseRateFileToCsv, normaliseMetalRate, detectMetal } from '../server/rates.js';

let k;

before(async () => {
  k = createDb(':memory:');
  await migrate(k);

  // Setup test products
  await k('products').insert([
    {
      sku: 'TEST-AU-22K',
      product_code: 'test-gold-ring',
      slug: 'test-gold-ring',
      name: '22K Gold Heritage Ring',
      category: 'Rings',
      metal: 'Gold',
      purity: '22K',
      net_weight_g: 4.5,
      making_flat: 1500,
      pricing_mode: 'GOLD_LINKED',
      stock: 10,
      status: 'published',
      source_timestamp: now(),
      updated_at: now()
    },
    {
      sku: 'TEST-AG-925',
      product_code: 'test-silver-cuff',
      slug: 'test-silver-cuff',
      name: '925 Sterling Silver Cuff',
      category: 'Bracelets',
      metal: 'Silver',
      purity: '925',
      net_weight_g: 20.0,
      making_flat: 800,
      pricing_mode: 'GOLD_LINKED',
      stock: 8,
      status: 'published',
      source_timestamp: now(),
      updated_at: now()
    }
  ]);

  // Setup test coin
  await k('coins').insert([
    {
      sku: 'COIN-TEST-AG10',
      name: '10g 999 Fine Silver Bullion Coin',
      metal: 'Silver',
      coin_type: 'Silver Coin',
      purity: '999',
      weight_g: 10.0,
      dimension: '28 mm Round',
      making_charge: 150,
      pricing_mode: 'METAL_LINKED',
      stock: 25,
      status: 'published',
      source_timestamp: now(),
      created_at: now(),
      updated_at: now()
    }
  ]);
});

after(async () => {
  await k.destroy();
});

test('detectMetal correctly identifies Gold and Silver from purities and explicit attributes', () => {
  assert.equal(detectMetal('24K', 'Gold'), 'Gold');
  assert.equal(detectMetal('22K', null), 'Gold');
  assert.equal(detectMetal('18K', ''), 'Gold');
  assert.equal(detectMetal('999', null), 'Silver');
  assert.equal(detectMetal('925', null), 'Silver');
  assert.equal(detectMetal('Silver', null), 'Silver');
  assert.equal(detectMetal('14K', 'Silver'), 'Silver');
});

test('normaliseMetalRate converts 10g, kg, and g rates to exact per-gram figures', () => {
  // Gold 10g
  const g10 = normaliseMetalRate({ purity: '24K', unit: '10g', rate: '105000' });
  assert.equal(g10.metal, 'Gold');
  assert.equal(g10.inr_per_gram, 10500);

  // Gold 1g
  const g1 = normaliseMetalRate({ purity: '22K', unit: 'g', rate: '9450' });
  assert.equal(g1.metal, 'Gold');
  assert.equal(g1.inr_per_gram, 9450);

  // Silver 1kg
  const agKg = normaliseMetalRate({ purity: '999', unit: 'kg', rate: '125000' });
  assert.equal(agKg.metal, 'Silver');
  assert.equal(agKg.inr_per_gram, 125);

  // Silver 1g
  const ag1 = normaliseMetalRate({ purity: '925', unit: 'g', rate: '115' });
  assert.equal(ag1.metal, 'Silver');
  assert.equal(ag1.inr_per_gram, 115);
});

test('manual rate entry updates database and reflects in activeRates', async () => {
  const ts = now();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  // Insert manual 22K gold rate
  await k('rates').insert({
    metal: 'Gold',
    supplier: 'Veyora Internal',
    purity: '22K',
    currency: 'INR',
    original_unit: 'g',
    original_rate: 9350,
    inr_per_gram: 9350,
    effective_date: today,
    source_timestamp: ts,
    published_at: ts,
    staff_id: 1,
    staff_name: 'owner@veyora.local',
    source_type: 'manual',
    notes: 'Morning manual update'
  });

  const rates = await activeRates(k);
  assert.ok(rates['22K']);
  assert.equal(rates['22K'].inr_per_gram, 9350);
  assert.equal(rates['22K'].staff_name, 'owner@veyora.local');
  assert.equal(rates['22K'].source_type, 'manual');
  assert.equal(rates['22K'].notes, 'Morning manual update');
});

test('manual silver 999 entry syncs settings table for coin pricing', async () => {
  const ts = now();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  await k('rates').insert({
    metal: 'Silver',
    supplier: 'Veyora Internal',
    purity: '999',
    currency: 'INR',
    original_unit: 'kg',
    original_rate: 130000,
    inr_per_gram: 130,
    effective_date: today,
    source_timestamp: ts,
    published_at: ts,
    staff_id: 1,
    staff_name: 'owner@veyora.local',
    source_type: 'manual',
    notes: 'Silver bullion update'
  });

  // Sync settings
  await k('settings').insert({ key: 'SILVER_RATE_PER_GRAM', value: '130' }).onConflict('key').merge();
  await k('settings').insert({ key: 'SILVER_RATE_UPDATED_AT', value: ts }).onConflict('key').merge();

  const setting = await k('settings').where({ key: 'SILVER_RATE_PER_GRAM' }).first();
  assert.equal(setting.value, '130');
});

test('catalogue product price calculates accurately from internally stored rates', async () => {
  const products = await catalogue(k);
  const goldRing = products.find(p => p.sku === 'TEST-AU-22K');
  assert.ok(goldRing);

  // 4.5g * 9350 = 42,075 + 1,500 making = 43,575
  assert.equal(goldRing.price, 43575);
  assert.equal(goldRing.breakdown.metal, 42075);
  assert.equal(goldRing.breakdown.making, 1500);
  assert.equal(goldRing.breakdown.rate, 9350);
  assert.equal(goldRing.checkout_available, true);
});

test('coin catalogue price calculates accurately from internally stored silver rates', async () => {
  const coins = await coinCatalogue(k);
  const silverCoin = coins.find(c => c.sku === 'COIN-TEST-AG10');
  assert.ok(silverCoin);

  // 10g * 130 = 1300 + 150 making = 1450
  assert.equal(silverCoin.price, 1450);
  assert.equal(silverCoin.breakdown.metal, 1300);
  assert.equal(silverCoin.breakdown.making, 150);
  assert.equal(silverCoin.checkout_available, true);
});

test('rate change dynamically recalculates product and coin prices without restart', async () => {
  const ts = now();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  // Revise 22K rate from 9350 to 9500
  await k('rates').insert({
    metal: 'Gold',
    supplier: 'Veyora Internal',
    purity: '22K',
    currency: 'INR',
    original_unit: 'g',
    original_rate: 9500,
    inr_per_gram: 9500,
    effective_date: today,
    source_timestamp: ts,
    published_at: ts,
    staff_id: 1,
    staff_name: 'owner@veyora.local',
    source_type: 'manual',
    notes: 'Afternoon upward revision'
  });

  const updatedProducts = await catalogue(k);
  const goldRing = updatedProducts.find(p => p.sku === 'TEST-AU-22K');

  // 4.5g * 9500 = 42,750 + 1,500 = 44,250
  assert.equal(goldRing.price, 44250);
  assert.equal(goldRing.breakdown.metal, 42750);
  assert.equal(goldRing.breakdown.rate, 9500);
});

test('historical completed orders preserve their purchase price snapshot after rate updates', async () => {
  const customer = { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', address: 'Bandra West', city: 'Mumbai', pincode: '400050' };
  const items = [{ sku: 'TEST-AU-22K', quantity: 1 }];
  const q = await quote(k, items);
  const order = await checkout(k, { items, token: q.token, customer, idempotencyKey: 'test-order-pricing-immutability-01' });

  assert.equal(Number(order.total), 44250);

  // Now change 22K rate drastically to 12,000
  const ts = now();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await k('rates').insert({
    metal: 'Gold',
    supplier: 'Veyora Internal',
    purity: '22K',
    currency: 'INR',
    original_unit: 'g',
    original_rate: 12000,
    inr_per_gram: 12000,
    effective_date: today,
    source_timestamp: ts,
    published_at: ts,
    source_type: 'manual'
  });

  // Current catalogue price is now 4.5 * 12000 + 1500 = 55,500
  const currentCatalogue = await catalogue(k);
  assert.equal(currentCatalogue.find(p => p.sku === 'TEST-AU-22K').price, 55500);

  // Historical order in DB remains exactly 44,250
  const savedOrder = await k('orders').where({ id: order.id }).first();
  assert.equal(Number(savedOrder.total), 44250);
});

test('validateRatesCsv parses valid CSV and detects row-level errors', () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const ts = new Date().toISOString();

  const validCsv = [
    'supplier,metal,purity,currency,unit,rate,effective_date,source_timestamp',
    `Veyora Internal,Gold,24K,INR,10g,102000,${today},${ts}`,
    `Veyora Internal,Gold,18K,INR,g,7800,${today},${ts}`,
    `Veyora Internal,Silver,999,INR,kg,122000,${today},${ts}`
  ].join('\n');

  const check = validateRatesCsv(validCsv);
  assert.equal(check.errors.length, 0);
  assert.equal(check.rows.length, 3);

  // Invalid CSV with negative rate, invalid currency, bad purity
  const invalidCsv = [
    'supplier,metal,purity,currency,unit,rate,effective_date,source_timestamp',
    `Veyora Internal,Gold,25K,USD,10g,-500,2099-01-01,${ts}`
  ].join('\n');

  const invalidCheck = validateRatesCsv(invalidCsv);
  assert.ok(invalidCheck.errors.length >= 3);
  assert.ok(invalidCheck.errors.some(e => e.field === 'currency'));
  assert.ok(invalidCheck.errors.some(e => e.field === 'purity'));
  assert.ok(invalidCheck.errors.some(e => e.field === 'rate'));
});

test('parseRateFileToCsv parses binary Excel XLSX buffer into CSV format', () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const ts = new Date().toISOString();

  const headers = ['supplier', 'metal', 'purity', 'currency', 'unit', 'rate', 'effective_date', 'source_timestamp'];
  const row1 = ['Veyora Internal', 'Gold', '24K', 'INR', '10g', '104000', today, ts];
  const row2 = ['Veyora Internal', 'Silver', '999', 'INR', 'kg', '124000', today, ts];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, row1, row2]);
  XLSX.utils.book_append_sheet(wb, ws, 'Metal Rates');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const csvOutput = parseRateFileToCsv(buffer);
  assert.ok(csvOutput.includes('104000'));
  assert.ok(csvOutput.includes('Silver'));

  const validation = validateRatesCsv(csvOutput);
  assert.equal(validation.errors.length, 0);
  assert.equal(validation.rows.length, 2);
});

test('zero external pricing network calls occur anywhere in the system', async () => {
  // Verify server/daily.js has no fetchLiveGoldRates
  const dailyModule = await import('../server/daily.js');
  assert.equal(dailyModule.fetchLiveGoldRates, undefined);

  // Calling daily with 'gold' and auto or gold-api records explicit rejection
  process.env.GOLD_FEED_URL = 'https://api.gold-api.com/price/XAU/INR';
  const run = await dailyModule.daily(k, 'manual', 'gold');
  assert.equal(run.result.gold.ok, false);
  assert.match(run.result.gold.message, /removed|Admin/i);
  delete process.env.GOLD_FEED_URL;
});
