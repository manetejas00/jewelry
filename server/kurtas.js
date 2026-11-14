import { validationError } from './errors.js';
import { listingThumbnail } from '../src/listing-media.js';
import { getAllProductsRatingSummaries } from './reviews.js';
import { activeOffers, matchOffer, calculatePrice, isFresh, activeRates } from './pricing.js';
import { now } from './db.js';

import { KURTA_SIZES } from '../src/kurta-constants.js';
export { KURTA_SIZES };

export async function listKurtas(k, options = {}) {
  const hasImages = await k.schema.hasTable('product_images').catch(() => false);
  const hasReviews = await k.schema.hasTable('reviews').catch(() => false);

  const [products, rates, rules, images, offers, ratings] = await Promise.all([
    k('products').where(function() {
      this.where({ is_kurta: true })
        .orWhere({ category: 'Chicken Curry Kurtas' })
        .orWhere('category', 'like', '%Kurta%');
    }).where({ status: 'published' }).orderBy('id', 'asc'),
    activeRates(k),
    k('pricing_rules').orderBy('id', 'desc').first(),
    hasImages ? k('product_images')
      .select('id', 'product_code', 'sku', 'role', 'url', 'alt_text', 'sort_order')
      .orderBy('sort_order', 'asc').orderBy('id', 'asc') : [],
    activeOffers(k),
    hasReviews ? getAllProductsRatingSummaries(k) : new Map()
  ]);

  const imagesByProduct = {};
  for (const img of images) {
    for (const key of [img.product_code, img.sku]) {
      if (!key) continue;
      if (!imagesByProduct[key]) imagesByProduct[key] = [];
      imagesByProduct[key].push(img);
    }
  }

  // Price all variants
  const pricedVariants = products.map(p => {
    const offer = matchOffer(p, offers, options.code);
    let price = null;
    try { price = calculatePrice(p, rates[p.purity], rules, offer); } catch {}
    const prodImages = [...(imagesByProduct[p.sku] || []), ...(imagesByProduct[p.product_code] || [])]
      .filter((img, i, all) => all.findIndex(o => o.url === img.url) === i);
    const ratingData = ratings.get(p.product_code) || ratings.get(p.id) || null;

    return {
      ...p,
      is_kurta: true,
      thumbnail: listingThumbnail(p),
      images: prodImages,
      price: price?.total ?? Number(p.fixed_price || 0),
      original_price: price?.original_total ?? null,
      discount_amount: price?.discount_amount ?? 0,
      offer: price?.offer || offer || null,
      breakdown: price,
      checkout_available: p.stock > 0,
      rating_average: ratingData ? ratingData.average : null,
      rating_count: ratingData ? ratingData.count : 0
    };
  });

  // Group by product_code to form family cards
  const familyMap = new Map();
  for (const v of pricedVariants) {
    const code = v.product_code || v.slug;
    const existing = familyMap.get(code);
    const curPrice = v.price ?? Number(v.fixed_price || 0);

    if (!existing) {
      familyMap.set(code, {
        ...v,
        minPrice: curPrice,
        maxPrice: curPrice,
        totalStock: v.stock,
        variants: [v],
        availableSizes: v.stock > 0 ? [v.size] : []
      });
    } else {
      existing.minPrice = Math.min(existing.minPrice, curPrice);
      existing.maxPrice = Math.max(existing.maxPrice, curPrice);
      existing.totalStock += v.stock;
      existing.variants.push(v);
      if (v.stock > 0 && !existing.availableSizes.includes(v.size)) {
        existing.availableSizes.push(v.size);
      }
      // If existing rep is out of stock but this one is in stock, swap rep
      if (existing.stock === 0 && v.stock > 0) {
        Object.assign(existing, {
          id: v.id,
          sku: v.sku,
          name: v.name,
          slug: v.slug,
          price: v.price,
          original_price: v.original_price,
          discount_amount: v.discount_amount,
          offer: v.offer,
          image: v.image,
          thumbnail: v.thumbnail,
          stock: v.stock,
          checkout_available: true
        });
      }
    }
  }

  for (const fam of familyMap.values()) {
    // Unique colours for the style
    const colorMap = new Map();
    for (const v of fam.variants) {
      if (v.color && !colorMap.has(v.color)) {
        const colorImgs = (fam.images || []).filter(img => img.color === v.color);
        const repImg = colorImgs[0]?.url || v.image;
        colorMap.set(v.color, {
          name: v.color,
          code: v.color_code || v.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          hex: v.hex_color || '#d4af37',
          image: repImg,
          price: v.price,
          in_stock: fam.variants.some(item => item.color === v.color && item.stock > 0)
        });
      }
    }
    fam.colors = [...colorMap.values()];

    fam.sizes = KURTA_SIZES.map(s => {
      const v = fam.variants.find(item => item.size.startsWith(s.code));
      return {
        ...s,
        sku: v?.sku,
        stock: v?.stock || 0,
        in_stock: (v?.stock || 0) > 0
      };
    });
  }

  return [...familyMap.values()];
}

export async function kurtaBySlug(k, slug, options = {}) {
  const cleanSlug = String(slug || '').trim();
  const baseProduct = await k('products')
    .where({ slug: cleanSlug })
    .orWhere({ product_code: cleanSlug })
    .first();

  if (!baseProduct) return null;

  const targetCode = baseProduct.product_code;
  const [variants, rates, rules, images, offers, ratings] = await Promise.all([
    k('products').where({ product_code: targetCode }).orderBy('id', 'asc'),
    activeRates(k),
    k('pricing_rules').orderBy('id', 'desc').first(),
    k('product_images').where(function() {
      this.where({ product_code: targetCode }).orWhereIn('sku', k('products').select('sku').where({ product_code: targetCode }));
    }).orderBy('sort_order', 'asc').orderBy('id', 'asc'),
    activeOffers(k),
    getAllProductsRatingSummaries(k)
  ]);

  const distinctImages = images.filter((img, i, all) => all.findIndex(o => o.url === img.url) === i);
  const ratingData = ratings.get(targetCode) || ratings.get(baseProduct.id) || null;

  const pricedVariants = variants.map(v => {
    const offer = matchOffer(v, offers, options.code);
    let price = null;
    try { price = calculatePrice(v, rates[v.purity], rules, offer); } catch {}
    return {
      ...v,
      is_kurta: true,
      price: price?.total ?? Number(v.fixed_price || 0),
      original_price: price?.original_total ?? null,
      discount_amount: price?.discount_amount ?? 0,
      offer: price?.offer || offer || null,
      breakdown: price,
      checkout_available: v.stock > 0
    };
  });

  const rep = pricedVariants.find(v => v.slug === cleanSlug) || pricedVariants.find(v => v.stock > 0) || pricedVariants[0];

  // Group colors
  const colorMap = new Map();
  for (const v of pricedVariants) {
    if (v.color && !colorMap.has(v.color)) {
      const colorImgs = distinctImages.filter(img => img.color === v.color);
      colorMap.set(v.color, {
        name: v.color,
        code: v.color_code || v.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        hex: v.hex_color || '#d4af37',
        image: colorImgs[0]?.url || v.image
      });
    }
  }

  // Active color variants for size selection (7 sizes)
  const activeColor = options.color || rep.color;
  const activeColorVariants = activeColor
    ? pricedVariants.filter(v => v.color === activeColor)
    : pricedVariants.slice(0, 7);

  const finalVariants = activeColorVariants.length === 7 ? activeColorVariants : pricedVariants.slice(0, 7);

  return {
    ...rep,
    is_kurta: true,
    thumbnail: listingThumbnail(rep),
    images: distinctImages,
    angle_images: distinctImages,
    variants: finalVariants,
    all_variants: pricedVariants,
    colors: [...colorMap.values()],
    rating_average: ratingData ? ratingData.average : null,
    rating_count: ratingData ? ratingData.count : 0,
    size_chart: KURTA_SIZES
  };
}

export async function adminListKurtas(k) {
  const products = await k('products').where(function() {
    this.where({ is_kurta: true })
      .orWhere({ category: 'Chicken Curry Kurtas' })
      .orWhere('category', 'like', '%Kurta%');
  }).orderBy('product_code').orderBy('id');

  const productCodes = [...new Set(products.map(p => p.product_code))];
  const images = await k('product_images')
    .whereIn('product_code', productCodes)
    .orderBy('sort_order', 'asc');

  const imagesByCode = {};
  for (const img of images) {
    if (!imagesByCode[img.product_code]) imagesByCode[img.product_code] = [];
    imagesByCode[img.product_code].push(img);
  }

  const families = new Map();
  for (const p of products) {
    const code = p.product_code;
    if (!families.has(code)) {
      families.set(code, {
        product_code: code,
        name: p.name,
        category: p.category,
        description: p.description,
        fabric: p.metal,
        craftsmanship: p.purity,
        price: Number(p.fixed_price || 0),
        status: p.status,
        image: p.image,
        images: imagesByCode[code] || [],
        totalStock: 0,
        sizes: {},
        stocks: {},
        variantCount: 0,
        _colorMap: new Map()
      });
    }
    const fam = families.get(code);
    fam.totalStock += p.stock;
    fam.variantCount += 1;
    if (p.color && !fam._colorMap.has(p.color)) {
      fam._colorMap.set(p.color, {
        name: p.color,
        code: p.color_code || p.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        hex: p.hex_color || '#e0d8cc'
      });
    }
    const sizeData = {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      stock: p.stock,
      price: Number(p.fixed_price || 0)
    };
    fam.sizes[p.size] = sizeData;
    fam.stocks[p.size] = p.stock;
  }

  for (const fam of families.values()) {
    fam.colors = [...fam._colorMap.values()];
    delete fam._colorMap;
  }

  return [...families.values()];
}

export async function createKurta(k, payload) {
  const {
    name,
    product_code,
    description,
    fabric = 'Pure Mulmul Cotton',
    craftsmanship = 'Handcrafted Lucknowi Chikankari',
    price = 3990,
    status = 'published',
    image = '',
    sizes = {},
    seo_title,
    meta_description,
    images = []
  } = payload;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw validationError('Product name is required');
  }

  const cleanCode = String(product_code || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (await k('products').where({ product_code: cleanCode }).first()) {
    throw validationError(`A kurta with product code "${cleanCode}" already exists.`);
  }

  const timestamp = now();
  const skuPrefix = cleanCode.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 15);

  return k.transaction(async (t) => {
    const insertedVariants = [];

    for (const sizeInfo of KURTA_SIZES) {
      const sizeSku = `CCK-${skuPrefix}-${sizeInfo.code}`;
      const sizeSlug = `${cleanCode}-${sizeInfo.code.toLowerCase()}`;
      const sizeStock = Math.max(0, parseInt(sizes[sizeInfo.label] ?? sizes[sizeInfo.code] ?? 10, 10));

      const row = {
        supplier: 'Lucknow Heritage Maison',
        product_code: cleanCode,
        sku: sizeSku,
        slug: sizeSlug,
        name: String(name).trim(),
        category: 'Chicken Curry Kurtas',
        is_kurta: true,
        description: description ? String(description).trim() : null,
        metal: String(fabric).trim(),
        purity: String(craftsmanship).trim(),
        net_weight_g: null,
        size: sizeInfo.label,
        finish: 'Hand Embroidered',
        image: image || `/assets/products/${cleanCode}/hero.webp`,
        pricing_mode: 'FIXED',
        fixed_price: String(Number(price || 0).toFixed(2)),
        making_flat: '0.00',
        making_percent: '0.0000',
        stone_charge: '0.00',
        other_charge: '0.00',
        stock: sizeStock,
        status: status === 'draft' ? 'draft' : 'published',
        source_timestamp: timestamp,
        updated_at: timestamp,
        seo_title: seo_title || `${name} | Veyora`,
        meta_description: meta_description || `${name} in authentic handcrafted Lucknowi Chikankari.`
      };

      const [id] = await t('products').insert(row);
      insertedVariants.push({ ...row, id });
    }

    // Insert images
    if (Array.isArray(images) && images.length > 0) {
      let sortOrder = 1;
      for (const img of images) {
        if (!img.url) continue;
        await t('product_images').insert({
          product_code: cleanCode,
          sku: null,
          role: img.role || 'hero',
          url: img.url,
          alt_text: img.alt_text || `${name} - ${img.role || 'view'}`,
          sort_order: sortOrder++,
          created_at: timestamp,
          updated_at: timestamp
        });
      }
    } else {
      // Seed default multi-angle roles if files exist
      const defaultRoles = ['hero', 'front', 'right', 'left', 'back', 'model', 'detail'];
      let order = 1;
      for (const role of defaultRoles) {
        const fileRole = role === 'detail' ? 'modal' : role;
        await t('product_images').insert({
          product_code: cleanCode,
          sku: null,
          role,
          url: `/assets/products/${cleanCode}/${fileRole}.webp`,
          alt_text: `${name} ${role.toUpperCase()} View`,
          sort_order: order++,
          created_at: timestamp,
          updated_at: timestamp
        });
      }
    }

    return { product_code: cleanCode, variants: insertedVariants };
  });
}

export async function updateKurta(k, productCode, payload) {
  const cleanCode = String(productCode).trim();
  const existing = await k('products').where({ product_code: cleanCode }).first();
  if (!existing) throw validationError('Kurta not found', 404);

  const {
    name,
    description,
    fabric,
    craftsmanship,
    price,
    status,
    image,
    sizes,
    stocks,
    seo_title,
    meta_description
  } = payload;
  const sizeMap = sizes || stocks || {};

  const timestamp = now();
  const patch = { updated_at: timestamp };

  if (name) patch.name = String(name).trim();
  if (description !== undefined) patch.description = description ? String(description).trim() : null;
  if (fabric) patch.metal = String(fabric).trim();
  if (craftsmanship) patch.purity = String(craftsmanship).trim();
  if (price !== undefined && price !== null) patch.fixed_price = String(Number(price).toFixed(2));
  if (status && ['published', 'draft'].includes(status)) patch.status = status;
  if (image) patch.image = String(image).trim();
  if (seo_title !== undefined) patch.seo_title = seo_title ? String(seo_title).trim() : null;
  if (meta_description !== undefined) patch.meta_description = meta_description ? String(meta_description).trim() : null;

  return k.transaction(async (t) => {
    await t('products').where({ product_code: cleanCode }).update(patch);

    // Update size-wise stocks if provided
    for (const sizeInfo of KURTA_SIZES) {
      const stockVal = sizeMap[sizeInfo.label] ?? sizeMap[sizeInfo.code];
      if (stockVal !== undefined) {
        await t('products')
          .where({ product_code: cleanCode })
          .andWhere(function() {
            this.where({ size: sizeInfo.label }).orWhere('sku', 'like', `%-${sizeInfo.code}`);
          })
          .update({
            stock: Math.max(0, parseInt(stockVal, 10)),
            updated_at: timestamp
          });
      }
    }

    return { ok: true, product_code: cleanCode };
  });
}

export async function deleteKurta(k, productCode) {
  const cleanCode = String(productCode).trim();
  const count = await k('products').where({ product_code: cleanCode }).del();
  if (!count) throw validationError('Kurta not found', 404);
  await k('product_images').where({ product_code: cleanCode }).del();
  return { ok: true, deleted: count };
}
