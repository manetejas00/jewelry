import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {db,migrate} from '../server/db.js';
import {seed} from '../scripts/seed.js';
import {searchCatalogue,invalidateSearchCache} from '../server/search.js';

before(async () => {
  await migrate();
  await seed();
  invalidateSearchCache();
});

after(async () => {
  await db.destroy();
});

test('empty query or single character returns popular searches and categories without products', async () => {
  invalidateSearchCache();
  const emptyRes = await searchCatalogue(db, '');
  assert.equal(emptyRes.query, '');
  assert.equal(emptyRes.totalMatches, 0);
  assert.equal(emptyRes.products.length, 0);
  assert.ok(emptyRes.popularSearches.length >= 5);
  assert.ok(emptyRes.categories.length >= 5);
  assert.ok(emptyRes.popularSearches.includes('Pearl Ring'));
  assert.ok(emptyRes.popularSearches.includes('Silver Coin'));

  const singleCharRes = await searchCatalogue(db, 'p');
  assert.equal(singleCharRes.products.length, 0);
  assert.ok(singleCharRes.popularSearches.length >= 5);
});

test('searching "Pearl Ring" matches pearl rings with categories and thumbnail URLs', async () => {
  invalidateSearchCache();
  const res = await searchCatalogue(db, 'Pearl Ring');
  assert.ok(res.totalMatches > 0, 'Should match multiple pearl rings');
  assert.ok(res.products.length <= 8, 'Should cap at max 8 products');

  // Verify product structure
  const first = res.products[0];
  assert.ok(first.name.toLowerCase().includes('pearl'));
  assert.ok(first.category === 'Rings');
  assert.ok(first.price > 0, 'Price should be calculated');
  assert.ok(first.url.startsWith('/products/'));
  assert.ok(first.thumbnail, 'Thumbnail must be provided');
  assert.ok(first.thumbnail.endsWith('.webp') || first.thumbnail.includes('/api/thumbnail'), 'Must be a thumbnail URL');

  // Suggestions should include Rings and Pearl Edit
  const catSuggestions = res.suggestions.filter(s => s.type === 'category');
  assert.ok(catSuggestions.some(c => c.text === 'The Pearl Edit' || c.text === 'Rings'));
});

test('searching "Gold Necklace" matches necklaces in gold', async () => {
  const res = await searchCatalogue(db, 'Gold Necklace');
  assert.ok(res.totalMatches > 0);
  assert.ok(res.products.every(p => p.category === 'Necklaces' || p.name.toLowerCase().includes('necklace')));
  const neckCat = res.suggestions.find(s => s.type === 'category' && s.text === 'Necklaces');
  assert.ok(neckCat, 'Necklaces category should be suggested');
});

test('searching "Silver Coin" returns silver bullion coins with links to coins PDP', async () => {
  const res = await searchCatalogue(db, 'Silver Coin');
  assert.ok(res.totalMatches >= 3, 'Should match all published silver coins');
  assert.ok(res.products.some(p => p.sku === 'COIN-AG-10G'));
  assert.ok(res.products.some(p => p.sku === 'COIN-AG-100G'));

  const coin = res.products.find(p => p.sku === 'COIN-AG-10G');
  assert.equal(coin.is_coin, true);
  assert.equal(coin.metal, 'Silver');
  assert.equal(coin.url, '/coins/product/COIN-AG-10G');
  assert.ok(coin.price > 0, 'Silver coin price should be calculated');

  // Suggestions should include Silver Coins category
  assert.ok(res.suggestions.some(s => s.text === 'Silver Coins' || s.text === 'Gold & Silver Coins'));
});

test('searching "10 Gram Gold Coin" ranks 10g pure gold coin as top suggestion', async () => {
  const res = await searchCatalogue(db, '10 Gram Gold Coin');
  assert.ok(res.totalMatches >= 1);
  assert.equal(res.products[0].sku, 'COIN-AU-10G');
  assert.equal(res.products[0].name, '24K Royal Emblem 999 Pure Gold Coin (10 Grams)');
  assert.equal(res.products[0].is_coin, true);
  assert.equal(res.products[0].weight_g, 10);
});

test('searching "Bracelet" and "Nocturne Cuff" matches bracelets and Nocturne Pearl Cuff', async () => {
  const resBracelet = await searchCatalogue(db, 'Bracelet');
  assert.ok(resBracelet.totalMatches > 0);
  assert.ok(resBracelet.suggestions.some(s => s.type === 'category' && s.text === 'Bracelets'));

  const resCuff = await searchCatalogue(db, 'Nocturne Cuff');
  assert.ok(resCuff.totalMatches >= 1);
  assert.ok(resCuff.products.some(p => p.name === 'Nocturne Pearl Cuff'));
});

test('searching "Earrings" suggests Earrings category without false-positive Rings category', async () => {
  const res = await searchCatalogue(db, 'Earrings');
  assert.ok(res.totalMatches > 0);
  const catNames = res.suggestions.filter(s => s.type === 'category').map(s => s.text);
  assert.ok(catNames.includes('Earrings'));
  assert.ok(!catNames.includes('Rings'), 'Earrings must not falsely suggest Rings category');
});

test('searching "999 Silver" matches 999 fine silver coins', async () => {
  const res = await searchCatalogue(db, '999 Silver');
  assert.ok(res.totalMatches >= 3);
  assert.ok(res.products.every(p => p.purity === '999' && p.metal === 'Silver'));
});

test('partial product names match correctly', async () => {
  const resEclip = await searchCatalogue(db, 'eclip');
  assert.ok(resEclip.products.some(p => p.name.includes('Eclipse')));

  const resLune = await searchCatalogue(db, 'lune');
  assert.ok(resLune.products.some(p => p.name.includes('Lune')));

  const resNoct = await searchCatalogue(db, 'noct');
  assert.ok(resNoct.products.some(p => p.name.includes('Nocturne')));
});

test('common spelling mistakes and typos are handled gracefully', async () => {
  // "peral" -> "pearl"
  const resPeral = await searchCatalogue(db, 'peral ring');
  assert.ok(resPeral.totalMatches > 0);
  assert.ok(resPeral.products[0].name.toLowerCase().includes('pearl'));

  // "silvr" -> "silver"
  const resSilvr = await searchCatalogue(db, 'silvr coin');
  assert.ok(resSilvr.totalMatches >= 3);
  assert.ok(resSilvr.products.some(p => p.metal === 'Silver'));

  // "neclace" -> "necklace"
  const resNeclace = await searchCatalogue(db, 'neclace');
  assert.ok(resNeclace.totalMatches > 0);
  assert.ok(resNeclace.products.some(p => p.category === 'Necklaces'));

  // "earings" -> "earrings"
  const resEarings = await searchCatalogue(db, 'earings');
  assert.ok(resEarings.totalMatches > 0);
  assert.ok(resEarings.products.some(p => p.category === 'Earrings'));

  // "braclet" -> "bracelet"
  const resBraclet = await searchCatalogue(db, 'braclet');
  assert.ok(resBraclet.totalMatches > 0);
  assert.ok(resBraclet.products.some(p => p.category === 'Bracelets'));
});

test('SKU lookup matches exact product or coin', async () => {
  const resCoinSku = await searchCatalogue(db, 'COIN-AU-10G');
  assert.equal(resCoinSku.totalMatches, 1);
  assert.equal(resCoinSku.products[0].sku, 'COIN-AU-10G');

  const resProdSku = await searchCatalogue(db, 'VEY-ER-12');
  assert.equal(resProdSku.totalMatches, 1);
  assert.equal(resProdSku.products[0].sku, 'VEY-ER-12');
});

test('case insensitivity handles uppercase and mixed case queries', async () => {
  const resUpper = await searchCatalogue(db, 'PEARL RING');
  const resLower = await searchCatalogue(db, 'pearl ring');
  assert.equal(resUpper.totalMatches, resLower.totalMatches);
  assert.equal(resUpper.products[0].sku, resLower.products[0].sku);
});

test('avoids duplicate suggestions by grouping product variants', async () => {
  const res = await searchCatalogue(db, 'Eclipse Pearl Ring');
  const codes = res.products.map(p => p.product_code);
  const distinctCodes = new Set(codes);
  assert.equal(codes.length, distinctCodes.size, 'Product suggestions must not contain duplicate product variants');
});
