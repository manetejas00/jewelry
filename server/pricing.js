import Decimal from 'decimal.js';
import crypto from 'node:crypto';
export function calculatePrice(p,rate,rule={tax_percent:0,rounding:1,tax_treatment:'exclusive'}) {
 if(p.pricing_mode==='FIXED')return {metal:0,rate:0,weight:Number(p.net_weight_g||0),making:0,stone:0,other:0,subtotal:Number(p.fixed_price),tax:0,total:Number(p.fixed_price),mode:'FIXED'};
 if(!rate) throw Error('Approved gold rate unavailable');
 const metal=new Decimal(p.net_weight_g).mul(rate.inr_per_gram);
 const making=new Decimal(p.making_flat||0).add(metal.mul(p.making_percent||0).div(100));
 const subtotal=metal.add(making).add(p.stone_charge||0).add(p.other_charge||0);
 const tax=rule.tax_treatment==='inclusive'?subtotal.sub(subtotal.div(new Decimal(1).add(new Decimal(rule.tax_percent||0).div(100)))):subtotal.mul(rule.tax_percent||0).div(100);
 const total=(rule.tax_treatment==='inclusive'?subtotal:subtotal.add(tax)).div(rule.rounding||1).toDecimalPlaces(0,Decimal.ROUND_HALF_UP).mul(rule.rounding||1);
 return {metal:metal.toNumber(),rate:Number(rate.inr_per_gram),weight:Number(p.net_weight_g),making:making.toNumber(),stone:Number(p.stone_charge||0),other:Number(p.other_charge||0),subtotal:subtotal.toNumber(),tax:tax.toDecimalPlaces(2).toNumber(),total:total.toNumber(),mode:'GOLD_LINKED',rate_date:rate.effective_date};
}
export const todayIndia=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function activeRates(k){const rows=await k('rates').orderBy('source_timestamp','desc').orderBy('id','desc');const result={};for(const r of rows)if(!result[r.purity] && r.effective_date<=todayIndia())result[r.purity]=r;return result;}
export function isFresh(rate,maxAge=Number(process.env.GOLD_MAX_AGE_HOURS||48),time=Date.now()){return !!rate && time-new Date(rate.source_timestamp).getTime()<=maxAge*3600000 && time-new Date(rate.effective_date+'T00:00:00+05:30').getTime()<=maxAge*3600000;}
export const fingerprint=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');

export async function getSilverRate(k){
  try{
    const row=await k('settings').where({key:'SILVER_RATE_PER_GRAM'}).first();
    return row?Number(row.value):98.00;
  }catch{
    return 98.00;
  }
}

export function calculateCoinPrice(c,rates,silverRate=98,rule={tax_percent:0,rounding:1,tax_treatment:'exclusive'}){
  const weight=Number(c.weight_g||0);
  if(c.pricing_mode==='FIXED'){
    return {metal:0,rate:0,weight,making:0,stone:0,other:0,subtotal:Number(c.fixed_price||0),tax:0,total:Number(c.fixed_price||0),mode:'FIXED'};
  }
  const isGold=(c.metal||'').toLowerCase()==='gold';
  let rate=0;
  if(isGold){
    const r=rates[c.purity]||rates['24K'];
    if(!r)throw Error('Approved gold rate unavailable');
    rate=Number(r.inr_per_gram);
  }else{
    rate=Number(silverRate||98);
  }
  const metal=new Decimal(weight).mul(rate);
  const making=new Decimal(c.making_charge||0);
  const subtotal=metal.add(making);
  const tax=rule.tax_treatment==='inclusive'?subtotal.sub(subtotal.div(new Decimal(1).add(new Decimal(rule.tax_percent||0).div(100)))):subtotal.mul(rule.tax_percent||0).div(100);
  const total=(rule.tax_treatment==='inclusive'?subtotal:subtotal.add(tax)).div(rule.rounding||1).toDecimalPlaces(0,Decimal.ROUND_HALF_UP).mul(rule.rounding||1);
  return {metal:metal.toNumber(),rate,weight,making:making.toNumber(),stone:0,other:0,subtotal:subtotal.toNumber(),tax:tax.toDecimalPlaces(2).toNumber(),total:total.toNumber(),mode:'METAL_LINKED',rate_date:isGold?(rates[c.purity]||rates['24K'])?.effective_date:todayIndia()};
}

export async function coinCatalogue(k){
  if(!k.schema||!(await k.schema.hasTable('coins')))return [];
  const [coins,rates,silverRate,rules]=await Promise.all([k('coins').where({status:'published'}),activeRates(k),getSilverRate(k),k('pricing_rules').orderBy('id','desc').first()]);
  return coins.map(c=>{
    let price=null;
    try{price=calculateCoinPrice(c,rates,silverRate,rules);}catch{}
    const isGold=(c.metal||'').toLowerCase()==='gold';
    const rateFresh=isGold?(c.pricing_mode==='FIXED'||isFresh(rates[c.purity]||rates['24K'])):true;
    return {...c,category:c.coin_type||(isGold?'Gold Coin':'Silver Coin'),price:price?.total??null,breakdown:price,checkout_available:c.stock>0&&rateFresh};
  });
}

export async function catalogue(k){
  const hasImages=await k.schema.hasTable('product_images').catch(()=>false);
  const [products,rates,rules,images]=await Promise.all([
    k('products').where({status:'published'}),
    activeRates(k),
    k('pricing_rules').orderBy('id','desc').first(),
    hasImages?k('product_images').orderBy('sort_order','asc').orderBy('id','asc'):[]
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
    let price=null;
    try{price=calculatePrice(p,rates[p.purity],rules)}catch{}
    const prodImages=imagesByProduct[p.product_code]||imagesByProduct[p.sku]||[];
    return {
      ...p,
      images:prodImages,
      price:price?.total,
      breakdown:price,
      checkout_available:p.stock>0 && (p.pricing_mode==='FIXED'||isFresh(rates[p.purity]))
    };
  });
}
export async function quote(k,items){
 if(!Array.isArray(items)||!items.length||items.length>50)throw Error('Your bag is empty or too large');
 if(new Set(items.map(i=>i.sku)).size!==items.length)throw Error('Duplicate bag SKU');
 const [products,coins]=await Promise.all([catalogue(k),coinCatalogue(k)]);
 const allItems=[...products,...coins];
 let subtotal=0;const lines=[];
 for(const i of items){const p=allItems.find(p=>p.sku===i.sku);if(!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20)throw Error('Invalid quantity');if(!p||!p.checkout_available||p.stock<i.quantity)throw Error(`${p?.name||i.sku} is unavailable. Please update your bag.`);const line={sku:p.sku,name:p.name,size:p.dimension||p.size||`${p.weight_g}g`,image:p.image,quantity:i.quantity,unit_price:p.price,breakdown:p.breakdown};subtotal+=p.price*i.quantity;lines.push(line);}
 const shipping=subtotal>=Number(process.env.FREE_SHIPPING_INR||25000)?0:Number(process.env.SHIPPING_INR||250);
 const result={lines,subtotal,shipping,total:Number(new Decimal(subtotal).add(shipping))};return {...result,token:fingerprint(result)};
}
