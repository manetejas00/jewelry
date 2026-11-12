import {validationError} from './errors.js';
import crypto from 'node:crypto';
import {quote} from './pricing.js';
import {now,json} from './db.js';
import {invalidateSearchCache} from './search.js';
export async function checkout(k,{items,token,customer,idempotencyKey,paymentMode='cod'},testMode=true,accountId=null,guestScope='direct'){
 if(paymentMode!=='cod')throw validationError('Only Cash on Delivery is supported');
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(idempotencyKey||''))throw validationError('A valid payment retry identifier is required');
 if(!customer||!String(customer.name||'').trim()||!/^\S+@\S+\.\S+$/.test(customer.email||'')||!/^\d{10}$/.test(customer.phone||'')||!/^\d{6}$/.test(customer.pincode||'')||String(customer.address||'').trim().length<8||!customer.city)throw validationError('Enter your name, email, Indian mobile number, address, city and six-digit PIN code');
 const retryFingerprint=crypto.createHash('sha256').update(JSON.stringify({items,token,customer,accountId,scope:accountId?null:guestScope,paymentMode})).digest('hex');
 let placed=false;
 const result=await k.transaction(async t=>{const existing=await t('orders').where({idempotency_key:idempotencyKey}).first();if(existing){if((existing.customer_id??null)!==accountId||existing.retry_fingerprint!==retryFingerprint)throw validationError('Payment retry belongs to a different customer.');return {id:existing.id,total:Number(existing.total),duplicate:true};}
 if(!Array.isArray(items)||!items.length||items.length>50||items.some(i=>!i||typeof i.sku!=='string'))throw validationError('Invalid shopping bag');
 const skus=items.map(i=>i.sku);
 await t('products').whereIn('sku',skus).orderBy('sku').forUpdate();
 if(await t.schema.hasTable('coins'))await t('coins').whereIn('sku',skus).orderBy('sku').forUpdate();
 const fresh=await quote(t,items);if(fresh.token!==token){const e=validationError('The price has changed. Please review and accept the updated total.');e.status=409;e.quote=fresh;throw e;}
 const id=`VEY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
 for(const line of fresh.lines){
  let updated=await t('products').where({sku:line.sku}).where('stock','>=',line.quantity).decrement('stock',line.quantity);
  if(updated!==1&&await t.schema.hasTable('coins')){
   updated=await t('coins').where({sku:line.sku}).where('stock','>=',line.quantity).decrement('stock',line.quantity);
  }
  if(updated!==1)throw validationError('Stock changed. Please review your bag.');
 }
 const clean=Object.fromEntries(['name','email','phone','address','city','pincode'].map(f=>[f,String(customer[f]).slice(0,500)]));
 await t('orders').insert({id,customer_id:accountId,idempotency_key:idempotencyKey,retry_fingerprint:retryFingerprint,status:'confirmed',customer:json(clean),subtotal:fresh.subtotal,shipping:fresh.shipping,total:fresh.total,payment_mode:'cod',created_at:now()});
 for(const line of fresh.lines)await t('order_items').insert({order_id:id,sku:line.sku,quantity:line.quantity,snapshot:json(line)});
 if(accountId){const state=await t('customer_state').where({customer_id:accountId}).forUpdate().first();const purchased=new Map(fresh.lines.map(i=>[i.sku,i.quantity]));const remaining=JSON.parse(state.bag).map(i=>({...i,quantity:i.quantity-(purchased.get(i.sku)||0)})).filter(i=>i.quantity>0);await t('customer_state').where({customer_id:accountId}).update({bag:json(remaining),revision:state.revision+1,updated_at:now()});}
 await t('payment_events').insert({event_id:`cod-${idempotencyKey}`,order_id:id,created_at:now()});placed=true;return {id,total:fresh.total};},k.client.config.client==='mysql2'?{isolationLevel:'read committed'}:{}).catch(async error=>{
  if(error.code==='ER_DUP_ENTRY'||error.code==='SQLITE_CONSTRAINT_UNIQUE'){const existing=await k('orders').where({idempotency_key:idempotencyKey}).first();if(existing?.retry_fingerprint===retryFingerprint)return {id:existing.id,total:Number(existing.total),duplicate:true};}
  throw error;
 });
 if(placed)invalidateSearchCache();
 return result;
}
