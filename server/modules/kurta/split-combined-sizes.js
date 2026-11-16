import { now } from '../../db.js';
import { kurtaSizesInValue, sizedKurtaSku } from '../../../shared/kurta-sizes.js';

function sizeSlug(base, code, id) {
  const stem = `${String(base || 'kurta').toLowerCase()}-${code.toLowerCase()}`
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140);
  return id ? `${stem}-${id}`.slice(0, 150) : stem;
}

async function uniqueSlug(k, table, base, code, id) {
  let slug = sizeSlug(base, code);
  const taken = await k(table).where({ slug }).first();
  if (!taken) return slug;
  slug = sizeSlug(base, code, id);
  const stillTaken = await k(table).where({ slug }).first();
  return stillTaken ? `${slug}-${code.toLowerCase()}`.slice(0, 150) : slug;
}

function withoutId(row) {
  const copy = { ...row };
  delete copy.id;
  return copy;
}

export async function splitCombinedKurtaSizes(k) {
  const stamp = now();
  const touched = new Set();

  if (await k.schema.hasTable('kurta_variants')) {
    const rows = await k('kurta_variants').select('*');
    for (const row of rows) {
      const sizes = kurtaSizesInValue(row.size);
      if (sizes.length < 2) continue;
      await k('kurta_variants').where({ id: row.id }).update({ size: sizes[0].label, updated_at: stamp });
      for (const size of sizes.slice(1)) {
        const sku = sizedKurtaSku(row.sku, size.code);
        if (sku.length > 100 || await k('kurta_variants').where({ sku }).first()) continue;
        const slug = await uniqueSlug(k, 'kurta_variants', row.slug || row.sku, size.code, row.id);
        await k('kurta_variants').insert({
          ...withoutId(row),
          sku,
          slug,
          size: size.label,
          created_at: row.created_at || stamp,
          updated_at: stamp
        });
      }
      if (row.kurta_id) touched.add(row.kurta_id);
    }
  }

  if (await k.schema.hasTable('kurtas') && touched.size) {
    const hasSizes = await k.schema.hasColumn('kurtas', 'available_sizes');
    for (const kurtaId of touched) {
      const variants = await k('kurta_variants').where({ kurta_id: kurtaId });
      const patch = {
        stock: variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0),
        updated_at: stamp
      };
      if (hasSizes) patch.available_sizes = JSON.stringify([...new Set(variants.map(variant => variant.size).filter(Boolean))]);
      await k('kurtas').where({ id: kurtaId }).update(patch);
    }
  }

  if (await k.schema.hasTable('products') && await k.schema.hasColumn('products', 'size')) {
    const rows = await k('products').select('*').where(function() {
      this.where({ is_kurta: true }).orWhere({ is_kurta: 1 }).orWhere('category', 'like', '%Kurta%');
    });
    for (const row of rows) {
      const sizes = kurtaSizesInValue(row.size);
      if (sizes.length < 2) continue;
      await k('products').where({ id: row.id }).update({ size: sizes[0].label, updated_at: stamp });
      for (const size of sizes.slice(1)) {
        const sku = sizedKurtaSku(row.sku, size.code);
        if (sku.length > 100 || await k('products').where({ sku }).first()) continue;
        const slug = await uniqueSlug(k, 'products', row.slug || row.product_code || row.sku, size.code, row.id);
        const insert = {
          ...withoutId(row),
          sku,
          slug,
          size: size.label,
          updated_at: stamp
        };
        if ('is_kurta' in row) insert.is_kurta = row.is_kurta ?? true;
        await k('products').insert(insert);
      }
    }
  }
}
