import { db, now } from '../server/db.js';

export async function JewelryVariantSeeder(k = db, jewelryId, variants = []) {
  if (!await k.schema.hasTable('jewelry_variants')) {
    throw Error('Table jewelry_variants does not exist. Run migrations first.');
  }

  const timestamp = now();
  let created = 0;
  let updated = 0;

  for (const v of variants) {
    const existing = await k('jewelry_variants').where({ sku: v.sku }).first();
    let variantId;

    if (!existing) {
      const [newId] = await k('jewelry_variants').insert({
        jewelry_id: jewelryId,
        product_code: v.product_code,
        sku: v.sku,
        size: v.size || null,
        finish: v.finish || null,
        metal: v.metal || 'Gold',
        purity: v.purity || '18K',
        gross_weight_g: v.gross_weight_g != null ? v.gross_weight_g : v.net_weight_g,
        net_weight_g: v.net_weight_g != null ? v.net_weight_g : null,
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

      // Log initial inventory entry
      if (await k.schema.hasTable('jewelry_inventory')) {
        await k('jewelry_inventory').insert({
          jewelry_id: jewelryId,
          variant_id: variantId,
          sku: v.sku,
          quantity_change: v.stock != null ? v.stock : 10,
          balance_after: v.stock != null ? v.stock : 10,
          reason: 'initial_seeder',
          reference_id: `SEED-VAR-${variantId}`,
          created_at: timestamp
        });
      }
    } else {
      await k('jewelry_variants').where({ id: existing.id }).update({
        size: v.size !== undefined ? v.size : existing.size,
        finish: v.finish !== undefined ? v.finish : existing.finish,
        metal: v.metal !== undefined ? v.metal : existing.metal,
        purity: v.purity !== undefined ? v.purity : existing.purity,
        gross_weight_g: v.gross_weight_g !== undefined ? v.gross_weight_g : existing.gross_weight_g,
        net_weight_g: v.net_weight_g !== undefined ? v.net_weight_g : existing.net_weight_g,
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
