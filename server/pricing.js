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
export async function catalogue(k){const [products,rates,rules]=await Promise.all([k('products').where({status:'published'}),activeRates(k),k('pricing_rules').orderBy('id','desc').first()]);return products.map(p=>{let price=null;try{price=calculatePrice(p,rates[p.purity],rules)}catch{}return {...p,price:price?.total,breakdown:price,checkout_available:p.stock>0 && (p.pricing_mode==='FIXED'||isFresh(rates[p.purity]))};});}
export async function quote(k,items){
 if(!Array.isArray(items)||!items.length||items.length>50)throw Error('Your bag is empty or too large');
 if(new Set(items.map(i=>i.sku)).size!==items.length)throw Error('Duplicate bag SKU');
 const products=await catalogue(k);let subtotal=0;const lines=[];
 for(const i of items){const p=products.find(p=>p.sku===i.sku);if(!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20)throw Error('Invalid quantity');if(!p||!p.checkout_available||p.stock<i.quantity)throw Error(`${p?.name||i.sku} is unavailable. Please update your bag.`);const line={sku:p.sku,name:p.name,size:p.size,image:p.image,quantity:i.quantity,unit_price:p.price,breakdown:p.breakdown};subtotal+=p.price*i.quantity;lines.push(line);}
 const shipping=subtotal>=Number(process.env.FREE_SHIPPING_INR||25000)?0:Number(process.env.SHIPPING_INR||250);
 const result={lines,subtotal,shipping,total:Number(new Decimal(subtotal).add(shipping))};return {...result,token:fingerprint(result)};
}
