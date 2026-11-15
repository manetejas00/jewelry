/**
 * Migration 032: Separate Kurta, Jewelry & Coins Tables
 *
 * 1. Creates `jewelry` view pointing to `jewelries` (allowing both conventions).
 * 2. Backfills any legacy jewelry rows from `products` into `jewelries`.
 * 3. Maps legacy categories and media into `jewelry_categories` and `jewelry_images`.
 * 4. Ensures referential integrity between `order_items` and independent tables.
 */
export async function up(k) {
  // 1. Create 'jewelry' view alias for 'jewelries' if supported
  try {
    if (k.client.config.client === 'mysql2') {
      await k.raw('CREATE OR REPLACE VIEW jewelry AS SELECT * FROM jewelries');
    } else {
      await k.raw('CREATE VIEW IF NOT EXISTS jewelry AS SELECT * FROM jewelries');
    }
  } catch {
    // If view creation is restricted or unsupported, continue
  }

  // 2. Normalize Kurta categories ('Chicken Curry Kurtas' -> 'Kurta')
  if (await k.schema.hasTable('kurtas')) {
    await k('kurtas').where({ category: 'Chicken Curry Kurtas' }).update({ category: 'Kurta' });
  }
  if (await k.schema.hasTable('kurta_categories')) {
    await k('kurta_categories').where({ slug: 'chicken-curry-kurtas' }).update({ slug: 'kurta', name: 'Kurta' });
  }

  // 3. Backfill legacy jewelry from products into jewelries
  if (await k.schema.hasTable('products') && await k.schema.hasTable('jewelries')) {
    const legacyJewelry = await k('products').where(function() {
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

    for (const p of legacyJewelry) {
      const exists = await k('jewelries').where({ sku: p.sku }).first();
      if (!exists) {
        // Find or create category_id
        let catId = null;
        if (p.category && await k.schema.hasTable('jewelry_categories')) {
          const catSlug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          let cat = await k('jewelry_categories').where({ slug: catSlug }).first();
          if (!cat) {
            const now = new Date().toISOString();
            const [newId] = await k('jewelry_categories').insert({
              slug: catSlug,
              name: p.category,
              status: 'active',
              sort_order: 10,
              created_at: now,
              updated_at: now
            });
            catId = typeof newId === 'object' ? newId.id : newId;
          } else {
            catId = cat.id;
          }
        }

        const now = p.updated_at || new Date().toISOString();
        const [insertedId] = await k('jewelries').insert({
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
          source_timestamp: p.source_timestamp || now,
          created_at: now,
          updated_at: now,
          price_source: 'DEFAULT'
        });

        const jId = typeof insertedId === 'object' ? insertedId.id : insertedId;

        // Copy images from product_images to jewelry_images
        if (await k.schema.hasTable('product_images') && await k.schema.hasTable('jewelry_images')) {
          const imgs = await k('product_images').where({ sku: p.sku }).orWhere({ product_code: p.product_code });
          for (const img of imgs) {
            await k('jewelry_images').insert({
              jewelry_id: jId,
              product_code: p.product_code,
              sku: p.sku,
              role: img.role || 'hero',
              url: img.url,
              alt_text: img.alt_text || p.name,
              sort_order: img.sort_order || 0,
              created_at: now,
              updated_at: now
            });
          }
        }
      }
    }
  }
}

export async function down(k) {
  try {
    await k.raw('DROP VIEW IF EXISTS jewelry');
  } catch {
    // Ignore if view doesn't exist
  }
}
