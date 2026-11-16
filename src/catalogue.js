export const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2,minimumFractionDigits:0}).format(v||0);

const kurtaCategories = ['kurtas', 'kurta', 'chicken curry kurtas', 'chicken curry kurtas for women'];

export function isKurtaPiece(item) {
  return Boolean(item?.is_kurta) || kurtaCategories.includes(String(item?.category || '').toLowerCase());
}

export function isCoinPiece(item) {
  return Boolean(item?.is_coin || item?.coin_type) || String(item?.sku || '').startsWith('COIN-');
}

export function catalogueKind(item) {
  if (isCoinPiece(item)) return 'coin';
  if (isKurtaPiece(item)) return 'kurta';
  return 'jewelry';
}

export function saveId(item) {
  if (!item) return '';
  if (isCoinPiece(item)) return item.sku || item.product_code || '';
  return item.product_code || item.sku || '';
}

function matchesSavedKey(item, key) {
  if (!item || !key) return false;
  if (saveId(item) === key || item.sku === key || item.product_code === key || item.slug === key) return true;
  return (item.variants || []).some(variant => variant?.sku === key || variant?.product_code === key);
}

export function savedCatalogue({products = [], kurtas = [], coins = [], saved = []} = {}) {
  const wanted = saved.filter(Boolean);
  if (!wanted.length) return [];
  const keys = new Set(wanted);
  const jewelry = grouped(products.filter(item => !isKurtaPiece(item) && !isCoinPiece(item) && keys.has(saveId(item))));
  const kurtaCards = kurtas.filter(item => wanted.some(key => matchesSavedKey(item, key))).map(item => ({...item, is_kurta: true}));
  const coinCards = coins.filter(item => wanted.some(key => matchesSavedKey(item, key))).map(item => ({...item, is_coin: true}));
  const pool = [...jewelry, ...kurtaCards, ...coinCards];
  const seen = new Set();
  const ordered = [];
  for (const key of wanted) {
    const item = pool.find(piece => matchesSavedKey(piece, key));
    const id = saveId(item);
    if (!item || !id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(item);
  }
  return ordered;
}

export const grouped=products=>[...products.reduce((map,p)=>{
  const old=map.get(p.product_code);
  const curP=p.price!==null&&p.price!==undefined?Number(p.price):null;
  const isGoldLinked=p.pricing_mode==='GOLD_LINKED'||old?.pricing_mode==='GOLD_LINKED';
  const offer=p.offer||old?.offer;
  const originalPrice=p.original_price||old?.original_price;
  const discountAmount=p.discount_amount||old?.discount_amount;
  if(!old){
    map.set(p.product_code,{...p,minPrice:curP,maxPrice:curP,pricing_mode:p.pricing_mode,offer,original_price:originalPrice,discount_amount:discountAmount});
  }else{
    const minP=Math.min(old.minPrice??Infinity,curP??Infinity);
    const maxP=Math.max(old.maxPrice??-Infinity,curP??-Infinity);
    const keepNew=(p.stock>0&&old.stock===0)||(Boolean(p.stock>0)===Boolean(old.stock>0)&&p.price<old.price);
    const rep=keepNew?{...p}:{...old};
    rep.minPrice=minP===Infinity?null:minP;
    rep.maxPrice=maxP===-Infinity?null:maxP;
    if(isGoldLinked)rep.pricing_mode='GOLD_LINKED';
    // Price and discount must come from the same displayed variant.
    rep.offer=rep.offer||null;
    map.set(p.product_code,rep);
  }
  return map;
},new Map()).values()];
