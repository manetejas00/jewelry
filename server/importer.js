import {validationError} from './errors.js';
import * as XLSX from 'xlsx';
import {parse as csvParse} from 'csv-parse/sync';
import {stringify} from 'csv-stringify/sync';
import Decimal from 'decimal.js';
import {validateCoins,previewCoins,publishCoins} from './coin-imports.js';
import {fingerprint,calculatePrice,activeRates,isFresh,todayIndia} from './pricing.js';
import {STOCK_HOLDING_STATUSES} from './orders.js';
import {now,parse,json,preview} from './db.js';

export function ensureCsv(input) {
  if (!input) return '';
  if (Buffer.isBuffer(input) || (typeof input === 'string' && (input.startsWith('data:application/vnd') || input.startsWith('UEsDB') || input.startsWith('0M8R4')))) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (sheetName) return XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
  }
  return String(input);
}
export const schemas={gold:['supplier','purity','currency','unit','rate','effective_date','source_timestamp'],products:['supplier','product_code','sku','name','category','description','metal','purity','net_weight_g','size','finish','image','pricing_mode','fixed_price','making_flat','making_percent','stone_charge','other_charge','stock','status','source_timestamp'],coins:['supplier','sku','name','metal','coin_type','purity','weight_g','dimension','making_charge','pricing_mode','fixed_price','stock','description','image','status','image_kind','source_timestamp'],kurtas:['supplier','product_code','sku','name','category','description','fabric','craftsmanship','size','color','finish','image','pricing_mode','fixed_price','stock','status','source_timestamp']};
const num=v=>/^\d+(\.\d{1,4})?$/.test(v) && Number(v)<=9999999999;
const timestamp=v=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v)&&!isNaN(Date.parse(v));
const purities=['24K','22K','18K','14K'];
export function validate(kind,text){
 if(kind==='coins')return validateCoins(text,schemas.coins);
 const errors=[];let rows=[];const error=(row,field,value,correction)=>errors.push({row,field,value:String(value??''),correction});
 try{rows=csvParse(text,{columns:headers=>{if(headers.join(',')!==schemas[kind]?.join(','))throw validationError('Headers must exactly match the downloadable template');return headers},skip_empty_lines:true,bom:true,trim:true,max_record_size:100000});}catch(e){return {rows:[],errors:[{row:1,field:'file',value:'CSV',correction:e.message}]};}
 if(!rows.length)error(1,'file','','Add at least one data row');if(rows.length>10000)error(1,'file',rows.length,'Maximum 10,000 rows per batch');
 const seen=new Set();
 rows.forEach((r,i)=>{const n=i+2;for(const f of kind==='gold'?schemas.gold:kind==='kurtas'?['supplier','product_code','sku','name','category','size','pricing_mode','fixed_price','stock','status','source_timestamp']:['supplier','product_code','sku','name','category','metal','pricing_mode','stock','status','source_timestamp'])if(!r[f])error(n,f,r[f],'Supply a value');
 if(!timestamp(r.source_timestamp)||Date.parse(r.source_timestamp)>Date.now()+300000)error(n,'source_timestamp',r.source_timestamp,'Use an ISO UTC source timestamp no later than now');
 if(kind==='gold'){
 if(!purities.includes(r.purity))error(n,'purity',r.purity,'Use 24K, 22K, 18K or 14K');if(r.currency!=='INR')error(n,'currency',r.currency,'Only explicit INR rates are supported; convert with an approved source before importing');if(!['g','10g'].includes(r.unit))error(n,'unit',r.unit,'Use g or 10g');if(!num(r.rate)||Number(r.rate)<=0)error(n,'rate',r.rate,'Use a positive unformatted decimal');if(!/^\d{4}-\d{2}-\d{2}$/.test(r.effective_date)||isNaN(Date.parse(r.effective_date))||new Date(r.effective_date).toISOString().slice(0,10)!==r.effective_date||r.effective_date>todayIndia())error(n,'effective_date',r.effective_date,'Use an effective date YYYY-MM-DD, no later than today');
 }else if(kind==='kurtas'){
 if(r.pricing_mode!=='FIXED')error(n,'pricing_mode',r.pricing_mode,'Use FIXED');
 if(!['published','draft'].includes(r.status))error(n,'status',r.status,'Use published or draft');if(!/^\d+$/.test(r.stock)||Number(r.stock)>100000000)error(n,'stock',r.stock,'Use a non-negative integer stock snapshot');
 if(!num(r.fixed_price)||Number(r.fixed_price)<=0)error(n,'fixed_price',r.fixed_price,'Kurta fixed price must be a positive decimal');
 if(!/^\d+(\.\d{1,2})?$/.test(r.fixed_price))error(n,'fixed_price',r.fixed_price,'Currency allows at most two decimal places');
 if(r.image && ((!/^https:\/\//.test(r.image)&&!/^\/(uploads|assets)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(r.image))||r.image.includes('..')))error(n,'image',r.image,'Use HTTPS or a saved /uploads/ or /assets/ image');
 }else{
 if(!['FIXED','GOLD_LINKED'].includes(r.pricing_mode))error(n,'pricing_mode',r.pricing_mode,'Use FIXED or GOLD_LINKED');
 if(!['published','draft'].includes(r.status))error(n,'status',r.status,'Use published or draft');if(!/^\d+$/.test(r.stock)||Number(r.stock)>100000000)error(n,'stock',r.stock,'Use a non-negative integer stock snapshot');
 for(const f of ['net_weight_g','fixed_price','making_flat','making_percent','stone_charge','other_charge'])if(r[f]!=='' && !num(r[f]))error(n,f,r[f],'Use a non-negative decimal without commas');
 for(const f of ['fixed_price','making_flat','stone_charge','other_charge'])if(r[f]!==''&&!/^\d+(\.\d{1,2})?$/.test(r[f]))error(n,f,r[f],'Currency allows at most two decimal places');
 if(r.net_weight_g!==''&&(!/^\d+(\.\d{1,3})?$/.test(r.net_weight_g)||Number(r.net_weight_g)>999999999))error(n,'net_weight_g',r.net_weight_g,'Weight allows up to three decimal places and at most 999999999 grams');
 if(Number(r.making_percent)>9999)error(n,'making_percent',r.making_percent,'Making percentage exceeds the supported limit');
 if(r.pricing_mode==='FIXED'&&(!num(r.fixed_price)||Number(r.fixed_price)<=0))error(n,'fixed_price',r.fixed_price,'Fixed products need a positive selling price');
 if(r.pricing_mode==='GOLD_LINKED') {if(r.metal.toLowerCase()!=='gold')error(n,'metal',r.metal,'Gold-linked pricing requires gold');if(!purities.includes(r.purity))error(n,'purity',r.purity,'Supply a supported purity-specific gold rate');if(!num(r.net_weight_g)||Number(r.net_weight_g)<=0)error(n,'net_weight_g',r.net_weight_g,'Supply a positive gold weight in grams');if(r.fixed_price!=='')error(n,'fixed_price',r.fixed_price,'Leave empty for gold-linked pricing');}
 if(r.image && ((!/^https:\/\//.test(r.image)&&!/^\/(uploads|assets)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(r.image))||r.image.includes('..')))error(n,'image',r.image,'Use HTTPS or a saved /uploads/ or /assets/ image');
 }
 if(timestamp(r.source_timestamp))r.source_timestamp=new Date(r.source_timestamp).toISOString();
 const key=kind==='gold'?`${r.supplier}:${r.purity}`:r.sku;if(seen.has(key))error(n,kind==='gold'?'purity':'sku',key,'Remove duplicate entries');seen.add(key);
 });return {rows,errors};
}
export function normaliseRate(r){return {...r,original_unit:r.unit,original_rate:r.rate,inr_per_gram:new Decimal(r.rate).div(r.unit==='10g'?10:1).toFixed(4)};}
function productPatch(row,old){const allowed=(process.env.SUPPLIER_OVERWRITE_FIELDS||'stock,fixed_price,net_weight_g,making_flat,stone_charge,other_charge').split(',');const patch={source_timestamp:row.source_timestamp,updated_at:now()};for(const f of allowed)if(schemas.products.includes(f)&&!['sku','supplier','product_code'].includes(f))patch[f]=row[f]===''?null:row[f];return patch;}
export async function previewImport(k,kind,text,staff=null){
 text=ensureCsv(text);
 if(kind==='coins')return previewCoins(k,text,schemas.coins,staff);
 if(!schemas[kind])throw validationError('Unknown import type');const checksum=fingerprint(text);const check=validate(kind,text);const supplier=check.rows[0]?.supplier||'unknown';
 if(!preview&&check.rows.some(r=>r.supplier==='Fictional Preview'))check.errors.push({row:1,field:'supplier',value:'Fictional Preview',correction:'Fictional examples are restricted to test/preview databases'});
 if(check.rows.some(r=>r.supplier!==supplier))check.errors.push({row:1,field:'supplier',value:'mixed',correction:'Use one supplier per batch'});
 const existing=await k('import_batches').where({kind,supplier,checksum}).first();if(existing)return {...existing,summary:parse(existing.summary),errors:await k('import_errors').where({batch_id:existing.id}),duplicate:true};
 const timestamps=check.rows.map(r=>r.source_timestamp).filter(Boolean).sort();const source_timestamp=timestamps[0]||now();
 const last=await k('import_batches').where({kind,supplier,status:'published'}).orderBy('source_timestamp','desc').first();
 if(last && source_timestamp<last.source_timestamp)check.errors.push({row:1,field:'source_timestamp',value:source_timestamp,correction:'Upload a file at least as recent as the latest published source'});
 if(kind==='gold' && Date.now()-Date.parse(source_timestamp)>Number(process.env.GOLD_MAX_AGE_HOURS||48)*3600000)check.errors.push({row:1,field:'source_timestamp',value:source_timestamp,correction:'Supply fresh rates within the configured maximum age'});
 let created=0,updated=0;const changes=[];const rates=await activeRates(k);const rule=await k('pricing_rules').orderBy('id','desc').first();
 if(kind==='products')for(const r of check.rows){const old=await k('products').where({sku:r.sku}).first();if(old&&old.supplier!==r.supplier)check.errors.push({row:check.rows.indexOf(r)+2,field:'supplier',value:r.supplier,correction:'SKU is owned by another supplier; use its mapped supplier'});if(old&&r.source_timestamp<old.source_timestamp)check.errors.push({row:check.rows.indexOf(r)+2,field:'source_timestamp',value:r.source_timestamp,correction:'This SKU already has newer supplier data'});old?updated++:created++;let before=null,after=null;try{before=old?calculatePrice(old,rates[old.purity],rule).total:null;const effective=old?{...old,...productPatch(r,old)}:r;after=calculatePrice(effective,rates[effective.purity],rule).total}catch{}changes.push({sku:r.sku,name:r.name,before,after,stock:r.stock});}
 if(kind==='kurtas')for(const r of check.rows){const old=await k('products').where({sku:r.sku}).first();if(old&&old.supplier!==r.supplier)check.errors.push({row:check.rows.indexOf(r)+2,field:'supplier',value:r.supplier,correction:'SKU is owned by another supplier; use its mapped supplier'});if(old&&r.source_timestamp<old.source_timestamp)check.errors.push({row:check.rows.indexOf(r)+2,field:'source_timestamp',value:r.source_timestamp,correction:'This SKU already has newer supplier data'});old?updated++:created++;let before=null,after=null;try{before=old?calculatePrice(old,null,rule).total:null;const effective={...r,pricing_mode:'FIXED',fixed_price:r.fixed_price};after=calculatePrice(effective,null,rule).total}catch{}changes.push({sku:r.sku,name:r.name,before,after,stock:r.stock});}
 if(kind==='gold')for(const r of check.rows){if(num(r.rate)&&['g','10g'].includes(r.unit)){const rate=normaliseRate(r);if(!isFresh(rate))check.errors.push({row:check.rows.indexOf(r)+2,field:'effective_date',value:r.effective_date,correction:'Rate effective date and source timestamp must both be within the freshness limit'});changes.push({sku:r.purity,before:rates[r.purity]?.inr_per_gram??null,after:rate.inr_per_gram,stock:'—'});created++;}}
 const summary={created,updated,unchanged:0,rejected:check.errors.length,changes};const data={kind,supplier,checksum,source_timestamp,status:check.errors.length?'failed':'staged',summary:json(summary),private_payload:text,created_at:now(),staff_id:staff};
 const [id]=await k('import_batches').insert(data);for(const e of check.errors)await k('import_errors').insert({...e,batch_id:id});return {...data,id,summary,errors:check.errors};
}
export async function publishImport(k,id,staff=null){
 const candidate=await k('import_batches').where({id}).first();if(candidate?.kind==='coins')return publishCoins(k,id,schemas.coins,staff);
 return k.transaction(async t=>{
 const b=await t('import_batches').where({id}).first();if(!b)throw validationError('Batch not found');if(b.status==='published')return {duplicate:true,...parse(b.summary)};if(b.status!=='staged')throw validationError('Correct the rejected CSV and upload again');
 try{await t('import_locks').insert({name:b.kind,acquired_at:now()});}catch{throw validationError('An overlapping import is running. Retry later.');}
 const currentBatch=await t('import_batches').where({id}).forUpdate().first();if(currentBatch.status==='published'){await t('import_locks').where({name:b.kind}).del();return {duplicate:true,...parse(currentBatch.summary)}}
 const last=await t('import_batches').where({kind:b.kind,supplier:b.supplier,status:'published'}).orderBy('source_timestamp','desc').first();if(last && b.source_timestamp<last.source_timestamp)throw validationError('A newer batch has been published; preview a fresh file');
 const {rows,errors}=validate(b.kind,b.private_payload);if(errors.length)throw validationError('Batch is no longer valid');
 if(b.kind==='gold' && Date.now()-Date.parse(b.source_timestamp)>Number(process.env.GOLD_MAX_AGE_HOURS||48)*3600000)throw validationError('Rates became stale before publication');
 let created=0,updated=0,unchanged=0;
 for(const r of rows){if(b.kind==='gold'){const norm=normaliseRate(r);if(!isFresh(norm))throw validationError('Rate effective date is stale');await t('rates').insert({metal:'Gold',staff_id:staff,source_type:'bulk_import',supplier:r.supplier,purity:r.purity,currency:r.currency,original_unit:norm.original_unit,original_rate:norm.original_rate,inr_per_gram:norm.inr_per_gram,effective_date:r.effective_date,source_timestamp:r.source_timestamp,published_at:now(),batch_id:b.id});created++;}else if(b.kind==='kurtas'){
 const old=await t('products').where({sku:r.sku}).forUpdate().first();if(old && r.source_timestamp<old.source_timestamp)throw validationError('SKU has newer data; preview again');
 let slug=String(r.product_code||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'kurta';
 const skuSuffix=String(r.sku).toLowerCase().replace(/[^a-z0-9]+/g,'-');
 if(!slug.includes(skuSuffix))slug=`${slug}-${skuSuffix}`;
 if(await t('products').where({slug}).whereNot({sku:r.sku}).first())slug=`${slug}-${Math.floor(Math.random()*10000)}`;
 const sold=await t('order_items').join('orders','orders.id','order_items.order_id').where('order_items.sku',r.sku).where('orders.created_at','>',r.source_timestamp).whereIn('orders.status',STOCK_HOLDING_STATUSES).sum('order_items.quantity as qty').first();
 const effectiveStock=Math.max(0,Number(r.stock)-Number(sold?.qty||0));
 const row={
  supplier:r.supplier||'Lucknow Heritage Maison',
  product_code:r.product_code,
  sku:r.sku,
  slug,
  name:r.name,
  category:r.category||'Chicken Curry Kurtas',
  is_kurta:true,
  description:r.description||null,
  metal:r.fabric||r.metal||'Pure Mulmul Cotton',
  purity:r.craftsmanship||r.purity||'Handcrafted Lucknowi Chikankari',
  net_weight_g:null,
  size:r.size||'M (38)',
  color:r.color||'Ivory',
  finish:r.finish||'Hand Embroidered',
  image:r.image||`/assets/products/${r.product_code}/hero.webp`,
  pricing_mode:'FIXED',
  fixed_price:String(Number(r.fixed_price).toFixed(2)),
  making_flat:'0.00',
  making_percent:'0.0000',
  stone_charge:'0.00',
  other_charge:'0.00',
  stock:effectiveStock,
  status:r.status==='draft'?'draft':'published',
  source_timestamp:r.source_timestamp,
  updated_at:now()
 };
 if(old){
  const patch={
   name:row.name,
   category:row.category,
   is_kurta:true,
   description:row.description??old.description,
   metal:row.metal,
   purity:row.purity,
   size:row.size,
   color:row.color,
   finish:row.finish,
   image:row.image,
   pricing_mode:'FIXED',
   fixed_price:row.fixed_price,
   stock:row.stock,
   status:row.status,
   source_timestamp:row.source_timestamp,
   updated_at:now()
  };
  const changed=Object.entries(patch).some(([f,v])=>!['source_timestamp','updated_at'].includes(f)&&String(old[f]??'')!==String(v??''));
  await t('products').where({sku:r.sku}).update(patch);
  changed?updated++:unchanged++;
 }else{
  await t('products').insert(row);
  created++;
 }
 await t('supplier_skus').insert({supplier:r.supplier,supplier_sku:r.sku,sku:r.sku}).onConflict(['supplier','supplier_sku']).ignore();
 }else{
 const old=await t('products').where({sku:r.sku}).forUpdate().first();if(old && r.source_timestamp<old.source_timestamp)throw validationError('SKU has newer data; preview again');
 let slug=String(r.product_code||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'piece';if(await t('products').where({slug}).whereNot({sku:r.sku}).first())slug=`${slug}-${String(r.sku).toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;const row={...r,slug,updated_at:now()};for(const f of ['net_weight_g','fixed_price','making_flat','making_percent','stone_charge','other_charge'])row[f]=r[f]===''?null:r[f];
 const sold=await t('order_items').join('orders','orders.id','order_items.order_id').where('order_items.sku',r.sku).where('orders.created_at','>',r.source_timestamp).whereIn('orders.status',STOCK_HOLDING_STATUSES).sum('order_items.quantity as qty').first();row.stock=Math.max(0,Number(r.stock)-Number(sold.qty||0));
 if(old){const patch=productPatch(row,old);const changed=Object.entries(patch).some(([f,v])=>!['source_timestamp','updated_at'].includes(f)&&String(old[f]??'')!==String(v??''));await t('products').where({sku:r.sku}).update(patch);changed?updated++:unchanged++;}else{await t('products').insert(row);created++;}
 await t('supplier_skus').insert({supplier:r.supplier,supplier_sku:r.sku,sku:r.sku}).onConflict(['supplier','supplier_sku']).ignore();
 }}
 if(b.kind==='kurtas'&&process.env.KURTA_INVENTORY_MODE==='full')await t('products').where({supplier:b.supplier,is_kurta:true}).whereNotIn('sku',rows.map(r=>r.sku)).update({stock:0,updated_at:now()});
 if(b.kind==='products'&&process.env.INVENTORY_MODE==='full')await t('products').where({supplier:b.supplier}).whereNotIn('sku',rows.map(r=>r.sku)).update({stock:0,updated_at:now()});
 const summary={...parse(b.summary),created,updated,unchanged,rejected:0};await t('import_batches').where({id}).update({status:'published',published_at:now(),summary:json(summary)});await t('audit').insert({staff_id:staff,action:`publish_${b.kind}`,details:json({batch:id,summary}),created_at:now()});await t('import_locks').where({name:b.kind}).del();return summary;
 },k.client.config.client==='mysql2'?{isolationLevel:'read committed'}:{});
}
export const errorCsv=errors=>stringify(errors,{header:true,columns:['row','field','value','correction'],escape_formulas:true});
export const exportCsv=(kind,rows)=>{if(kind==='gold')return stringify(rows.map(r=>({supplier:r.supplier,purity:r.purity,currency:r.currency,unit:r.original_unit||r.unit,rate:r.original_rate||r.rate,effective_date:r.effective_date,source_timestamp:r.source_timestamp})),{header:true,columns:schemas.gold,escape_formulas:true});if(kind==='coins')return stringify(rows.map(r=>Object.fromEntries(schemas.coins.map(col=>[col,col==='source_timestamp'?now():col==='supplier'?(r[col]||'Merchant'):col==='image_kind'?(r[col]||'photo'):r[col]??'']))),{header:true,columns:schemas.coins,escape_formulas:true});if(kind==='kurtas')return stringify(rows.map(r=>({supplier:r.supplier||'Lucknow Heritage Maison',product_code:r.product_code||'',sku:r.sku,name:r.name,category:r.category||'Chicken Curry Kurtas',description:r.description||'',fabric:r.fabric||r.metal||'Pure Mulmul Cotton',craftsmanship:r.craftsmanship||r.purity||'Handcrafted Lucknowi Chikankari',size:r.size||'M (38)',color:r.color||'Ivory',finish:r.finish||'Hand Embroidered',image:r.image||'',pricing_mode:'FIXED',fixed_price:r.fixed_price!=null?String(r.fixed_price):'',stock:r.stock!=null?String(r.stock):'0',status:r.status||'published',source_timestamp:r.source_timestamp||now()})),{header:true,columns:schemas.kurtas,escape_formulas:true});return stringify(rows.map(r=>Object.fromEntries(schemas.products.map(col=>[col,r[col]??'']))),{header:true,columns:schemas.products,escape_formulas:true});};
export const ordersCsv=rows=>stringify(rows.map(o=>{const c=parse(o.customer);return {order_id:o.id,created_at:o.created_at,status:o.status,payment_mode:o.payment_mode,customer_name:c.name||'',customer_email:c.email||'',customer_phone:c.phone||'',city:c.city||'',pincode:c.pincode||'',address:c.address||'',subtotal:o.subtotal,shipping:o.shipping,total:o.total};}),{header:true,columns:['order_id','created_at','status','payment_mode','customer_name','customer_email','customer_phone','city','pincode','address','subtotal','shipping','total'],escape_formulas:true});
