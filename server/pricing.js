import {validationError} from './errors.js';
import {expandCombinedKurtaVariant, kurtaSizeCode} from '../shared/kurta-sizes.js';
import {listingThumbnail} from '../shared/listing-media.js';
import Decimal from 'decimal.js';
import crypto from 'node:crypto';
import {calculateMargin} from './pricing-rules.js';
import {getAllProductsRatingSummaries} from './reviews.js';
import {shareRead} from './read-share.js';

export function activeOffers(k){
  return shareRead(k, 'active-offers', () => readActiveOffers(k));
}
async function readActiveOffers(k){
  try{
    if(!k.schema||!(await k.schema.hasTable('offers')))return [];
    return await k('offers').where({status:'active'}).orderBy('priority','desc').orderBy('id','desc');
  }catch(e){throw e;}
}

export function offerIsCurrent(offer, nowMs=Date.now()){
  if(!offer)return false;
  if(offer.starts_at && Date.parse(offer.starts_at)>nowMs)return false;
  if(offer.ends_at && Date.parse(offer.ends_at)<nowMs)return false;
  return true;
}
export function matchOffer(item, offers=[], code=null){
  const wanted=code?String(code).trim().toUpperCase():'';
  for(const o of offers){
    if(!offerIsCurrent(o))continue;
    const codeRequired=o.code_required===true||o.code_required===1||o.code_required==='1';
    if(codeRequired&&String(o.code||'').trim().toUpperCase()!==wanted)continue;
    const app=o.applies_to;
    if(app==='all')return o;
    const isCoin=Boolean(item.coin_type||(item.metal&&['Gold','Silver'].includes(item.metal)&&item.weight_g&&item.sku?.startsWith('COIN-')));
    if(app==='products'&&!isCoin)return o;
    if(app==='coins'&&isCoin)return o;
    const metal=(item.metal||'').toLowerCase();
    if(app==='gold'&&metal==='gold')return o;
    if(app==='silver'&&metal==='silver')return o;
    if(app==='category'&&o.target_value&&item.category&&item.category.toLowerCase()===o.target_value.toLowerCase())return o;
    if(app==='sku'&&o.target_value&&(item.sku===o.target_value||item.product_code===o.target_value))return o;
  }
  return null;
}
export function pricedOffer(offer, discountAmount){
  if(!offer||!(Number(discountAmount)>0))return null;
  return {id:offer.id,name:offer.name,badge_text:offer.badge_text,discount_type:offer.discount_type,discount_value:Number(offer.discount_value)};
}

export function calculatePrice(p,rate,rule={tax_percent:0,rounding:1,tax_treatment:'exclusive'},offer=null) {
 if(p.pricing_mode==='FIXED'){
   const baseSubtotal=new Decimal(p.fixed_price);
   const margin=calculateMargin(baseSubtotal,rule);
   const fixedPrice=baseSubtotal.add(margin).toNumber();
   let total=fixedPrice;
   let discountAmount=0;
   if(offer){
     if(offer.discount_type==='total_percent'){
       discountAmount=new Decimal(fixedPrice).mul(offer.discount_value).div(100).toNumber();
       total=Math.max(0,fixedPrice-discountAmount);
     }else if(offer.discount_type==='flat_amount'){
       discountAmount=Math.min(fixedPrice,Number(offer.discount_value));
       total=Math.max(0,fixedPrice-discountAmount);
     }
   }
   total=new Decimal(total).toDecimalPlaces(2).toNumber();discountAmount=new Decimal(discountAmount).toDecimalPlaces(2).toNumber();
   return {
     metal:0,rate:0,weight:Number(p.net_weight_g||0),making:0,stone:0,other:0,
     subtotal:total,tax:0,total,
     base_subtotal:baseSubtotal.toNumber(),margin:margin.toNumber(),margin_type:rule.margin_type||'PERCENT',margin_value:Number(rule.margin_value||0),
     original_total:fixedPrice,
     discount_amount:discountAmount,
     offer:pricedOffer(offer, discountAmount),
     mode:'FIXED'
   };
 }
 if(!rate) throw validationError('Approved gold rate unavailable');
 const metal=new Decimal(p.net_weight_g).mul(rate.inr_per_gram);
 const fullMaking=new Decimal(p.making_flat||0).add(metal.mul(p.making_percent||0).div(100));

 // Original without discount
 const baseSubtotal=metal.add(fullMaking).add(p.stone_charge||0).add(p.other_charge||0);
 const margin=calculateMargin(baseSubtotal,rule);
 const origSubtotal=baseSubtotal.add(margin);
 const origTax=rule.tax_treatment==='inclusive'?origSubtotal.sub(origSubtotal.div(new Decimal(1).add(new Decimal(rule.tax_percent||0).div(100)))):origSubtotal.mul(rule.tax_percent||0).div(100);
 const origTotal=(rule.tax_treatment==='inclusive'?origSubtotal:origSubtotal.add(origTax)).div(rule.rounding||1).toDecimalPlaces(0,Decimal.ROUND_HALF_UP).mul(rule.rounding||1);

 let effectiveMaking=fullMaking;
 let discountAmount=new Decimal(0);

 if(offer){
   if(offer.discount_type==='making_percent'){
     const discountOnMaking=fullMaking.mul(offer.discount_value).div(100);
     effectiveMaking=Decimal.max(0,fullMaking.sub(discountOnMaking));
     discountAmount=discountOnMaking;
   }else if(offer.discount_type==='total_percent'){
     discountAmount=origSubtotal.mul(offer.discount_value).div(100);
   }else if(offer.discount_type==='flat_amount'){
     discountAmount=new Decimal(offer.discount_value);
   }
 }

 const subtotal=offer&&offer.discount_type!=='making_percent'
   ? Decimal.max(0,origSubtotal.sub(discountAmount))
   : metal.add(effectiveMaking).add(p.stone_charge||0).add(p.other_charge||0).add(margin);

 const tax=rule.tax_treatment==='inclusive'?subtotal.sub(subtotal.div(new Decimal(1).add(new Decimal(rule.tax_percent||0).div(100)))):subtotal.mul(rule.tax_percent||0).div(100);
 const total=(rule.tax_treatment==='inclusive'?subtotal:subtotal.add(tax)).div(rule.rounding||1).toDecimalPlaces(0,Decimal.ROUND_HALF_UP).mul(rule.rounding||1);

 return {
   metal:metal.toNumber(),
   rate:Number(rate.inr_per_gram),
   weight:Number(p.net_weight_g),
   making:effectiveMaking.toNumber(),
   original_making:fullMaking.toNumber(),
   stone:Number(p.stone_charge||0),
   other:Number(p.other_charge||0),
   base_subtotal:baseSubtotal.toNumber(),margin:margin.toNumber(),margin_type:rule.margin_type||'PERCENT',margin_value:Number(rule.margin_value||0),
   subtotal:subtotal.toNumber(),
   tax:tax.toDecimalPlaces(2).toNumber(),
   total:total.toNumber(),
   original_total:origTotal.toNumber(),
   discount_amount:Math.max(0,origTotal.sub(total).toNumber()),
   offer:pricedOffer(offer, origTotal.sub(total).toNumber()),
   mode:'GOLD_LINKED',
   rate_date:rate.effective_date
 };
}

export const todayIndia=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function activeRates(k){
  return shareRead(k, 'active-rates:' + todayIndia(), () => readActiveRates(k));
}
async function readActiveRates(k){
  const rows=await k('rates').where('effective_date','<=',todayIndia()).orderBy('source_timestamp','desc').orderBy('id','desc').limit(100);
  const result={};
  for(const r of rows){
    if(r.effective_date<=todayIndia()){
      if(!result[r.purity])result[r.purity]=r;
      const mp=`${r.metal||'Gold'}_${r.purity}`;
      if(!result[mp])result[mp]=r;
    }
  }
  return result;
}
export function isFresh(rate,maxAge=Number(process.env.GOLD_MAX_AGE_HOURS||48),time=Date.now()){return !!rate && time-new Date(rate.source_timestamp).getTime()>=-300000 && time-new Date(rate.source_timestamp).getTime()<=maxAge*3600000 && time-new Date(rate.effective_date+'T00:00:00+05:30').getTime()<=maxAge*3600000;}
export const fingerprint=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');

export async function getSilverRate(k){
 const rows=await k('settings').whereIn('key',['SILVER_RATE_PER_GRAM','SILVER_RATE_UPDATED_AT']);
 const values=Object.fromEntries(rows.map(r=>[r.key,r.value]));
 if(values.SILVER_RATE_PER_GRAM && values.SILVER_RATE_UPDATED_AT){
   const rate=Number(values.SILVER_RATE_PER_GRAM),age=Date.now()-Date.parse(values.SILVER_RATE_UPDATED_AT);
   if(Number.isFinite(rate)&&rate>0&&Number.isFinite(age)&&age>=-300000&&age<=Number(process.env.GOLD_MAX_AGE_HOURS||48)*3600000){
     return rate;
   }
 }
 try{
   if(k.schema&&await k.schema.hasTable('rates')){
     const silverRow=await k('rates')
       .where(function(){this.where({metal:'Silver'}).orWhereIn('purity',['999','925']);})
       .andWhere('effective_date','<=',todayIndia())
       .orderBy('source_timestamp','desc')
       .orderBy('id','desc')
       .first();
     if(silverRow && isFresh(silverRow)){
       return Number(silverRow.inr_per_gram);
     }
   }
 }catch{}
 if(process.env.NODE_ENV!=='production'&&!values.SILVER_RATE_PER_GRAM)return 98;
 const rate=Number(values.SILVER_RATE_PER_GRAM),age=Date.now()-Date.parse(values.SILVER_RATE_UPDATED_AT);
 return Number.isFinite(rate)&&rate>0&&Number.isFinite(age)&&age>=-300000&&age<=Number(process.env.GOLD_MAX_AGE_HOURS||48)*3600000?rate:null;
}

export function calculateCoinPrice(c,rates,silverRate=null,rule={tax_percent:0,rounding:1,tax_treatment:'exclusive'},offer=null){
  const weight=Number(c.weight_g||0);
  if(c.pricing_mode==='FIXED'){
    const baseSubtotal=new Decimal(c.fixed_price||0);
    const margin=calculateMargin(baseSubtotal,rule);
    const fixedPrice=baseSubtotal.add(margin).toNumber();
    let total=fixedPrice;
    let discountAmount=0;
    if(offer){
      if(offer.discount_type==='total_percent'){
        discountAmount=new Decimal(fixedPrice).mul(offer.discount_value).div(100).toNumber();
        total=Math.max(0,fixedPrice-discountAmount);
      }else if(offer.discount_type==='flat_amount'){
        discountAmount=Math.min(fixedPrice,Number(offer.discount_value));
        total=Math.max(0,fixedPrice-discountAmount);
      }
    }
    total=new Decimal(total).toDecimalPlaces(2).toNumber();discountAmount=new Decimal(discountAmount).toDecimalPlaces(2).toNumber();
    return {
      metal:0,rate:0,weight,making:0,stone:0,other:0,subtotal:total,tax:0,total,
      base_subtotal:baseSubtotal.toNumber(),margin:margin.toNumber(),margin_type:rule.margin_type||'PERCENT',margin_value:Number(rule.margin_value||0),
     original_total:fixedPrice,discount_amount:discountAmount,
      offer:pricedOffer(offer, discountAmount),
      mode:'FIXED'
    };
  }
  const isGold=(c.metal||'').toLowerCase()==='gold';
  let rate=0;
  if(isGold){
    const r=rates[c.purity];
    if(!r)throw validationError('Approved gold rate unavailable');
    rate=Number(r.inr_per_gram);
  }else{
    rate=Number(silverRate);if(!Number.isFinite(rate)||rate<=0)throw validationError('Approved silver rate unavailable');
  }
  const metal=new Decimal(weight).mul(rate);
  const fullMaking=new Decimal(c.making_charge||0);

  // Original without discount
  const baseSubtotal=metal.add(fullMaking);
  const margin=calculateMargin(baseSubtotal,rule);
  const origSubtotal=baseSubtotal.add(margin);
  const origTax=rule.tax_treatment==='inclusive'?origSubtotal.sub(origSubtotal.div(new Decimal(1).add(new Decimal(rule.tax_percent||0).div(100)))):origSubtotal.mul(rule.tax_percent||0).div(100);
  const origTotal=(rule.tax_treatment==='inclusive'?origSubtotal:origSubtotal.add(origTax)).div(rule.rounding||1).toDecimalPlaces(0,Decimal.ROUND_HALF_UP).mul(rule.rounding||1);

  let effectiveMaking=fullMaking;
  let discountAmount=new Decimal(0);

  if(offer){
    if(offer.discount_type==='making_percent'){
      const discountOnMaking=fullMaking.mul(offer.discount_value).div(100);
      effectiveMaking=Decimal.max(0,fullMaking.sub(discountOnMaking));
      discountAmount=discountOnMaking;
    }else if(offer.discount_type==='total_percent'){
      discountAmount=origSubtotal.mul(offer.discount_value).div(100);
    }else if(offer.discount_type==='flat_amount'){
      discountAmount=new Decimal(offer.discount_value);
    }
  }

  const subtotal=offer&&offer.discount_type!=='making_percent'
    ? Decimal.max(0,origSubtotal.sub(discountAmount))
    : metal.add(effectiveMaking).add(margin);

  const tax=rule.tax_treatment==='inclusive'?subtotal.sub(subtotal.div(new Decimal(1).add(new Decimal(rule.tax_percent||0).div(100)))):subtotal.mul(rule.tax_percent||0).div(100);
  const total=(rule.tax_treatment==='inclusive'?subtotal:subtotal.add(tax)).div(rule.rounding||1).toDecimalPlaces(0,Decimal.ROUND_HALF_UP).mul(rule.rounding||1);

  return {
    metal:metal.toNumber(),
    rate,weight,
    making:effectiveMaking.toNumber(),
    original_making:fullMaking.toNumber(),
    stone:0,other:0,
    base_subtotal:baseSubtotal.toNumber(),margin:margin.toNumber(),margin_type:rule.margin_type||'PERCENT',margin_value:Number(rule.margin_value||0),
   subtotal:subtotal.toNumber(),
    tax:tax.toDecimalPlaces(2).toNumber(),
    total:total.toNumber(),
    original_total:origTotal.toNumber(),
    discount_amount:Math.max(0,origTotal.sub(total).toNumber()),
    offer:pricedOffer(offer, origTotal.sub(total).toNumber()),
    mode:'METAL_LINKED',
    rate_date:isGold?(rates[c.purity])?.effective_date:todayIndia()
  };
}

const emptyPricingRule = catalogue => ({ tax_percent: 0, rounding: 1, tax_treatment: 'exclusive', margin_type: 'PERCENT', margin_value: 0, catalogue: catalogue || null });

export function latestPricingRule(k, catalogue) {
  return shareRead(k, 'pricing-rule:' + (catalogue || 'latest'), () => readLatestPricingRule(k, catalogue));
}

async function readLatestPricingRule(k, catalogue) {
  if (!k?.schema || !(await k.schema.hasTable('pricing_rules').catch(() => false))) return emptyPricingRule(catalogue);
  const hasCatalogue = await k.schema.hasColumn('pricing_rules', 'catalogue').catch(() => false);
  if (hasCatalogue && ['jewelry', 'coin', 'kurta'].includes(catalogue)) {
    const row = await k('pricing_rules').where({ catalogue }).orderBy('id', 'desc').first();
    if (row) return row;
    return emptyPricingRule(catalogue);
  }
  const legacy = await k('pricing_rules').orderBy('id', 'desc').first();
  return legacy || emptyPricingRule(catalogue);
}

export function priceFixedCataloguePiece(amount, rule, offer = null) {
  const base = Number(amount);
  if (!Number.isFinite(base)) return null;
  return calculatePrice({ pricing_mode: 'FIXED', fixed_price: base, net_weight_g: 0 }, null, rule || {}, offer);
}

export function coinCatalogue(k, options={}){
  return shareRead(k, 'coin-catalogue:' + (options.code || ''), () => readCoinCatalogue(k, options));
}
async function readCoinCatalogue(k, options={}){
  if(!k.schema||!(await k.schema.hasTable('coins')))return [];
  const hasImages=await k.schema.hasTable('product_images').catch(()=>false);
  const hasReviews=await k.schema.hasTable('reviews').catch(()=>false);
  const [coins,rates,silverRate,rules,images,offers,ratings]=await Promise.all([
    k('coins').where({status:'published'}),
    activeRates(k),
    getSilverRate(k),
    latestPricingRule(k, 'coin'),
    hasImages?k('product_images')
      .select('id','product_code','sku','role','url','alt_text','sort_order')
      .where(function(){
        const pub=k('coins').select('sku').where({status:'published'});
        this.whereIn('sku',pub).orWhereIn('product_code',pub);
      })
      .orderBy('sort_order','asc').orderBy('id','asc'):[],
    activeOffers(k),
    hasReviews?getAllProductsRatingSummaries(k):new Map()
  ]);
  const imagesBySku={};
  for(const img of images){
    for(const key of [img.sku,img.product_code]){
      if(!key)continue;
      if(!imagesBySku[key])imagesBySku[key]=[];
      imagesBySku[key].push(img);
    }
  }
  return coins.map(c=>{
    const offer=matchOffer(c,offers,options.code);
    let price=null;
    try{price=calculateCoinPrice(c,rates,silverRate,rules,offer);}catch{}
    const isGold=(c.metal||'').toLowerCase()==='gold';
    const rateFresh=c.pricing_mode==='FIXED'||(isGold?isFresh(rates[c.purity]):Number(silverRate)>0);
    const coinImgs=(imagesBySku[c.sku]||[]).filter((img,i,all)=>all.findIndex(other=>other.url===img.url)===i);
    const ratingData=ratings.get(c.sku)||ratings.get(c.id)||null;
    const rating_average=ratingData?ratingData.average:null;
    const rating_count=ratingData?ratingData.count:0;
    return {
      ...c,
      thumbnail:listingThumbnail(c),
      images:coinImgs,
      category:c.coin_type||(isGold?'Gold Coin':'Silver Coin'),
      price:price?.total??null,
      original_price:price?.original_total??null,
      discount_amount:price?.discount_amount??0,
      offer:pricedOffer(price?.offer||offer, price?.discount_amount),
      breakdown:price,
      checkout_available:c.stock>0&&rateFresh&&Number.isFinite(price?.total),
      rating_average,
      rating_count,
      rating: { average: rating_average, count: rating_count }
    };
  });
}

let tableCache = new Map();
async function safeHasTable(k, table) {
  if (k.client?.config?.client === 'mysql2') {
    if (tableCache.has(table)) return tableCache.get(table);
    const has = await k.schema.hasTable(table).catch(() => false);
    tableCache.set(table, has);
    return has;
  }
  return k.schema.hasTable(table).catch(() => false);
}

async function pricingShared(k){
  const [rates, rule, offers, ratings] = await Promise.all([
    activeRates(k),
    latestPricingRule(k, 'jewelry'),
    activeOffers(k).catch(() => []),
    safeHasTable(k, 'reviews').then(has => has ? getAllProductsRatingSummaries(k) : new Map())
  ]);
  return { rates, rule, offers, ratings };
}

export function catalogue(k, options={}){
  return shareRead(k, 'catalogue:' + (options.code || ''), () => readCatalogue(k, options));
}
async function readCatalogue(k, options={}){
  const sharedPromise = pricingShared(k);
  const jewelryPromise = (async () => {
    if (!(await safeHasTable(k, 'jewelries'))) return [];
    const jCount = await k('jewelries').count('* as c').first();
    const countVal = Number(jCount?.c ?? jCount?.['count(*)'] ?? 0);
    if (!countVal) return [];
    const shared = await sharedPromise;
    const { JewelryService } = await import('./modules/jewelry/Services/JewelryService.js');
    const js = new JewelryService(k);
    return js.getPublishedCatalogue({ ...options, shared });
  })();
  const hasImages=await safeHasTable(k, 'product_images');
  const [shared, jewelryItems, products, images]=await Promise.all([
    sharedPromise,
    jewelryPromise,
    // Kurtas have their own catalogue endpoint and must never leak into the
    // jewellery collection, even if a legacy record has a jewellery-like name.
    k('products').where({status:'published'}).where(function(){ 
      this.whereNull('is_kurta').orWhere('is_kurta', false); 
    }).where(function(){
      this.whereNull('category')
        .orWhere(function(){
          this.whereNot('category','like','%Kurta%')
            .whereNot('category','like','%Chikankari%')
            .whereNot('category','like','%Saree%')
            .whereNot('category','like','%Bottom%');
        });
    }),
    hasImages?k('product_images')
      .select('id','product_code','sku','role','url','alt_text','sort_order')
      .where(function(){this.whereIn('sku',k('products').select('sku').where({status:'published'}))
        .orWhereIn('product_code',k('products').select('product_code').where({status:'published'}))})
      .orderBy('sort_order','asc').orderBy('id','asc'):[]
  ]);
  const {rates, rule: rules, offers, ratings} = shared;
  const imagesByProduct={};
  for(const img of images){
    const key=img.product_code||img.sku;
    if(key){
      if(!imagesByProduct[key])imagesByProduct[key]=[];
      imagesByProduct[key].push(img);
    }
  }
  const legacyMapped = products.map(p=>{
    const offer=matchOffer(p,offers,options.code);
    let price=null;
    try{price=calculatePrice(p,rates[p.purity],rules,offer)}catch{}
    const prodImages=[...(imagesByProduct[p.sku]||[]),...(imagesByProduct[p.product_code]||[])].filter((img,i,all)=>all.findIndex(other=>other.url===img.url)===i);
    const ratingData=ratings.get(p.product_code)||ratings.get(p.id)||null;
    const rating_average=ratingData?ratingData.average:null;
    const rating_count=ratingData?ratingData.count:0;
    return {
      ...p,
      thumbnail:listingThumbnail(p),
      images:prodImages,
      price:price?.total,
      original_price:price?.original_total??null,
      discount_amount:price?.discount_amount??0,
      offer:pricedOffer(price?.offer||offer, price?.discount_amount),
      breakdown:price,
      checkout_available:p.stock>0 && Number.isFinite(price?.total) && (p.pricing_mode==='FIXED'||isFresh(rates[p.purity])),
      rating_average,
      rating_count,
      rating: { average: rating_average, count: rating_count }
    };
  });
  if (jewelryItems.length > 0) {
    const jSkus = new Set(jewelryItems.map(j => j.sku));
    const extra = legacyMapped.filter(p => !jSkus.has(p.sku));
    return [...jewelryItems, ...extra];
  }
  return legacyMapped;
}

export async function quote(k,items,options={}){
 if(!Array.isArray(items)||!items.length||items.length>50)throw validationError('Your bag is empty or too large');
 if(items.some(i=>!i||typeof i.sku!=='string'||!i.sku||i.sku.length>80))throw validationError('Invalid bag item');
 if(new Set(items.map(i=>i.sku)).size!==items.length)throw validationError('Duplicate bag SKU');
  const [products,coins]=await Promise.all([catalogue(k,options),coinCatalogue(k,options)]);
  let kurtaVariants = [];
  try {
    if (k.schema && await k.schema.hasTable('kurta_variants')) {
      const hasParents = await k.schema.hasTable('kurtas');
      const vars = hasParents
        ? await k('kurta_variants')
          .leftJoin('kurtas', 'kurtas.id', 'kurta_variants.kurta_id')
          .where('kurta_variants.status', 'published')
          .select('kurta_variants.*', 'kurtas.name as kurta_name', 'kurtas.slug as kurta_slug')
        : await k('kurta_variants').where({ status: 'published' });
      const [rule, offers] = await Promise.all([latestPricingRule(k, 'kurta'), activeOffers(k).catch(() => [])]);
      const sized = vars.flatMap(v => expandCombinedKurtaVariant({
        ...v,
        name: v.name || v.kurta_name,
        slug: v.kurta_slug || v.slug
      }, { slug: v.kurta_slug || v.slug }));
      kurtaVariants = sized.map(v => {
        const offer = matchOffer(v, offers, options.code);
        const priced = priceFixedCataloguePiece(v.price ?? v.fixed_price ?? 0, rule, offer);
        const total = priced?.total ?? (v.price != null ? Number(v.price) : Number(v.fixed_price || 0));
        return {
          ...v,
          dimension: v.size,
          size: v.size,
          image: v.image,
          checkout_available: Number(v.stock) > 0 && Number.isFinite(total),
          price: total,
          original_price: priced?.original_total ?? null,
          discount_amount: priced?.discount_amount ?? 0,
          offer: priced?.offer || null,
          breakdown: priced || { total, mode: 'FIXED' }
        };
      });
    }
  } catch {}
  const catalogueItems = products.flatMap(item => item.is_kurta ? expandCombinedKurtaVariant(item) : [item]);
  const allItems=[...kurtaVariants,...catalogueItems,...coins];
  let subtotal=0;const lines=[];
  for(const i of items){
    const matches = allItems.filter(item => item.sku === i.sku);
    const p = matches.find(item => kurtaSizeCode(item.size)) || matches[0];
    if(!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20)throw validationError('Invalid quantity');
    if(!p||!p.checkout_available||p.stock<i.quantity)throw validationError(`${p?.name||i.sku} is unavailable. Please update your bag.`);
    const line={
      sku:p.sku,
      name:p.name,
      size:p.dimension||p.size||`${p.weight_g||'Standard'}`,
     image:p.image,
     quantity:i.quantity,
     unit_price:p.price,
     original_price:p.original_price,
     discount_amount:p.discount_amount,
     offer:p.offer,
     breakdown:p.breakdown
   };
   subtotal=new Decimal(subtotal).add(new Decimal(p.price).mul(i.quantity)).toDecimalPlaces(2).toNumber();
   lines.push(line);
 }
 const shipping=subtotal>=Number(process.env.FREE_SHIPPING_INR||25000)?0:Number(process.env.SHIPPING_INR||250);
 const result={lines,subtotal,shipping,total:Number(new Decimal(subtotal).add(shipping))};
 return {...result,token:fingerprint(result)};
}
async function pricingContext(k, catalogue){
  const [rates,rules,offers]=await Promise.all([activeRates(k),latestPricingRule(k, catalogue),activeOffers(k)]);
  return {rates,rules,offers};
}
export async function pricedProductBySlug(k, slug){
  const row=await k('products').where({slug,status:'published'}).first();
  if(!row)return null;
  const {rates,rules,offers}=await pricingContext(k, 'jewelry');
  const offer=matchOffer(row,offers);
  let price=null;
  try{price=calculatePrice(row,rates[row.purity],rules,offer);}catch{}
  const fresh=row.pricing_mode==='FIXED'||isFresh(rates[row.purity]);
  return {...row,price:price?.total,checkout_available:row.stock>0&&Number.isFinite(price?.total)&&fresh};
}
export async function pricedCoinBySku(k, sku){
  if(!await k.schema.hasTable('coins'))return null;
  const row=await k('coins').where({sku,status:'published'}).first();
  if(!row)return null;
  const {rates,rules,offers}=await pricingContext(k, 'coin');
  const silver=await getSilverRate(k);
  const offer=matchOffer(row,offers);
  let price=null;
  try{price=calculateCoinPrice(row,rates,silver,rules,offer);}catch{}
  const isGold=(row.metal||'').toLowerCase()==='gold';
  const fresh=row.pricing_mode==='FIXED'||(isGold?isFresh(rates[row.purity]):Number(silver)>0);
  return {...row,price:price?.total,checkout_available:row.stock>0&&Number.isFinite(price?.total)&&fresh,description:row.description||row.name};
}

const PREVIEW_ROW_LIMIT = 80;
const PREVIEW_FIELDS = {
  products: ['sku','name','product_code','category','metal','purity','pricing_mode','fixed_price','net_weight_g','making_flat','making_percent','stone_charge','other_charge','is_kurta'],
  jewelries: ['sku','name','product_code','category','metal','purity','pricing_mode','fixed_price','net_weight_g','making_charges','making_percent','stone_charge','other_charge'],
  coins: ['sku','name','category','metal','purity','coin_type','pricing_mode','fixed_price','weight_g','making_charge'],
  kurtas: ['sku','name','product_code','category','pricing_mode','fixed_price','price']
};

async function slimRows(k, table, wanted) {
  if (!await k.schema.hasTable(table)) return [];
  const info = await k(table).columnInfo();
  const columns = wanted.filter(name => info[name]);
  if (!columns.includes('sku') && !columns.includes('name')) return [];
  return k(table).select(columns);
}

function quotedTotal(item, rates, silver, rule, offer) {
  if (item.kind === 'Coin') return calculateCoinPrice(item, rates, silver, rule, offer);
  return calculatePrice(item, item.kind === 'Kurta' ? null : rates[item.purity], rule, offer);
}

export async function previewPricingChanges(k, rule) {
  const catalogue = ['jewelry', 'coin', 'kurta'].includes(rule?.catalogue) ? rule.catalogue : 'jewelry';
  const [rates, silver, offers, current, products, jewelries, coins, kurtas] = await Promise.all([
    activeRates(k),
    getSilverRate(k),
    activeOffers(k),
    latestPricingRule(k, catalogue),
    catalogue === 'jewelry' ? slimRows(k, 'products', PREVIEW_FIELDS.products) : [],
    catalogue === 'jewelry' ? slimRows(k, 'jewelries', PREVIEW_FIELDS.jewelries) : [],
    catalogue === 'coin' ? slimRows(k, 'coins', PREVIEW_FIELDS.coins) : [],
    catalogue === 'kurta' ? slimRows(k, 'kurtas', PREVIEW_FIELDS.kurtas) : []
  ]);
  const seen = new Set();
  const items = [];
  const add = item => {
    const key = `${item.kind}:${item.sku || item.product_code || item.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };
  for (const row of jewelries) add({ ...row, kind: 'Jewellery', making_flat: row.making_flat ?? row.making_charges ?? 0 });
  for (const row of coins) add({ ...row, kind: 'Coin' });
  for (const row of kurtas) add({ ...row, kind: 'Kurta', pricing_mode: 'FIXED', fixed_price: row.fixed_price ?? row.price ?? 0 });
  for (const row of products) {
    if (row.is_kurta === 1 || row.is_kurta === true) continue;
    add({ ...row, kind: 'Jewellery' });
  }

  const baseline = current || { tax_percent: 0, rounding: 1, tax_treatment: 'exclusive', margin_type: 'PERCENT', margin_value: 0 };
  const changes = [];
  let changed = 0, unchanged = 0, awaiting = 0;
  for (const item of items) {
    const offer = matchOffer(item, offers);
    let before = null, after = null, margin = null, warning = null;
    try {
      before = quotedTotal(item, rates, silver, baseline, offer).total;
      const next = quotedTotal(item, rates, silver, rule, offer);
      after = next.total;
      margin = next.margin;
    } catch {
      warning = 'Awaiting an approved metal rate';
      awaiting += 1;
    }
    if (!warning && before === after) unchanged += 1;
    else if (!warning) changed += 1;
    if ((warning || before !== after) && changes.length < PREVIEW_ROW_LIMIT) {
      changes.push({ sku: item.sku, name: item.name, kind: item.kind, before, after, margin, warning });
    }
  }
  return {
    summary: { compared: items.length, changed, unchanged, awaiting, shown: changes.length },
    changes
  };
}
