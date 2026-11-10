import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {db} from '../server/db.js';

const root = new URL('../public/', import.meta.url).pathname;
const roles = ['front', 'left', 'right', 'model'];
const errors = [];
let checked = 0;
try {
  const products = await db('products').distinct('product_code');
  const coins = await db.schema.hasTable('coins') ? await db('coins').distinct('sku') : [];
  const entries = [...products.map(p => ({code:p.product_code, base:'products'})), ...coins.map(c => ({code:c.sku.toLowerCase(), base:'coins'}))];
  for (const {code, base} of entries) {
    const hashes = new Set();
    for (const role of roles) {
      const url = `/assets/${base}/${code}/${role}.webp`;
      try {
        const buffer = await fs.readFile(path.join(root, url));
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) throw Error('Invalid image');
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        if (hashes.has(hash)) throw Error('Duplicates another required view');
        hashes.add(hash);
        const image = await db('product_images').where({product_code:code, role}).first();
        if (image?.url !== url) throw Error('Gallery does not link to this image');
        await fs.access(path.join(root, url.replace('.webp', '-thumb.webp')));
        checked++;
      } catch (error) { errors.push(`${code}/${role}: ${error.message}`); }
    }
    const folder = path.join(root, 'assets', base, code);
    try {
      const [model, detail] = await Promise.all(['model', 'modal'].map(role => fs.readFile(path.join(folder, `${role}.webp`))));
      if (model.equals(detail)) errors.push(`${code}: Model image duplicates the detail image`);
    } catch (error) { errors.push(`${code}: ${error.message}`); }
  }
  console.log(JSON.stringify({products:products.length, coins:coins.length, checked, errors}, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await db.destroy(); }
