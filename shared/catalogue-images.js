import { now } from '../server/db.js';

export const IMPORT_ANGLE_COLUMNS = [
  'image_front',
  'image_back',
  'image_right',
  'image_left',
  'image_detail',
  'image_model'
];

const ANGLE_META = {
  image: { role: 'hero', sort: 1 },
  image_front: { role: 'front', sort: 2 },
  image_left: { role: 'left', sort: 3 },
  image_right: { role: 'right', sort: 4 },
  image_back: { role: 'back', sort: 5 },
  image_model: { role: 'model', sort: 6 },
  image_detail: { role: 'detail', sort: 7 }
};

const FIELD_BY_ROLE = {
  front: 'image_front',
  back: 'image_back',
  right: 'image_right',
  left: 'image_left',
  detail: 'image_detail',
  model: 'image_model'
};

export function suppliedImportImages(row) {
  return Object.entries(ANGLE_META).flatMap(([field, meta]) => {
    const url = String(row?.[field] ?? '').trim();
    return url ? [{ field, url, ...meta }] : [];
  });
}

export function catalogueImageError(value, { allowSvg = true } = {}) {
  const image = String(value ?? '').trim();
  if (!image) return '';
  const ext = allowSvg ? 'png|jpe?g|webp|gif|svg' : 'png|jpe?g|webp|gif';
  if (image.includes('..') || (!/^https:\/\//.test(image) && !new RegExp(`^/(uploads|assets)/[a-zA-Z0-9_./-]+\\.(${ext})$`, 'i').test(image))) {
    return allowSvg
      ? 'Use HTTPS or a saved /uploads/ or /assets/ image'
      : 'Use an HTTPS URL or an image from /uploads/ or /assets/';
  }
  return '';
}

export function stripImportAngles(row) {
  const copy = { ...row };
  for (const field of IMPORT_ANGLE_COLUMNS) delete copy[field];
  return copy;
}

export function resolveStoredImage(row, existingImage = '', fallback = '') {
  const hero = String(row?.image ?? '').trim();
  if (hero) return hero;
  const angle = suppliedImportImages(row).find(photo => photo.field !== 'image');
  if (angle && !String(existingImage || '').trim()) return angle.url;
  if (angle) return String(existingImage || '');
  return fallback;
}

export function exportImageFields(row = {}) {
  const fromPhotos = {};
  for (const photo of row.images || []) {
    const field = FIELD_BY_ROLE[photo?.role];
    if (field && photo.url && !fromPhotos[field]) fromPhotos[field] = photo.url;
  }
  return Object.fromEntries(IMPORT_ANGLE_COLUMNS.map(field => [field, String(row[field] || fromPhotos[field] || '')]));
}

function samePiece(photo, row) {
  const keys = [row?.sku, row?.product_code].filter(Boolean).map(String);
  const photoKeys = [photo?.sku, photo?.product_code].filter(Boolean).map(String);
  return keys.some(key => photoKeys.includes(key));
}

export async function rowsWithGallery(k, rows, kind) {
  const photos = [];
  const add = async table => {
    if (!await k.schema.hasTable(table)) return;
    photos.push(...await k(table).select('*'));
  };
  await add('product_images');
  if (kind === 'coins') await add('coin_images');
  if (kind === 'products' || kind === 'jewelry' || kind === 'jewellery') await add('jewelry_images');
  if (kind === 'kurtas' || kind === 'kurta') await add('kurta_images');
  return rows.map(row => ({ ...row, images: photos.filter(photo => samePiece(photo, row)) }));
}

async function upsertImage(k, table, match, photo, alt) {
  const existing = await k(table).where(match).first();
  const stamp = now();
  const values = {
    url: photo.url,
    alt_text: String(alt || '').slice(0, 255) || null,
    sort_order: photo.sort,
    updated_at: stamp
  };
  if (existing) {
    await k(table).where({ id: existing.id }).update(values);
    return;
  }
  await k(table).insert({ ...match, role: photo.role, ...values, created_at: stamp });
}

async function upsertProductImage(k, photo, { sku, productCode, alt }) {
  const existing = await k('product_images').where({ role: photo.role }).where(function () {
    if (productCode) this.where({ product_code: productCode });
    if (sku) productCode ? this.orWhere({ sku }) : this.where({ sku });
  }).first();
  const stamp = now();
  const values = {
    url: photo.url,
    alt_text: String(alt || '').slice(0, 255) || null,
    sort_order: photo.sort,
    updated_at: stamp
  };
  if (existing) {
    await k('product_images').where({ id: existing.id }).update(values);
    return;
  }
  await k('product_images').insert({
    product_code: productCode || sku,
    sku: sku || productCode,
    role: photo.role,
    ...values,
    created_at: stamp
  });
}

export async function saveImportedCatalogueImages(k, row, kind) {
  const photos = suppliedImportImages(row);
  if (!photos.length) return;
  const alt = row.name || '';
  const sku = row.sku || null;
  const productCode = row.product_code || null;

  if (await k.schema.hasTable('product_images')) {
    for (const photo of photos) await upsertProductImage(k, photo, { sku, productCode, alt });
  }

  if (kind === 'coins' && sku && await k.schema.hasTable('coins') && await k.schema.hasTable('coin_images')) {
    const coin = await k('coins').where({ sku }).first();
    if (coin) {
      for (const photo of photos) {
        await upsertImage(k, 'coin_images', { coin_id: coin.id, role: photo.role }, photo, alt);
        await k('coin_images').where({ coin_id: coin.id, role: photo.role }).update({ sku });
      }
    }
  }

  if ((kind === 'products' || kind === 'jewelry') && sku && await k.schema.hasTable('jewelries') && await k.schema.hasTable('jewelry_images')) {
    const jewelry = await k('jewelries').where(function () {
      this.where({ sku });
      if (productCode) this.orWhere({ product_code: productCode });
    }).first();
    if (jewelry) {
      for (const photo of photos) {
        await upsertImage(k, 'jewelry_images', { jewelry_id: jewelry.id, role: photo.role }, photo, alt);
        await k('jewelry_images').where({ jewelry_id: jewelry.id, role: photo.role }).update({
          sku: jewelry.sku || sku,
          product_code: jewelry.product_code || productCode
        });
      }
      const hero = String(row.image || '').trim();
      const angle = photos.find(photo => photo.field !== 'image');
      if (hero || (!jewelry.image && angle)) {
        await k('jewelries').where({ id: jewelry.id }).update({ image: hero || angle.url, updated_at: now() });
      }
    }
  }

  if (kind === 'kurtas' && productCode && await k.schema.hasTable('kurtas') && await k.schema.hasTable('kurta_images')) {
    const kurta = await k('kurtas').where({ product_code: productCode }).first();
    if (kurta) {
      for (const photo of photos) {
        await upsertImage(k, 'kurta_images', { product_code: productCode, role: photo.role }, photo, alt);
        await k('kurta_images').where({ product_code: productCode, role: photo.role }).update({
          kurta_id: kurta.id,
          sku: null,
          color: row.color || null
        });
      }
      const hero = String(row.image || '').trim();
      const angle = photos.find(photo => photo.field !== 'image');
      if (hero || (!kurta.image && angle)) {
        await k('kurtas').where({ id: kurta.id }).update({ image: hero || angle.url, updated_at: now() });
      }
    }
  }
}
