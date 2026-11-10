import {validationError} from './errors.js';
import {parse as csvParse} from 'csv-parse/sync';
import {now,json,parse,preview} from './db.js';
import {fingerprint,calculateCoinPrice,activeRates,getSilverRate,activeOffers,matchOffer} from './pricing.js';
const decimal=(v,places=2)=>new RegExp(`^\\d+(\\.\\d{1,${places}})?$`).test(v)&&Number(v)<=999999999;
export function validateCoins(text,headers){
 const errors=[];let rows=[];const bad=(row,field,value,correction)=>errors.push({row,field,value:String(value??''),correction});
 try{rows=csvParse(text,{columns:h=>{if(h.join(',')!==headers.join(','))throw validationError('Headers must exactly match the coin template');return h;},bom:true,trim:true,skip_empty_lines:true,max_record_size:100000});}catch(e){return {rows:[],errors:[{row:1,field:'file',value:'CSV',correction:e.message}]};}
 if(!rows.length||rows.length>10000)bad(1,'file',rows.length,'Supply between 1 and 10,000 coin rows');
 const seen=new Set();
 rows.forEach((r,i)=>{const n=i+2;r.sku=(r.sku||'').toUpperCase();for(const f of ['supplier','sku','name','metal','coin_type','purity','weight_g','making_charge','pricing_mode','stock','status','image_kind','source_timestamp'])if(!r[f])bad(n,f,r[f],'Supply the required value');
 if(!/^[A-Z0-9][A-Z0-9._-]{0,79}$/.test(r.sku))bad(n,'sku',r.sku,'Use a stable SKU with letters, numbers, dots, hyphens or underscores');
 if(seen.has(r.sku))bad(n,'sku',r.sku,'Remove the duplicate SKU');seen.add(r.sku);
 for(const [f,max] of [['supplier',100],['name',250],['coin_type',100],['dimension',100],['description',5000],['image',2000]])if(r[f]?.length>max)bad(n,f,r[f].slice(0,100),`Use at most ${max} characters`);
 if(!['Gold','Silver'].includes(r.metal))bad(n,'metal',r.metal,'Use Gold or Silver');
 const purities=r.metal==='Gold'?['24K','22K','18K','14K']:['999','999.9','925'];if(!purities.includes(r.purity))bad(n,'purity',r.purity,'Use a supported purity for the selected metal');
 if(!decimal(r.weight_g,3)||Number(r.weight_g)<=0||Number(r.weight_g)>9999999)bad(n,'weight_g',r.weight_g,'Use positive grams, up to 3 decimal places; do not append g');
 if(!decimal(r.making_charge))bad(n,'making_charge',r.making_charge,'Use a non-negative INR amount with up to 2 decimal places');
 if(!/^\d+$/.test(r.stock)||Number(r.stock)>100000000)bad(n,'stock',r.stock,'Use a non-negative whole-number stock snapshot');
 if(!['METAL_LINKED','FIXED'].includes(r.pricing_mode))bad(n,'pricing_mode',r.pricing_mode,'Use METAL_LINKED or FIXED');
 if(r.pricing_mode==='FIXED'&&(!decimal(r.fixed_price)||Number(r.fixed_price)<=0))bad(n,'fixed_price',r.fixed_price,'Fixed pricing needs a positive INR selling price');
 if(r.pricing_mode==='METAL_LINKED'&&r.fixed_price!=='')bad(n,'fixed_price',r.fixed_price,'Leave blank for metal-linked pricing');
 if(!['published','draft'].includes(r.status))bad(n,'status',r.status,'Use published or draft');
 if(!['photo','illustration'].includes(r.image_kind))bad(n,'image_kind',r.image_kind,'Use photo or illustration');
 if(r.image&&!/^https:\/\//.test(r.image)&&!/^\/(uploads|assets)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(r.image))bad(n,'image',r.image,'Use an HTTPS URL or an image from /uploads/ or /assets/');
 if(r.image?.includes('..'))bad(n,'image',r.image,'Use a direct image reference without parent-directory segments');
 const stamp=Date.parse(r.source_timestamp);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(r.source_timestamp)||!Number.isFinite(stamp)||stamp>Date.now()+300000)bad(n,'source_timestamp',r.source_timestamp,'Use the UTC source time as YYYY-MM-DDTHH:mm:ss.sssZ, no later than now');else r.source_timestamp=new Date(stamp).toISOString();
 });return {rows,errors};
}
async function checkOwnership(k,rows){const errors=[];const products=new Set((await k('products').select('sku')).map(p=>p.sku.toUpperCase()));for(const [i,r]of rows.entries()){const old=await k('coins').where({sku:r.sku}).first();let correction;if(products.has(r.sku))correction='SKU already belongs to jewellery; choose a unique coin SKU';else if(old&&old.supplier!==r.supplier)correction='Keep the existing supplier for this SKU';else if(old?.source_timestamp&&r.source_timestamp<old.source_timestamp)correction='Use a snapshot at least as recent as this coin’s last source';if(correction)errors.push({row:i+2,field:products.has(r.sku)?'sku':'source_timestamp',value:r.sku,correction});}return errors;}
export async function previewCoins(k,text,headers,staff){
 const checked=validateCoins(text,headers),supplier=checked.rows[0]?.supplier||'unknown',checksum=fingerprint(text);
 if(!preview&&supplier==='Fictional Preview')checked.errors.push({row:1,field:'supplier',value:supplier,correction:'Fictional examples are restricted to preview'});
 if(checked.rows.some(r=>r.supplier!==supplier))checked.errors.push({row:1,field:'supplier',value:'mixed',correction:'Use one supplier per file'});
 const oldBatch=await k('import_batches').where({kind:'coins',supplier,checksum}).first();if(oldBatch)return {...oldBatch,summary:parse(oldBatch.summary),errors:await k('import_errors').where({batch_id:oldBatch.id}),duplicate:true};
 checked.errors.push(...await checkOwnership(k,checked.rows));
 const [rates,silver,rule,offers]=await Promise.all([activeRates(k),getSilverRate(k),k('pricing_rules').orderBy('id','desc').first(),activeOffers(k)]);
 let created=0,updated=0;const changes=[];
 for(const r of checked.rows){const old=await k('coins').where({sku:r.sku}).first();old?updated++:created++;let before=null,after=null;try{if(old)before=calculateCoinPrice(old,rates,silver,rule,matchOffer(old,offers)).total;after=calculateCoinPrice(r,rates,silver,rule,matchOffer(r,offers)).total;}catch{}changes.push({sku:r.sku,name:r.name,before,after,stock:r.stock});}
 const summary={created,updated,unchanged:0,rejected:checked.errors.length,changes};const source_timestamp=checked.rows.map(r=>r.source_timestamp).filter(Boolean).sort()[0]||now();
 const data={kind:'coins',supplier,checksum,source_timestamp,status:checked.errors.length?'failed':'staged',summary:json(summary),private_payload:text,created_at:now(),staff_id:staff};
 const [id]=await k('import_batches').insert(data);for(const e of checked.errors)await k('import_errors').insert({...e,batch_id:id});return {...data,id,summary,errors:checked.errors};
}
export async function publishCoins(k,id,headers,staff){return k.transaction(async t=>{
 try{await t('import_locks').insert({name:'coins',acquired_at:now()});}catch{throw validationError('An overlapping coin import is running; retry later');}
 const b=await t('import_batches').where({id}).forUpdate().first();if(!b||b.kind!=='coins')throw validationError('Coin batch not found');if(b.status==='published'){await t('import_locks').where({name:'coins'}).del();return {duplicate:true,...parse(b.summary)};}if(b.status!=='staged')throw validationError('Correct the CSV and upload it again');
 const checked=validateCoins(b.private_payload,headers);checked.errors.push(...await checkOwnership(t,checked.rows));if(checked.errors.length)throw validationError('Coin data changed since preview. Correct the CSV and preview again.');
 let created=0,updated=0,unchanged=0;
 for(const r of checked.rows){const old=await t('coins').where({sku:r.sku}).forUpdate().first();if(old?.source_timestamp&&r.source_timestamp<old.source_timestamp)throw validationError('A newer coin snapshot has been published');
 const sold=await t('order_items').join('orders','orders.id','order_items.order_id').where('order_items.sku',r.sku).where('orders.created_at','>',r.source_timestamp).whereIn('orders.status',['paid','confirmed','placed']).sum('order_items.quantity as qty').first();
 const row={...r,stock:Math.max(0,Number(r.stock)-Number(sold.qty||0)),fixed_price:r.fixed_price===''?null:r.fixed_price,updated_at:now()};
 if(old){const changed=Object.entries(row).some(([f,v])=>!['source_timestamp','updated_at'].includes(f)&&String(old[f]??'')!==String(v??''));await t('coins').where({sku:r.sku}).update(row);changed?updated++:unchanged++;}else{await t('coins').insert({...row,created_at:now()});created++;}
 }
 if(process.env.COIN_INVENTORY_MODE==='full')await t('coins').where({supplier:b.supplier}).whereNotIn('sku',checked.rows.map(r=>r.sku)).update({stock:0,updated_at:now()});
 const summary={...parse(b.summary),created,updated,unchanged,rejected:0};await t('import_batches').where({id}).update({status:'published',published_at:now(),summary:json(summary)});await t('audit').insert({staff_id:staff,action:'publish_coins',details:json({batch:id,summary}),created_at:now()});await t('import_locks').where({name:'coins'}).del();return summary;
},k.client.config.client==='mysql2'?{isolationLevel:'read committed'}:{});}
