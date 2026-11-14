export const now = () => new Date().toISOString();

export async function up(k) {
  // 1. Jewelry Tables
  if (!await k.schema.hasTable('jewelry_categories')) {
    await k.schema.createTable('jewelry_categories', t => {
      t.increments('id').primary();
      t.string('slug', 100).unique().notNullable().index();
      t.string('name', 150).notNullable();
      t.text('description').nullable();
      t.text('thumbnail').nullable();
      t.text('banner').nullable();
      t.string('status', 20).notNullable().defaultTo('active').index();
      t.integer('sort_order').defaultTo(0).index();
      t.string('seo_title', 255).nullable();
      t.text('meta_description').nullable();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('jewelries')) {
    await k.schema.createTable('jewelries', t => {
      t.increments('id').primary();
      t.string('sku', 100).unique().notNullable().index();
      t.string('product_code', 100).notNullable().index();
      t.string('slug', 150).unique().notNullable().index();
      t.string('name', 255).notNullable();
      t.integer('category_id').unsigned().nullable().references('id').inTable('jewelry_categories').onDelete('SET NULL').index();
      t.string('category', 100).nullable().index();
      t.text('description').nullable();
      t.string('metal', 50).defaultTo('Gold').index();
      t.string('purity', 50).defaultTo('18K').index();
      t.decimal('gross_weight_g', 12, 3).nullable();
      t.decimal('net_weight_g', 12, 3).nullable();
      t.text('stone_details').nullable();
      t.text('diamond_details').nullable();
      t.text('gemstone_details').nullable();
      t.decimal('making_charges', 14, 2).defaultTo(0);
      t.decimal('making_percent', 8, 4).defaultTo(0);
      t.decimal('gst', 8, 4).defaultTo(3.00);
      t.decimal('base_price', 14, 2).nullable();
      t.decimal('selling_price', 14, 2).nullable();
      t.decimal('fixed_price', 14, 2).nullable();
      t.string('pricing_mode', 50).defaultTo('GOLD_LINKED');
      t.decimal('stone_charge', 14, 2).defaultTo(0);
      t.decimal('other_charge', 14, 2).defaultTo(0);
      t.integer('stock').defaultTo(0);
      t.string('status', 20).defaultTo('published').index();
      t.string('supplier', 100).defaultTo('Merchant').index();
      t.text('image').nullable();
      t.string('seo_title', 255).nullable();
      t.text('meta_description').nullable();
      t.string('source_timestamp').index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('jewelry_variants')) {
    await k.schema.createTable('jewelry_variants', t => {
      t.increments('id').primary();
      t.integer('jewelry_id').unsigned().notNullable().references('id').inTable('jewelries').onDelete('CASCADE').index();
      t.string('product_code', 100).notNullable().index();
      t.string('sku', 100).unique().notNullable().index();
      t.string('size', 50).nullable();
      t.string('finish', 100).nullable();
      t.string('metal', 50).nullable();
      t.string('purity', 50).nullable();
      t.decimal('gross_weight_g', 12, 3).nullable();
      t.decimal('net_weight_g', 12, 3).nullable();
      t.decimal('price', 14, 2).nullable();
      t.decimal('fixed_price', 14, 2).nullable();
      t.integer('stock').defaultTo(0);
      t.text('image').nullable();
      t.string('status', 20).defaultTo('published').index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('jewelry_images')) {
    await k.schema.createTable('jewelry_images', t => {
      t.increments('id').primary();
      t.integer('jewelry_id').unsigned().nullable().references('id').inTable('jewelries').onDelete('CASCADE').index();
      t.string('product_code', 100).nullable().index();
      t.string('sku', 100).nullable().index();
      t.string('role', 50).notNullable().defaultTo('front').index();
      t.text('url').notNullable();
      t.string('alt_text', 255).nullable();
      t.integer('sort_order').defaultTo(0);
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('jewelry_attributes')) {
    await k.schema.createTable('jewelry_attributes', t => {
      t.increments('id').primary();
      t.string('name', 100).notNullable();
      t.string('code', 100).unique().notNullable().index();
      t.string('type', 50).defaultTo('text');
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('jewelry_attribute_values')) {
    await k.schema.createTable('jewelry_attribute_values', t => {
      t.increments('id').primary();
      t.integer('jewelry_id').unsigned().notNullable().references('id').inTable('jewelries').onDelete('CASCADE').index();
      t.integer('attribute_id').unsigned().notNullable().references('id').inTable('jewelry_attributes').onDelete('CASCADE').index();
      t.text('value').notNullable();
      t.string('created_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('jewelry_inventory')) {
    await k.schema.createTable('jewelry_inventory', t => {
      t.increments('id').primary();
      t.integer('jewelry_id').unsigned().notNullable().references('id').inTable('jewelries').onDelete('CASCADE').index();
      t.integer('variant_id').unsigned().nullable().references('id').inTable('jewelry_variants').onDelete('CASCADE').index();
      t.string('sku', 100).notNullable().index();
      t.integer('quantity_change').notNullable();
      t.integer('balance_after').notNullable();
      t.string('reason', 100).notNullable();
      t.string('reference_id', 100).nullable().index();
      t.string('created_at').notNullable();
    });
  }

  // 2. Coin Tables
  if (!await k.schema.hasTable('coin_categories')) {
    await k.schema.createTable('coin_categories', t => {
      t.increments('id').primary();
      t.string('slug', 100).unique().notNullable().index();
      t.string('name', 150).notNullable();
      t.text('description').nullable();
      t.text('thumbnail').nullable();
      t.string('status', 20).notNullable().defaultTo('active').index();
      t.integer('sort_order').defaultTo(0).index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (await k.schema.hasTable('coins')) {
    const hasSlug = await k.schema.hasColumn('coins', 'slug');
    if (!hasSlug) {
      await k.schema.table('coins', t => {
        t.string('slug', 150).nullable().index();
        t.integer('category_id').unsigned().nullable().references('id').inTable('coin_categories').onDelete('SET NULL').index();
        t.string('denomination', 100).nullable();
        t.string('mint', 150).nullable();
        t.string('collection', 150).nullable();
        t.string('edition', 150).nullable();
        t.integer('year_of_issue').nullable();
        t.string('certification', 255).nullable();
        t.string('seo_title', 255).nullable();
        t.text('meta_description').nullable();
      });
    }
  }

  if (!await k.schema.hasTable('coin_variants')) {
    await k.schema.createTable('coin_variants', t => {
      t.increments('id').primary();
      t.integer('coin_id').unsigned().notNullable().references('id').inTable('coins').onDelete('CASCADE').index();
      t.string('sku', 100).unique().notNullable().index();
      t.string('name', 255).notNullable();
      t.decimal('weight_g', 10, 3).notNullable();
      t.string('purity', 50).notNullable();
      t.string('metal', 50).notNullable();
      t.string('dimension', 100).nullable();
      t.decimal('price', 14, 2).nullable();
      t.decimal('fixed_price', 14, 2).nullable();
      t.integer('stock').defaultTo(0);
      t.string('status', 20).defaultTo('published').index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('coin_images')) {
    await k.schema.createTable('coin_images', t => {
      t.increments('id').primary();
      t.integer('coin_id').unsigned().nullable().references('id').inTable('coins').onDelete('CASCADE').index();
      t.string('sku', 100).nullable().index();
      t.string('role', 50).notNullable().defaultTo('hero').index();
      t.text('url').notNullable();
      t.string('alt_text', 255).nullable();
      t.integer('sort_order').defaultTo(0);
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('coin_attributes')) {
    await k.schema.createTable('coin_attributes', t => {
      t.increments('id').primary();
      t.string('name', 100).notNullable();
      t.string('code', 100).unique().notNullable().index();
      t.string('type', 50).defaultTo('text');
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('coin_attribute_values')) {
    await k.schema.createTable('coin_attribute_values', t => {
      t.increments('id').primary();
      t.integer('coin_id').unsigned().notNullable().references('id').inTable('coins').onDelete('CASCADE').index();
      t.integer('attribute_id').unsigned().notNullable().references('id').inTable('coin_attributes').onDelete('CASCADE').index();
      t.text('value').notNullable();
      t.string('created_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('coin_inventory')) {
    await k.schema.createTable('coin_inventory', t => {
      t.increments('id').primary();
      t.integer('coin_id').unsigned().notNullable().references('id').inTable('coins').onDelete('CASCADE').index();
      t.integer('variant_id').unsigned().nullable().references('id').inTable('coin_variants').onDelete('CASCADE').index();
      t.string('sku', 100).notNullable().index();
      t.integer('quantity_change').notNullable();
      t.integer('balance_after').notNullable();
      t.string('reason', 100).notNullable();
      t.string('reference_id', 100).nullable().index();
      t.string('created_at').notNullable();
    });
  }

  // 3. Kurta Tables
  if (!await k.schema.hasTable('kurta_categories')) {
    await k.schema.createTable('kurta_categories', t => {
      t.increments('id').primary();
      t.string('slug', 100).unique().notNullable().index();
      t.string('name', 150).notNullable();
      t.text('description').nullable();
      t.text('thumbnail').nullable();
      t.string('status', 20).notNullable().defaultTo('active').index();
      t.integer('sort_order').defaultTo(0).index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('kurtas')) {
    await k.schema.createTable('kurtas', t => {
      t.increments('id').primary();
      t.string('sku', 100).unique().notNullable().index();
      t.string('product_code', 100).unique().notNullable().index();
      t.string('slug', 150).unique().notNullable().index();
      t.string('name', 255).notNullable();
      t.integer('category_id').unsigned().nullable().references('id').inTable('kurta_categories').onDelete('SET NULL').index();
      t.string('category', 100).nullable().index();
      t.text('description').nullable();
      t.string('fabric', 100).nullable();
      t.string('pattern', 100).nullable();
      t.string('fit', 100).nullable();
      t.string('sleeve_type', 100).nullable();
      t.string('neck_type', 100).nullable();
      t.string('occasion', 100).nullable();
      t.string('gender', 50).defaultTo('Women');
      t.text('available_sizes').nullable();
      t.text('available_colors').nullable();
      t.string('material', 100).nullable();
      t.decimal('price', 14, 2).nullable();
      t.decimal('sale_price', 14, 2).nullable();
      t.decimal('fixed_price', 14, 2).nullable();
      t.integer('stock').defaultTo(0);
      t.string('status', 20).defaultTo('published').index();
      t.string('supplier', 100).defaultTo('Lucknow Heritage Maison').index();
      t.text('image').nullable();
      t.string('seo_title', 255).nullable();
      t.text('meta_description').nullable();
      t.string('source_timestamp').index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('kurta_variants')) {
    await k.schema.createTable('kurta_variants', t => {
      t.increments('id').primary();
      t.integer('kurta_id').unsigned().notNullable().references('id').inTable('kurtas').onDelete('CASCADE').index();
      t.string('product_code', 100).notNullable().index();
      t.string('sku', 100).unique().notNullable().index();
      t.string('slug', 150).unique().notNullable().index();
      t.string('size', 50).notNullable();
      t.string('color', 100).nullable();
      t.string('color_code', 100).nullable();
      t.string('hex_color', 50).nullable();
      t.string('finish', 100).nullable();
      t.decimal('price', 14, 2).nullable();
      t.decimal('fixed_price', 14, 2).nullable();
      t.integer('stock').defaultTo(0);
      t.text('image').nullable();
      t.string('status', 20).defaultTo('published').index();
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('kurta_images')) {
    await k.schema.createTable('kurta_images', t => {
      t.increments('id').primary();
      t.integer('kurta_id').unsigned().nullable().references('id').inTable('kurtas').onDelete('CASCADE').index();
      t.string('product_code', 100).nullable().index();
      t.string('sku', 100).nullable().index();
      t.string('color', 100).nullable().index();
      t.string('role', 50).notNullable().defaultTo('front').index();
      t.text('url').notNullable();
      t.string('alt_text', 255).nullable();
      t.integer('sort_order').defaultTo(0);
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('kurta_attributes')) {
    await k.schema.createTable('kurta_attributes', t => {
      t.increments('id').primary();
      t.string('name', 100).notNullable();
      t.string('code', 100).unique().notNullable().index();
      t.string('type', 50).defaultTo('text');
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('kurta_attribute_values')) {
    await k.schema.createTable('kurta_attribute_values', t => {
      t.increments('id').primary();
      t.integer('kurta_id').unsigned().notNullable().references('id').inTable('kurtas').onDelete('CASCADE').index();
      t.integer('attribute_id').unsigned().notNullable().references('id').inTable('kurta_attributes').onDelete('CASCADE').index();
      t.text('value').notNullable();
      t.string('created_at').notNullable();
    });
  }

  if (!await k.schema.hasTable('kurta_inventory')) {
    await k.schema.createTable('kurta_inventory', t => {
      t.increments('id').primary();
      t.integer('kurta_id').unsigned().notNullable().references('id').inTable('kurtas').onDelete('CASCADE').index();
      t.integer('variant_id').unsigned().nullable().references('id').inTable('kurta_variants').onDelete('CASCADE').index();
      t.string('sku', 100).notNullable().index();
      t.integer('quantity_change').notNullable();
      t.integer('balance_after').notNullable();
      t.string('reason', 100).notNullable();
      t.string('reference_id', 100).nullable().index();
      t.string('created_at').notNullable();
    });
  }

  // 4. Alter reviews and order_items for explicit polymorphic / type-aware relationships
  if (await k.schema.hasTable('reviews')) {
    const hasJewelryId = await k.schema.hasColumn('reviews', 'jewelry_id');
    if (!hasJewelryId) {
      await k.schema.table('reviews', t => {
        t.integer('jewelry_id').unsigned().nullable().references('id').inTable('jewelries').onDelete('CASCADE').index();
        t.integer('kurta_id').unsigned().nullable().references('id').inTable('kurtas').onDelete('CASCADE').index();
        t.string('item_type', 20).defaultTo('jewelry').index();
      });
    }
  }

  if (await k.schema.hasTable('order_items')) {
    const hasItemType = await k.schema.hasColumn('order_items', 'item_type');
    if (!hasItemType) {
      await k.schema.table('order_items', t => {
        t.string('item_type', 20).nullable().index();
        t.integer('item_id').unsigned().nullable().index();
      });
    }
  }

  // 5. Data Migration from existing products, product_images, categories, coins
  const timeStr = now();

  // A. Seed default categories if empty
  const defaultJewelryCategories = [
    { slug: 'rings', name: 'Rings', description: 'Fine artisan rings in gold and silver with lustrous pearls and gemstones.', sort_order: 1 },
    { slug: 'earrings', name: 'Earrings', description: 'Graceful drops, hoops, and studs crafted with heirloom precision.', sort_order: 2 },
    { slug: 'necklaces', name: 'Necklaces', description: 'Collar pieces, pendants, and strings designed for understated luxury.', sort_order: 3 },
    { slug: 'bracelets', name: 'Bracelets', description: 'Sculptural cuffs, tennis chains, and pearl bracelets.', sort_order: 4 }
  ];
  for (const cat of defaultJewelryCategories) {
    const exists = await k('jewelry_categories').where({ slug: cat.slug }).first();
    if (!exists) {
      await k('jewelry_categories').insert({ ...cat, status: 'active', created_at: timeStr, updated_at: timeStr });
    }
  }

  const defaultCoinCategories = [
    { slug: 'gold-coins', name: 'Gold Coins', description: '24 Karat 999 pure gold investment coins and medallions.', sort_order: 1 },
    { slug: 'silver-coins', name: 'Silver Coins', description: '999 fine silver bullion coins with sacred engravings.', sort_order: 2 },
    { slug: 'bullion-bars', name: 'Bullion Bars', description: 'Precision cast gold and silver bars in tamper-proof assay cards.', sort_order: 3 }
  ];
  for (const cat of defaultCoinCategories) {
    const exists = await k('coin_categories').where({ slug: cat.slug }).first();
    if (!exists) {
      await k('coin_categories').insert({ ...cat, status: 'active', created_at: timeStr, updated_at: timeStr });
    }
  }

  const defaultKurtaCategories = [
    { slug: 'kurtas', name: 'Kurtas', description: 'Authentic handcrafted Lucknowi Chikankari needlework kurtas.', sort_order: 1 },
    { slug: 'cotton-chikankari', name: 'Cotton Chikankari', description: 'Breathable mulmul cotton embroidered in classic shadow work.', sort_order: 2 },
    { slug: 'georgette-kurtas', name: 'Georgette Kurtas', description: 'Fluid viscose georgette draped with intricate tonal embroidery.', sort_order: 3 },
    { slug: 'chanderi-silk-kurtas', name: 'Chanderi Silk Kurtas', description: 'Handloom Chanderi silk with delicate zari and Chikankari accents.', sort_order: 4 }
  ];
  for (const cat of defaultKurtaCategories) {
    const exists = await k('kurta_categories').where({ slug: cat.slug }).first();
    if (!exists) {
      await k('kurta_categories').insert({ ...cat, status: 'active', created_at: timeStr, updated_at: timeStr });
    }
  }

  // Fetch category lookups
  const jCategories = await k('jewelry_categories').select('id', 'name', 'slug');
  const jCatMap = new Map(jCategories.map(c => [c.name.toLowerCase(), c.id]));
  const kCategories = await k('kurta_categories').select('id', 'name', 'slug');
  const kCatMap = new Map(kCategories.map(c => [c.name.toLowerCase(), c.id]));
  const cCategories = await k('coin_categories').select('id', 'name', 'slug');

  // B. Migrate Jewelry records from products
  if (await k.schema.hasTable('products')) {
    const rawJewelry = await k('products').where(function() {
      this.where('is_kurta', 0).orWhereNull('is_kurta');
    }).whereNot('category', 'like', '%Kurta%').orderBy('id', 'asc');

    const jByCode = new Map();
    for (const p of rawJewelry) {
      const code = p.product_code || p.slug;
      if (!jByCode.has(code)) jByCode.set(code, []);
      jByCode.get(code).push(p);
    }

    const hasProductImages = await k.schema.hasTable('product_images');
    const allImages = hasProductImages ? await k('product_images').select('*') : [];

    for (const [code, variants] of jByCode.entries()) {
      const rep = variants[0];
      const categoryId = jCatMap.get((rep.category || '').toLowerCase()) || null;
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

      let jewelry = await k('jewelries').where({ product_code: code }).first();
      let jewelryId;

      if (!jewelry) {
        let slug = rep.slug || code;
        const existingSlug = await k('jewelries').where({ slug }).first();
        if (existingSlug) slug = `${slug}-${rep.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        const [newId] = await k('jewelries').insert({
          sku: rep.sku,
          product_code: code,
          slug,
          name: rep.name,
          category_id: categoryId,
          category: rep.category || 'Rings',
          description: rep.description,
          metal: rep.metal || 'Gold',
          purity: rep.purity || '18K',
          gross_weight_g: rep.net_weight_g,
          net_weight_g: rep.net_weight_g,
          stone_details: rep.stone_charge ? `Natural Gemstone Setting (₹${rep.stone_charge})` : null,
          diamond_details: null,
          gemstone_details: null,
          making_charges: rep.making_flat || 0,
          making_percent: rep.making_percent || 0,
          gst: 3.00,
          base_price: rep.fixed_price,
          selling_price: rep.fixed_price,
          fixed_price: rep.fixed_price,
          pricing_mode: rep.pricing_mode || 'GOLD_LINKED',
          stone_charge: rep.stone_charge || 0,
          other_charge: rep.other_charge || 0,
          stock: totalStock,
          status: rep.status || 'published',
          supplier: rep.supplier || 'Merchant',
          image: rep.image,
          seo_title: rep.seo_title || `${rep.name} | Veyora Jewels`,
          meta_description: rep.meta_description || rep.description,
          source_timestamp: rep.source_timestamp || timeStr,
          created_at: rep.created_at || timeStr,
          updated_at: rep.updated_at || timeStr
        });
        jewelryId = newId;
      } else {
        jewelryId = jewelry.id;
      }

      for (const v of variants) {
        const existingVar = await k('jewelry_variants').where({ sku: v.sku }).first();
        let varId;
        if (!existingVar) {
          const [newVarId] = await k('jewelry_variants').insert({
            jewelry_id: jewelryId,
            product_code: code,
            sku: v.sku,
            size: v.size,
            finish: v.finish,
            metal: v.metal,
            purity: v.purity,
            gross_weight_g: v.net_weight_g,
            net_weight_g: v.net_weight_g,
            price: v.fixed_price,
            fixed_price: v.fixed_price,
            stock: v.stock || 0,
            image: v.image,
            status: v.status || 'published',
            created_at: v.created_at || timeStr,
            updated_at: v.updated_at || timeStr
          });
          varId = newVarId;

          await k('jewelry_inventory').insert({
            jewelry_id: jewelryId,
            variant_id: varId,
            sku: v.sku,
            quantity_change: v.stock || 0,
            balance_after: v.stock || 0,
            reason: 'initial_migration',
            reference_id: `MIG-${v.id}`,
            created_at: timeStr
          });
        }
      }

      const matchingImages = allImages.filter(img => img.product_code === code || variants.some(v => v.sku === img.sku));
      for (const img of matchingImages) {
        const existingImg = await k('jewelry_images').where({
          jewelry_id: jewelryId,
          role: img.role,
          url: img.url
        }).first();
        if (!existingImg) {
          await k('jewelry_images').insert({
            jewelry_id: jewelryId,
            product_code: code,
            sku: img.sku || rep.sku,
            role: img.role,
            url: img.url,
            alt_text: img.alt_text || `${rep.name} ${img.role}`,
            sort_order: img.sort_order || 0,
            created_at: img.created_at || timeStr,
            updated_at: img.updated_at || timeStr
          });
        }
      }
    }

    // C. Migrate Kurta records from products
    const rawKurtas = await k('products').where(function() {
      this.where('is_kurta', 1).orWhere('category', 'like', '%Kurta%');
    }).orderBy('id', 'asc');

    const kByCode = new Map();
    for (const p of rawKurtas) {
      const code = p.product_code || p.slug;
      if (!kByCode.has(code)) kByCode.set(code, []);
      kByCode.get(code).push(p);
    }

    for (const [code, variants] of kByCode.entries()) {
      const rep = variants[0];
      const categoryId = kCatMap.get((rep.category || '').toLowerCase()) || kCategories[0]?.id || null;
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

      const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
      const colorMap = new Map();
      for (const v of variants) {
        if (v.color && !colorMap.has(v.color)) {
          colorMap.set(v.color, {
            name: v.color,
            code: v.color_code || v.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            hex: v.hex_color || '#d4af37'
          });
        }
      }
      const colors = [...colorMap.values()];

      let kurta = await k('kurtas').where({ product_code: code }).first();
      let kurtaId;

      if (!kurta) {
        let slug = code.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kurta';
        const existingSlug = await k('kurtas').where({ slug }).first();
        if (existingSlug) slug = `${slug}-${rep.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        const [newId] = await k('kurtas').insert({
          sku: rep.sku,
          product_code: code,
          slug,
          name: rep.name,
          category_id: categoryId,
          category: rep.category && rep.category !== 'Chicken Curry Kurtas' ? rep.category : 'Kurtas',
          description: rep.description,
          fabric: rep.metal || 'Pure Mulmul Cotton',
          pattern: 'Handcrafted Lucknowi Chikankari',
          fit: 'Straight Fit',
          sleeve_type: 'Full Sleeves',
          neck_type: 'Mandarin Collar with Keyhole Placket',
          occasion: 'Festive & Daily Elegance',
          gender: 'Women',
          available_sizes: JSON.stringify(sizes),
          available_colors: JSON.stringify(colors),
          material: rep.metal || 'Pure Mulmul Cotton',
          price: rep.fixed_price,
          sale_price: rep.fixed_price,
          fixed_price: rep.fixed_price,
          stock: totalStock,
          status: rep.status || 'published',
          supplier: rep.supplier || 'Lucknow Heritage Maison',
          image: rep.image || `/assets/products/${code}/hero.webp`,
          seo_title: `${rep.name} | Lucknowi Chikankari Kurta`,
          meta_description: rep.description,
          source_timestamp: rep.source_timestamp || timeStr,
          created_at: rep.created_at || timeStr,
          updated_at: rep.updated_at || timeStr
        });
        kurtaId = newId;
      } else {
        kurtaId = kurta.id;
      }

      for (const v of variants) {
        const existingVar = await k('kurta_variants').where({ sku: v.sku }).first();
        let varId;
        if (!existingVar) {
          const varSlug = v.slug || `${code}-${v.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          const [newVarId] = await k('kurta_variants').insert({
            kurta_id: kurtaId,
            product_code: code,
            sku: v.sku,
            slug: varSlug,
            size: v.size || 'M (38)',
            color: v.color || 'Ivory White',
            color_code: v.color_code || 'ivory-white',
            hex_color: v.hex_color || '#fdfbf7',
            finish: v.finish || 'Hand Embroidered',
            price: v.fixed_price,
            fixed_price: v.fixed_price,
            stock: v.stock || 0,
            image: v.image,
            status: v.status || 'published',
            created_at: v.created_at || timeStr,
            updated_at: v.updated_at || timeStr
          });
          varId = newVarId;

          await k('kurta_inventory').insert({
            kurta_id: kurtaId,
            variant_id: varId,
            sku: v.sku,
            quantity_change: v.stock || 0,
            balance_after: v.stock || 0,
            reason: 'initial_migration',
            reference_id: `MIG-${v.id}`,
            created_at: timeStr
          });
        }
      }

      const matchingImages = allImages.filter(img => img.product_code === code || variants.some(v => v.sku === img.sku));
      for (const img of matchingImages) {
        const existingImg = await k('kurta_images').where({
          kurta_id: kurtaId,
          role: img.role,
          url: img.url
        }).first();
        if (!existingImg) {
          await k('kurta_images').insert({
            kurta_id: kurtaId,
            product_code: code,
            sku: img.sku || rep.sku,
            color: img.color || null,
            role: img.role,
            url: img.url,
            alt_text: img.alt_text || `${rep.name} ${img.role}`,
            sort_order: img.sort_order || 0,
            created_at: img.created_at || timeStr,
            updated_at: img.updated_at || timeStr
          });
        }
      }
    }
  }

  // D. Update Coins table and populate coin_variants & coin_images
  if (await k.schema.hasTable('coins')) {
    const rawCoins = await k('coins').select('*');
    const goldCat = cCategories.find(c => c.slug === 'gold-coins')?.id || null;
    const silverCat = cCategories.find(c => c.slug === 'silver-coins')?.id || null;

    const hasProductImages = await k.schema.hasTable('product_images');
    const allImages = hasProductImages ? await k('product_images').select('*') : [];

    for (const c of rawCoins) {
      const isGold = (c.metal || '').toLowerCase() === 'gold';
      const catId = isGold ? goldCat : silverCat;
      const coinSlug = c.slug || c.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const denomination = `${c.weight_g} Gram${Number(c.weight_g) > 1 ? 's' : ''}`;
      const collection = c.name.includes('Lakshmi') ? 'Divine Blessings' : c.name.includes('Royal') ? 'Royal Heritage' : 'Classic Bullion';

      await k('coins').where({ id: c.id }).update({
        slug: coinSlug,
        category_id: catId,
        denomination,
        mint: c.supplier || 'Veyora Bullion Refinery',
        collection,
        edition: '2026 Sovereign Edition',
        year_of_issue: 2026,
        certification: 'NABL Accredited Assay Card',
        seo_title: `${c.name} | Veyora Bullion`,
        meta_description: c.description
      });

      const existingVar = await k('coin_variants').where({ sku: c.sku }).first();
      let varId;
      if (!existingVar) {
        const [newVarId] = await k('coin_variants').insert({
          coin_id: c.id,
          sku: c.sku,
          name: c.name,
          weight_g: c.weight_g,
          purity: c.purity,
          metal: c.metal,
          dimension: c.dimension,
          price: c.fixed_price,
          fixed_price: c.fixed_price,
          stock: c.stock || 0,
          status: c.status || 'published',
          created_at: c.created_at || timeStr,
          updated_at: c.updated_at || timeStr
        });
        varId = newVarId;

        await k('coin_inventory').insert({
          coin_id: c.id,
          variant_id: varId,
          sku: c.sku,
          quantity_change: c.stock || 0,
          balance_after: c.stock || 0,
          reason: 'initial_migration',
          reference_id: `COIN-MIG-${c.id}`,
          created_at: timeStr
        });
      }

      const matchingImages = allImages.filter(img => img.sku === c.sku || img.product_code === c.sku);
      if (matchingImages.length) {
        for (const img of matchingImages) {
          const existingImg = await k('coin_images').where({ coin_id: c.id, role: img.role, url: img.url }).first();
          if (!existingImg) {
            await k('coin_images').insert({
              coin_id: c.id,
              sku: c.sku,
              role: img.role,
              url: img.url,
              alt_text: img.alt_text || `${c.name} ${img.role}`,
              sort_order: img.sort_order || 0,
              created_at: img.created_at || timeStr,
              updated_at: img.updated_at || timeStr
            });
          }
        }
      } else if (c.image) {
        const existingImg = await k('coin_images').where({ coin_id: c.id, role: 'hero' }).first();
        if (!existingImg) {
          await k('coin_images').insert({
            coin_id: c.id,
            sku: c.sku,
            role: 'hero',
            url: c.image,
            alt_text: c.name,
            sort_order: 1,
            created_at: timeStr,
            updated_at: timeStr
          });
        }
      }
    }
  }

  // E. Backfill reviews: link to jewelries, coins, or kurtas
  if (await k.schema.hasTable('reviews')) {
    const reviews = await k('reviews').select('*');
    for (const rev of reviews) {
      if (rev.subject_type === 'coin' || rev.coin_id) {
        await k('reviews').where({ id: rev.id }).update({ item_type: 'coin' });
      } else if (rev.product_id) {
        const oldProduct = await k('products').where({ id: rev.product_id }).first();
        if (oldProduct) {
          if (oldProduct.is_kurta || (oldProduct.category && oldProduct.category.includes('Kurta'))) {
            const kurta = await k('kurtas').where({ product_code: oldProduct.product_code }).first();
            if (kurta) {
              await k('reviews').where({ id: rev.id }).update({ kurta_id: kurta.id, item_type: 'kurta' });
            }
          } else {
            const jewelry = await k('jewelries').where({ product_code: oldProduct.product_code }).first();
            if (jewelry) {
              await k('reviews').where({ id: rev.id }).update({ jewelry_id: jewelry.id, item_type: 'jewelry' });
            }
          }
        }
      }
    }
  }

  // F. Backfill order_items
  if (await k.schema.hasTable('order_items')) {
    const items = await k('order_items').select('*');
    for (const item of items) {
      const sku = item.sku;
      const coin = await k('coins').where({ sku }).first();
      if (coin) {
        await k('order_items').where({ id: item.id }).update({ item_type: 'coin', item_id: coin.id });
        continue;
      }
      const kVar = await k('kurta_variants').where({ sku }).first();
      if (kVar) {
        await k('order_items').where({ id: item.id }).update({ item_type: 'kurta', item_id: kVar.kurta_id });
        continue;
      }
      const jVar = await k('jewelry_variants').where({ sku }).first();
      if (jVar) {
        await k('order_items').where({ id: item.id }).update({ item_type: 'jewelry', item_id: jVar.jewelry_id });
        continue;
      }
    }
  }
}

export async function down(k) {
  // Kurta tables
  await k.schema.dropTableIfExists('kurta_inventory');
  await k.schema.dropTableIfExists('kurta_attribute_values');
  await k.schema.dropTableIfExists('kurta_attributes');
  await k.schema.dropTableIfExists('kurta_images');
  await k.schema.dropTableIfExists('kurta_variants');
  await k.schema.dropTableIfExists('kurtas');
  await k.schema.dropTableIfExists('kurta_categories');

  // Coin tables
  await k.schema.dropTableIfExists('coin_inventory');
  await k.schema.dropTableIfExists('coin_attribute_values');
  await k.schema.dropTableIfExists('coin_attributes');
  await k.schema.dropTableIfExists('coin_images');
  await k.schema.dropTableIfExists('coin_variants');
  await k.schema.dropTableIfExists('coin_categories');

  // Jewelry tables
  await k.schema.dropTableIfExists('jewelry_inventory');
  await k.schema.dropTableIfExists('jewelry_attribute_values');
  await k.schema.dropTableIfExists('jewelry_attributes');
  await k.schema.dropTableIfExists('jewelry_images');
  await k.schema.dropTableIfExists('jewelry_variants');
  await k.schema.dropTableIfExists('jewelries');
  await k.schema.dropTableIfExists('jewelry_categories');
}
