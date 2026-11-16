/**
 * Removes jewellery, coin, and kurta catalogue photos.
 *
 * Product rows, orders, reviews, and customer data stay. Image rows are
 * deleted and image columns are cleared. When this database actually held
 * catalogue photos, the matching files under the project and the live
 * public copy are removed as well. Customer review uploads are left in place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const IMAGE_TABLES = ['jewelry_images', 'coin_images', 'kurta_images', 'product_images'];

const IMAGE_COLUMNS = [
  ['jewelries', 'image'],
  ['jewelry_variants', 'image'],
  ['coins', 'image'],
  ['kurtas', 'image'],
  ['kurta_variants', 'image'],
  ['products', 'image'],
  ['jewelry_image_jobs', 'image_url'],
  ['categories', 'thumbnail'],
  ['categories', 'banner'],
  ['jewelry_categories', 'thumbnail'],
  ['coin_categories', 'thumbnail'],
  ['kurta_categories', 'thumbnail'],
  ['collections', 'thumbnail'],
];

const ASSET_DIRS = ['products', 'coins', 'coin-art'];

function isCatalogueMedia(value) {
  return typeof value === 'string' && (
    value.startsWith('/assets/products/')
    || value.startsWith('/assets/coins/')
    || value.startsWith('/assets/coin-art/')
    || value.startsWith('/uploads/')
  );
}

function uploadName(value) {
  if (typeof value !== 'string' || !value.startsWith('/uploads/') || value.includes('..')) return null;
  const name = path.basename(value.split('?')[0]);
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}\.(jpe?g|png|webp|gif)$/i.test(name) ? name : null;
}

async function columnValues(k, table, column) {
  if (!await k.schema.hasTable(table) || !await k.schema.hasColumn(table, column)) return [];
  const rows = await k(table).select(column);
  return rows.map(row => row[column]).filter(value => typeof value === 'string' && value.trim());
}

function removeAssetDir(abs) {
  const target = path.resolve(abs);
  if (path.basename(path.dirname(target)) !== 'assets' || !ASSET_DIRS.includes(path.basename(target))) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function removeUpload(uploadsDir, name) {
  const directory = path.resolve(uploadsDir);
  const file = path.resolve(directory, name);
  if (path.dirname(file) !== directory) return;
  fs.rmSync(file, { force: true });
  const thumb = path.resolve(directory, 'thumbs', `${name}.webp`);
  if (path.dirname(thumb) === path.resolve(directory, 'thumbs')) fs.rmSync(thumb, { force: true });
}

function removeCatalogueFiles(reviewNames) {
  for (const base of [
    path.join(root, 'public', 'assets'),
    path.join(root, 'dist', 'assets'),
    path.resolve(root, '..', 'public_html', 'assets'),
  ]) {
    for (const name of ASSET_DIRS) removeAssetDir(path.join(base, name));
  }

  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(root, 'public', 'uploads'));
  if (!fs.existsSync(uploadsDir)) return;
  const names = fs.readdirSync(uploadsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}\.(jpe?g|png|webp|gif)$/i.test(entry.name))
    .map(entry => entry.name);
  for (const name of names) {
    if (!reviewNames.has(name)) removeUpload(uploadsDir, name);
  }
}

export async function up(k) {
  const stored = [];
  for (const table of IMAGE_TABLES) stored.push(...await columnValues(k, table, 'url'));
  for (const [table, column] of IMAGE_COLUMNS) stored.push(...await columnValues(k, table, column));
  const catalogueMedia = stored.filter(isCatalogueMedia);
  const reviewNames = new Set((await columnValues(k, 'review_images', 'image_url')).map(uploadName).filter(Boolean));

  let removedRows = 0;
  for (const table of IMAGE_TABLES) {
    if (await k.schema.hasTable(table)) removedRows += await k(table).del();
  }
  for (const [table, column] of IMAGE_COLUMNS) {
    if (!await k.schema.hasTable(table) || !await k.schema.hasColumn(table, column)) continue;
    await k(table).whereNotNull(column).update({ [column]: null });
  }

  if (catalogueMedia.length) {
    removeCatalogueFiles(reviewNames);
    console.log(`Migration 034: cleared ${removedRows} catalogue image rows and removed stored product image files.`);
  }
}

export async function down() {
  throw new Error('Migration 034 removes catalogue photos and cannot be rolled back. Restore a database backup instead.');
}
