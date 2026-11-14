import { validationError } from './errors.js';
import { db, now } from './db.js';
import { catalogue, coinCatalogue } from './pricing.js';

export async function comboCatalogue(k = db, options = {}) {
  if (!k.schema || !(await k.schema.hasTable('combos'))) return [];

  const [combos, items, prods, coins] = await Promise.all([
    k('combos').where({ status: 'published' }).orderBy('id', 'asc'),
    k.schema.hasTable('combo_items') ? k('combo_items') : [],
    catalogue(k, options),
    coinCatalogue(k, options)
  ]);

  const allItems = [...prods, ...coins];
  const prodBySku = new Map(allItems.map(p => [p.sku, p]));

  const itemsByCombo = new Map();
  for (const it of items) {
    if (!itemsByCombo.has(it.combo_id)) itemsByCombo.set(it.combo_id, []);
    const component = prodBySku.get(it.product_sku);
    itemsByCombo.get(it.combo_id).push({
      ...it,
      product: component || null
    });
  }

  return combos.map(combo => {
    const comboComponents = itemsByCombo.get(combo.id) || [];
    
    // Calculate live component sum
    let calculatedOriginal = 0;
    let minComponentStock = Infinity;

    for (const c of comboComponents) {
      if (c.product) {
        calculatedOriginal += Number(c.product.price || 0) * (c.quantity || 1);
        minComponentStock = Math.min(minComponentStock, Math.floor((c.product.stock || 0) / (c.quantity || 1)));
      }
    }

    const originalPrice = calculatedOriginal > 0 ? calculatedOriginal : Number(combo.original_price || combo.combo_price);
    const comboPrice = Number(combo.combo_price);
    const savings = Math.max(0, originalPrice - comboPrice);
    const discountPercent = originalPrice > 0 ? Number(((savings / originalPrice) * 100).toFixed(1)) : 0;
    const effectiveStock = Math.max(0, Math.min(Number(combo.stock || 0), minComponentStock === Infinity ? Number(combo.stock || 0) : minComponentStock));

    return {
      ...combo,
      is_combo: true,
      price: comboPrice,
      original_price: originalPrice,
      discount_amount: savings,
      savings,
      discount_percent: discountPercent,
      stock: effectiveStock,
      checkout_available: effectiveStock > 0,
      thumbnail: combo.thumbnail || combo.image,
      image_url: combo.image,
      components: comboComponents,
      images: [
        { id: `combo-${combo.id}`, role: 'hero', url: combo.image, alt_text: combo.name }
      ]
    };
  });
}

export async function comboBySlug(k = db, slug) {
  if (!k.schema || !(await k.schema.hasTable('combos'))) return null;
  const combos = await comboCatalogue(k);
  return combos.find(c => c.slug === slug) || null;
}

export async function comboBySku(k = db, sku) {
  if (!k.schema || !(await k.schema.hasTable('combos'))) return null;
  const combos = await comboCatalogue(k);
  return combos.find(c => c.sku === sku) || null;
}

export async function adminListCombos(k = db) {
  if (!k.schema || !(await k.schema.hasTable('combos'))) return [];
  const combos = await k('combos').orderBy('id', 'desc');
  const items = await k('combo_items');

  const itemsMap = new Map();
  for (const it of items) {
    if (!itemsMap.has(it.combo_id)) itemsMap.set(it.combo_id, []);
    itemsMap.get(it.combo_id).push(it);
  }

  return combos.map(c => ({
    ...c,
    items: itemsMap.get(c.id) || []
  }));
}

export async function createCombo(k = db, data) {
  const { sku, name, description, category, image, combo_price, original_price, stock, status, items, seo_title, meta_description } = data;
  if (!sku || !name || !combo_price) throw validationError('SKU, Name, and Combo Price are required.');
  const cleanSku = String(sku).trim().toUpperCase();

  const existing = await k('combos').where({ sku: cleanSku }).first();
  if (existing) throw validationError(`A combo with SKU "${cleanSku}" already exists.`);
  if (await k('products').where({ sku: cleanSku }).first()) throw validationError(`SKU "${cleanSku}" collides with an existing product.`);
  if (await k.schema.hasTable('coins') && await k('coins').where({ sku: cleanSku }).first()) throw validationError(`SKU "${cleanSku}" collides with an existing coin.`);

  let slug = String(data.slug || cleanSku.toLowerCase()).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'combo';
  if (await k('combos').where({ slug }).first()) slug = `${slug}-${cleanSku.toLowerCase()}`;

  const numComboPrice = Number(combo_price);
  const numOrigPrice = original_price ? Number(original_price) : numComboPrice;
  const numSavings = Math.max(0, numOrigPrice - numComboPrice);
  const numDiscountPercent = numOrigPrice > 0 ? Number(((numSavings / numOrigPrice) * 100).toFixed(2)) : 0;
  const timestamp = now();

  return k.transaction(async (t) => {
    const [id] = await t('combos').insert({
      sku: cleanSku,
      slug,
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      category: category ? String(category).trim() : 'Kurta & Jewellery Combo',
      image: image ? String(image).trim() : '/assets/combos/combo-placeholder.webp',
      combo_price: numComboPrice,
      original_price: numOrigPrice,
      discount_percent: numDiscountPercent,
      savings: numSavings,
      stock: Math.max(0, parseInt(stock || 0, 10)),
      status: ['published', 'draft'].includes(status) ? status : 'published',
      seo_title: seo_title ? String(seo_title).trim() : null,
      meta_description: meta_description ? String(meta_description).trim() : null,
      created_at: timestamp,
      updated_at: timestamp
    });

    if (Array.isArray(items) && items.length) {
      for (const item of items) {
        if (!item.product_sku) continue;
        await t('combo_items').insert({
          combo_id: id,
          product_sku: String(item.product_sku).trim().toUpperCase(),
          quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
          is_primary: item.is_primary ? 1 : 0
        });
      }
    }

    return { id, sku: cleanSku, slug };
  });
}

export async function updateCombo(k = db, id, data) {
  const existing = await k('combos').where({ id }).first();
  if (!existing) throw validationError('Combo not found', 404);

  const patch = { updated_at: now() };
  if (data.name) patch.name = String(data.name).trim();
  if (data.description !== undefined) patch.description = data.description ? String(data.description).trim() : null;
  if (data.category) patch.category = String(data.category).trim();
  if (data.image) patch.image = String(data.image).trim();
  if (data.status && ['published', 'draft'].includes(data.status)) patch.status = data.status;
  if (data.stock !== undefined) patch.stock = Math.max(0, parseInt(data.stock || 0, 10));
  if (data.seo_title !== undefined) patch.seo_title = data.seo_title ? String(data.seo_title).trim() : null;
  if (data.meta_description !== undefined) patch.meta_description = data.meta_description ? String(data.meta_description).trim() : null;

  if (data.combo_price !== undefined) {
    const numComboPrice = Number(data.combo_price);
    const numOrigPrice = data.original_price ? Number(data.original_price) : (existing.original_price || numComboPrice);
    patch.combo_price = numComboPrice;
    patch.original_price = numOrigPrice;
    patch.savings = Math.max(0, numOrigPrice - numComboPrice);
    patch.discount_percent = numOrigPrice > 0 ? Number(((patch.savings / numOrigPrice) * 100).toFixed(2)) : 0;
  }

  return k.transaction(async (t) => {
    await t('combos').where({ id }).update(patch);

    if (Array.isArray(data.items)) {
      await t('combo_items').where({ combo_id: id }).del();
      for (const item of data.items) {
        if (!item.product_sku) continue;
        await t('combo_items').insert({
          combo_id: id,
          product_sku: String(item.product_sku).trim().toUpperCase(),
          quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
          is_primary: item.is_primary ? 1 : 0
        });
      }
    }

    return t('combos').where({ id }).first();
  });
}

export async function deleteCombo(k = db, id) {
  const existing = await k('combos').where({ id }).first();
  if (!existing) throw validationError('Combo not found', 404);

  return k.transaction(async (t) => {
    await t('combo_items').where({ combo_id: id }).del();
    await t('combos').where({ id }).del();
    return { ok: true };
  });
}
