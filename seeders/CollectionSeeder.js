import { db, now } from '../server/db.js';

export const collectionsData = [
  {
    name: 'Gold Collection',
    slug: 'gold',
    description: 'An ode to timeless Indian gold craftsmanship. Explore 22K and 18K necklaces, mangalsutras, jhumkas and bangles.',
    banner: '/assets/banners/gold-collection-banner.webp',
    thumbnail: '/assets/banners/gold-collection-thumb.webp',
    status: 'active',
    sort_order: 1,
    seo_title: 'The Gold Collection – Pure Heritage Gold Jewellery | Veyora Jewels',
    meta_description: 'Shop authentic handcrafted 22K and 18K Indian gold necklaces, earrings, bangles, and rings.'
  },
  {
    name: 'Silver Collection',
    slug: 'silver',
    description: 'Luminous 925 sterling silver and artisanal oxidised tribal jewellery, crafted for quiet statements and everyday distinction.',
    banner: '/assets/banners/silver-collection-banner.webp',
    thumbnail: '/assets/banners/silver-collection-thumb.webp',
    status: 'active',
    sort_order: 2,
    seo_title: 'The Silver Collection – 925 Sterling & Oxidised Jewellery | Veyora Jewels',
    meta_description: 'Discover handcrafted sterling silver chokers, jhumkas, payal and artisanal tribal cuffs.'
  },
  {
    name: 'Bridal Collection',
    slug: 'bridal',
    description: 'Imperial Kundan, Polki and Temple bridal sets designed for the momentous rituals of the grand Indian wedding.',
    banner: '/assets/banners/festive-silver-coins.webp',
    thumbnail: '/assets/banners/bridal-collection-thumb.webp',
    status: 'active',
    sort_order: 3,
    seo_title: 'Imperial Indian Bridal Jewellery Collection | Veyora Jewels',
    meta_description: 'Grand bridal chokers, rani haars, maang tikkas, and naths handcrafted for the royal bride.'
  },
  {
    name: 'Festive Edit',
    slug: 'festive',
    description: 'Radiant Meenakari enamels, festive jhumkas, and temple kada to celebrate Diwali, Navratri and family celebrations.',
    banner: '/assets/banners/festive-silver-coins.webp',
    thumbnail: '/assets/banners/festive-collection-thumb.webp',
    status: 'active',
    sort_order: 4,
    seo_title: 'The Festive Jewellery Edit | Veyora Jewels',
    meta_description: 'Vibrant celebration jewellery crafted in gold, sterling silver, pearls and colorful enamels.'
  },
  {
    name: 'Everyday Wear',
    slug: 'everyday-wear',
    description: 'Lightweight minimal gold pendants, delicate pearl station chains, and comfortable solitaire mangalsutras.',
    banner: '/assets/banners/festive-silver-coins.webp',
    thumbnail: '/assets/banners/everyday-collection-thumb.webp',
    status: 'active',
    sort_order: 5,
    seo_title: 'Modern Everyday Luxury Jewellery | Veyora Jewels',
    meta_description: 'Comfortable, durable fine jewellery designed to be lived in from morning till night.'
  },
  {
    name: 'Traditional Heritage',
    slug: 'traditional',
    description: 'Century-old regional silhouettes, Maharashtrian naths, kasu malas, and antique royal heirlooms.',
    banner: '/assets/banners/festive-silver-coins.webp',
    thumbnail: '/assets/banners/traditional-collection-thumb.webp',
    status: 'active',
    sort_order: 6,
    seo_title: 'Traditional Indian Heritage Jewellery | Veyora Jewels',
    meta_description: 'Authentic regional temple, kasu, and royal heirlooms preserving hereditary karigar traditions.'
  }
];

export async function CollectionSeeder(k = db) {
  if (!await k.schema.hasTable('collections')) return { inserted: 0, updated: 0 };
  const timestamp = now();
  let inserted = 0;
  let updated = 0;

  for (const c of collectionsData) {
    const existing = await k('collections').where({ slug: c.slug }).first();
    if (existing) {
      await k('collections').where({ id: existing.id }).update({
        name: c.name,
        description: c.description,
        banner: c.banner,
        thumbnail: c.thumbnail,
        status: c.status,
        sort_order: c.sort_order,
        seo_title: c.seo_title,
        meta_description: c.meta_description,
        updated_at: timestamp
      });
      updated++;
    } else {
      await k('collections').insert({
        ...c,
        created_at: timestamp,
        updated_at: timestamp
      });
      inserted++;
    }
  }

  return { inserted, updated, total: collectionsData.length };
}

// Named alias seeders for specific collection seeding if invoked directly
export const GoldCollectionSeeder = CollectionSeeder;
export const SilverCollectionSeeder = CollectionSeeder;
