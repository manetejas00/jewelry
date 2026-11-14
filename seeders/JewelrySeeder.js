import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';
import { JewelryCategorySeeder } from './JewelryCategorySeeder.js';
import { JewelryVariantSeeder } from './JewelryVariantSeeder.js';

export const jewelleryData = JSON.parse(
  fs.readFileSync(new URL('./data/jewellery-100.json', import.meta.url), 'utf8')
);

export async function JewelrySeeder(k = db, { data = jewelleryData } = {}) {
  if (!await k.schema.hasTable('jewelries')) {
    throw Error('Table jewelries does not exist. Run migrations first.');
  }

  // Ensure categories are seeded
  await JewelryCategorySeeder(k);
  const categories = await k('jewelry_categories').select('id', 'name', 'slug');
  const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

  return k.transaction(async (t) => {
    let inserted = 0;
    let existing = 0;
    const timestamp = now();

    for (const item of data) {
      const code = item.product_code || item.slug;
      const catId = catMap.get((item.category || '').toLowerCase()) || null;
      const old = await t('jewelries').where({ product_code: code }).first();
      let jewelryId;

      const payload = {
        sku: item.sku,
        product_code: code,
        slug: item.slug || code,
        name: item.name,
        category_id: catId,
        category: item.category || 'Rings',
        description: item.description,
        metal: item.metal || 'Gold',
        purity: item.purity || '18K',
        gross_weight_g: item.gross_weight_g != null ? item.gross_weight_g : item.net_weight_g,
        net_weight_g: item.net_weight_g != null ? item.net_weight_g : null,
        stone_details: item.stone_details || (item.additional_materials ? item.additional_materials.join(', ') : null),
        diamond_details: item.diamond_details || null,
        gemstone_details: item.gemstone_details || null,
        making_charges: item.making_flat ? Number(item.making_flat) : 0,
        making_percent: item.making_percent ? Number(item.making_percent) : 0,
        gst: 3.00,
        base_price: item.fixed_price ? Number(item.fixed_price) : null,
        selling_price: item.fixed_price ? Number(item.fixed_price) : null,
        fixed_price: item.fixed_price ? Number(item.fixed_price) : null,
        pricing_mode: item.pricing_mode || 'FIXED',
        stone_charge: item.stone_charge ? Number(item.stone_charge) : 0,
        other_charge: item.other_charge ? Number(item.other_charge) : 0,
        stock: item.stock != null ? item.stock : 12,
        status: item.status || 'published',
        supplier: item.supplier || 'Veyora Heritage Atelier',
        image: item.image,
        seo_title: `${item.name} | Veyora Jewels`,
        meta_description: item.description,
        source_timestamp: timestamp,
        updated_at: timestamp
      };

      if (!old) {
        const [newId] = await t('jewelries').insert({
          ...payload,
          created_at: timestamp
        });
        jewelryId = newId;
        inserted++;
      } else {
        jewelryId = old.id;
        await t('jewelries').where({ id: old.id }).update({
          name: payload.name,
          category_id: payload.category_id,
          category: payload.category,
          description: payload.description,
          metal: payload.metal,
          purity: payload.purity,
          gross_weight_g: payload.gross_weight_g,
          net_weight_g: payload.net_weight_g,
          stone_details: payload.stone_details,
          making_charges: payload.making_charges,
          making_percent: payload.making_percent,
          fixed_price: payload.fixed_price,
          pricing_mode: payload.pricing_mode,
          image: payload.image,
          seo_title: payload.seo_title,
          meta_description: payload.meta_description,
          updated_at: timestamp
        });
        existing++;
      }

      // Seed Variant
      await JewelryVariantSeeder(t, jewelryId, [{
        product_code: code,
        sku: item.sku,
        size: item.size || 'Standard',
        finish: item.finish || 'Polished',
        metal: item.metal || 'Gold',
        purity: item.purity || '18K',
        gross_weight_g: payload.gross_weight_g,
        net_weight_g: payload.net_weight_g,
        price: payload.fixed_price,
        fixed_price: payload.fixed_price,
        stock: payload.stock,
        image: item.image,
        status: payload.status
      }]);

      // Seed Image
      if (item.image && await t.schema.hasTable('jewelry_images')) {
        const hasImg = await t('jewelry_images').where({ jewelry_id: jewelryId, url: item.image }).first();
        if (!hasImg) {
          await t('jewelry_images').insert({
            jewelry_id: jewelryId,
            product_code: code,
            sku: item.sku,
            role: 'hero',
            url: item.image,
            alt_text: `${item.name} - Hero Shot`,
            sort_order: 1,
            created_at: timestamp,
            updated_at: timestamp
          });
        }
      }
    }

    return { inserted, existing, total: data.length };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await JewelrySeeder(), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
