import { db, now } from './db.js';
import { activeRates, calculatePrice, activeOffers, matchOffer } from './pricing.js';
import { listingThumbnail } from '../src/listing-media.js';

// In-memory cache with 15-minute TTL
const memoryCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function clearRecommendationCache() {
  memoryCache.clear();
}

export async function getRecommendationSettings(k = db) {
  if (!k.schema || !(await k.schema.hasTable('recommendation_settings'))) {
    return {
      ai_enabled: true,
      max_similar: 6,
      max_you_may_like: 6,
      max_complete_look: 4,
      provider: 'internal-hybrid-engine'
    };
  }

  const rows = await k('recommendation_settings').select('key', 'value');
  const settings = {
    ai_enabled: true,
    max_similar: 6,
    max_you_may_like: 6,
    max_complete_look: 4,
    provider: 'internal-hybrid-engine'
  };

  for (const r of rows) {
    if (r.key === 'ai_enabled') settings.ai_enabled = r.value === 'true';
    if (r.key === 'max_similar') settings.max_similar = parseInt(r.value, 10) || 6;
    if (r.key === 'max_you_may_like') settings.max_you_may_like = parseInt(r.value, 10) || 6;
    if (r.key === 'max_complete_look') settings.max_complete_look = parseInt(r.value, 10) || 4;
    if (r.key === 'provider') settings.provider = r.value;
  }

  return settings;
}

export async function updateRecommendationSettings(k = db, patch = {}) {
  if (!k.schema || !(await k.schema.hasTable('recommendation_settings'))) return;
  const timestamp = now();

  for (const [key, val] of Object.entries(patch)) {
    await k('recommendation_settings')
      .insert({ key, value: String(val), updated_at: timestamp })
      .onConflict('key')
      .merge();
  }

  clearRecommendationCache();
  return getRecommendationSettings(k);
}

export async function getProductRecommendations(k = db, targetSlugOrCode, options = {}) {
  const cacheKey = `rec:${targetSlugOrCode}:${options.color || 'all'}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const settings = await getRecommendationSettings(k);

  // 1. Locate source product
  let product = await k('products')
    .where({ slug: targetSlugOrCode })
    .orWhere({ product_code: targetSlugOrCode })
    .orWhere({ sku: targetSlugOrCode })
    .first();

  let isCoin = false;
  if (!product) {
    product = await k('coins')
      .where({ sku: targetSlugOrCode })
      .orWhere({ id: Number(targetSlugOrCode) || 0 })
      .first();
    if (product) isCoin = true;
  }

  if (!product) {
    return { similar: [], youMayLike: [], completeLook: [], source: 'none' };
  }

  const [allProducts, allCoins, rates, rule, offers] = await Promise.all([
    k('products').where({ status: 'published' }).orderBy('id', 'asc'),
    k('coins').where({ status: 'published' }).orderBy('id', 'asc'),
    activeRates(k),
    k('pricing_rules').orderBy('id', 'desc').first(),
    activeOffers(k)
  ]);

  // Format cards helper
  const formatCard = (p) => {
    const offer = matchOffer(p, offers);
    let price = null;
    try {
      price = calculatePrice(p, rates[p.purity], rule, offer);
    } catch {}

    const curPrice = price?.total ?? Number(p.fixed_price || 0);
    return {
      id: p.id,
      sku: p.sku,
      product_code: p.product_code || p.sku,
      slug: p.slug || p.product_code,
      name: p.name,
      category: p.category,
      metal: p.metal,
      purity: p.purity,
      finish: p.finish,
      image: p.image,
      thumbnail: listingThumbnail(p),
      price: curPrice,
      original_price: price?.original_total ?? null,
      discount_amount: price?.discount_amount ?? 0,
      offer: price?.offer || offer || null,
      stock: p.stock,
      is_kurta: Boolean(p.is_kurta),
      is_coin: Boolean(p.weight_g && !p.is_kurta)
    };
  };

  const currentCode = product.product_code || product.sku;
  const currentCategory = product.category || (isCoin ? 'Gold & Silver Coins' : '');
  const currentMetal = product.metal || '';
  const currentPurity = product.purity || '';
  const currentPrice = Number(product.fixed_price || 0);

  // Exclude current product and other variants sharing the same product_code
  const pool = allProducts.filter(p => (p.product_code || p.sku) !== currentCode);

  // Group pool by product_code to avoid showing multiple variants of the same item
  const uniqueItemsMap = new Map();
  for (const item of pool) {
    const code = item.product_code || item.slug;
    if (!uniqueItemsMap.has(code) && item.stock > 0) {
      uniqueItemsMap.set(code, item);
    }
  }
  const uniqueItems = Array.from(uniqueItemsMap.values());

  // Check manual admin overrides in database
  const manualOverrides = (await k.schema.hasTable('product_recommendations'))
    ? await k('product_recommendations')
        .where({ source_code: currentCode, status: 'active' })
        .orderBy('admin_priority', 'desc')
    : [];

  const manualPinned = {
    similar: manualOverrides.filter(o => o.recommendation_type === 'similar').map(o => o.target_code),
    youMayLike: manualOverrides.filter(o => o.recommendation_type === 'you_may_like').map(o => o.target_code),
    completeLook: manualOverrides.filter(o => o.recommendation_type === 'complete_look').map(o => o.target_code)
  };

  const usedCodes = new Set([currentCode]);

  // A. SIMILAR PRODUCTS
  // Same category, matching metal/material if possible, similar price range
  let similarPool = uniqueItems.filter(p => {
    if (usedCodes.has(p.product_code)) return false;
    if (Boolean(p.is_kurta) !== Boolean(product.is_kurta)) return false;
    return p.category === currentCategory;
  });

  // Sort by price proximity and metal match
  similarPool.sort((a, b) => {
    const aMetalMatch = a.metal === currentMetal ? 1 : 0;
    const bMetalMatch = b.metal === currentMetal ? 1 : 0;
    if (bMetalMatch !== aMetalMatch) return bMetalMatch - aMetalMatch;
    const aDiff = Math.abs(Number(a.fixed_price || 0) - currentPrice);
    const bDiff = Math.abs(Number(b.fixed_price || 0) - currentPrice);
    return aDiff - bDiff;
  });

  // Inject manual pins for similar
  const similarItems = [];
  for (const code of manualPinned.similar) {
    const pinned = allProducts.find(p => (p.product_code || p.sku) === code);
    if (pinned && !usedCodes.has(pinned.product_code)) {
      similarItems.push(formatCard(pinned));
      usedCodes.add(pinned.product_code);
    }
  }

  for (const p of similarPool) {
    if (similarItems.length >= settings.max_similar) break;
    similarItems.push(formatCard(p));
    usedCodes.add(p.product_code);
  }

  // B. YOU MAY ALSO LIKE
  // High quality pieces in same metal or collection or festive styling
  const youMayLikePool = uniqueItems.filter(p => {
    if (usedCodes.has(p.product_code)) return false;
    if (Boolean(p.is_kurta) !== Boolean(product.is_kurta)) return false;
    return true;
  });

  youMayLikePool.sort((a, b) => {
    const aMetalMatch = a.metal === currentMetal ? 1 : 0;
    const bMetalMatch = b.metal === currentMetal ? 1 : 0;
    return bMetalMatch - aMetalMatch;
  });

  const youMayLikeItems = [];
  for (const code of manualPinned.youMayLike) {
    const pinned = allProducts.find(p => (p.product_code || p.sku) === code);
    if (pinned && !usedCodes.has(pinned.product_code)) {
      youMayLikeItems.push(formatCard(pinned));
      usedCodes.add(pinned.product_code);
    }
  }

  for (const p of youMayLikePool) {
    if (youMayLikeItems.length >= settings.max_you_may_like) break;
    youMayLikeItems.push(formatCard(p));
    usedCodes.add(p.product_code);
  }

  // C. COMPLETE THE LOOK
  // Complementary categories!
  // If viewing Necklace -> Recommend Earrings, Bangles/Kada, Rings
  // If viewing Mangalsutra -> Recommend Bangles, Earrings
  // If viewing Earrings -> Recommend Necklace, Rings
  // If viewing Rings -> Recommend Bracelets, Earrings
  // If viewing Kurtas -> Recommend other kurtas with complementary hues or accessories
  let complementaryCategories = [];
  if (currentCategory === 'Necklaces') complementaryCategories = ['Earrings', 'Bangles and Kada', 'Rings', 'Maang Tikka and Nath'];
  else if (currentCategory === 'Mangalsutra') complementaryCategories = ['Bangles and Kada', 'Earrings', 'Rings'];
  else if (currentCategory === 'Earrings') complementaryCategories = ['Necklaces', 'Rings', 'Bracelets', 'Maang Tikka and Nath'];
  else if (currentCategory === 'Rings') complementaryCategories = ['Bracelets', 'Earrings', 'Necklaces'];
  else if (currentCategory === 'Bracelets' || currentCategory === 'Bangles and Kada') complementaryCategories = ['Necklaces', 'Rings', 'Earrings'];
  else if (currentCategory === 'Jewellery Sets') complementaryCategories = ['Rings', 'Bangles and Kada', 'Anklets and Payal'];
  else if (product.is_kurta) complementaryCategories = ['Chicken Curry Kurtas'];
  else complementaryCategories = ['Earrings', 'Necklaces', 'Rings', 'Bracelets'];

  const completeLookPool = uniqueItems.filter(p => {
    if (usedCodes.has(p.product_code)) return false;
    if (product.is_kurta) return p.is_kurta;
    return complementaryCategories.includes(p.category);
  });

  completeLookPool.sort((a, b) => {
    // Prefer matching metals (Gold with Gold, Silver with Silver)
    const aMetalMatch = a.metal === currentMetal ? 1 : 0;
    const bMetalMatch = b.metal === currentMetal ? 1 : 0;
    return bMetalMatch - aMetalMatch;
  });

  const completeLookItems = [];
  for (const code of manualPinned.completeLook) {
    const pinned = allProducts.find(p => (p.product_code || p.sku) === code);
    if (pinned && !usedCodes.has(pinned.product_code)) {
      completeLookItems.push(formatCard(pinned));
      usedCodes.add(pinned.product_code);
    }
  }

  for (const p of completeLookPool) {
    if (completeLookItems.length >= settings.max_complete_look) break;
    completeLookItems.push(formatCard(p));
    usedCodes.add(p.product_code);
  }

  // Handle coins recommendations
  if (isCoin) {
    const coinPool = allCoins.filter(c => c.sku !== product.sku);
    similarItems.length = 0;
    youMayLikeItems.length = 0;
    completeLookItems.length = 0;

    for (const c of coinPool) {
      const card = {
        id: c.id,
        sku: c.sku,
        product_code: c.sku,
        slug: c.sku.toLowerCase(),
        name: c.name,
        category: 'Gold & Silver Coins',
        metal: c.metal,
        purity: c.purity,
        weight_g: c.weight_g,
        image: c.image,
        thumbnail: c.image,
        price: Number(c.fixed_price || 0),
        is_coin: true,
        stock: c.stock
      };
      if (c.metal === product.metal && similarItems.length < settings.max_similar) {
        similarItems.push(card);
      } else if (youMayLikeItems.length < settings.max_you_may_like) {
        youMayLikeItems.push(card);
      }
    }
  }

  const result = {
    similar: similarItems,
    youMayLike: youMayLikeItems,
    completeLook: completeLookItems,
    source: settings.ai_enabled ? 'hybrid-ai-relational' : 'deterministic-relational'
  };

  memoryCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

export function registerRecommendationRoutes(app, { db, route, auth }) {
  app.get('/api/products/:slug/recommendations', route(async (req, res) => {
    const recs = await getProductRecommendations(db, req.params.slug, { color: req.query.color });
    res.json(recs);
  }));

  app.get('/api/admin/recommendations/settings', auth(), route(async (req, res) => {
    res.json(await getRecommendationSettings(db));
  }));

  app.put('/api/admin/recommendations/settings', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await updateRecommendationSettings(db, req.body));
  }));

  app.post('/api/admin/recommendations/clear-cache', auth(['owner', 'manager']), route(async (req, res) => {
    clearRecommendationCache();
    res.json({ ok: true, message: 'Recommendation cache cleared.' });
  }));
}

