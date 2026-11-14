import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export const jewelleryData = JSON.parse(fs.readFileSync(new URL('./data/jewellery-100.json', import.meta.url), 'utf8'));

export async function JewelleryProductSeeder(k = db) {
  if (!await k.schema.hasTable('products')) {
    throw Error('Run migrations before running JewelleryProductSeeder.');
  }

  // Fetch lookups for materials, craftsmanship, finishes, collections
  const [materials, craftsmanship, finishes, collections] = await Promise.all([
    k('materials').select('id', 'slug', 'name'),
    k('craftsmanship').select('id', 'slug', 'name'),
    k('finishes').select('id', 'slug', 'name'),
    k('collections').select('id', 'slug', 'name')
  ]);

  const matMap = new Map(materials.map(m => [m.slug, m.id]));
  const craftMap = new Map(craftsmanship.map(c => [c.slug, c.id]));
  const finMap = new Map(finishes.map(f => [f.slug, f.id]));
  const colMap = new Map(collections.map(col => [col.slug, col.id]));

  return k.transaction(async (t) => {
    let inserted = 0;
    let existing = 0;
    const timestamp = now();

    for (const item of jewelleryData) {
      const old = await t('products').where({ sku: item.sku }).first();
      let productId = old?.id;

      const productPayload = {
        sku: item.sku,
        product_code: item.product_code,
        slug: item.slug,
        name: item.name,
        category: item.category,
        description: item.description,
        metal: item.metal,
        purity: item.purity,
        net_weight_g: item.net_weight_g,
        size: item.size,
        finish: item.finish,
        image: item.image,
        pricing_mode: item.pricing_mode || 'FIXED',
        fixed_price: item.fixed_price,
        making_flat: item.making_flat || '0',
        making_percent: item.making_percent || '0',
        stone_charge: item.stone_charge || '0',
        other_charge: item.other_charge || '0',
        stock: item.stock || 12,
        status: item.status || 'published',
        supplier: item.supplier || 'Veyora Heritage Atelier',
        source_timestamp: timestamp,
        updated_at: timestamp,
        seo_title: `${item.name} | Veyora Jewels`,
        meta_description: item.description.slice(0, 155),
        is_kurta: false
      };

      if (old) {
        await t('products').where({ id: old.id }).update({
          name: item.name,
          category: item.category,
          description: item.description,
          metal: item.metal,
          purity: item.purity,
          net_weight_g: item.net_weight_g,
          finish: item.finish,
          image: item.image,
          fixed_price: item.fixed_price,
          updated_at: timestamp
        });
        existing++;
      } else {
        const [newId] = await t('products').insert(productPayload);
        productId = newId;
        inserted++;
      }

      // Register SKU in supplier_skus
      await t('supplier_skus')
        .insert({ supplier: item.supplier, supplier_sku: item.sku, sku: item.sku })
        .onConflict(['supplier', 'supplier_sku'])
        .ignore();

      // Register primary hero image in product_images
      const hasImage = await t('product_images').where({ sku: item.sku, role: 'hero' }).first();
      if (!hasImage) {
        await t('product_images').insert({
          sku: item.sku,
          product_code: item.product_code,
          role: 'hero',
          url: item.image,
          alt_text: `${item.name} — master view`,
          sort_order: 1,
          created_at: timestamp,
          updated_at: timestamp
        });
      }

      // Associate Primary Material
      if (item.primary_material && matMap.has(item.primary_material)) {
        const matId = matMap.get(item.primary_material);
        await t('product_materials').where({ sku: item.sku, is_primary: true }).del();
        await t('product_materials').insert({
          product_id: productId,
          product_code: item.product_code,
          sku: item.sku,
          material_id: matId,
          is_primary: true,
          created_at: timestamp
        });
      }

      // Associate Additional Materials
      if (Array.isArray(item.additional_materials)) {
        for (const addSlug of item.additional_materials) {
          if (matMap.has(addSlug)) {
            const addId = matMap.get(addSlug);
            const exists = await t('product_materials').where({ sku: item.sku, material_id: addId }).first();
            if (!exists) {
              await t('product_materials').insert({
                product_id: productId,
                product_code: item.product_code,
                sku: item.sku,
                material_id: addId,
                is_primary: false,
                created_at: timestamp
              });
            }
          }
        }
      }

      // Associate Craftsmanship
      if (Array.isArray(item.craftsmanship)) {
        for (const craftSlug of item.craftsmanship) {
          if (craftMap.has(craftSlug)) {
            const craftId = craftMap.get(craftSlug);
            const exists = await t('product_craftsmanship').where({ sku: item.sku, craftsmanship_id: craftId }).first();
            if (!exists) {
              await t('product_craftsmanship').insert({
                product_id: productId,
                product_code: item.product_code,
                sku: item.sku,
                craftsmanship_id: craftId,
                created_at: timestamp
              });
            }
          }
        }
      }

      // Associate Finish
      if (item.finish && finMap.has(item.finish)) {
        const finId = finMap.get(item.finish);
        const exists = await t('product_finishes').where({ sku: item.sku, finish_id: finId }).first();
        if (!exists) {
          await t('product_finishes').insert({
            product_id: productId,
            product_code: item.product_code,
            sku: item.sku,
            finish_id: finId,
            created_at: timestamp
          });
        }
      }

      // Associate Collections
      if (Array.isArray(item.collections)) {
        for (const colSlug of item.collections) {
          if (colMap.has(colSlug)) {
            const colId = colMap.get(colSlug);
            const exists = await t('product_collections').where({ sku: item.sku, collection_id: colId }).first();
            if (!exists) {
              await t('product_collections').insert({
                product_id: productId,
                product_code: item.product_code,
                sku: item.sku,
                collection_id: colId,
                created_at: timestamp
              });
            }
          }
        }
      }
    }

    return { inserted, existing, total: jewelleryData.length };
  }, k.client.config.client === 'mysql2' ? { isolationLevel: 'read committed' } : {});
}

// Named alias seeders for specific calls
export const ProductMaterialSeeder = JewelleryProductSeeder;
export const ProductCraftsmanshipSeeder = JewelleryProductSeeder;
export const ProductCollectionSeeder = JewelleryProductSeeder;
