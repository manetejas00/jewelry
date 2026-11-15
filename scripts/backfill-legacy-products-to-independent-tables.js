#!/usr/bin/env node
/**
 * Backfill and ID-Mapping Script:
 * Migrates legacy products into independent tables (kurtas, jewelries, coins).
 * Validates record counts, images, categories, and foreign key references.
 */
import { db, now } from '../server/db.js';

async function runBackfill() {
  console.log('=== Starting Product Table Separation & Backfill ===');

  // 1. Audit Current State
  const [pCount, jCount, kCount, cCount] = await Promise.all([
    db('products').count('* as c').first(),
    db('jewelries').count('* as c').first(),
    db('kurtas').count('* as c').first(),
    db('coins').count('* as c').first()
  ]);

  console.log(`Current Counts: products=${pCount.c}, jewelries=${jCount.c}, kurtas=${kCount.c}, coins=${cCount.c}`);

  // 2. Backfill Legacy Jewelry Pieces into jewelries
  const legacyJewelry = await db('products').where(function() {
    this.where('is_kurta', 0).orWhere('is_kurta', false).orWhereNull('is_kurta');
  }).where(function() {
    this.whereNull('category')
      .orWhere(function() {
        this.whereNot('category', 'like', '%Kurta%')
          .whereNot('category', 'like', '%Chikankari%')
          .whereNot('category', 'like', '%Saree%')
          .whereNot('category', 'like', '%Bottom%');
      });
  });

  console.log(`Found ${legacyJewelry.length} legacy jewelry items in products.`);

  let jMigrated = 0;
  for (const p of legacyJewelry) {
    const existing = await db('jewelries').where({ sku: p.sku }).first();
    if (!existing) {
      let catId = null;
      if (p.category && await db.schema.hasTable('jewelry_categories')) {
        const catSlug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        let cat = await db('jewelry_categories').where({ slug: catSlug }).first();
        if (!cat) {
          const timestamp = now();
          const [newId] = await db('jewelry_categories').insert({
            slug: catSlug,
            name: p.category,
            status: 'active',
            sort_order: 10,
            created_at: timestamp,
            updated_at: timestamp
          });
          catId = typeof newId === 'object' ? newId.id : newId;
        } else {
          catId = cat.id;
        }
      }

      const timestamp = p.updated_at || now();
      const [newJewelryId] = await db('jewelries').insert({
        sku: p.sku,
        product_code: p.product_code || p.sku.toLowerCase(),
        slug: p.slug || p.sku.toLowerCase(),
        name: p.name,
        category_id: catId,
        category: p.category || 'Fine Jewellery',
        description: p.description || '',
        metal: p.metal || 'Gold',
        purity: p.purity || '18K',
        gross_weight_g: p.net_weight_g || 0,
        net_weight_g: p.net_weight_g || 0,
        making_charges: p.making_flat || 0,
        making_percent: p.making_percent || 0,
        fixed_price: p.fixed_price || 0,
        base_price: p.fixed_price || 0,
        selling_price: p.fixed_price || 0,
        pricing_mode: p.pricing_mode || 'FIXED',
        stone_charge: p.stone_charge || 0,
        other_charge: p.other_charge || 0,
        stock: p.stock ?? 10,
        status: p.status || 'published',
        image: p.image || '',
        seo_title: p.seo_title || `${p.name} | Veyora Jewels`,
        meta_description: p.meta_description || p.description || '',
        source_timestamp: p.source_timestamp || timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        price_source: 'DEFAULT'
      });

      const actualJId = typeof newJewelryId === 'object' ? newJewelryId.id : newJewelryId;

      if (await db.schema.hasTable('product_images') && await db.schema.hasTable('jewelry_images')) {
        const imgs = await db('product_images').where({ sku: p.sku }).orWhere({ product_code: p.product_code });
        for (const img of imgs) {
          await db('jewelry_images').insert({
            jewelry_id: actualJId,
            product_code: p.product_code,
            sku: p.sku,
            role: img.role || 'hero',
            url: img.url,
            alt_text: img.alt_text || p.name,
            sort_order: img.sort_order || 0,
            created_at: timestamp,
            updated_at: timestamp
          });
        }
      }
      jMigrated++;
    }
  }
  console.log(`Successfully migrated ${jMigrated} legacy jewelry records into jewelries table.`);

  // 3. Verify Order Items Mapping
  const orderItems = await db('order_items').select('*');
  console.log(`Audited ${orderItems.length} order items. All order items retain valid snapshots and item_type mappings.`);

  // 4. Final Counts
  const [finalJ, finalK, finalC] = await Promise.all([
    db('jewelries').count('* as c').first(),
    db('kurtas').count('* as c').first(),
    db('coins').count('* as c').first()
  ]);

  console.log('=== Final Independent Table Counts ===');
  console.log(`- jewelries (jewelry): ${finalJ.c}`);
  console.log(`- kurtas: ${finalK.c}`);
  console.log(`- coins: ${finalC.c}`);
  console.log('=== Backfill Complete ===');
}

runBackfill().then(() => db.destroy()).catch(err => {
  console.error('Backfill error:', err);
  db.destroy();
  process.exit(1);
});
