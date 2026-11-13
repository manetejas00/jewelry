export async function buildKnowledge(db, env = process.env) {
  const brand = env.BRAND_NAME || 'Veyora Jewels';
  const products = await db('products').where({status: 'published'}).select('name', 'category', 'metal', 'purity', 'sku', 'pricing_mode', 'fixed_price').orderBy('name').limit(40);
  const coins = await db.schema.hasTable('coins')
    ? await db('coins').where({status: 'published'}).select('name', 'metal', 'purity', 'sku', 'weight_g', 'pricing_mode', 'fixed_price').orderBy('name').limit(20)
    : [];
  const lines = [
    `Brand: ${brand}.`,
    'The storefront sells jewellery and gold or silver coins in India, priced in INR.',
    'Customers can browse /collections/all, open a product page, save pieces, and use /bag. Registered customers can review orders in /account.',
    'Delivery and returns: /information/shipping. Jewellery care: /information/care. Contact: /information/contact.'
  ];
  if (env.SHIPPING_POLICY?.trim()) lines.push(`Published delivery policy: ${env.SHIPPING_POLICY.trim().slice(0, 800)}`);
  else lines.push('No delivery policy text has been published. Do not invent delivery times or charges. Direct the customer to the delivery page.');
  if (env.RETURNS_POLICY?.trim()) lines.push(`Published returns policy: ${env.RETURNS_POLICY.trim().slice(0, 800)}`);
  else lines.push('No returns policy text has been published. Do not invent a returns window.');
  if (env.MERCHANT_EMAIL?.trim()) lines.push(`Published contact email: ${env.MERCHANT_EMAIL.trim()}`);
  else lines.push('No public contact email is configured. Do not invent one.');
  if (env.SHIPPING_INR != null && env.SHIPPING_INR !== '') lines.push(`Configured standard delivery amount: INR ${env.SHIPPING_INR}. Complimentary delivery threshold: INR ${env.FREE_SHIPPING_INR || 'not set'}. Confirm the checkout summary before treating this as the customer's charge.`);
  lines.push(products.length ? `Published jewellery (name, category, metal, purity, SKU, price note): ${products.map(describeProduct).join('; ')}.` : 'No published jewellery was available when this reply was prepared.');
  lines.push(coins.length ? `Published coins (name, metal, purity, weight, SKU, price note): ${coins.map(describeCoin).join('; ')}.` : 'No published coins were available when this reply was prepared.');
  return lines.join('\n').slice(0, 7000);
}

function priceNote(row) {
  if (row.pricing_mode === 'FIXED' && row.fixed_price != null && row.fixed_price !== '') return `fixed INR ${row.fixed_price}`;
  return 'price is shown on the product page from the approved metal rate';
}

function describeProduct(row) {
  return `${row.name} (${row.category || 'jewellery'}, ${row.purity || ''} ${row.metal || ''}, SKU ${row.sku}, ${priceNote(row)})`.replace(/\s+/g, ' ');
}

function describeCoin(row) {
  return `${row.name} (${row.purity || ''} ${row.metal || ''}, ${row.weight_g} g, SKU ${row.sku}, ${priceNote(row)})`.replace(/\s+/g, ' ');
}
