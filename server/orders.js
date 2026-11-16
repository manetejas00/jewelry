import {validationError} from './errors.js';
import crypto from 'node:crypto';
import {quote} from './pricing.js';
import {now,json,parse} from './db.js';
import {parentKurtaSku} from '../shared/kurta-sizes.js';
import {invalidateSearchCache} from './search.js';
import {sendOrderMail} from './order-mail.js';
export const STOCK_HOLDING_STATUSES = ['paid','confirmed','placed','packed','shipped','delivered'];
async function kurtaVariantForSku(t, sku) {
  if (!await t.schema.hasTable('kurta_variants')) return null;
  const exact = await t('kurta_variants').where({sku}).first();
  if (exact) return exact;
  const parent = parentKurtaSku(sku);
  if (!parent) return null;
  return t('kurta_variants').where({sku: parent}).first();
}
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
      if (await t.schema.hasTable('jewelry_variants')) {
        const jv = await t('jewelry_variants').where({sku: item.sku}).first();
        if (jv) {
          await t('jewelry_variants').where({sku: item.sku}).increment('stock', item.quantity);
          await t('jewelries').where({id: jv.jewelry_id}).increment('stock', item.quantity);
          if (await t.schema.hasTable('jewelry_inventory')) {
            await t('jewelry_inventory').insert({
              jewelry_id: jv.jewelry_id,
              variant_id: jv.id,
              sku: item.sku,
              quantity_change: item.quantity,
              balance_after: jv.stock + item.quantity,
              reason: 'order_cancelled',
              reference_id: id,
              created_at: now()
            });
          }
        }
      }
      if (await t.schema.hasTable('coin_variants')) {
        const cv = await t('coin_variants').where({sku: item.sku}).first();
        if (cv) {
          await t('coin_variants').where({sku: item.sku}).increment('stock', item.quantity);
          await t('coins').where({id: cv.coin_id}).increment('stock', item.quantity);
          if (await t.schema.hasTable('coin_inventory')) {
            await t('coin_inventory').insert({
              coin_id: cv.coin_id,
              variant_id: cv.id,
              sku: item.sku,
              quantity_change: item.quantity,
              balance_after: cv.stock + item.quantity,
              reason: 'order_cancelled',
              reference_id: id,
              created_at: now()
            });
          }
        } else if (await t.schema.hasTable('coins')) {
          const c = await t('coins').where({sku: item.sku}).first();
          if (c) {
            await t('coins').where({sku: item.sku}).increment('stock', item.quantity);
            if (await t.schema.hasTable('coin_inventory')) {
              await t('coin_inventory').insert({
                coin_id: c.id,
                sku: item.sku,
                quantity_change: item.quantity,
                balance_after: c.stock + item.quantity,
                reason: 'order_cancelled',
                reference_id: id,
                created_at: now()
              });
            }
          }
        }
      }
      if (await t.schema.hasTable('kurta_variants')) {
        const kv = await kurtaVariantForSku(t, item.sku);
        if (kv) {
          await t('kurta_variants').where({sku: kv.sku}).increment('stock', item.quantity);
          await t('kurtas').where({id: kv.kurta_id}).increment('stock', item.quantity);
          if (await t.schema.hasTable('kurta_inventory')) {
            await t('kurta_inventory').insert({
              kurta_id: kv.kurta_id,
              variant_id: kv.id,
              sku: item.sku,
              quantity_change: item.quantity,
              balance_after: kv.stock + item.quantity,
              reason: 'order_cancelled',
              reference_id: id,
              created_at: now()
            });
          }
        }
      }
      if (await t.schema.hasTable('products')) {
        const product = await t('products').where({sku: item.sku}).first();
        if (product) await t('products').where({sku: item.sku}).increment('stock', item.quantity);
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
 const kurtaLockSkus=[...new Set(skus.flatMap(sku => [sku, parentKurtaSku(sku)].filter(Boolean)))];
 if (await t.schema.hasTable('jewelries')) await t('jewelries').whereIn('sku', skus).orderBy('sku').forUpdate();
 if (await t.schema.hasTable('jewelry_variants')) await t('jewelry_variants').whereIn('sku', skus).orderBy('sku').forUpdate();
 if (await t.schema.hasTable('coins')) await t('coins').whereIn('sku', skus).orderBy('sku').forUpdate();
 if (await t.schema.hasTable('coin_variants')) await t('coin_variants').whereIn('sku', skus).orderBy('sku').forUpdate();
 if (await t.schema.hasTable('kurtas')) await t('kurtas').whereIn('sku', kurtaLockSkus).orderBy('sku').forUpdate();
 if (await t.schema.hasTable('kurta_variants')) await t('kurta_variants').whereIn('sku', kurtaLockSkus).orderBy('sku').forUpdate();
 if (await t.schema.hasTable('products')) await t('products').whereIn('sku', skus).orderBy('sku').forUpdate();
 const fresh=await quote(t,items,{code:offerCode||null});if(fresh.token!==token){const e=validationError('The price has changed. Please review and accept the updated total.');e.status=409;e.quote=fresh;throw e;}
 const id=`VEY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
 for(const line of fresh.lines){
  let updated = 0;
  if (await t.schema.hasTable('jewelry_variants')) {
    const jv = await t('jewelry_variants').where({sku: line.sku}).first();
    if (jv) {
      updated = await t('jewelry_variants').where({sku: line.sku}).where('stock', '>=', line.quantity).decrement('stock', line.quantity);
      if (updated === 1) {
        await t('jewelries').where({id: jv.jewelry_id}).where('stock', '>=', line.quantity).decrement('stock', line.quantity);
        if (await t.schema.hasTable('jewelry_inventory')) {
          await t('jewelry_inventory').insert({
            jewelry_id: jv.jewelry_id,
            variant_id: jv.id,
            sku: line.sku,
            quantity_change: -line.quantity,
            balance_after: jv.stock - line.quantity,
            reason: 'order_placed',
            reference_id: id,
            created_at: now()
          });
        }
      }
    }
  }
  if (updated !== 1 && await t.schema.hasTable('coins')) {
    const cv = await t.schema.hasTable('coin_variants') ? await t('coin_variants').where({sku: line.sku}).first() : null;
    if (cv) {
      updated = await t('coin_variants').where({sku: line.sku}).where('stock', '>=', line.quantity).decrement('stock', line.quantity);
      if (updated === 1) {
        await t('coins').where({id: cv.coin_id}).where('stock', '>=', line.quantity).decrement('stock', line.quantity);
        if (await t.schema.hasTable('coin_inventory')) {
          await t('coin_inventory').insert({
            coin_id: cv.coin_id,
            variant_id: cv.id,
            sku: line.sku,
            quantity_change: -line.quantity,
            balance_after: cv.stock - line.quantity,
            reason: 'order_placed',
            reference_id: id,
            created_at: now()
          });
        }
      }
    } else {
      const c = await t('coins').where({sku: line.sku}).first();
      if (c) {
        updated = await t('coins').where({sku: line.sku}).where('stock', '>=', line.quantity).decrement('stock', line.quantity);
        if (updated === 1 && await t.schema.hasTable('coin_inventory')) {
          await t('coin_inventory').insert({
            coin_id: c.id,
            sku: line.sku,
            quantity_change: -line.quantity,
            balance_after: c.stock - line.quantity,
            reason: 'order_placed',
            reference_id: id,
            created_at: now()
          });
        }
      }
    }
  }
  if (updated !== 1 && await t.schema.hasTable('kurta_variants')) {
    const kv = await kurtaVariantForSku(t, line.sku);
    if (kv) {
      updated = await t('kurta_variants').where({sku: kv.sku}).where('stock', '>=', line.quantity).decrement('stock', line.quantity);
      if (updated === 1) {
        await t('kurtas').where({id: kv.kurta_id}).where('stock', '>=', line.quantity).decrement('stock', line.quantity);
        if (await t.schema.hasTable('kurta_inventory')) {
          await t('kurta_inventory').insert({
            kurta_id: kv.kurta_id,
            variant_id: kv.id,
            sku: line.sku,
            quantity_change: -line.quantity,
            balance_after: kv.stock - line.quantity,
            reason: 'order_placed',
            reference_id: id,
            created_at: now()
          });
        }
      }
    }
  }
  if (await t.schema.hasTable('products')) {
    const prodUpdated = await t('products').where({sku: line.sku}).where('stock', '>=', line.quantity).decrement('stock', line.quantity);
    if (updated !== 1) updated = prodUpdated;
  }
  if(updated!==1)throw validationError('Stock changed. Please review your bag.');
 }
 const clean=Object.fromEntries(['name','email','phone','address','city','pincode'].map(f=>[f,String(customer[f]).slice(0,500)]));
 await t('orders').insert({id,customer_id:accountId,idempotency_key:idempotencyKey,retry_fingerprint:retryFingerprint,status:'confirmed',customer:json(clean),subtotal:fresh.subtotal,shipping:fresh.shipping,total:fresh.total,payment_mode:'cod',created_at:now()});
 const hasItemType = await t.schema.hasColumn('order_items', 'item_type');
 const hasItemId = await t.schema.hasColumn('order_items', 'item_id');
 for(const line of fresh.lines){
   let itemType = 'jewelry';
   let itemId = null;
   if (await t.schema.hasTable('coins') && await t('coins').where({sku: line.sku}).first()) {
     itemType = 'coin';
     itemId = (await t('coins').where({sku: line.sku}).first()).id;
   } else if (await t.schema.hasTable('kurta_variants') && await kurtaVariantForSku(t, line.sku)) {
     itemType = 'kurta';
     itemId = (await kurtaVariantForSku(t, line.sku)).kurta_id;
   } else if (await t.schema.hasTable('jewelries') && await t('jewelries').where({sku: line.sku}).first()) {
     itemType = 'jewelry';
     itemId = (await t('jewelries').where({sku: line.sku}).first()).id;
   } else if (await t.schema.hasTable('jewelry_variants') && await t('jewelry_variants').where({sku: line.sku}).first()) {
     itemType = 'jewelry';
     itemId = (await t('jewelry_variants').where({sku: line.sku}).first()).jewelry_id;
   }
   const itemRow = {
     order_id: id,
     sku: line.sku,
     quantity: line.quantity,
     snapshot: json(line)
   };
   if (hasItemType) itemRow.item_type = itemType;
   if (hasItemId) itemRow.item_id = itemId;
   await t('order_items').insert(itemRow);
 }
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
