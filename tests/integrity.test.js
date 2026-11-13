import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createDb, migrate, now} from '../server/db.js';
import {registerCustomer} from '../server/customers.js';
import {submitReview} from '../server/reviews.js';
import {checkout, updateOrderStatus, presentOrders, requireSignedInCsrf} from '../server/orders.js';
import {quote} from '../server/pricing.js';
import {setStaffAccess, createStaff} from '../server/staff-access.js';
import bcrypt from 'bcryptjs';
import {isSafeMediaUrl} from '../server/thumbnails.js';

let k;
const stamp = now();
const customer = {name:'Integrity Customer', email:'integrity@example.invalid', phone:'9999999999', address:'Fictional test address', city:'Mumbai', pincode:'400001'};

before(async () => {
  k = createDb(':memory:');
  await migrate(k);
});
after(async () => { await k.destroy(); });

test('launch integrity fixes keep reviews, stock, offers and staff access consistent', async () => {
  await k('products').insert({supplier:'Merchant', product_code:'jew-1', slug:'jew-1', sku:'JEW-1', name:'Jewellery piece', category:'Rings', metal:'Gold', purity:'22K', pricing_mode:'FIXED', fixed_price:10000, stock:2, status:'published', source_timestamp:stamp, updated_at:stamp});
  await k('coins').insert({sku:'COIN-TEST-1', name:'Test coin', metal:'Gold', coin_type:'Gold Coin', purity:'24K', weight_g:1, pricing_mode:'FIXED', fixed_price:8000, stock:3, status:'published', created_at:stamp, updated_at:stamp});
  const product = await k('products').where({sku:'JEW-1'}).first();
  const coin = await k('coins').where({sku:'COIN-TEST-1'}).first();
  assert.equal(product.id, coin.id);
  const account = await registerCustomer(k, {name:'Reviewer One', email:'reviewer@example.invalid', password:'A secure test password'});
  await submitReview(k, account.id, coin.sku, {rating:5, title:'Solid coin', comment:'The coin arrived as described in the listing.', images:[]});
  const review = await k('reviews').first();
  assert.equal(review.subject_type, 'coin');
  assert.equal(review.coin_id, coin.id);
  assert.equal(review.product_id, null);

  const items = [{sku:'JEW-1', quantity:1}];
  const priced = await quote(k, items);
  const order = await checkout(k, {items, token:priced.token, customer, idempotencyKey:'integrity-order-0001'});
  assert.equal((await k('products').where({sku:'JEW-1'}).first()).stock, 1);
  await updateOrderStatus(k, order.id, 'cancelled');
  assert.equal((await k('products').where({sku:'JEW-1'}).first()).stock, 2);
  await assert.rejects(updateOrderStatus(k, order.id, 'packed'), /no longer change/);

  await k('offers').insert({name:'Coded', code:'SAVE10', badge_text:'10 percent', discount_type:'total_percent', discount_value:10, applies_to:'sku', target_value:'JEW-1', status:'active', priority:20, show_in_banner:1, show_in_grid:1, code_required:1, created_at:stamp, updated_at:stamp});
  assert.equal((await quote(k, items)).subtotal, 10000);
  assert.equal((await quote(k, items, {code:'save10'})).subtotal, 9000);

  const [ownerId] = await k('staff').insert({email:'only-owner@example.invalid', password_hash:'hash', role:'owner'});
  await assert.rejects(setStaffAccess(k, ownerId, ownerId, true), /own account|active owner/);
  assert.equal((await k('staff').where({id:ownerId}).first()).disabled_at, null);

  const created = await createStaff(k, {email:' New.Staff@Example.Invalid ', password:'a-secure-password', role:'viewer'});
  assert.equal(created.email, 'new.staff@example.invalid');
  assert.equal(created.role, 'viewer');
  assert.equal(created.password_hash, undefined);
  const row = await k('staff').where({email:'new.staff@example.invalid'}).first();
  assert.equal(await bcrypt.compare('a-secure-password', row.password_hash), true);
  await assert.rejects(() => createStaff(k, {email:'new.staff@example.invalid', password:'a-secure-password', role:'manager'}), /already exists/);
  await assert.rejects(() => createStaff(k, {email:'not-an-email', password:'a-secure-password', role:'viewer'}), /email/i);
  await assert.rejects(() => createStaff(k, {email:'short@example.invalid', password:'too-short', role:'viewer'}), /password/i);
  await assert.rejects(() => createStaff(k, {email:'role@example.invalid', password:'a-secure-password', role:'admin'}), /role/i);
});

test('viewer order payloads omit contact details', () => {
  const hidden = presentOrders([{id:'VEY-1', status:'confirmed', payment_mode:'cod', subtotal:10, shipping:0, total:10, created_at:stamp, customer:JSON.stringify({name:'Asha', email:'asha@example.invalid', phone:'9999999999', address:'Secret road 12'})}], 'viewer');
  assert.equal(hidden[0].customer.name, 'Customer');
  assert.equal(hidden[0].customer.email, undefined);
  assert.equal(hidden[0].customer.address, undefined);
});

test('signed-in checkout requires the customer csrf token and guests do not', () => {
  assert.doesNotThrow(() => requireSignedInCsrf({session:{}, get(){ return ''; }}));
  assert.doesNotThrow(() => requireSignedInCsrf({session:{customer:{id:1}, customerCsrf:'abc'}, get(name){ return name === 'x-customer-csrf' ? 'abc' : ''; }}));
  assert.throws(() => requireSignedInCsrf({session:{customer:{id:1}, customerCsrf:'abc'}, get(){ return ''; }}), /reload/);
});

test('image addresses reject scripts and private schemes', () => {
  assert.equal(isSafeMediaUrl('/uploads/ring.jpg'), true);
  assert.equal(isSafeMediaUrl('https://cdn.example/ring.jpg'), true);
  assert.equal(isSafeMediaUrl('javascript:alert(1)'), false);
  assert.equal(isSafeMediaUrl('/uploads/../secret.jpg'), false);
});
