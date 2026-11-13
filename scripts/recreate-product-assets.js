import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { db, now } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

export async function recreateProductAssets(k = db, {publicDir = path.join(root, 'public')} = {}) {
  const timestamp = now();

  // 1. Ensure all physical image files exist on disk
  console.log('Verifying disk assets...');
  const prodBase = path.join(publicDir, 'assets/products');
  if (fs.existsSync(prodBase)) {
    const prodDirs = fs.readdirSync(prodBase, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const d of prodDirs) {
      const dir = path.join(prodBase, d);
      const hero = path.join(dir, 'hero.webp');
      const front = path.join(dir, 'front.webp');

      if (fs.existsSync(hero) && !fs.existsSync(front)) {
        fs.copyFileSync(hero, front);
      }
    }
    console.log(`Verified disk files for ${prodDirs.length} product folders.`);
  }

  const coinBase = path.join(publicDir, 'assets/coins');
  if (fs.existsSync(coinBase)) {
    const coinDirs = fs.readdirSync(coinBase, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const d of coinDirs) {
      const dir = path.join(coinBase, d);
      const hero = path.join(dir, 'hero.webp');
      const front = path.join(dir, 'front.webp');

      if (fs.existsSync(hero) && !fs.existsSync(front)) {
        fs.copyFileSync(hero, front);
      }
    }
    console.log(`Verified disk files for ${coinDirs.length} coin folders.`);
  }

  // Cards and gallery previews request role-specific thumbnails.
  let thumbnailCount = 0;
  for (const base of [prodBase, coinBase]) {
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const role of ['hero', 'front', 'left', 'right', 'modal', 'model']) {
        const source = path.join(base, entry.name, `${role}.webp`);
        const target = path.join(base, entry.name, `${role}-thumb.webp`);
        if (!fs.existsSync(source)) continue;
        if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs) continue;
        const input = fs.readFileSync(source);
        await sharp(input).resize({ width: 600, height: 800, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 }).toFile(target);
        thumbnailCount++;
      }
    }
  }
  console.log(`Created ${thumbnailCount} gallery thumbnails.`);

  // 2. Fetch distinct products from database
  const products = await k('products').select('product_code', 'name', 'category', 'image').groupBy('product_code');
  console.log(`Found ${products.length} distinct products in database.`);

  const coins = (await k.schema.hasTable('coins'))
    ? await k('coins').select('sku', 'name', 'metal', 'image').groupBy('sku')
    : [];
  console.log(`Found ${coins.length} coins in database.`);

  // 3. Populate product_images table in transaction
  await k.transaction(async (t) => {
    let insertedImages = 0;

    for (const p of products) {
      const code = p.product_code;
      const name = p.name;
      const folder = path.join(publicDir, 'assets/products', code);

      const heroExists = fs.existsSync(path.join(folder, 'hero.webp'));
      const frontExists = fs.existsSync(path.join(folder, 'front.webp'));
      const leftExists = fs.existsSync(path.join(folder, 'left.webp'));
      const rightExists = fs.existsSync(path.join(folder, 'right.webp'));
      const modalExists = fs.existsSync(path.join(folder, 'modal.webp'));
      const modelExists = fs.existsSync(path.join(folder, 'model.webp'));

      // Clean existing records for this product_code to avoid duplicates
      await t('product_images').where({ product_code: code }).del();

      const heroUrl = heroExists ? `/assets/products/${code}/hero.webp` : (p.image || '/assets/product-placeholder.svg');
      const frontUrl = frontExists ? `/assets/products/${code}/front.webp` : heroUrl;
      const leftUrl = leftExists ? `/assets/products/${code}/left.webp` : heroUrl;
      const rightUrl = rightExists ? `/assets/products/${code}/right.webp` : heroUrl;
      const modelUrl = modelExists ? `/assets/products/${code}/model.webp` : null;
      const modalUrl = modalExists ? `/assets/products/${code}/modal.webp` : heroUrl;

      const imagesToInsert = [
        {
          product_code: code,
          sku: null,
          role: 'hero',
          url: heroUrl,
          alt_text: `${name} Hero Shot`,
          sort_order: 1,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: null,
          role: 'front',
          url: frontUrl,
          alt_text: `${name} Front Angle`,
          sort_order: 2,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: null,
          role: 'left',
          url: leftUrl,
          alt_text: `${name} Left View`,
          sort_order: 3,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: null,
          role: 'right',
          url: rightUrl,
          alt_text: `${name} Right View`,
          sort_order: 4,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: null,
          role: 'detail',
          url: modalUrl,
          alt_text: `${name} Macro Detail`,
          sort_order: 6,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: null,
          role: 'model',
          url: modelUrl,
          alt_text: `${name} Model Shot`,
          sort_order: 5,
          created_at: timestamp,
          updated_at: timestamp,
        }
      ].filter(image => image.url);

      await t('product_images').insert(imagesToInsert);
      insertedImages += imagesToInsert.length;
    }

    // Populate coins
    for (const c of coins) {
      const code = (c.sku || '').toLowerCase();
      const name = c.name;
      const folder = path.join(publicDir, 'assets/coins', code);

      const heroExists = fs.existsSync(path.join(folder, 'hero.webp'));
      const frontExists = fs.existsSync(path.join(folder, 'front.webp'));
      const leftExists = fs.existsSync(path.join(folder, 'left.webp'));
      const rightExists = fs.existsSync(path.join(folder, 'right.webp'));
      const modalExists = fs.existsSync(path.join(folder, 'modal.webp'));
      const modelExists = fs.existsSync(path.join(folder, 'model.webp'));

      await t('product_images').where({ sku: c.sku }).orWhere({ product_code: code }).del();

      const heroUrl = heroExists ? `/assets/coins/${code}/hero.webp` : (c.image || '/assets/product-placeholder.svg');
      const frontUrl = frontExists ? `/assets/coins/${code}/front.webp` : heroUrl;
      const leftUrl = leftExists ? `/assets/coins/${code}/left.webp` : heroUrl;
      const rightUrl = rightExists ? `/assets/coins/${code}/right.webp` : heroUrl;
      const modelUrl = modelExists ? `/assets/coins/${code}/model.webp` : null;
      const modalUrl = modalExists ? `/assets/coins/${code}/modal.webp` : heroUrl;

      const coinImages = [
        {
          product_code: code,
          sku: c.sku,
          role: 'hero',
          url: heroUrl,
          alt_text: `${name} Obverse Face`,
          sort_order: 1,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: c.sku,
          role: 'front',
          url: frontUrl,
          alt_text: `${name} Front Angle`,
          sort_order: 2,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: c.sku,
          role: 'left',
          url: leftUrl,
          alt_text: `${name} Left View`,
          sort_order: 3,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: c.sku,
          role: 'right',
          url: rightUrl,
          alt_text: `${name} Right View`,
          sort_order: 4,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: c.sku,
          role: 'detail',
          url: modalUrl,
          alt_text: `${name} Macro Detail`,
          sort_order: 6,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          product_code: code,
          sku: c.sku,
          role: 'model',
          url: modelUrl,
          alt_text: `${name} Hand-held Scale View`,
          sort_order: 5,
          created_at: timestamp,
          updated_at: timestamp,
        }
      ].filter(image => image.url);

      await t('product_images').insert(coinImages);
      insertedImages += coinImages.length;
    }

    console.log(`Successfully recreated assets: ${insertedImages} total angle images inserted across ${products.length} products and ${coins.length} coins.`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await recreateProductAssets();
    console.log('Asset recreation complete.');
  } catch (err) {
    console.error('Asset recreation failed:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
