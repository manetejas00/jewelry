import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('STORE_NAV_ITEMS defines all 8 shopping navigation menu items with proper URLs', () => {
  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');

  // Verify STORE_NAV_ITEMS is present
  assert.match(mainJsx, /export const STORE_NAV_ITEMS\s*=\s*\[/, 'main.jsx must export STORE_NAV_ITEMS');

  const expectedNav = [
    { label: 'Chicken Curry Kurtas', href: '/kurtas' },
    { label: 'All jewellery', href: '/collections/all' },
    { label: 'The Pearl Edit', href: '/collections/pearls' },
    { label: 'Coins', href: '/coins' },
    { label: 'Earrings', href: '/collections/earrings' },
    { label: 'Necklaces', href: '/collections/necklaces' },
    { label: 'Rings', href: '/collections/rings' },
    { label: 'Bracelets', href: '/collections/bracelets' }
  ];

  for (const { label, href } of expectedNav) {
    assert.ok(
      mainJsx.includes(`'${label}'`) || mainJsx.includes(`"${label}"`),
      `STORE_NAV_ITEMS must contain label "${label}"`
    );
    assert.ok(
      mainJsx.includes(`'${href}'`) || mainJsx.includes(`"${href}"`),
      `STORE_NAV_ITEMS must contain href "${href}"`
    );
  }
});

test('isStoreNavActive accurately resolves active state across all routes and child/nested pages', () => {
  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');

  // Extract isStoreNavActive and STORE_NAV_ITEMS
  const startItems = mainJsx.indexOf('export const STORE_NAV_ITEMS');
  const endFn = mainJsx.indexOf('function Header()');
  assert.ok(startItems > 0 && endFn > startItems, 'Must locate STORE_NAV_ITEMS cleanly');

  const fnModule = new Function(`
    ${mainJsx.slice(startItems, endFn).replace(/export /g, '')}
    return { STORE_NAV_ITEMS, isStoreNavActive };
  `);
  const { STORE_NAV_ITEMS, isStoreNavActive } = fnModule();

  assert.equal(STORE_NAV_ITEMS.length, 8, 'There must be exactly 8 store navigation items');

  const mockProducts = [
    { slug: 'lune-pearl-drops', product_code: 'lune-drops', category: 'Earrings' },
    { slug: 'atelier-pearl-collar', product_code: 'atelier-collar', category: 'Necklaces' },
    { slug: 'eclipse-pearl-ring', product_code: 'eclipse-ring', category: 'Rings' },
    { slug: 'nocturne-cuff', product_code: 'nocturne-cuff', category: 'Bracelets' },
    { slug: 'royal-heritage-kurta', product_code: 'CCK-01', category: 'Chicken Curry Kurtas', is_kurta: true },
    { sku: 'COIN-AU-1G', is_coin: true, category: 'Coins' }
  ];

  function getActiveItem(pathname) {
    return STORE_NAV_ITEMS.find(item => isStoreNavActive(item, pathname, mockProducts));
  }

  // 1. Exact match for All Jewellery on /collections/all
  const allJewellery = getActiveItem('/collections/all');
  assert.ok(allJewellery, 'Must match /collections/all');
  assert.equal(allJewellery.label, 'All jewellery');

  // 2. Specific categories must NOT falsely trigger All jewellery
  const earrings = getActiveItem('/collections/earrings');
  assert.ok(earrings, 'Must match /collections/earrings');
  assert.equal(earrings.label, 'Earrings');
  assert.notEqual(earrings.label, 'All jewellery', 'Earrings must not activate All jewellery');

  const necklaces = getActiveItem('/collections/necklaces');
  assert.equal(necklaces?.label, 'Necklaces');

  const rings = getActiveItem('/collections/rings');
  assert.equal(rings?.label, 'Rings');

  const bracelets = getActiveItem('/collections/bracelets');
  assert.equal(bracelets?.label, 'Bracelets');

  const pearls = getActiveItem('/collections/pearls');
  assert.equal(pearls?.label, 'The Pearl Edit');

  // 3. Kurtas and nested kurta detail pages
  const kurtasRoot = getActiveItem('/kurtas');
  assert.equal(kurtasRoot?.label, 'Chicken Curry Kurtas');

  const kurtaDetail = getActiveItem('/kurtas/lucknowi-ivory-chikankari-kurta');
  assert.equal(kurtaDetail?.label, 'Chicken Curry Kurtas');

  // 4. Coins and subcategories / product pages
  const coinsRoot = getActiveItem('/coins');
  assert.equal(coinsRoot?.label, 'Coins');

  const coinsSilver = getActiveItem('/coins/silver');
  assert.equal(coinsSilver?.label, 'Coins');

  const coinProduct = getActiveItem('/coins/product/COIN-AU-1G');
  assert.equal(coinProduct?.label, 'Coins');

  // 5. Product Detail Page category resolution
  const prodEarring = getActiveItem('/products/lune-pearl-drops');
  assert.equal(prodEarring?.label, 'Earrings');

  const prodCollar = getActiveItem('/products/atelier-pearl-collar');
  assert.equal(prodCollar?.label, 'Necklaces');

  // 6. Non-shopping pages should have NO navigation active state
  assert.equal(getActiveItem('/'), undefined, 'Home page should not highlight category items');
  assert.equal(getActiveItem('/account'), undefined, 'Account page should not highlight category items');
  assert.equal(getActiveItem('/bag'), undefined, 'Bag page should not highlight category items');
  assert.equal(getActiveItem('/checkout'), undefined, 'Checkout page should not highlight category items');
  assert.equal(getActiveItem('/order/ORD-123'), undefined, 'Order page should not highlight category items');
});

test('Header renders store navigation with dynamic active class and accessibility attributes', () => {
  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');

  // Renders STORE_NAV_ITEMS mapping with active class and aria-current
  assert.match(mainJsx, /STORE_NAV_ITEMS\.map\(\s*item\s*=>/, 'Header must map STORE_NAV_ITEMS in nav');
  assert.match(mainJsx, /className=\{isActive\s*\?\s*'active'\s*:\s*''\}/, 'Navbar links must receive active class when active');
  assert.match(mainJsx, /aria-current=\{isActive\s*\?\s*'page'\s*:\s*undefined\}/, 'Active link must set aria-current="page"');
});

test('Navbar CSS provides subtle gold underline, darker active text, and smooth transitions', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');

  // Desktop active styling
  assert.match(css, /\.nav a\.active\{color:var\(--ink\);font-weight:600\}/, 'Active link must use var(--ink) with 600 weight');
  assert.match(css, /\.nav a\.active:after\{right:0;height:1\.5px;background:var\(--gold\)\}/, 'Active underline must be 1.5px gold');
  assert.match(css, /\.nav a:after\{position:absolute;content:'';height:1\.5px;bottom:8px;left:0;right:100%;background:var\(--gold\);transition:right/, 'Underline must have smooth transition');

  // Mobile navigation active styling
  assert.match(css, /\.header \.nav a\.active\{color:var\(--ink\);font-weight:600\}/, 'Mobile active link must have active text styling');
  assert.match(css, /\.header \.nav a\.active:after\{right:0\}/, 'Mobile active underline must display under active item');
});
