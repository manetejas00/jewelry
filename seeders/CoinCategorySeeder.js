import { db, now } from '../server/db.js';

export const COIN_CATEGORIES = [
  {
    slug: 'gold-coins',
    name: 'Gold Coins',
    description: '24 Karat 999 pure gold investment coins and medallions stamped with sacred emblems.',
    sort_order: 1
  },
  {
    slug: 'silver-coins',
    name: 'Silver Coins',
    description: '999 fine silver bullion coins crafted for auspicious gifting and festive ceremonies.',
    sort_order: 2
  },
  {
    slug: 'bullion-bars',
    name: 'Bullion Bars',
    description: 'Precision cast gold and silver bars in tamper-proof assay cards with certified weight.',
    sort_order: 3
  }
];

export async function CoinCategorySeeder(k = db) {
  if (!await k.schema.hasTable('coin_categories')) {
    throw Error('Table coin_categories does not exist. Run migrations first.');
  }

  const timestamp = now();
  let created = 0;
  let updated = 0;

  for (const cat of COIN_CATEGORIES) {
    const existing = await k('coin_categories').where({ slug: cat.slug }).first();
    if (!existing) {
      await k('coin_categories').insert({
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sort_order: cat.sort_order,
        status: 'active',
        created_at: timestamp,
        updated_at: timestamp
      });
      created++;
    } else {
      await k('coin_categories').where({ id: existing.id }).update({
        name: cat.name,
        description: cat.description,
        sort_order: cat.sort_order,
        updated_at: timestamp
      });
      updated++;
    }
  }

  return { created, updated, total: COIN_CATEGORIES.length };
}
