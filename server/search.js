import {catalogue, coinCatalogue} from './pricing.js';
import {comboCatalogue} from './combos.js';

let cache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateSearchCache() {
  cache = null;
  cacheTime = 0;
}

const TYPO_MAP = {
  peral: 'pearl',
  perals: 'pearl',
  perl: 'pearl',
  neclace: 'necklace',
  neckless: 'necklace',
  necklac: 'necklace',
  neckles: 'necklace',
  earings: 'earrings',
  erring: 'earrings',
  errings: 'earrings',
  earing: 'earrings',
  braclet: 'bracelet',
  barcelet: 'bracelet',
  braclets: 'bracelets',
  wristband: 'bracelet',
  cuf: 'cuff',
  silvr: 'silver',
  silve: 'silver',
  silveer: 'silver',
  gld: 'gold',
  gol: 'gold',
  laxmi: 'lakshmi',
  lakshmee: 'lakshmi',
  ganesha: 'ganesh',
  ganpati: 'ganesh',
  dimond: 'diamond',
  diamand: 'diamond',
  jwellery: 'jewellery',
  jewelery: 'jewellery',
  jewelry: 'jewellery',
  nocturn: 'nocturne',
  nocture: 'nocturne',
  eclise: 'eclipse',
  eclips: 'eclipse',
  chikan: 'chikankari',
  chikankary: 'chikankari',
  chickencurry: 'chikankari',
  chickencurrykurta: 'kurta',
  kurti: 'kurta',
  kurtas: 'kurta',
  kurtis: 'kurta',
  cmbo: 'combo',
  combos: 'combo',
  georget: 'georgette',
  chander: 'chanderi',
  mulmul: 'mulmul'
};

const VOCABULARY = [
  'pearl', 'ring', 'rings', 'necklace', 'necklaces', 'earring', 'earrings',
  'bracelet', 'bracelets', 'cuff', 'collar', 'drops', 'studs', 'gold',
  'silver', 'coin', 'coins', 'lakshmi', 'ganesh', 'emblem', 'floral',
  'cast', 'pure', 'bullion', 'eclipse', 'nocturne', 'lune', 'atelier',
  'aurelia', 'solenne', 'celeste', 'mirelle', 'estelle', 'elodie',
  'seraphine', 'amelie', 'rosalie', 'vesper', 'aster', 'calista', 'daphne',
  'gram', 'grams', 'weight', 'purity', 'velours', 'halo',
  'kurta', 'kurtas', 'chikankari', 'lucknowi', 'mulmul', 'georgette', 'chanderi',
  'cotton', 'ethnic', 'festive', 'combo', 'combos', 'set', 'sets', 'embroidery',
  'ivory', 'blush', 'sage', 'sky'
];

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function expandTokens(rawQuery) {
  const normalized = normalizeText(rawQuery);
  const rawTokens = normalized.split(' ').filter(Boolean);
  const expanded = [];

  for (const token of rawTokens) {
    const candidates = new Set([token]);
    // Check direct typo map
    if (TYPO_MAP[token]) {
      candidates.add(TYPO_MAP[token]);
    }
    // Check gram/weight variants: e.g. "10g" -> "10" and "gram" / "g"
    const matchWeight = token.match(/^(\d+)(g|gm|gms|gram|grams)$/);
    if (matchWeight) {
      candidates.add(matchWeight[1]);
      candidates.add(matchWeight[1] + 'g');
      candidates.add('gram');
      candidates.add('grams');
    }
    // Levenshtein fuzzy match if length >= 4 and not pure digits
    if (token.length >= 4 && !/^\d+$/.test(token)) {
      for (const word of VOCABULARY) {
        const dist = levenshtein(token, word);
        const maxDist = token.length >= 6 ? 2 : 1;
        if (dist <= maxDist) {
          candidates.add(word);
        }
      }
    }
    expanded.push([...candidates]);
  }
  return { normalized, rawTokens, expanded };
}

const CATEGORY_MAP = [
  { name: 'Chicken Curry Kurtas', url: '/collections/chicken-curry-kurtas', keywords: ['kurta', 'kurtas', 'chikankari', 'chickencurry', 'chicken curry', 'lucknowi', 'mulmul'] },
  { name: 'Kurta & Jewellery Combos', url: '/combos', keywords: ['combo', 'combos', 'gift set', 'gift sets', 'kurta combo', 'set'] },
  { name: 'The Pearl Edit', url: '/collections/pearls', keywords: ['pearl', 'pearls'] },
  { name: 'All Jewellery', url: '/collections/all', keywords: ['jewellery', 'jewelry'] },
  { name: 'Gold & Silver Coins', url: '/coins', keywords: ['coin', 'coins', 'bullion'] },
  { name: 'Gold Coins', url: '/coins/gold', keywords: ['gold coin', 'gold coins'] },
  { name: 'Silver Coins', url: '/coins/silver', keywords: ['silver coin', 'silver coins'] },
  { name: 'Earrings', url: '/collections/earrings', keywords: ['earring', 'earrings', 'drops', 'studs'] },
  { name: 'Necklaces', url: '/collections/necklaces', keywords: ['necklace', 'necklaces', 'collar', 'choker'] },
  { name: 'Rings', url: '/collections/rings', keywords: ['ring', 'rings', 'solitaire'] },
  { name: 'Bracelets', url: '/collections/bracelets', keywords: ['bracelet', 'bracelets', 'cuff', 'bangle'] },
  { name: 'Festive Kurtas', url: '/collections/festive-kurtas', keywords: ['festive', 'festive kurta'] },
  { name: 'Everyday Ethnic Wear', url: '/collections/everyday-ethnic-wear', keywords: ['everyday', 'daily wear'] }
];

const POPULAR_SEARCHES = [
  'Chikankari Kurta',
  'Kurta & Jewellery Combo',
  'Pearl Ring',
  'Gold Necklace',
  'Silver Coin',
  'Lucknowi Ivory Kurta',
  '10 Gram Gold Coin',
  'Nocturne Cuff',
  'Earrings'
];

export async function getSearchIndex(db) {
  const now = Date.now();
  if (cache && (now - cacheTime < CACHE_TTL_MS)) {
    return cache;
  }
  const [prods, coins, combos] = await Promise.all([
    catalogue(db).catch(() => []),
    coinCatalogue(db).catch(() => []),
    comboCatalogue(db).catch(() => [])
  ]);
  cache = { prods, coins, combos, indexedAt: now };
  cacheTime = now;
  return cache;
}

export async function searchCatalogue(db, rawQuery, { maxProducts = 8, maxSuggestions = 5 } = {}) {
  const query = String(rawQuery || '').trim();

  // Empty state handling (< 2 chars)
  if (query.length < 2) {
    return {
      query,
      suggestions: [],
      popularSearches: POPULAR_SEARCHES,
      categories: CATEGORY_MAP.slice(0, 7),
      products: [],
      totalMatches: 0
    };
  }

  const { normalized, rawTokens, expanded } = expandTokens(query);
  const { prods, coins, combos = [] } = await getSearchIndex(db);

  // Score each product & coin
  function scoreItem(item, isCoin) {
    const nameNorm = normalizeText(item.name);
    const skuNorm = normalizeText(item.sku);
    const catNorm = normalizeText(item.category || item.coin_type || '');
    const metalNorm = normalizeText(item.metal || '');
    const purityNorm = normalizeText(item.purity || '');
    const descNorm = normalizeText(item.description || '');
    const finishNorm = normalizeText(item.finish || '');
    const weightNorm = isCoin ? `${item.weight_g} ${item.weight_g}g ${item.weight_g} gram ${item.weight_g} grams` : (item.net_weight_g ? `${item.net_weight_g} ${item.net_weight_g}g` : '');
    const fullText = `${nameNorm} ${skuNorm} ${catNorm} ${metalNorm} ${purityNorm} ${weightNorm} ${finishNorm} ${descNorm}`;

    let score = 0;
    let matchesAllTokens = true;

    // Check SKU exact match
    if (skuNorm === normalized || skuNorm.includes(normalized)) {
      score += 150;
    }

    // Exact full name match
    if (nameNorm === normalized) {
      score += 100;
    } else if (nameNorm.startsWith(normalized)) {
      score += 60;
    } else if (nameNorm.includes(normalized)) {
      score += 40;
    }

    // Token-by-token evaluation
    for (const tokenGroup of expanded) {
      let tokenMatched = false;
      let tokenScore = 0;

      for (const token of tokenGroup) {
        if (nameNorm.includes(token)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 25);
          if (nameNorm.split(' ').some(w => w === token || w.startsWith(token))) {
            tokenScore += 15;
          }
        } else if (catNorm.includes(token)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 20);
        } else if (metalNorm.includes(token) || purityNorm.includes(token)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 20);
        } else if (weightNorm.includes(token)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 30);
        } else if (fullText.includes(token)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 10);
        }
      }

      if (tokenMatched) {
        score += tokenScore;
      } else {
        matchesAllTokens = false;
      }
    }

    if (!matchesAllTokens) return 0;

    // Favor in-stock items slightly
    if (item.stock > 0) score += 5;
    if (item.checkout_available) score += 5;

    return score;
  }

  // Score products
  const scoredProducts = [];
  for (const p of prods) {
    const s = scoreItem(p, false);
    if (s > 0) {
      scoredProducts.push({
        item: {
          id: p.id,
          sku: p.sku,
          product_code: p.product_code,
          name: p.name,
          category: p.category,
          metal: p.metal,
          purity: p.purity,
          price: p.price,
          original_price: p.original_price,
          discount_amount: p.discount_amount,
          thumbnail: p.thumbnail,
          stock: p.stock,
          checkout_available: p.checkout_available,
          url: `/products/${p.slug}`,
          is_coin: false
        },
        score: s
      });
    }
  }

  // Score coins
  const scoredCoins = [];
  for (const c of coins) {
    const s = scoreItem(c, true);
    if (s > 0) {
      scoredCoins.push({
        item: {
          id: c.id,
          sku: c.sku,
          product_code: c.sku,
          name: c.name,
          category: c.category || (c.metal === 'Gold' ? 'Gold Coin' : 'Silver Coin'),
          metal: c.metal,
          purity: c.purity,
          weight_g: c.weight_g,
          price: c.price,
          original_price: c.original_price,
          discount_amount: c.discount_amount,
          thumbnail: c.thumbnail,
          stock: c.stock,
          checkout_available: c.checkout_available,
          url: `/coins/product/${encodeURIComponent(c.sku)}`,
          is_coin: true
        },
        score: s
      });
    }
  }

  // Score combos
  const scoredCombos = [];
  for (const cb of combos) {
    const s = scoreItem(cb, false);
    if (s > 0) {
      scoredCombos.push({
        item: {
          id: cb.id,
          sku: cb.sku,
          product_code: cb.sku,
          name: cb.name,
          category: 'Curated Combo',
          price: cb.price,
          original_price: cb.original_price,
          discount_amount: cb.savings,
          thumbnail: cb.thumbnail,
          stock: cb.stock,
          checkout_available: cb.checkout_available,
          url: `/combos/${cb.slug}`,
          is_combo: true
        },
        score: s + 10 // Slight boost for curated combos on matching queries
      });
    }
  }

  // Combine and sort
  const allScored = [...scoredProducts, ...scoredCoins, ...scoredCombos].sort((a, b) => b.score - a.score);

  // Group jewellery variants by product_code unless exact SKU match
  const deduplicated = [];
  const seenCodes = new Set();
  const isExactSkuSearch = prods.some(p => p.sku.toLowerCase() === normalized) || coins.some(c => c.sku.toLowerCase() === normalized);

  for (const entry of allScored) {
    const code = isExactSkuSearch ? entry.item.sku : (entry.item.product_code || entry.item.sku);
    if (!seenCodes.has(code)) {
      seenCodes.add(code);
      deduplicated.push(entry.item);
    }
  }

  const totalMatches = deduplicated.length;
  const products = deduplicated.slice(0, maxProducts);

  // Matching categories (precise whole-word / token matching)
  const matchingCategories = [];
  const queryLower = normalized;
  const flatTokens = expanded.flat();

  for (const cat of CATEGORY_MAP) {
    let matched = false;
    for (const kw of cat.keywords) {
      if (kw.includes(' ')) {
        // Multi-word keyword (e.g. "gold coin", "silver coin")
        if (queryLower.includes(kw) || kw.includes(queryLower)) {
          matched = true;
          break;
        }
      } else {
        // Single word keyword: must match an exact token or token prefix (length >= 3)
        // Avoid "earrings" matching "ring" by checking equality or token starting with kw
        if (flatTokens.some(t => t === kw || (t.length >= 3 && kw.startsWith(t)))) {
          // If keyword is "ring", make sure token isn't "earring" or "earrings"
          if (kw === 'ring' || kw === 'rings') {
            if (flatTokens.some(t => t.includes('earring'))) continue;
          }
          matched = true;
          break;
        }
      }
    }
    if (matched) {
      matchingCategories.push({
        text: cat.name,
        type: 'category',
        url: cat.url
      });
    }
  }

  // Suggested search phrases
  const suggestedPhrases = [];
  const phraseSet = new Set();

  // Helper to check if a phrase matches all raw tokens in query
  function phraseMatchesQuery(phrase) {
    const pNorm = normalizeText(phrase);
    // Every query token group should have at least one variant in the phrase
    return expanded.every(tokenGroup => tokenGroup.some(t => pNorm.includes(t)));
  }

  // 1. From Popular Searches
  for (const pop of POPULAR_SEARCHES) {
    if (phraseMatchesQuery(pop)) {
      const lower = pop.toLowerCase();
      if (!phraseSet.has(lower) && !matchingCategories.some(c => c.text.toLowerCase() === lower)) {
        phraseSet.add(lower);
        suggestedPhrases.push({ text: pop, type: 'phrase' });
      }
    }
  }

  // 2. From top matching product names
  for (const prod of deduplicated.slice(0, 5)) {
    const pName = prod.name;
    const lower = pName.toLowerCase();
    if (!phraseSet.has(lower) && !matchingCategories.some(c => c.text.toLowerCase() === lower)) {
      phraseSet.add(lower);
      suggestedPhrases.push({ text: pName, type: 'phrase' });
    }
  }

  // Combine categories and phrases for suggestions, capped at maxSuggestions
  const suggestions = [...matchingCategories, ...suggestedPhrases].slice(0, maxSuggestions);

  return {
    query,
    suggestions,
    categories: matchingCategories,
    products,
    totalMatches
  };
}
