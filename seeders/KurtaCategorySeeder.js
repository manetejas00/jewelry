import { db, now } from '../server/db.js';

export const KURTA_CATEGORIES = [
  {
    slug: 'chicken-curry-kurtas',
    name: 'Chicken Curry Kurtas',
    description: 'Authentic handcrafted Lucknowi Chikankari needlework kurtas with delicate floral motifs and shadow embroidery.',
    sort_order: 1
  },
  {
    slug: 'cotton-chikankari',
    name: 'Cotton Chikankari',
    description: 'Ultra-breathable premium mulmul cotton embroidered in classic shadow work for daytime elegance.',
    sort_order: 2
  },
  {
    slug: 'georgette-kurtas',
    name: 'Georgette Kurtas',
    description: 'Fluid drape viscose georgette detailed with tonal Bakhiya and Phanda stitches for evening wear.',
    sort_order: 3
  },
  {
    slug: 'chanderi-silk-kurtas',
    name: 'Chanderi Silk Kurtas',
    description: 'Royal handloom Chanderi silk with delicate zari and Chikankari accents for festive celebrations.',
    sort_order: 4
  }
];

export async function KurtaCategorySeeder(k = db) {
  if (!await k.schema.hasTable('kurta_categories')) {
    throw Error('Table kurta_categories does not exist. Run migrations first.');
  }

  const timestamp = now();
  let created = 0;
  let updated = 0;

  for (const cat of KURTA_CATEGORIES) {
    const existing = await k('kurta_categories').where({ slug: cat.slug }).first();
    if (!existing) {
      await k('kurta_categories').insert({
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
      await k('kurta_categories').where({ id: existing.id }).update({
        name: cat.name,
        description: cat.description,
        sort_order: cat.sort_order,
        updated_at: timestamp
      });
      updated++;
    }
  }

  return { created, updated, total: KURTA_CATEGORIES.length };
}
