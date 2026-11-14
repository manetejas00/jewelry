import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';

export const categoriesData = [
  {
    slug: 'chicken-curry-kurtas',
    name: 'Chicken Curry Kurtas for Women',
    description: 'Handcrafted authentic Lucknowi Chikankari (Chicken Curry) embroidered kurtas for women, tailored in pure breathable mulmul, fine georgette, and shimmering Chanderi silk with delicate heritage needlework.',
    thumbnail: '/assets/categories/chicken-curry-kurtas-thumb.webp',
    banner: '/assets/categories/chicken-curry-kurtas-banner.webp',
    status: 'active',
    sort_order: 1,
    seo_title: 'Chicken Curry Kurtas for Women – Handcrafted Lucknowi Chikankari | Veyora',
    meta_description: 'Explore exquisite Chicken Curry (Chikankari) kurtas for women. Handcrafted pure cotton and georgette kurtas featuring timeless Awadhi embroidery. Free shipping across India.'
  },
  {
    slug: 'chicken-curry-collection',
    name: 'Chicken Curry Kurta Collection',
    description: 'The definitive edit of handcrafted Chicken Curry kurtis, straight-cut kurtas, and festive Anarkalis tailored for effortless grace.',
    thumbnail: '/assets/categories/chicken-curry-collection-thumb.webp',
    banner: '/assets/categories/chicken-curry-collection-banner.webp',
    status: 'active',
    sort_order: 2,
    seo_title: 'Chicken Curry Kurta Collection – Hand-Embroidered Ethnic Kurtis | Veyora',
    meta_description: 'Discover the Chicken Curry Kurta Collection. Elegant hand-embroidered silhouettes for celebrations and daily grace.'
  },
  {
    slug: 'kurta-jewellery-combos',
    name: 'Kurta & Jewellery Combo',
    description: 'Artfully paired ensembles combining hand-embroidered Chicken Curry Kurtas with matching cultured pearl and gold jewellery.',
    thumbnail: '/assets/categories/kurta-jewellery-combos-thumb.webp',
    banner: '/assets/categories/kurta-jewellery-combos-banner.webp',
    status: 'active',
    sort_order: 3,
    seo_title: 'Kurta & Jewellery Combos – Coordinated Ethnic Sets | Veyora',
    meta_description: 'Shop curated Kurta and Jewellery Combos. Perfectly paired Chikankari kurtas with fine pearl earrings and necklaces with exclusive bundle savings.'
  },
  {
    slug: 'premium-ethnic-wear',
    name: 'Premium Ethnic Wear',
    description: 'Sophisticated artisanal ethnic garments, luxury Chanderi kurtas, and royal heirloom ensembles tailored in fine natural fabrics.',
    thumbnail: '/assets/categories/premium-ethnic-wear-thumb.webp',
    banner: '/assets/categories/premium-ethnic-wear-banner.webp',
    status: 'active',
    sort_order: 4,
    seo_title: "Premium Ethnic Wear for Women – Luxury Handcrafted Kurtas | Veyora",
    meta_description: "Elevate your wardrobe with premium women's ethnic wear. Pure fabrics, meticulous Lucknowi needlework, and timeless elegance."
  },
  {
    slug: 'festive-kurtas',
    name: 'Festive Kurta Collection',
    description: 'Radiant hand-embroidered kurtas with intricate tonal threadwork and subtle shimmer for festive occasions, Eid, and celebrations.',
    thumbnail: '/assets/categories/festive-kurtas-thumb.webp',
    banner: '/assets/categories/festive-kurtas-banner.webp',
    status: 'active',
    sort_order: 5,
    seo_title: 'Festive Kurta Collection – Celebration Ethnic Ensembles | Veyora',
    meta_description: 'Celebrate in style with our Festive Kurta Collection. Opulent Chikankari embroidery on georgette and Chanderi fabrics.'
  },
  {
    slug: 'everyday-ethnic-wear',
    name: "Everyday Women's Ethnic Wear",
    description: 'Lightweight, breathable pure cotton Chikankari kurtas designed for effortless all-day comfort and workwear grace.',
    thumbnail: '/assets/categories/everyday-ethnic-wear-thumb.webp',
    banner: '/assets/categories/everyday-ethnic-wear-banner.webp',
    status: 'active',
    sort_order: 6,
    seo_title: "Everyday Women's Ethnic Wear – Breathable Cotton Kurtas | Veyora",
    meta_description: 'Discover lightweight, comfortable everyday ethnic kurtas. Breathable pure mulmul cotton with delicate shadow work for daily wear.'
  },
  {
    slug: 'kurta-gift-sets',
    name: 'Kurta Gift Sets',
    description: 'Elegantly boxed gift sets pairing hand-embroidered Chikankari kurtas with fine jewellery and luxury packaging for gifting.',
    thumbnail: '/assets/categories/kurta-gift-sets-thumb.webp',
    banner: '/assets/categories/kurta-gift-sets-banner.webp',
    status: 'active',
    sort_order: 7,
    seo_title: 'Kurta Gift Sets – Luxury Packaged Kurta & Jewellery Gifts | Veyora',
    meta_description: 'Delight your loved ones with curated Kurta Gift Sets. Handcrafted kurtas paired with heirloom pearl jewellery in signature packaging.'
  },
  {
    slug: 'premium-jewellery-kurta-sets',
    name: 'Premium Jewellery & Kurta Sets',
    description: 'High-jewellery suites coordinated with artisanal Chikankari couture for weddings and grand celebrations.',
    thumbnail: '/assets/categories/premium-jewellery-kurta-sets-thumb.webp',
    banner: '/assets/categories/premium-jewellery-kurta-sets-banner.webp',
    status: 'active',
    sort_order: 8,
    seo_title: 'Premium Jewellery & Kurta Sets – Wedding & Bridal Edits | Veyora',
    meta_description: 'Exquisite high-jewellery and couture Chikankari sets for brides, festivities, and heirloom celebrations.'
  },
  {
    slug: 'earrings',
    name: 'Earrings',
    description: 'Luminous cultured pearl and gold earrings, drops, and studs designed for everyday wear and quiet luxury.',
    thumbnail: '/assets/products/lune-pearl-drops/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 9,
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
    sort_order: 10,
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
    sort_order: 11,
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
    sort_order: 12,
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
    sort_order: 13,
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
