import { db, now } from '../server/db.js';

export const craftsmanshipData = [
  {
    name: 'Kundan',
    slug: 'kundan',
    description: 'Ancient royal Rajasthani method of setting highly refined 24K gold foil between gemstones and mountings.',
    thumbnail: '/assets/craftsmanship/kundan.webp',
    status: 'active',
    sort_order: 1,
    seo_title: 'Kundan Jewellery Collection | Veyora Jewels',
    meta_description: 'Exquisite Kundan chokers, necklaces, maang tikka and cocktail rings handcrafted by master karigars.'
  },
  {
    name: 'Polki',
    slug: 'polki',
    description: 'Uncut, unpolished natural diamonds set in rich gold frameworks, prized for organic Mughal brilliance.',
    thumbnail: '/assets/craftsmanship/polki.webp',
    status: 'active',
    sort_order: 2,
    seo_title: 'Polki Diamond Heritage Jewellery | Veyora Jewels',
    meta_description: 'Timeless Polki diamond necklaces, earrings and bridal sets celebrating royal heritage.'
  },
  {
    name: 'Meenakari',
    slug: 'meenakari',
    description: 'Vibrant mineral enamel fused onto engraved metal surfaces in traditional floral and peacock patterns.',
    thumbnail: '/assets/craftsmanship/meenakari.webp',
    status: 'active',
    sort_order: 3,
    seo_title: 'Meenakari Enamel Jewellery | Veyora Jewels',
    meta_description: 'Luminous Banarasi and Jaipur Meenakari jewellery in rich pastel and jewel tones.'
  },
  {
    name: 'Temple Craft',
    slug: 'temple-craft',
    description: 'South Indian sacred architecture-inspired gold reliefs depicting deities, coins, and temple pillars.',
    thumbnail: '/assets/craftsmanship/temple-craft.webp',
    status: 'active',
    sort_order: 4,
    seo_title: 'Authentic Temple Jewellery | Veyora Jewels',
    meta_description: 'Heirloom South Indian Temple necklaces, kasu malas and nakshi kada.'
  },
  {
    name: 'Filigree',
    slug: 'filigree',
    description: 'Delicate lace-like ornamentation spun from fine silver and gold wires in the ancient Cuttack Tarkasi style.',
    thumbnail: '/assets/craftsmanship/filigree.webp',
    status: 'active',
    sort_order: 5,
    seo_title: 'Tarkasi Silver Filigree Jewellery | Veyora Jewels',
    meta_description: 'Intricately spun silver and gold filigree earrings, pendants and bracelets.'
  },
  {
    name: 'Jadau',
    slug: 'jadau',
    description: 'Incomparable Indian setting technique where stones are embedded into softened pure gold bezels.',
    thumbnail: '/assets/craftsmanship/jadau.webp',
    status: 'active',
    sort_order: 6,
    seo_title: 'Jadau Bridal Jewellery | Veyora Jewels',
    meta_description: 'Imperial Jadau celebration jewellery handcrafted with uncut gems and pearls.'
  },
  {
    name: 'Nakshi',
    slug: 'nakshi',
    description: 'Deep sculptural repoussé and chasing carving divine deities and flora on solid gold sheets.',
    thumbnail: '/assets/craftsmanship/nakshi.webp',
    status: 'active',
    sort_order: 7,
    seo_title: 'Nakshi Sculptural Gold Jewellery | Veyora Jewels',
    meta_description: 'Hand-carved Nakshi bangles, chokers and vaddanams in antique gold.'
  },
  {
    name: 'Handcrafted',
    slug: 'handcrafted',
    description: 'Meticulously shaped, forged and soldered entirely by hereditary artisan karigars.',
    thumbnail: '/assets/craftsmanship/handcrafted.webp',
    status: 'active',
    sort_order: 8,
    seo_title: 'Handcrafted Indian Fine Jewellery | Veyora Jewels',
    meta_description: 'Pure artisan handcrafted gold and silver fine jewellery.'
  },
  {
    name: 'Stone Setting',
    slug: 'stone-setting',
    description: 'Precision prong, bezel and pavé micro-settings securing high-grade gemstones and solitaires.',
    thumbnail: '/assets/craftsmanship/stone-setting.webp',
    status: 'active',
    sort_order: 9,
    seo_title: 'Fine Gemstone & Diamond Settings | Veyora Jewels',
    meta_description: 'Master stone-set rings, tennis bracelets and daily pendants.'
  },
  {
    name: 'Traditional Engraving',
    slug: 'traditional-engraving',
    description: 'Hand-chiseled lettering, sacred geometric yantras and royal motifs etched into precious metals.',
    thumbnail: '/assets/craftsmanship/traditional-engraving.webp',
    status: 'active',
    sort_order: 10,
    seo_title: 'Hand Engraved Jewellery & Bullion | Veyora Jewels',
    meta_description: 'Artisanal hand-engraved gold coins, kada and signet rings.'
  },
  {
    name: 'Antique Craft',
    slug: 'antique-craft',
    description: 'Time-honored patination and textural oxidization evoking centuries-old royal dynasties.',
    thumbnail: '/assets/craftsmanship/antique-craft.webp',
    status: 'active',
    sort_order: 11,
    seo_title: 'Antique Finish Royal Jewellery | Veyora Jewels',
    meta_description: 'Heirloom antique gold and oxidised silver traditional jewellery.'
  },
  {
    name: 'Other Traditional Techniques',
    slug: 'traditional-techniques',
    description: 'Specialist regional crafts including Thewa glass-gold fusion and Pratapgarh goldsmithing.',
    thumbnail: '/assets/craftsmanship/traditional-techniques.webp',
    status: 'active',
    sort_order: 12,
    seo_title: 'Heritage Regional Techniques | Veyora Jewels',
    meta_description: 'Preserving endangered Indian goldsmithing and silversmithing techniques.'
  }
];

export async function CraftsmanshipSeeder(k = db) {
  if (!await k.schema.hasTable('craftsmanship')) return { inserted: 0, updated: 0 };
  const timestamp = now();
  let inserted = 0;
  let updated = 0;

  for (const c of craftsmanshipData) {
    const existing = await k('craftsmanship').where({ slug: c.slug }).first();
    if (existing) {
      await k('craftsmanship').where({ id: existing.id }).update({
        name: c.name,
        description: c.description,
        thumbnail: c.thumbnail,
        status: c.status,
        sort_order: c.sort_order,
        seo_title: c.seo_title,
        meta_description: c.meta_description,
        updated_at: timestamp
      });
      updated++;
    } else {
      await k('craftsmanship').insert({
        ...c,
        created_at: timestamp,
        updated_at: timestamp
      });
      inserted++;
    }
  }

  return { inserted, updated, total: craftsmanshipData.length };
}
