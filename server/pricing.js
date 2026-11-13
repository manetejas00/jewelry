import {validationError} from './errors.js';
import {listingThumbnail} from '../src/listing-media.js';
import Decimal from 'decimal.js';
import crypto from 'node:crypto';
import {calculateMargin} from './pricing-rules.js';
import {getAllProductsRatingSummaries} from './reviews.js';

export async function activeOffers(k){
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
     offer:offer?{id:offer.id,name:offer.name,badge_text:offer.badge_text,discount_type:offer.discount_type,discount_value:Number(offer.discount_value)}:null,
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
   offer:offer?{id:offer.id,name:offer.name,badge_text:offer.badge_text,discount_type:offer.discount_type,discount_value:Number(offer.discount_value)}:null,
   mode:'GOLD_LINKED',
   rate_date:rate.effective_date
 };
}

export const todayIndia=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function activeRates(k){const rows=await k('rates').orderBy('source_timestamp','desc').orderBy('id','desc');const result={};for(const r of rows)if(!result[r.purity] && r.effective_date<=todayIndia())result[r.purity]=r;return result;}
export function isFresh(rate,maxAge=Number(process.env.GOLD_MAX_AGE_HOURS||48),time=Date.now()){return !!rate && time-new Date(rate.source_timestamp).getTime()>=-300000 && time-new Date(rate.source_timestamp).getTime()<=maxAge*3600000 && time-new Date(rate.effective_date+'T00:00:00+05:30').getTime()<=maxAge*3600000;}
export const fingerprint=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');

export async function getSilverRate(k){
 const rows=await k('settings').whereIn('key',['SILVER_RATE_PER_GRAM','SILVER_RATE_UPDATED_AT']);
 const values=Object.fromEntries(rows.map(r=>[r.key,r.value]));
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
      offer:offer?{id:offer.id,name:offer.name,badge_text:offer.badge_text,discount_type:offer.discount_type,discount_value:Number(offer.discount_value)}:null,
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
    offer:offer?{id:offer.id,name:offer.name,badge_text:offer.badge_text,discount_type:offer.discount_type,discount_value:Number(offer.discount_value)}:null,
    mode:'METAL_LINKED',
    rate_date:isGold?(rates[c.purity])?.effective_date:todayIndia()
  };
}

export async function coinCatalogue(k, options={}){
  if(!k.schema||!(await k.schema.hasTable('coins')))return [];
  const hasImages=await k.schema.hasTable('product_images').catch(()=>false);
  const hasReviews=await k.schema.hasTable('reviews').catch(()=>false);
  const [coins,rates,silverRate,rules,images,offers,ratings]=await Promise.all([
    k('coins').where({status:'published'}),
    activeRates(k),
    getSilverRate(k),
    k('pricing_rules').orderBy('id','desc').first(),
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
      offer:price?.offer||(offer?{id:offer.id,name:offer.name,badge_text:offer.badge_text,discount_type:offer.discount_type,discount_value:Number(offer.discount_value)}:null),
      breakdown:price,
      checkout_available:c.stock>0&&rateFresh&&Number.isFinite(price?.total),
      rating_average,
      rating_count,
      rating: { average: rating_average, count: rating_count }
    };
  });
}

export async function catalogue(k, options={}){
  const hasImages=await k.schema.hasTable('product_images').catch(()=>false);
  const hasReviews=await k.schema.hasTable('reviews').catch(()=>false);
  const [products,rates,rules,images,offers,ratings]=await Promise.all([
    k('products').where({status:'published'}),
    activeRates(k),
    k('pricing_rules').orderBy('id','desc').first(),
    hasImages?k('product_images')
      .select('id','product_code','sku','role','url','alt_text','sort_order')
      .where(function(){this.whereIn('sku',k('products').select('sku').where({status:'published'}))
        .orWhereIn('product_code',k('products').select('product_code').where({status:'published'}))})
      .orderBy('sort_order','asc').orderBy('id','asc'):[],
    activeOffers(k),
    hasReviews?getAllProductsRatingSummaries(k):new Map()
  ]);
  const imagesByProduct={};
  for(const img of images){
    const key=img.product_code||img.sku;
    if(key){
      if(!imagesByProduct[key])imagesByProduct[key]=[];
      imagesByProduct[key].push(img);
    }
  }
  return products.map(p=>{
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
      offer:price?.offer||(offer?{id:offer.id,name:offer.name,badge_text:offer.badge_text,discount_type:offer.discount_type,discount_value:Number(offer.discount_value)}:null),
      breakdown:price,
      checkout_available:p.stock>0 && Number.isFinite(price?.total) && (p.pricing_mode==='FIXED'||isFresh(rates[p.purity])),
      rating_average,
      rating_count,
      rating: { average: rating_average, count: rating_count }
    };
  });
}

export async function quote(k,items,options={}){
 if(!Array.isArray(items)||!items.length||items.length>50)throw validationError('Your bag is empty or too large');
 if(items.some(i=>!i||typeof i.sku!=='string'||!i.sku||i.sku.length>80))throw validationError('Invalid bag item');
 if(new Set(items.map(i=>i.sku)).size!==items.length)throw validationError('Duplicate bag SKU');
  const [products,coins]=await Promise.all([catalogue(k,options),coinCatalogue(k,options)]);
 const allItems=[...products,...coins];
 let subtotal=0;const lines=[];
 for(const i of items){
   const p=allItems.find(p=>p.sku===i.sku);
   if(!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20)throw validationError('Invalid quantity');
   if(!p||!p.checkout_available||p.stock<i.quantity)throw validationError(`${p?.name||i.sku} is unavailable. Please update your bag.`);
   const line={
     sku:p.sku,
     name:p.name,
     size:p.dimension||p.size||`${p.weight_g}g`,
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
async function pricingContext(k){
  const [rates,rules,offers]=await Promise.all([activeRates(k),k('pricing_rules').orderBy('id','desc').first(),activeOffers(k)]);
  return {rates,rules,offers};
}
export async function pricedProductBySlug(k, slug){
  const row=await k('products').where({slug,status:'published'}).first();
  if(!row)return null;
  const {rates,rules,offers}=await pricingContext(k);
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
  const {rates,rules,offers}=await pricingContext(k);
  const silver=await getSilverRate(k);
  const offer=matchOffer(row,offers);
  let price=null;
  try{price=calculateCoinPrice(row,rates,silver,rules,offer);}catch{}
  const isGold=(row.metal||'').toLowerCase()==='gold';
  const fresh=row.pricing_mode==='FIXED'||(isGold?isFresh(rates[row.purity]):Number(silver)>0);
  return {...row,price:price?.total,checkout_available:row.stock>0&&Number.isFinite(price?.total)&&fresh,description:row.description||row.name};
}
