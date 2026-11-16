import { db, now } from '../server/db.js';
import { validationError } from '../server/errors.js';
import { storedKurtaSize, KURTA_SIZE_CORRECTION } from '../shared/kurta-sizes.js';

export async function KurtaVariantSeeder(k = db, kurtaId, variants = []) {
  if (!await k.schema.hasTable('kurta_variants')) {
    throw Error('Table kurta_variants does not exist. Run migrations first.');
  }

  const timestamp = now();
  let created = 0;
  let updated = 0;

  for (const v of variants) {
    const existing = await k('kurta_variants')
      .where({ sku: v.sku })
      .orWhere({ slug: v.slug })
      .first();

    let variantId;
    const label = storedKurtaSize(v.size);
    if (!label) throw validationError(`Kurta variant ${v.sku || v.product_code || ''} needs one size. ${KURTA_SIZE_CORRECTION}`);

    if (!existing) {
      const [newId] = await k('kurta_variants').insert({
        kurta_id: kurtaId,
        product_code: v.product_code,
        sku: v.sku,
        slug: v.slug || `${v.product_code}-${v.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        size: label,
        color: v.color || null,
        color_code: v.color_code || null,
        hex_color: v.hex_color || null,
        finish: v.finish || 'Hand Embroidered',
        price: v.price != null ? v.price : v.fixed_price,
        fixed_price: v.fixed_price != null ? v.fixed_price : null,
        stock: v.stock != null ? v.stock : 10,
        image: v.image || null,
        status: v.status || 'published',
        created_at: timestamp,
        updated_at: timestamp
      });
      variantId = newId;
      created++;

      if (await k.schema.hasTable('kurta_inventory')) {
        await k('kurta_inventory').insert({
          kurta_id: kurtaId,
          variant_id: variantId,
          sku: v.sku,
          quantity_change: v.stock != null ? v.stock : 10,
          balance_after: v.stock != null ? v.stock : 10,
          reason: 'initial_seeder',
          reference_id: `SEED-KURTA-VAR-${variantId}`,
          created_at: timestamp
        });
      }
    } else {
      await k('kurta_variants').where({ id: existing.id }).update({
        size: label,
        color: v.color !== undefined ? v.color : existing.color,
        color_code: v.color_code !== undefined ? v.color_code : existing.color_code,
        hex_color: v.hex_color !== undefined ? v.hex_color : existing.hex_color,
        finish: v.finish !== undefined ? v.finish : existing.finish,
        price: v.price !== undefined ? v.price : existing.price,
        fixed_price: v.fixed_price !== undefined ? v.fixed_price : existing.fixed_price,
        status: v.status !== undefined ? v.status : existing.status,
        updated_at: timestamp
      });
      updated++;
    }
  }

  return { created, updated, count: variants.length };
}
