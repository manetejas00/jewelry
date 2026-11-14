import {validationError} from './errors.js';
import crypto from 'node:crypto';
import {quote} from './pricing.js';
import {now,json,parse} from './db.js';
import {invalidateSearchCache} from './search.js';
import {sendOrderMail} from './order-mail.js';
export const STOCK_HOLDING_STATUSES = ['paid','confirmed','placed','packed','shipped','delivered'];
const ORDER_STATUSES = ['confirmed','packed','shipped','delivered','cancelled'];
export function requireSignedInCsrf(req) {
 if (!req.session?.customer) return;
 if (!req.session.customerCsrf || req.get('x-customer-csrf') !== req.session.customerCsrf) throw validationError('Please reload and try again.', 403);
}
export function presentOrders(orders, role) {
 return orders.map(order => {
  const customer = parse(order.customer);
  const base = {id: order.id, status: order.status, payment_mode: order.payment_mode, subtotal: order.subtotal, shipping: order.shipping, total: order.total, created_at: order.created_at};
  if (role === 'viewer') return {...base, customer: {name: 'Customer'}};
  return {...order, ...base, customer};
 });
}
export async function updateOrderStatus(k, id, status) {
 if (!ORDER_STATUSES.includes(status)) throw validationError('Choose confirmed, packed, shipped, delivered, or cancelled');
 return k.transaction(async t => {
  const order = await t('orders').where({id}).first();
  if (!order) throw validationError('Order not found', 404);
  if (order.status === status) return {id, status, unchanged: true};
  if (order.status === 'cancelled' || order.status === 'delivered') throw validationError('This order can no longer change status');
  if (status === 'cancelled') {
   const items = await t('order_items').where({order_id: id});
   for (const item of items) {
    const product = await t('products').where({sku: item.sku}).first();
    if (product) await t('products').where({sku: item.sku}).increment('stock', item.quantity);
    else if (await t.schema.hasTable('coins') && (await t('coins').where({sku: item.sku}).first())) {
     await t('coins').where({sku: item.sku}).increment('stock', item.quantity);
    }
   }
  }
  await t('orders').where({id}).update({status, updated_at: now()});
  return {id, status};
 });
}
export async function checkout(k,{items,token,customer,idempotencyKey,paymentMode='cod',offerCode=null},testMode=true,accountId=null,guestScope='direct'){
 if(paymentMode!=='cod')throw validationError('Only Cash on Delivery is supported');
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(idempotencyKey||''))throw validationError('A valid payment retry identifier is required');
 if(!customer||!String(customer.name||'').trim()||!/^\S+@\S+\.\S+$/.test(customer.email||'')||!/^\d{10}$/.test(customer.phone||'')||!/^\d{6}$/.test(customer.pincode||'')||String(customer.address||'').trim().length<8||!customer.city)throw validationError('Enter your name, email, Indian mobile number, address, city and six-digit PIN code');
 const retryFingerprint=crypto.createHash('sha256').update(JSON.stringify({items,token,customer,accountId,scope:accountId?null:guestScope,paymentMode,offerCode:offerCode||null})).digest('hex');
 let placed=false;
 const result=await k.transaction(async t=>{const existing=await t('orders').where({idempotency_key:idempotencyKey}).first();if(existing){if((existing.customer_id??null)!==accountId||existing.retry_fingerprint!==retryFingerprint)throw validationError('Payment retry belongs to a different customer.');return {id:existing.id,total:Number(existing.total),duplicate:true};}
 if(!Array.isArray(items)||!items.length||items.length>50||items.some(i=>!i||typeof i.sku!=='string'))throw validationError('Invalid shopping bag');
 const skus=items.map(i=>i.sku);
 await t('products').whereIn('sku',skus).orderBy('sku').forUpdate();
 if(await t.schema.hasTable('coins'))await t('coins').whereIn('sku',skus).orderBy('sku').forUpdate();
 const fresh=await quote(t,items,{code:offerCode||null});if(fresh.token!==token){const e=validationError('The price has changed. Please review and accept the updated total.');e.status=409;e.quote=fresh;throw e;}
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
 if(placed && result?.id && !result.duplicate){
  invalidateSearchCache();
  const saved=await k('orders').where({id:result.id}).first();
  await sendOrderMail(saved).catch(()=>{});
 }
 return result;
}
