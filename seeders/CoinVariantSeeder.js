import { db, now } from '../server/db.js';

export async function CoinVariantSeeder(k = db, coinId, variants = []) {
  if (!await k.schema.hasTable('coin_variants')) {
    throw Error('Table coin_variants does not exist. Run migrations first.');
  }

  const timestamp = now();
  let created = 0;
  let updated = 0;

  for (const v of variants) {
    const existing = await k('coin_variants').where({ sku: v.sku }).first();
    let variantId;

    if (!existing) {
      const [newId] = await k('coin_variants').insert({
        coin_id: coinId,
        sku: v.sku,
        name: v.name,
        weight_g: v.weight_g,
        purity: v.purity,
        metal: v.metal,
        dimension: v.dimension || null,
        price: v.price != null ? v.price : v.fixed_price,
        fixed_price: v.fixed_price != null ? v.fixed_price : null,
        stock: v.stock != null ? v.stock : 20,
        status: v.status || 'published',
        created_at: timestamp,
        updated_at: timestamp
      });
      variantId = newId;
      created++;

      if (await k.schema.hasTable('coin_inventory')) {
        await k('coin_inventory').insert({
          coin_id: coinId,
          variant_id: variantId,
          sku: v.sku,
          quantity_change: v.stock != null ? v.stock : 20,
          balance_after: v.stock != null ? v.stock : 20,
          reason: 'initial_seeder',
          reference_id: `SEED-COIN-VAR-${variantId}`,
          created_at: timestamp
        });
      }
    } else {
      await k('coin_variants').where({ id: existing.id }).update({
        name: v.name !== undefined ? v.name : existing.name,
        weight_g: v.weight_g !== undefined ? v.weight_g : existing.weight_g,
        purity: v.purity !== undefined ? v.purity : existing.purity,
        metal: v.metal !== undefined ? v.metal : existing.metal,
        dimension: v.dimension !== undefined ? v.dimension : existing.dimension,
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
