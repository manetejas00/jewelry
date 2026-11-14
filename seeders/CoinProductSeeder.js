import { db, now } from '../server/db.js';
import { coinArtwork } from '../server/coin-artwork.js';

export const coinSupplier = 'Veyora Bullion Refinery';

export async function CoinProductSeeder(k = db) {
  if (!await k.schema.hasTable('coins')) {
    throw Error('Run migrations before running CoinProductSeeder.');
  }

  return k.transaction(async (t) => {
    let inserted = 0;
    let updated = 0;
    const timestamp = now();

    for (const [idx, coin] of coinArtwork.entries()) {
      const existing = await t('coins').where({ sku: coin.sku }).first();

      const makingCharge = coin.metal === 'Gold'
        ? (coin.weight_g <= 2 ? '450.00' : coin.weight_g <= 10 ? '750.00' : '1500.00')
        : (coin.weight_g <= 20 ? '150.00' : coin.weight_g <= 100 ? '350.00' : '650.00');

      const fixedPrice = coin.metal === 'Gold'
        ? String(Math.round(coin.weight_g * 9800 + Number(makingCharge)))
        : String(Math.round(coin.weight_g * 115 + Number(makingCharge)));

      const payload = {
        sku: coin.sku,
        name: coin.name,
        metal: coin.metal,
        coin_type: coin.metal === 'Gold' ? 'Gold Bullion Coin' : 'Silver Bullion Coin',
        purity: coin.purity,
        weight_g: String(coin.weight_g),
        dimension: coin.dimension,
        making_charge: makingCharge,
        pricing_mode: idx % 4 === 0 ? 'FIXED' : 'METAL_LINKED',
        fixed_price: fixedPrice,
        stock: 25,
        description: coin.description,
        image: coin.image,
        image_kind: 'illustration',
        status: 'published',
        supplier: coinSupplier,
        source_timestamp: timestamp,
        updated_at: timestamp
      };

      if (existing) {
        await t('coins').where({ id: existing.id }).update({
          name: payload.name,
          metal: payload.metal,
          purity: payload.purity,
          weight_g: payload.weight_g,
          dimension: payload.dimension,
          description: payload.description,
          image: payload.image,
          status: payload.status,
          updated_at: timestamp
        });
        updated++;
      } else {
        await t('coins').insert({
          ...payload,
          created_at: timestamp
        });
        inserted++;
      }
    }

    return { inserted, updated, total: coinArtwork.length };
  }, k.client.config.client === 'mysql2' ? { isolationLevel: 'read committed' } : {});
}
