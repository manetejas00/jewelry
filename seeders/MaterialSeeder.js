import { db, now } from '../server/db.js';

export const materialsData = [
  {
    name: 'Gold',
    slug: 'gold',
    description: 'Certified 22K and 18K solid yellow and rose gold, refined to eternal Indian standards.',
    thumbnail: '/assets/materials/gold.webp',
    status: 'active',
    sort_order: 1,
    seo_title: 'Solid Gold Jewellery Collection | Veyora Jewels',
    meta_description: 'Explore handcrafted gold necklaces, rings, earrings and bangles in 22K and 18K gold.'
  },
  {
    name: 'Silver',
    slug: 'silver',
    description: 'Lustrous 925 Sterling Silver handcrafted into contemporary chokers, studs, and heirloom silverware.',
    thumbnail: '/assets/materials/silver.webp',
    status: 'active',
    sort_order: 2,
    seo_title: '925 Sterling Silver Jewellery | Veyora Jewels',
    meta_description: 'Discover fine 925 sterling silver necklaces, rings, earrings and coins.'
  },
  {
    name: 'Oxidised Silver',
    slug: 'oxidised-silver',
    description: 'Antiqued sterling silver with deep blackened relief, celebrating tribal and regional heritage motifs.',
    thumbnail: '/assets/materials/oxidised-silver.webp',
    status: 'active',
    sort_order: 3,
    seo_title: 'Oxidised Silver Ethnic Jewellery | Veyora Jewels',
    meta_description: 'Handcrafted oxidised silver jhumkas, chokers, payal and tribal cuffs.'
  },
  {
    name: 'Pearl',
    slug: 'pearl',
    description: 'Luminous freshwater and cultured pearls selected for exceptional lustre and spherical balance.',
    thumbnail: '/assets/materials/pearl.webp',
    status: 'active',
    sort_order: 4,
    seo_title: 'Cultured Pearl Jewellery Collection | Veyora Jewels',
    meta_description: 'Artisanal cultured pearl necklaces, drops, and delicate rings.'
  },
  {
    name: 'Gemstones',
    slug: 'gemstones',
    description: 'Vibrant rubies, emeralds, sapphires and semi-precious stones set into royal Indian jewellery.',
    thumbnail: '/assets/materials/gemstones.webp',
    status: 'active',
    sort_order: 5,
    seo_title: 'Precious Gemstone Jewellery | Veyora Jewels',
    meta_description: 'Royal emerald, ruby and navratna gemstone jewellery handcrafted in gold and silver.'
  },
  {
    name: 'Diamond',
    slug: 'diamond',
    description: 'Brilliant natural diamonds and diamond-style polki accents crafted for everlasting sparkle.',
    thumbnail: '/assets/materials/diamond.webp',
    status: 'active',
    sort_order: 6,
    seo_title: 'Diamond Jewellery & Solitaires | Veyora Jewels',
    meta_description: 'Timeless diamond mangalsutras, everyday solitaire rings and earrings.'
  },
  {
    name: 'Brass',
    slug: 'brass',
    description: 'Sturdy traditional brass base metal, masterfully gold-dipped or antique electroplated.',
    thumbnail: '/assets/materials/brass.webp',
    status: 'active',
    sort_order: 7,
    seo_title: 'Artisanal Brass Jewellery | Veyora Jewels',
    meta_description: 'Gold-dipped handcrafted brass temple jewellery and bridal accessories.'
  },
  {
    name: 'Alloy',
    slug: 'alloy',
    description: 'Lightweight hypoallergenic copper and metal alloys engineered for comfortable bridal statements.',
    thumbnail: '/assets/materials/alloy.webp',
    status: 'active',
    sort_order: 8,
    seo_title: 'Specialty Alloy Fashion Jewellery | Veyora Jewels',
    meta_description: 'Intricately cast Kundan and Polki festive sets in comfortable specialty alloys.'
  },
  {
    name: 'Black Beads',
    slug: 'black-beads',
    description: 'Auspicious sacred black spinel and glass beads hand-strung for sacred Mangalsutras.',
    thumbnail: '/assets/materials/black-beads.webp',
    status: 'active',
    sort_order: 9,
    seo_title: 'Traditional Black Bead Mangalsutras | Veyora Jewels',
    meta_description: 'Sacred black bead mangalsutras with gold and diamond pendants.'
  },
  {
    name: 'Mixed Materials',
    slug: 'mixed-materials',
    description: 'Harmonious combinations of gold, pearls, meenakari enamel and colored gemstones.',
    thumbnail: '/assets/materials/mixed-materials.webp',
    status: 'active',
    sort_order: 10,
    seo_title: 'Mixed Material Fine Jewellery | Veyora Jewels',
    meta_description: 'Exquisite fusion of precious metals, pearls and enamels.'
  },
  {
    name: 'Other Traditional Materials',
    slug: 'traditional-materials',
    description: 'Authentic silken dori threads, lac work, and heritage regional materials.',
    thumbnail: '/assets/materials/traditional-materials.webp',
    status: 'active',
    sort_order: 11,
    seo_title: 'Traditional Indian Heritage Materials | Veyora Jewels',
    meta_description: 'Regional artisanal jewellery crafted with traditional dori and lac materials.'
  }
];

export async function MaterialSeeder(k = db) {
  if (!await k.schema.hasTable('materials')) return { inserted: 0, updated: 0 };
  const timestamp = now();
  let inserted = 0;
  let updated = 0;

  for (const m of materialsData) {
    const existing = await k('materials').where({ slug: m.slug }).first();
    if (existing) {
      await k('materials').where({ id: existing.id }).update({
        name: m.name,
        description: m.description,
        thumbnail: m.thumbnail,
        status: m.status,
        sort_order: m.sort_order,
        seo_title: m.seo_title,
        meta_description: m.meta_description,
        updated_at: timestamp
      });
      updated++;
    } else {
      await k('materials').insert({
        ...m,
        created_at: timestamp,
        updated_at: timestamp
      });
      inserted++;
    }
  }

  return { inserted, updated, total: materialsData.length };
}
