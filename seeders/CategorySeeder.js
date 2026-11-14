import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';

export const categoriesData = [
  {
    slug: 'earrings',
    name: 'Earrings',
    description: 'Luminous cultured pearl and gold earrings, drops, and studs designed for everyday wear and quiet luxury.',
    thumbnail: '/assets/products/lune-pearl-drops/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 1,
    seo_title: 'Fine Pearl & Gold Earrings | Veyora Jewels',
    meta_description: 'Handcrafted gold and pearl earrings, studs, and drops designed to be worn close every day.'
  },
  {
    slug: 'necklaces',
    name: 'Necklaces',
    description: 'Handcrafted gold collars, pearl strands, and delicate pendants made to rest gracefully near the heart.',
    thumbnail: '/assets/products/atelier-pearl-collar/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 2,
    seo_title: 'Handcrafted Pearl Necklaces & Chokers | Veyora Jewels',
    meta_description: 'Discover solid gold and pearl necklaces crafted with timeless restraint and beauty.'
  },
  {
    slug: 'rings',
    name: 'Rings',
    description: 'Signature pearl rings and everyday bands in solid 18K gold. An understated signature for your hands.',
    thumbnail: '/assets/products/eclipse-ring/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 3,
    seo_title: 'Signature Gold & Pearl Rings | Veyora Jewels',
    meta_description: 'Solid gold rings featuring luminous cultured pearls, designed for effortless daily wear.'
  },
  {
    slug: 'bracelets',
    name: 'Bracelets',
    description: 'Sculptural open cuffs, tennis bracelets, and pearl station chains tailored for modern elegance.',
    thumbnail: '/assets/products/nocturne-cuff/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 4,
    seo_title: 'Gold & Pearl Cuffs and Bracelets | Veyora Jewels',
    meta_description: 'Artisanal gold cuffs and pearl bracelets made to be worn alone or thoughtfully layered.'
  },
  {
    slug: 'coins',
    name: 'Gold & Silver Coins',
    description: 'Certified investment-grade 24K pure gold and 999 fine silver bullion coins in tamper-proof assay cards.',
    thumbnail: '/assets/coins/coin-au-1g/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 5,
    seo_title: 'Investment Bullion Coins – 24K Gold & 999 Silver | Veyora Jewels',
    meta_description: 'Buy certified 24K gold and 999 silver coins with live market rates and zero hidden charges.'
  }
];

export async function CategorySeeder(k = db) {
  if (!await k.schema.hasTable('categories')) {
    throw Error('Run migrations before running CategorySeeder.');
  }

  return k.transaction(async (t) => {
    let inserted = 0;
    let updated = 0;
    const timestamp = now();

    const validSlugs = categoriesData.map(c => c.slug);
    await t('categories').whereNotIn('slug', validSlugs).del();

    for (const cat of categoriesData) {
      const existing = await t('categories').where({ slug: cat.slug }).first();
      if (existing) {
        await t('categories').where({ id: existing.id }).update({
          name: cat.name,
          description: cat.description,
          thumbnail: cat.thumbnail,
          banner: cat.banner,
          status: cat.status,
          sort_order: cat.sort_order,
          seo_title: cat.seo_title,
          meta_description: cat.meta_description,
          updated_at: timestamp
        });
        updated++;
      } else {
        await t('categories').insert({
          ...cat,
          created_at: timestamp,
          updated_at: timestamp
        });
        inserted++;
      }
    }

    return { inserted, updated, total: categoriesData.length };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const res = await CategorySeeder();
    console.log('CategorySeeder complete:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('CategorySeeder failed:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
