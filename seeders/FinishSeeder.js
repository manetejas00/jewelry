import { db, now } from '../server/db.js';

export const finishesData = [
  {
    name: 'Polished Gold',
    slug: 'polished-gold',
    description: 'Mirror-bright, warm reflective gold surface with gleaming brilliance.',
    thumbnail: '/assets/finishes/polished-gold.webp',
    status: 'active',
    sort_order: 1
  },
  {
    name: 'Antique Gold Finish',
    slug: 'antique-gold-finish',
    description: 'Muted, rich deep-toned patinated gold finish emphasizing intricate carving and repoussé relief.',
    thumbnail: '/assets/finishes/antique-gold-finish.webp',
    status: 'active',
    sort_order: 2
  },
  {
    name: 'Rose Gold Finish',
    slug: 'rose-gold-finish',
    description: 'Blush-toned coppery gold finish offering modern warmth and delicate femininity.',
    thumbnail: '/assets/finishes/rose-gold-finish.webp',
    status: 'active',
    sort_order: 3
  },
  {
    name: 'Rhodium Finish',
    slug: 'rhodium-finish',
    description: 'High-durability precious platinum-family rhodium plate offering brilliant tarnish resistance.',
    thumbnail: '/assets/finishes/rhodium-finish.webp',
    status: 'active',
    sort_order: 4
  },
  {
    name: 'Oxidised Finish',
    slug: 'oxidised-finish',
    description: 'Satin blackened patina in recesses with polished silver highlights for dramatic ethnic depth.',
    thumbnail: '/assets/finishes/oxidised-finish.webp',
    status: 'active',
    sort_order: 5
  },
  {
    name: 'Matte Finish',
    slug: 'matte-finish',
    description: 'Smooth, non-reflective brushed velvet surface offering contemporary understated luxury.',
    thumbnail: '/assets/finishes/matte-finish.webp',
    status: 'active',
    sort_order: 6
  },
  {
    name: 'High Polish',
    slug: 'high-polish',
    description: 'Flawlessly burnished liquid metal reflection highlighting pure metallurgical perfection.',
    thumbnail: '/assets/finishes/high-polish.webp',
    status: 'active',
    sort_order: 7
  },
  {
    name: 'Silver Finish',
    slug: 'silver-finish',
    description: 'Bright, crisp white silver polish illuminating intricate sterling silver wirework.',
    thumbnail: '/assets/finishes/silver-finish.webp',
    status: 'active',
    sort_order: 8
  },
  {
    name: 'Gold Plated',
    slug: 'gold-plated',
    description: 'Heavy 1-to-3 micron 24K gold electroplate over durable brass or silver base.',
    thumbnail: '/assets/finishes/gold-plated.webp',
    status: 'active',
    sort_order: 9
  },
  {
    name: 'Other Finishes',
    slug: 'other-finishes',
    description: 'Specialist dual-tone, hammered texture or sandblasted finishes.',
    thumbnail: '/assets/finishes/other-finishes.webp',
    status: 'active',
    sort_order: 10
  }
];

export async function FinishSeeder(k = db) {
  if (!await k.schema.hasTable('finishes')) return { inserted: 0, updated: 0 };
  const timestamp = now();
  let inserted = 0;
  let updated = 0;

  for (const f of finishesData) {
    const existing = await k('finishes').where({ slug: f.slug }).first();
    if (existing) {
      await k('finishes').where({ id: existing.id }).update({
        name: f.name,
        description: f.description,
        thumbnail: f.thumbnail,
        status: f.status,
        sort_order: f.sort_order,
        updated_at: timestamp
      });
      updated++;
    } else {
      await k('finishes').insert({
        ...f,
        created_at: timestamp,
        updated_at: timestamp
      });
      inserted++;
    }
  }

  return { inserted, updated, total: finishesData.length };
}
