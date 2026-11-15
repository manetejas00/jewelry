import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';
import { coinArtwork } from '../shared/coin-artwork.js';
import { CoinCategorySeeder } from './CoinCategorySeeder.js';
import { CoinVariantSeeder } from './CoinVariantSeeder.js';

const MINT_NAME = 'Veyora Bullion Refinery';

export async function CoinSeeder(k = db) {
  if (!await k.schema.hasTable('coins')) {
    throw Error('Table coins does not exist. Run migrations first.');
  }

  // Ensure coin categories exist
  await CoinCategorySeeder(k);
  const categories = await k('coin_categories').select('id', 'slug');
  const goldCat = categories.find(c => c.slug === 'gold-coins')?.id || null;
  const silverCat = categories.find(c => c.slug === 'silver-coins')?.id || null;

  return k.transaction(async (t) => {
    let inserted = 0;
    let updated = 0;
    const timestamp = now();

    for (const [idx, coin] of coinArtwork.entries()) {
      const isGold = coin.metal === 'Gold';
      const catId = isGold ? goldCat : silverCat;
      const coinSlug = coin.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const denomination = `${coin.weight_g} Gram${coin.weight_g > 1 ? 's' : ''}`;
      const collection = coin.name.includes('Lakshmi') ? 'Divine Blessings' : coin.name.includes('Royal') ? 'Royal Heritage' : 'Classic Bullion';

      const makingCharge = isGold
        ? (coin.weight_g <= 2 ? '450.00' : coin.weight_g <= 10 ? '750.00' : '1500.00')
        : (coin.weight_g <= 20 ? '150.00' : coin.weight_g <= 100 ? '350.00' : '650.00');

      const fixedPrice = isGold
        ? String(Math.round(coin.weight_g * 9800 + Number(makingCharge)))
        : String(Math.round(coin.weight_g * 115 + Number(makingCharge)));

      const payload = {
        sku: coin.sku,
        slug: coinSlug,
        name: coin.name,
        category_id: catId,
        metal: coin.metal,
        coin_type: isGold ? 'Gold Bullion Coin' : 'Silver Bullion Coin',
        purity: coin.purity,
        weight_g: String(coin.weight_g),
        dimension: coin.dimension,
        denomination,
        mint: MINT_NAME,
        collection,
        edition: '2026 Sovereign Edition',
        year_of_issue: 2026,
        certification: 'NABL Accredited Assay Card',
        making_charge: makingCharge,
        pricing_mode: idx % 4 === 0 ? 'FIXED' : 'METAL_LINKED',
        fixed_price: fixedPrice,
        stock: 25,
        description: coin.description,
        image: coin.image,
        image_kind: 'illustration',
        status: 'published',
        seo_title: `${coin.name} | Veyora Bullion`,
        meta_description: coin.description,
        source_timestamp: timestamp,
        updated_at: timestamp
      };

      const existing = await t('coins').where({ sku: coin.sku }).first();
      let coinId;

      if (existing) {
        coinId = existing.id;
        await t('coins').where({ id: existing.id }).update({
          slug: payload.slug,
          name: payload.name,
          category_id: payload.category_id,
          metal: payload.metal,
          purity: payload.purity,
          weight_g: payload.weight_g,
          dimension: payload.dimension,
          denomination: payload.denomination,
          mint: payload.mint,
          collection: payload.collection,
          edition: payload.edition,
          year_of_issue: payload.year_of_issue,
          certification: payload.certification,
          description: payload.description,
          image: payload.image,
          status: payload.status,
          seo_title: payload.seo_title,
          meta_description: payload.meta_description,
          updated_at: timestamp
        });
        updated++;
      } else {
        const [newId] = await t('coins').insert({
          ...payload,
          created_at: timestamp
        });
        coinId = newId;
        inserted++;
      }

      // Seed Variant
      await CoinVariantSeeder(t, coinId, [{
        sku: coin.sku,
        name: coin.name,
        weight_g: coin.weight_g,
        purity: coin.purity,
        metal: coin.metal,
        dimension: coin.dimension,
        price: Number(fixedPrice),
        fixed_price: Number(fixedPrice),
        stock: payload.stock,
        status: payload.status
      }]);

      // Seed Image
      if (coin.image && await t.schema.hasTable('coin_images')) {
        const hasImg = await t('coin_images').where({ coin_id: coinId, url: coin.image }).first();
        if (!hasImg) {
          await t('coin_images').insert({
            coin_id: coinId,
            sku: coin.sku,
            role: 'hero',
            url: coin.image,
            alt_text: `${coin.name} - Obverse Face`,
            sort_order: 1,
            created_at: timestamp,
            updated_at: timestamp
          });
        }
      }
    }

    return { inserted, updated, total: coinArtwork.length };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await CoinSeeder(), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
