import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { db } from '../server/db.js';

const root = new URL('../public/', import.meta.url).pathname;
const errors = [];
let checked = 0;

try {
  const products = await db('products').select('id', 'sku', 'product_code', 'image');
  const coins = await db.schema.hasTable('coins') ? await db('coins').select('id', 'sku', 'image') : [];
  const gallery = await db.schema.hasTable('product_images') ? await db('product_images').select('id', 'product_code', 'url', 'role') : [];

  // Check product primary images
  const checkedUrls = new Set();
  for (const p of products) {
    if (!p.image) {
      errors.push(`Product ${p.sku || p.product_code}: missing image field`);
      continue;
    }
    if (!checkedUrls.has(p.image)) {
      checkedUrls.add(p.image);
      try {
        const filePath = path.join(root, p.image.replace(/^\//, ''));
        const buffer = await fs.readFile(filePath);
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) throw new Error('Invalid dimensions');
        checked++;
      } catch (err) {
        errors.push(`Product image ${p.image}: ${err.message}`);
      }
    }
  }

  // Check coins
  for (const c of coins) {
    if (!c.image) {
      errors.push(`Coin ${c.sku}: missing image field`);
      continue;
    }
    if (!checkedUrls.has(c.image)) {
      checkedUrls.add(c.image);
      try {
        const filePath = path.join(root, c.image.replace(/^\//, ''));
        const buffer = await fs.readFile(filePath);
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) throw new Error('Invalid dimensions');
        checked++;
      } catch (err) {
        errors.push(`Coin image ${c.image}: ${err.message}`);
      }
    }
  }

  // Check gallery images
  for (const g of gallery) {
    if (!g.url) continue;
    if (!checkedUrls.has(g.url)) {
      checkedUrls.add(g.url);
      try {
        const filePath = path.join(root, g.url.replace(/^\//, ''));
        const buffer = await fs.readFile(filePath);
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) throw new Error('Invalid dimensions');
        checked++;
      } catch (err) {
        errors.push(`Gallery image ${g.url} (${g.product_code}): ${err.message}`);
      }
    }
  }

  console.log(JSON.stringify({
    products: products.length,
    coins: coins.length,
    galleryImages: gallery.length,
    uniqueChecked: checked,
    errorsCount: errors.length,
    errors: errors.slice(0, 10)
  }, null, 2));

  if (errors.length > 0) process.exitCode = 1;
} finally {
  await db.destroy();
}
