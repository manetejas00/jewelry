import {validationError} from './errors.js';
import bcrypt from 'bcryptjs';
import {now, json, parse} from './db.js';
import {catalogue,coinCatalogue} from './pricing.js';

const normalEmail = value => String(value || '').trim().toLowerCase();
const publicCustomer = row => ({id: row.id, name: row.name, email: row.email,session_version:row.session_version||0});
const passwordValid = value => typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value, 'utf8') <= 72;

export async function registerCustomer(k, input) {
  const email = normalEmail(input.email), name = String(input.name || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !name || name.length > 100)
    throw validationError('Enter your full name and a valid email address.');
  if (!passwordValid(input.password)) throw validationError('Choose a password of at least 12 characters, up to 72 UTF-8 bytes.');
  const password_hash = await bcrypt.hash(input.password, 12);
  return k.transaction(async t => {
    if (await t('customers').where({email}).first()) throw validationError('Unable to create this account. Try signing in instead.');
    let id;
    try { [id] = await t('customers').insert({email, name, password_hash, created_at: now()}); }
    catch (e) { if (e.code === 'ER_DUP_ENTRY' || e.code?.startsWith('SQLITE_CONSTRAINT')) throw validationError('Unable to create this account. Try signing in instead.'); throw e; }
    await t('customer_state').insert({customer_id: id, bag: '[]', saved: '[]', revision: 0, updated_at: now()});
    return {id, name, email,session_version:0};
  });
}
// Run the same cost of password verification even when the email is unknown.
const dummyHash = await bcrypt.hash('not-a-customer-password', 12);
export async function loginCustomer(k, input) {
  const row = await k('customers').where({email: normalEmail(input.email)}).whereNull('deleted_at').first();
  const candidate = typeof input.password === 'string' && Buffer.byteLength(input.password) <= 72 ? input.password : '';
  const valid = await bcrypt.compare(candidate, row?.password_hash || dummyHash);
  if (!row || !valid) throw validationError('Email or password is incorrect.');
  return publicCustomer(row);
}

export function validateState(input) {
  if (!input || !Array.isArray(input.bag) || !Array.isArray(input.saved) || input.bag.length > 50 || input.saved.length > 200)
    throw validationError('A bag can contain up to 50 variants and 200 saved pieces.');
  const bag = new Map();
  for (const item of input.bag) {
    if (!item || typeof item.sku !== 'string' || !item.sku || item.sku.length > 80 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)
      throw validationError('Bag quantities must be whole numbers from 1 to 20.');
    bag.set(item.sku, {sku: item.sku, quantity: Math.max(bag.get(item.sku)?.quantity || 0, item.quantity)});
  }
  if (input.saved.some(code => typeof code !== 'string' || !code || code.length > 100)) throw validationError('Invalid saved piece.');
  return {bag: [...bag.values()], saved: [...new Set(input.saved)]};
}
async function knownState(k, input) {
  const clean = validateState(input);
  const rows = await k('products').select('sku', 'product_code').where({status: 'published'});
  const coins=await k('coins').select('sku').where({status:'published'});
  const skus = new Set([...rows,...coins].map(p => p.sku)), codes = new Set(rows.map(p => p.product_code));
  return {bag: clean.bag.filter(i => skus.has(i.sku)), saved: clean.saved.filter(code => codes.has(code))};
}
export async function customerState(k, customerId) {
  const row = await k('customer_state').where({customer_id: customerId}).first();
  if (!row) throw validationError('Customer account not found. Please sign in again.');
  const items = parse(row.bag, []), products = [...await catalogue(k),...(await coinCatalogue(k)).map(c=>({...c,slug:'coins',size:`${c.weight_g}g (${c.purity})`,kind:'coin'}))];
  const bag = items.map(item => {
    const p = products.find(p => p.sku === item.sku);
    if (!p) return {sku: item.sku, quantity: item.quantity, name: 'Unavailable piece', size: item.sku, slug: '', image: '', price: 0, unavailable: true};
    return {sku: p.sku, quantity: item.quantity, name: p.name, size: p.size, slug: p.slug, image: p.image, price: p.price, stock:p.stock, kind:p.kind, unavailable: !p.checkout_available};
  });
  return {bag, saved: parse(row.saved, []), revision: row.revision};
}
export async function saveCustomerState(k, customerId, input) {
  if (!Number.isInteger(input.revision) || input.revision < 0) throw validationError('Reload your account before saving changes.');
  const clean = await knownState(k, input);
  const count = await k('customer_state').where({customer_id: customerId, revision: input.revision}).update({bag: json(clean.bag), saved: json(clean.saved), revision: input.revision + 1, updated_at: now()});
  if (!count) { const error = validationError('Your account changed in another tab. Reload the latest bag and saved pieces before editing.'); error.status = 409; throw error; }
  return {revision: input.revision + 1};
}
export async function mergeGuestState(k, customerId, guest) {
  const clean = await knownState(k, guest);
  await k.transaction(async t => {
    const row = await t('customer_state').where({customer_id: customerId}).forUpdate().first();
    const bag = new Map(parse(row.bag, []).map(i => [i.sku, i]));
    for (const item of clean.bag) bag.set(item.sku, {sku: item.sku, quantity: Math.max(bag.get(item.sku)?.quantity || 0, item.quantity)});
    if (bag.size > 50) throw validationError('Your combined bag exceeds 50 variants. Remove a few pieces before signing in.');
    const saved = [...new Set([...parse(row.saved, []), ...clean.saved])];
    if (saved.length > 200) throw validationError('Your combined saved pieces exceed 200. Remove a few before signing in.');
    await t('customer_state').where({customer_id: customerId}).update({bag: json([...bag.values()]), saved: json(saved), revision: row.revision + 1, updated_at: now()});
  });
}
export async function claimSessionOrders(k, customer, sessionOrderIds = []) {
  // Email alone is never proof of ownership: require an existing guest-session capability too.
  const rows = await k('orders').whereNull('customer_id').whereIn('id', sessionOrderIds.slice(-100));
  for (const row of rows) if (normalEmail(parse(row.customer).email) === customer.email)
    await k('orders').where({id: row.id}).whereNull('customer_id').update({customer_id: customer.id});
}
export async function customerOrders(k, customerId, page = 1) {
  const offset = (page - 1) * 20;
  const orders = await k('orders').where({customer_id: customerId}).orderBy('created_at', 'desc').limit(20).offset(offset);
  const count = await k('orders').where({customer_id: customerId}).count('* as total').first();
  const items = orders.length ? await k('order_items').whereIn('order_id', orders.map(o => o.id)) : [];
  return {page, total: Number(count.total), orders: orders.map(o => ({id: o.id, status: o.status, created_at: o.created_at, total: Number(o.total), shipping: Number(o.shipping), payment_mode: o.payment_mode, items: items.filter(i => i.order_id === o.id).map(i => parse(i.snapshot))}))};
}
export function mayReadOrder(session, order) {
  if (!order) return false;
  if (session.staff) return true;
  if (order.customer_id !== null && order.customer_id !== undefined) return Number(session.customer?.id) === Number(order.customer_id);
  return !!session.orderIds?.includes(order.id);
}
