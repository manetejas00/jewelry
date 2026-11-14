import { db, now } from '../server/db.js';

export const JEWELRY_CATEGORIES = [
  {
    slug: 'rings',
    name: 'Rings',
    description: 'Fine artisan rings in gold and silver with lustrous pearls and gemstones.',
    sort_order: 1,
    seo_title: 'Fine Artisan Rings | Veyora Jewels',
    meta_description: 'Explore handcrafted gold and silver rings set with luminous pearls and radiant gemstones.'
  },
  {
    slug: 'earrings',
    name: 'Earrings',
    description: 'Graceful drops, statement hoops, and delicate studs crafted with heirloom precision.',
    sort_order: 2,
    seo_title: 'Heirloom Earrings | Veyora Jewels',
    meta_description: 'Discover graceful drop earrings, delicate pearl studs, and artisanal statement hoops.'
  },
  {
    slug: 'necklaces',
    name: 'Necklaces',
    description: 'Collar pieces, chokers, and pendant strings designed for understated luxury.',
    sort_order: 3,
    seo_title: 'Luxury Necklaces & Collars | Veyora Jewels',
    meta_description: 'Signature necklaces, pearl collars, and royal heritage chokers in 18K and 22K gold.'
  },
  {
    slug: 'bracelets',
    name: 'Bracelets',
    description: 'Sculptural cuffs, tennis chains, and pearl bracelets for modern elegance.',
    sort_order: 4,
    seo_title: 'Artisan Cuffs & Bracelets | Veyora Jewels',
    meta_description: 'Discover sculptural cuffs and delicate chain bracelets designed for daily elegance.'
  }
];

export async function JewelryCategorySeeder(k = db) {
  if (!await k.schema.hasTable('jewelry_categories')) {
    throw Error('Table jewelry_categories does not exist. Run migrations first.');
  }

  const timestamp = now();
  let created = 0;
  let updated = 0;

  for (const cat of JEWELRY_CATEGORIES) {
    const existing = await k('jewelry_categories').where({ slug: cat.slug }).first();
    if (!existing) {
      await k('jewelry_categories').insert({
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sort_order: cat.sort_order,
        seo_title: cat.seo_title,
        meta_description: cat.meta_description,
        status: 'active',
        created_at: timestamp,
        updated_at: timestamp
      });
      created++;
    } else {
      await k('jewelry_categories').where({ id: existing.id }).update({
        name: cat.name,
        description: cat.description,
        sort_order: cat.sort_order,
        seo_title: cat.seo_title,
        meta_description: cat.meta_description,
        updated_at: timestamp
      });
      updated++;
    }
  }

  return { created, updated, total: JEWELRY_CATEGORIES.length };
}
