import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveId, savedCatalogue } from '../src/catalogue.js';

const jewelry = { sku: 'VEY-NK-001', product_code: 'aaradhya-kundan-bridal-choker', name: 'Aaradhya', category: 'Necklaces', price: 285000, stock: 2 };
const kurta = { sku: 'CCK-MSK-001-XS', product_code: 'msk-001-noor', slug: 'noor', name: 'Noor', category: 'Cotton Chikankari', is_kurta: true, price: 1299, stock: 4, variants: [{ sku: 'CCK-MSK-001-M', product_code: 'msk-001-noor' }] };
const coin = { sku: 'COIN-AU-1G', slug: 'coin-au-1g', name: '1g Gold', coin_type: 'Gold Coin', price: 10175, stock: 3 };

test('saveId uses the product code for jewellery and kurtas, and the SKU for coins', () => {
  assert.equal(saveId(jewelry), 'aaradhya-kundan-bridal-choker');
  assert.equal(saveId(kurta), 'msk-001-noor');
  assert.equal(saveId(coin), 'COIN-AU-1G');
});

test('saved pieces include jewellery, kurtas, and coins in the order they were saved', () => {
  const items = savedCatalogue({
    products: [jewelry, { ...kurta, category: 'Kurtas' }],
    kurtas: [kurta],
    coins: [coin],
    saved: ['COIN-AU-1G', 'msk-001-noor', 'aaradhya-kundan-bridal-choker']
  });
  assert.deepEqual(items.map(item => item.name), ['1g Gold', 'Noor', 'Aaradhya']);
  assert.equal(items.filter(item => item.name === 'Noor').length, 1);
});

test('a kurta saved from a size SKU still resolves to its family card', () => {
  const items = savedCatalogue({ products: [], kurtas: [kurta], coins: [], saved: ['CCK-MSK-001-M'] });
  assert.equal(items.length, 1);
  assert.equal(items[0].product_code, 'msk-001-noor');
});
