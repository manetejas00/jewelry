import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';

export const comboData = [
  {
    sku: 'CMB-AWADH-01',
    slug: 'awadh-splendour-ivory-kurta-lune-pearl-drops',
    name: 'Awadh Splendour: Ivory Chikankari Kurta & Lune Pearl Drops Set',
    category: 'Kurta & Jewellery Combo',
    description: 'The quintessential regal pairing. Our best-selling Noor-e-Awadh Ivory Chikankari Mulmul Kurta paired with the iconic Veyora 18K Gold Lune Pearl Drops. The pure white-on-white embroidery complements the radiant lustre of cultured pearls for weddings, festive brunches, and special occasions.',
    image: '/assets/combos/combo-ivory-kurta-lune-pearl-drops.webp',
    original_price: 27490,
    combo_price: 23360,
    discount_percent: 15.02,
    savings: 4130,
    stock: 8,
    status: 'published',
    seo_title: 'Awadh Splendour: Ivory Chikankari Kurta & Lune Pearl Drops Set | Veyora',
    meta_description: 'Coordinated ethnic luxury set: Noor-e-Awadh Ivory pure cotton Chikankari kurta paired with 18K gold Lune Pearl Drops. Save ₹4,130 on this exclusive combo.',
    items: [
      { product_sku: 'CCK-IVORY-M', quantity: 1, is_primary: true },
      { product_sku: 'VEY-LP-01', quantity: 1, is_primary: false }
    ]
  },
  {
    sku: 'CMB-GULZAR-02',
    slug: 'gulzar-romance-blush-pink-kurta-atelier-collar',
    name: 'Gulzar Romance: Blush Pink Georgette Kurta & Atelier Pearl Collar Set',
    category: 'Premium Jewellery & Kurta Sets',
    description: 'An exquisite festive ensemble pairing the Gulzar Rose Blush Georgette Chikankari Kurta with the majestic 22K Gold Atelier Pearl Collar. Soft floral georgette embroidery paired with architectural pearl choker design.',
    image: '/assets/combos/combo-blush-kurta-atelier-collar.webp',
    original_price: 41990,
    combo_price: 35690,
    discount_percent: 15.00,
    savings: 6300,
    stock: 5,
    status: 'published',
    seo_title: 'Gulzar Romance: Blush Pink Georgette Kurta & Atelier Pearl Collar Set | Veyora',
    meta_description: 'Festive Chikankari kurta in blush pink georgette paired with 22K Atelier Pearl Collar. Curated luxury ethnic set with ₹6,300 bundle savings.',
    items: [
      { product_sku: 'CCK-BLUSH-M', quantity: 1, is_primary: true },
      { product_sku: 'VEY-AC-01', quantity: 1, is_primary: false }
    ]
  },
  {
    sku: 'CMB-NAZAKAT-03',
    slug: 'nazakat-grace-sage-green-kurta-nocturne-cuff',
    name: 'Nazakat Grace: Sage Green Chanderi Kurta & Nocturne Pearl Cuff Set',
    category: 'Kurta & Jewellery Combo',
    description: 'Understated modern luxury. Handloom sage green Chanderi kurta with delicate Murri embroidery, styled with the sleek 18K Gold Nocturne Pearl Cuff. Balanced elegance from sleeve to wrist.',
    image: '/assets/combos/combo-sage-kurta-nocturne-cuff.webp',
    original_price: 36640,
    combo_price: 31140,
    discount_percent: 15.01,
    savings: 5500,
    stock: 6,
    status: 'published',
    seo_title: 'Nazakat Grace: Sage Green Kurta & Nocturne Pearl Cuff Set | Veyora',
    meta_description: 'Artisanal Chanderi Chikankari kurta in sage green paired with 18K solid gold Nocturne Pearl Cuff. Exclusive ₹5,500 combo savings.',
    items: [
      { product_sku: 'CCK-SAGE-M', quantity: 1, is_primary: true },
      { product_sku: 'VEY-NC-01', quantity: 1, is_primary: false }
    ]
  },
  {
    sku: 'CMB-FIZA-04',
    slug: 'fiza-serenity-sky-blue-kurta-velours-earrings',
    name: 'Fiza Serenity: Sky Blue Chikankari Kurta & Velours Pearl Earrings Set',
    category: 'Kurta Gift Sets',
    description: 'A fresh and luminous daytime pairing. The breathable sky-blue mulmul kurta featuring delicate shadow needlework paired with 18K Gold Velours Pearl Earrings. Comes packed in a luxury presentation gift box.',
    image: '/assets/combos/combo-sky-kurta-velours-earrings.webp',
    original_price: 31690,
    combo_price: 26930,
    discount_percent: 15.02,
    savings: 4760,
    stock: 7,
    status: 'published',
    seo_title: 'Fiza Serenity: Sky Blue Chikankari Kurta & Velours Pearl Earrings Set | Veyora',
    meta_description: 'Luxury gift set pairing sky blue Chikankari cotton kurta with 18K gold Velours Pearl Earrings in a signature gift box. Save ₹4,760.',
    items: [
      { product_sku: 'CCK-SKY-M', quantity: 1, is_primary: true },
      { product_sku: 'VEY-VE-01', quantity: 1, is_primary: false }
    ]
  }
];

export async function ComboSeeder(k = db) {
  if (!await k.schema.hasTable('combos') || !await k.schema.hasTable('combo_items')) {
    throw Error('Run migrations before running ComboSeeder.');
  }

  return k.transaction(async (t) => {
    let inserted = 0;
    let updated = 0;
    const timestamp = now();

    for (const combo of comboData) {
      const existing = await t('combos').where({ sku: combo.sku }).first();
      let comboId;

      const comboFields = {
        sku: combo.sku,
        slug: combo.slug,
        name: combo.name,
        category: combo.category,
        description: combo.description,
        image: combo.image,
        combo_price: combo.combo_price,
        original_price: combo.original_price,
        discount_percent: combo.discount_percent,
        savings: combo.savings,
        stock: combo.stock,
        status: combo.status,
        seo_title: combo.seo_title,
        meta_description: combo.meta_description,
        updated_at: timestamp
      };

      if (existing) {
        await t('combos').where({ id: existing.id }).update(comboFields);
        comboId = existing.id;
        updated++;
      } else {
        const [id] = await t('combos').insert({
          ...comboFields,
          created_at: timestamp
        });
        comboId = id;
        inserted++;
      }

      // Re-insert combo_items
      await t('combo_items').where({ combo_id: comboId }).del();
      for (const item of combo.items) {
        await t('combo_items').insert({
          combo_id: comboId,
          product_sku: item.product_sku,
          quantity: item.quantity,
          is_primary: item.is_primary ? 1 : 0
        });
      }
    }

    return { inserted, updated, total: comboData.length };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const res = await ComboSeeder();
    console.log('ComboSeeder complete:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('ComboSeeder failed:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
