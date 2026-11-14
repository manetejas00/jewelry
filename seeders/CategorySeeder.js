import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';

export const categoriesData = [
  {
    slug: 'necklaces',
    name: 'Necklaces',
    description: 'Handcrafted gold collars, Kundan chokers, temple harams, and delicate pendants made to rest gracefully near the heart.',
    thumbnail: '/assets/products/atelier-pearl-collar/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 1,
    seo_title: 'Handcrafted Gold, Kundan & Pearl Necklaces | Veyora Jewels',
    meta_description: 'Discover solid gold, Kundan, Polki, and heirloom necklaces crafted with timeless artistry.'
  },
  {
    slug: 'mangalsutra',
    name: 'Mangalsutra',
    description: 'Sacred black bead chains paired with auspicious gold, diamond, and Maharashtrian vati pendants.',
    thumbnail: '/assets/products/lune-pearl-drops/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 2,
    seo_title: 'Sacred Gold & Diamond Mangalsutras | Veyora Jewels',
    meta_description: 'Traditional and modern everyday mangalsutras celebrating eternal union.'
  },
  {
    slug: 'earrings',
    name: 'Earrings',
    description: 'Traditional jhumkas, royal chandbalis, Kundan studs, and luminous pearls designed for celebratory and everyday grace.',
    thumbnail: '/assets/products/lune-pearl-drops/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 3,
    seo_title: 'Fine Jhumkas, Chandbalis & Gold Earrings | Veyora Jewels',
    meta_description: 'Handcrafted gold, Kundan, and pearl earrings, studs, and drops designed for radiant presence.'
  },
  {
    slug: 'rings',
    name: 'Rings',
    description: 'Signature gold bands, Kundan cocktail rings, gemstone solitaires, and antique royal statements.',
    thumbnail: '/assets/products/eclipse-ring/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 4,
    seo_title: 'Signature Gold, Kundan & Gemstone Rings | Veyora Jewels',
    meta_description: 'Solid gold rings featuring royal uncut polki, kundan, and gemstones for effortless daily luxury.'
  },
  {
    slug: 'bracelets',
    name: 'Bracelets',
    description: 'Sculptural open cuffs, tennis link bracelets, and station chains tailored for modern elegance.',
    thumbnail: '/assets/products/nocturne-cuff/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 5,
    seo_title: 'Gold & Silver Cuffs and Bracelets | Veyora Jewels',
    meta_description: 'Artisanal gold cuffs and delicate bracelets made to be worn alone or thoughtfully layered.'
  },
  {
    slug: 'bangles-and-kada',
    name: 'Bangles and Kada',
    description: 'Heritage temple kada, solid gold bangles, and openable filigree cuffs carrying hereditary karigar motifs.',
    thumbnail: '/assets/products/nocturne-cuff/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 6,
    seo_title: 'Traditional Gold Bangles & Temple Kada | Veyora Jewels',
    meta_description: 'Discover handcrafted gold bangles, Nakshi temple kada, and antique cuffs.'
  },
  {
    slug: 'maang-tikka-and-nath',
    name: 'Maang Tikka and Nath',
    description: 'Regal forehead ornaments, pearl matha pattis, and traditional Maharashtrian clip-on and pierced naths.',
    thumbnail: '/assets/products/atelier-pearl-collar/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 7,
    seo_title: 'Bridal Maang Tikka & Traditional Nath | Veyora Jewels',
    meta_description: 'Exquisite bridal maang tikkas, borlas, and traditional pearl naths.'
  },
  {
    slug: 'anklets-and-payal',
    name: 'Anklets and Payal',
    description: 'Lustrous 925 sterling silver payal, antique oxidised tribal anklets, and delicate gold station ankle chains.',
    thumbnail: '/assets/products/nocturne-cuff/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 8,
    seo_title: '925 Silver Payal & Traditional Anklets | Veyora Jewels',
    meta_description: 'Heirloom sterling silver payal, ghungroo anklets, and minimalist designs.'
  },
  {
    slug: 'jewellery-sets',
    name: 'Jewellery Sets',
    description: 'Complete ceremonial Kundan, Temple and Polki bridal parures uniting necklace, matching earrings, and maang tikka.',
    thumbnail: '/assets/products/atelier-pearl-collar/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 9,
    seo_title: 'Complete Bridal & Festive Jewellery Sets | Veyora Jewels',
    meta_description: 'Imperial Kundan and Temple bridal jewellery sets for auspicious celebrations.'
  },
  {
    slug: 'coins',
    name: 'Gold & Silver Coins',
    description: 'Certified investment-grade 24K pure gold and 999 fine silver bullion coins in tamper-proof assay cards.',
    thumbnail: '/assets/coins/coin-au-1g/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 10,
    seo_title: 'Investment Bullion Coins – 24K Gold & 999 Silver | Veyora Jewels',
    meta_description: 'Buy certified 24K gold and 999 silver coins with live market rates and zero hidden charges.'
  },
  {
    slug: 'kurtas',
    name: 'Chicken Curry Kurtas',
    description: 'Authentic handcrafted Lucknowi Chikankari kurtas in breathable pure mulmul cotton, chanderi, and georgette.',
    thumbnail: '/assets/products/lucknowi-ivory-chikankari-cotton-kurta/hero.webp',
    banner: '/assets/banners/festive-silver-coins.webp',
    status: 'active',
    sort_order: 11,
    seo_title: 'Handcrafted Lucknowi Chikankari Kurtas | Veyora Jewels',
    meta_description: 'Discover pure cotton and georgette Chikankari kurtas across sizes XS to XXXL.'
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
  }, k.client.config.client === 'mysql2' ? { isolationLevel: 'read committed' } : {});
}
