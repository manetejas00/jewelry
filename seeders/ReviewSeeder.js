import bcrypt from 'bcryptjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {db, now} from '../server/db.js';

export const seededCustomers = [
  { name: 'Ananya Iyer', email: 'ananya.iyer@example.invalid' },
  { name: 'Rohan Mehta', email: 'rohan.mehta@example.invalid' },
  { name: 'Pooja Verma', email: 'pooja.verma@example.invalid' },
  { name: 'Vikramaditya Singhania', email: 'vikram.singhania@example.invalid' },
  { name: 'Neha Kulkarni', email: 'neha.kulkarni@example.invalid' },
  { name: 'Aditya Sharma', email: 'aditya.sharma@example.invalid' },
  { name: 'Kavita Nair', email: 'kavita.nair@example.invalid' },
  { name: 'Arjun Patel', email: 'arjun.patel@example.invalid' },
  { name: 'Sneha Rao', email: 'sneha.rao@example.invalid' },
  { name: 'Deepak Joshi', email: 'deepak.joshi@example.invalid' }
];

export async function ReviewSeeder(k = db) {
  if (!await k.schema.hasTable('reviews')) {
    throw Error('Run npm run migrate before ReviewSeeder.');
  }

  // Idempotency check: if reviews already exist, skip inserting duplicates
  const existingCount = await k('reviews').count('* as total').first();
  if (Number(existingCount?.total || 0) > 0) {
    return { skipped: true, existing: Number(existingCount.total), message: 'Reviews already seeded.' };
  }

  const stamp = now();
  const passwordHash = await bcrypt.hash('preview-customer-password', 10);

  // 1. Ensure customers exist
  const customerMap = {};
  for (const c of seededCustomers) {
    let row = await k('customers').where({ email: c.email.toLowerCase() }).first();
    if (!row) {
      const [id] = await k('customers').insert({
        name: c.name,
        email: c.email.toLowerCase(),
        password_hash: passwordHash,
        created_at: stamp
      });
      await k('customer_state').insert({
        customer_id: id,
        bag: '[]',
        saved: '[]',
        revision: 0,
        updated_at: stamp
      });
      row = { id, ...c };
    }
    customerMap[c.email] = row.id;
  }

  // 2. Locate existing products to review
  const targetProductCodes = [
    'eclipse-ring',
    'lune-pearl-drops',
    'atelier-pearl-collar',
    'nocturne-cuff',
    'noir-halo-studs',
    'velours-earrings'
  ];

  const products = await k('products').whereIn('product_code', targetProductCodes);
  if (!products.length) {
    // If specific preview codes aren't loaded, pick any first 6 products
    const anyProducts = await k('products').limit(6);
    products.push(...anyProducts);
  }

  // Group by product_code to find canonical product ID
  const canonicalByCode = {};
  for (const p of products) {
    if (!canonicalByCode[p.product_code]) {
      canonicalByCode[p.product_code] = p;
    }
  }

  const eclipseRing = canonicalByCode['eclipse-ring'] || products[0];
  const luneDrops = canonicalByCode['lune-pearl-drops'] || products[1] || products[0];
  const atelierCollar = canonicalByCode['atelier-pearl-collar'] || products[2] || products[0];
  const nocturneCuff = canonicalByCode['nocturne-cuff'] || products[3] || products[0];
  const noirStuds = canonicalByCode['noir-halo-studs'] || products[4] || products[0];
  const veloursEarrings = canonicalByCode['velours-earrings'] || products[5] || products[0];

  // 3. Create simulated verified orders for verified purchasers
  const verifiedOrders = [
    { customerEmail: 'ananya.iyer@example.invalid', product: eclipseRing },
    { customerEmail: 'pooja.verma@example.invalid', product: eclipseRing },
    { customerEmail: 'neha.kulkarni@example.invalid', product: eclipseRing },
    { customerEmail: 'rohan.mehta@example.invalid', product: luneDrops },
    { customerEmail: 'kavita.nair@example.invalid', product: luneDrops },
    { customerEmail: 'vikram.singhania@example.invalid', product: atelierCollar },
    { customerEmail: 'sneha.rao@example.invalid', product: atelierCollar },
    { customerEmail: 'aditya.sharma@example.invalid', product: nocturneCuff },
    { customerEmail: 'arjun.patel@example.invalid', product: noirStuds }
  ];

  for (let i = 0; i < verifiedOrders.length; i++) {
    const vo = verifiedOrders[i];
    const customerId = customerMap[vo.customerEmail];
    const orderId = `ORD-REV-SEED-${1000 + i}`;
    const exists = await k('orders').where({ id: orderId }).first();
    if (!exists && customerId && vo.product) {
      await k('orders').insert({
        id: orderId,
        idempotency_key: `seed-idemp-${orderId}`,
        customer_id: customerId,
        status: 'delivered',
        customer: JSON.stringify({ name: seededCustomers.find(c => c.email === vo.customerEmail)?.name, email: vo.customerEmail }),
        subtotal: Number(vo.product.fixed_price || 25000),
        shipping: 0,
        total: Number(vo.product.fixed_price || 25000),
        payment_mode: 'cod',
        created_at: new Date(Date.now() - (30 - i) * 86400000).toISOString()
      });
      await k('order_items').insert({
        order_id: orderId,
        sku: vo.product.sku,
        quantity: 1,
        snapshot: JSON.stringify({ sku: vo.product.sku, name: vo.product.name, price: Number(vo.product.fixed_price || 25000) })
      });
    }
  }

  // 4. Seed reviews with natural Indian customer reviews, clear preview test markings, and status variety
  const reviewDefinitions = [
    // Eclipse Ring Reviews (Approved)
    {
      product: eclipseRing,
      customerEmail: 'ananya.iyer@example.invalid',
      rating: 5,
      title: '[Preview Test] Breathtaking warm pearl luster and comfortable band',
      comment: '[Catalogue Preview Test] The luminous organic glow of the pearl against the 18K yellow gold setting is truly captivating. Sizing 14 fits like an absolute dream and the low-profile bezel feels secure for everyday festive wear. Packaging felt truly luxurious.',
      status: 'approved',
      is_verified_purchase: true,
      images: ['/assets/products/eclipse-ring/modal.webp', '/assets/products/eclipse-ring/hero.webp'],
      daysAgo: 14
    },
    {
      product: eclipseRing,
      customerEmail: 'pooja.verma@example.invalid',
      rating: 5,
      title: '[Preview Test] Elegant heirloom finish, exquisite craftsmanship',
      comment: '[Catalogue Preview Test] Ordered this for a family celebration in Mumbai. The pearl has subtle rose-champagne iridescence that photographs beautifully in natural light.',
      status: 'approved',
      is_verified_purchase: true,
      images: [],
      daysAgo: 10
    },
    {
      product: eclipseRing,
      customerEmail: 'neha.kulkarni@example.invalid',
      rating: 4,
      title: '[Preview Test] Gorgeous statement piece, minor delay in courier',
      comment: '[Catalogue Preview Test] The ring itself is flawless, with a delicate finish and premium feel. It took four days to reach Pune, but the packaging kept the velvet box in mint condition.',
      status: 'approved',
      is_verified_purchase: true,
      images: [],
      daysAgo: 6
    },
    {
      product: eclipseRing,
      customerEmail: 'deepak.joshi@example.invalid',
      rating: 5,
      title: '[Preview Test] Perfect anniversary gift for my spouse',
      comment: '[Catalogue Preview Test] My wife loved the minimal modern interpretation of classic pearl jewellery. The smooth contour does not snag on silk sarees.',
      status: 'approved',
      is_verified_purchase: false,
      images: [],
      daysAgo: 3
    },

    // Lune Pearl Drops (Approved & Pending)
    {
      product: luneDrops,
      customerEmail: 'rohan.mehta@example.invalid',
      rating: 5,
      title: '[Preview Test] Graceful drop earrings with radiant baroque pearls',
      comment: '[Catalogue Preview Test] The balance on these drops is phenomenal—light enough to wear through an entire evening reception without tugging the lobe. Beautiful movement and satin gold tone.',
      status: 'approved',
      is_verified_purchase: true,
      images: ['/assets/products/lune-pearl-drops/modal.webp'],
      daysAgo: 12
    },
    {
      product: luneDrops,
      customerEmail: 'kavita.nair@example.invalid',
      rating: 5,
      title: '[Preview Test] Sublime quality, exactly as pictured in preview',
      comment: '[Catalogue Preview Test] The pearls match each other in tone and luster while retaining subtle natural organic shapes. The butterfly back clasp is firm and secure.',
      status: 'approved',
      is_verified_purchase: true,
      images: [],
      daysAgo: 8
    },
    {
      product: luneDrops,
      customerEmail: 'arjun.patel@example.invalid',
      rating: 4,
      title: '[Preview Test] Beautiful delicate earrings, gentle movement',
      comment: '[Catalogue Preview Test] Bought as a gift. The presentation box with silk pull-ribbon was very memorable. Pearls have deep natural luster.',
      status: 'approved',
      is_verified_purchase: false,
      images: [],
      daysAgo: 4
    },
    {
      product: luneDrops,
      customerEmail: 'aditya.sharma@example.invalid',
      rating: 5,
      title: '[Preview Test] Awaiting moderator approval: Stunning festive earrings',
      comment: '[Catalogue Preview Test] Submitted review pending moderation: Outstanding pearl lustre and pristine finishing. Truly matches high jewellery standards.',
      status: 'pending',
      is_verified_purchase: false,
      images: [],
      daysAgo: 1
    },

    // Atelier Pearl Collar
    {
      product: atelierCollar,
      customerEmail: 'vikram.singhania@example.invalid',
      rating: 5,
      title: '[Preview Test] Exceptional bespoke presence and rich gold weight',
      comment: '[Catalogue Preview Test] The 22K gold alloy gives this collar necklace a deep imperial warmth. The centerpiece pearl is immaculate with mirror-like orient. Truly an investment heirloom.',
      status: 'approved',
      is_verified_purchase: true,
      images: ['/assets/products/atelier-pearl-collar/modal.webp'],
      daysAgo: 18
    },
    {
      product: atelierCollar,
      customerEmail: 'sneha.rao@example.invalid',
      rating: 5,
      title: '[Preview Test] The showstopper of my wedding reception ensemble',
      comment: '[Catalogue Preview Test] Received countless compliments. Sits gracefully on the collarbone without twisting. Highly recommend Veyora for bespoke bridal jewellery.',
      status: 'approved',
      is_verified_purchase: true,
      images: [],
      daysAgo: 9
    },
    {
      product: atelierCollar,
      customerEmail: 'pooja.verma@example.invalid',
      rating: 4,
      title: '[Preview Test] Pending review: Royal craftsmanship, wish chain was slightly longer',
      comment: '[Catalogue Preview Test] Submitted review pending moderation: The craftsmanship is stellar. The 42 cm length sits snug; an extension link would be welcome.',
      status: 'pending',
      is_verified_purchase: false,
      images: [],
      daysAgo: 2
    },

    // Nocturne Cuff
    {
      product: nocturneCuff,
      customerEmail: 'aditya.sharma@example.invalid',
      rating: 5,
      title: '[Preview Test] Architectural silhouette and effortless slip-on fit',
      comment: '[Catalogue Preview Test] The dual-pearl terminals give this cuff a refined modern edge. The gold structure has just the right amount of spring tension to wear securely on the wrist.',
      status: 'approved',
      is_verified_purchase: true,
      images: ['/assets/products/nocturne-cuff/modal.webp'],
      daysAgo: 15
    },
    {
      product: nocturneCuff,
      customerEmail: 'ananya.iyer@example.invalid',
      rating: 4,
      title: '[Preview Test] Sleek and contemporary cuff bracelet',
      comment: '[Catalogue Preview Test] Very chic styling piece. Looks stunning paired with both Western blazers and handwoven silk sarees.',
      status: 'approved',
      is_verified_purchase: false,
      images: [],
      daysAgo: 7
    },

    // Noir Halo Studs
    {
      product: noirStuds,
      customerEmail: 'arjun.patel@example.invalid',
      rating: 5,
      title: '[Preview Test] Understated luxury for daily corporate and festive wear',
      comment: '[Catalogue Preview Test] The black-toned halo contrast enhances the luminous white pearl centerpiece dramatically. Extremely comfortable posts.',
      status: 'approved',
      is_verified_purchase: true,
      images: [],
      daysAgo: 11
    },
    {
      product: noirStuds,
      customerEmail: 'neha.kulkarni@example.invalid',
      rating: 3,
      title: '[Preview Test] Subtle studs, smaller in size than expected from photos',
      comment: '[Catalogue Preview Test] The craftsmanship is fine, but the studs are petite. Would recommend reviewing the diameter dimensions carefully before purchasing.',
      status: 'approved',
      is_verified_purchase: false,
      images: [],
      daysAgo: 5
    },

    // Velours Earrings
    {
      product: veloursEarrings,
      customerEmail: 'kavita.nair@example.invalid',
      rating: 5,
      title: '[Preview Test] Velvety luster and romantic vintage design',
      comment: '[Catalogue Preview Test] Classic Veyora aesthetic—delicate milgrain detailing with pearls that catch the evening candlelight so warmly.',
      status: 'approved',
      is_verified_purchase: false,
      images: [],
      daysAgo: 13
    },
    {
      product: veloursEarrings,
      customerEmail: 'rohan.mehta@example.invalid',
      rating: 4,
      title: '[Preview Test] High quality gift purchase, delivered on time in Bengaluru',
      comment: '[Catalogue Preview Test] The recipient was deeply touched by the thoughtful packaging and assay card. Great attention to detail.',
      status: 'approved',
      is_verified_purchase: false,
      images: [],
      daysAgo: 6
    },

    // Pending Reviews for Admin Moderation Testing
    {
      product: eclipseRing,
      customerEmail: 'arjun.patel@example.invalid',
      rating: 5,
      title: '[Preview Test] Pending Review: In love with the luster of this pearl',
      comment: '[Catalogue Preview Test] Submitted review awaiting moderation: Ordered this ring last week. The pearl has unbelievable iridescence in sunlight.',
      status: 'pending',
      is_verified_purchase: false,
      images: [],
      daysAgo: 1
    },
    {
      product: nocturneCuff,
      customerEmail: 'deepak.joshi@example.invalid',
      rating: 5,
      title: '[Preview Test] Pending Review: Elegant cuff for special occasions',
      comment: '[Catalogue Preview Test] Submitted review awaiting moderation: Outstanding build quality and solid gold feel on wrist.',
      status: 'pending',
      is_verified_purchase: false,
      images: [],
      daysAgo: 0
    },

    // Rejected Reviews for Admin Moderation Testing (e.g. Off-topic, spam attempt, or pricing complaint)
    {
      product: eclipseRing,
      customerEmail: 'rohan.mehta@example.invalid',
      rating: 1,
      title: '[Preview Test] Rejected review: Off-topic seller inquiry',
      comment: '[Catalogue Preview Test] Rejected by admin for policy violation: Can someone call me on WhatsApp to discuss gold wholesale prices? Not reviewing the actual piece.',
      status: 'rejected',
      is_verified_purchase: false,
      images: [],
      daysAgo: 16
    },
    {
      product: atelierCollar,
      customerEmail: 'arjun.patel@example.invalid',
      rating: 2,
      title: '[Preview Test] Rejected review: Duplicate promotional spam',
      comment: '[Catalogue Preview Test] Rejected by admin for policy violation: Check out my jewellery blog and discounts at external link.',
      status: 'rejected',
      is_verified_purchase: false,
      images: [],
      daysAgo: 20
    }
  ];

  let insertedCount = 0;
  for (const rev of reviewDefinitions) {
    if (!rev.product) continue;
    const userId = customerMap[rev.customerEmail];
    if (!userId) continue;

    const createdAt = new Date(Date.now() - (rev.daysAgo || 0) * 86400000).toISOString();

    const [reviewId] = await k('reviews').insert({
      product_id: rev.product.id,
      user_id: userId,
      rating: rev.rating,
      title: rev.title,
      comment: rev.comment,
      status: rev.status,
      is_verified_purchase: rev.is_verified_purchase,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null
    });

    let reviewImages = rev.images || [];
    if (reviewImages.length > 0 && rev.product) {
      const code = rev.product.product_code || rev.product.slug;
      const dbImages = await k('product_images')
        .where(q => q.where({ product_code: code }).orWhere({ sku: rev.product.sku }))
        .whereIn('role', ['detail', 'model', 'hero', 'front'])
        .orderBy('sort_order', 'desc');
      if (dbImages.length > 0) {
        reviewImages = dbImages.slice(0, reviewImages.length).map(img => img.url);
      }
    }

    if (reviewImages.length > 0) {
      await k('review_images').insert(
        reviewImages.map(url => ({
          review_id: reviewId,
          image_url: url,
          created_at: createdAt
        }))
      );
    }

    insertedCount++;
  }

  return {
    inserted: insertedCount,
    customersSeeded: seededCustomers.length,
    message: `Seeded ${insertedCount} realistic customer reviews across products.`
  };
}

export const seedReviews = ReviewSeeder;
export default ReviewSeeder;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await ReviewSeeder(), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
