import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';

export const seededKurtaCustomers = [
  { name: 'Ananya Iyer', email: 'ananya.iyer@example.invalid' },
  { name: 'Sunita Sharma', email: 'sunita.sharma@example.invalid' },
  { name: 'Dr. Meera Radhakrishnan', email: 'meera.r@example.invalid' },
  { name: 'Pooja Verma', email: 'pooja.verma@example.invalid' },
  { name: 'Tanvi Bhatia', email: 'tanvi.bhatia@example.invalid' },
  { name: 'Ritu Saxena', email: 'ritu.saxena@example.invalid' },
  { name: 'Neha Kulkarni', email: 'neha.kulkarni@example.invalid' },
  { name: 'Aditi Singhal', email: 'aditi.singhal@example.invalid' },
  { name: 'Divya Nair', email: 'divya.nair@example.invalid' },
  { name: 'Sneha Patel', email: 'sneha.patel@example.invalid' },
  { name: 'Kavita Sen', email: 'kavita.sen@example.invalid' },
  { name: 'Priya Deshmukh', email: 'priya.deshmukh@example.invalid' },
  { name: 'Shalini Mukherjee', email: 'shalini.m@example.invalid' },
  { name: 'Vandana Joshi', email: 'vandana.joshi@example.invalid' }
];

// Rich, authentic impressions crafted specifically for Lucknowi Chikankari needlecraft
const authenticImpressions = [
  {
    rating: 5,
    title: 'Exquisite Lucknowi Bakhiya and Phanda needlecraft',
    comment: 'The craftsmanship on this piece is truly heirloom grade. The delicate shadow work on the reverse combined with tiny pearl milgrain knots gives it an opaque glow. Breathtaking in natural sunlight.'
  },
  {
    rating: 5,
    title: 'Pure mulmul cotton that breathes effortlessly in warm weather',
    comment: 'The fabric feels like a gentle whisper against the skin. Even in the sweltering heat of Delhi, it kept me exceptionally cool and comfortable throughout the day. Sizing was impeccably true to the size chart.'
  },
  {
    rating: 5,
    title: 'Tone-on-tone embroidery is refined and never snags or itches',
    comment: 'So many Chikankari kurtas have scratchy backing, but this atelier piece is unbelievably soft on the inside. The embroidery threads are pure cotton and lie smooth against the body.'
  },
  {
    rating: 5,
    title: 'Received countless compliments at a festive family luncheon',
    comment: 'I styled this with pearl jhumkis and ivory cigarette pants. At least five family members asked where I acquired it. Authentic craftsmanship directly reminiscent of Hazratganj heritage boutiques.'
  },
  {
    rating: 4,
    title: 'Flawless straight drape; pairs effortlessly with both palazzo and denim',
    comment: 'The side slits and hemline are finished with meticulous hand-rolled piping. The fabric has a relaxed, graceful fall. Courier took three days to reach Pune, but packaging in the Veyora signature box was mint.'
  },
  {
    rating: 5,
    title: 'Stitches remain embossed and crisp even after gentle hand-wash',
    comment: 'I followed the care guidelines—cold water hand wash and reverse iron. The Keel Kangan floral vines kept their tactile texture and the fabric did not shrink a millimeter. Outstanding durability.'
  },
  {
    rating: 5,
    title: 'The pastel hue is even more luminous in person',
    comment: 'The dye work has a delicate vintage saturation that feels serene and luxurious. The fabric is light without being flimsy, and the yoke embroidery frames the collarbones with royal grace.'
  },
  {
    rating: 4,
    title: 'Very comfortable armholes and neck cut with zero gaping',
    comment: 'Often ready-made kurtas fit awkwardly around the bust or shoulder seams, but this cut has thoughtful tailoring. Comfortable for 10-hour days at work or festive celebrations.'
  },
  {
    rating: 5,
    title: 'Museum quality jaal embroidery across the bodice',
    comment: 'Every floral vine and petal is formed by hand needles. You can genuinely feel the artisanal dedication behind the garment. Worth every single rupee.'
  },
  {
    rating: 5,
    title: 'Royal Awadhi silhouette with dreamy graceful movement',
    comment: 'The flare billows softly as you walk. The weight of the embroidery at the hem gives it just the right natural drop. Simply sublime.'
  }
];

export async function KurtaReviewSeeder(k = db, { clean = true, recordOrders = true } = {}) {
  const hasReviews = await k.schema.hasTable('reviews').catch(() => false);
  if (!hasReviews) {
    throw new Error('Table "reviews" does not exist. Run database migrations first.');
  }

  const hasKurtas = await k.schema.hasTable('kurtas').catch(() => false);
  if (!hasKurtas) {
    throw new Error('Table "kurtas" does not exist. Ensure Kurta module is migrated.');
  }

  // 1. Clean existing reviews if clean is true
  if (clean) {
    if (await k.schema.hasTable('review_images')) {
      await k('review_images').del();
    }
    await k('reviews').del();
  }

  const stamp = now();
  const passwordHash = await bcrypt.hash('kurta-patron-password', 10);

  // 2. Ensure customer accounts exist
  const customerMap = {};
  for (const c of seededKurtaCustomers) {
    let row = await k('customers').where({ email: c.email.toLowerCase() }).first();
    if (!row) {
      try {
        const [id] = await k('customers').insert({
          name: c.name,
          email: c.email.toLowerCase(),
          password_hash: passwordHash,
          created_at: stamp
        });
        const realId = typeof id === 'object' && id !== null ? (id.id || id[0]) : id;
        if (await k.schema.hasTable('customer_state')) {
          await k('customer_state').insert({
            customer_id: realId,
            bag: '[]',
            saved: '[]',
            revision: 0,
            updated_at: stamp
          }).catch(() => {});
        }
        row = { id: realId, ...c };
      } catch {
        row = await k('customers').where({ email: c.email.toLowerCase() }).first();
      }
    }
    if (row) {
      customerMap[c.email] = row.id;
    }
  }

  // 3. Fetch all Kurtas and their variants
  const kurtas = await k('kurtas').select('id', 'name', 'product_code', 'slug', 'sku', 'price', 'fixed_price', 'fabric', 'category');
  if (!kurtas.length) {
    return { inserted: 0, message: 'No kurtas found in database.' };
  }

  const hasKurtaVariants = await k.schema.hasTable('kurta_variants');
  const variantsByKurta = {};
  if (hasKurtaVariants) {
    const allVariants = await k('kurta_variants').select('id', 'kurta_id', 'sku', 'size', 'color', 'product_code');
    for (const v of allVariants) {
      if (!variantsByKurta[v.kurta_id]) variantsByKurta[v.kurta_id] = [];
      variantsByKurta[v.kurta_id].push(v);
    }
  }

  const customerEmails = seededKurtaCustomers.map(c => c.email);
  const usedProductCustomers = new Set();
  let totalReviewsInserted = 0;
  let totalOrdersInserted = 0;
  let totalImagesInserted = 0;

  const hasReviewImages = await k.schema.hasTable('review_images');
  const hasOrders = await k.schema.hasTable('orders');
  const hasOrderItems = await k.schema.hasTable('order_items');
  const hasOrderCustomerId = hasOrders && await k.schema.hasColumn('orders', 'customer_id');
  const hasOrderItemType = hasOrderItems && await k.schema.hasColumn('order_items', 'item_type');
  const hasOrderItemId = hasOrderItems && await k.schema.hasColumn('order_items', 'item_id');
  const hasKurtaIdCol = await k.schema.hasColumn('reviews', 'kurta_id');
  const hasJewelryIdCol = await k.schema.hasColumn('reviews', 'jewelry_id');
  const hasCoinIdCol = await k.schema.hasColumn('reviews', 'coin_id');
  const hasProductIdCol = await k.schema.hasColumn('reviews', 'product_id');
  const hasSubjectTypeCol = await k.schema.hasColumn('reviews', 'subject_type');
  const hasItemTypeCol = await k.schema.hasColumn('reviews', 'item_type');
  const hasProductsTable = await k.schema.hasTable('products');

  // Seed reviews for each Kurta
  for (let kIdx = 0; kIdx < kurtas.length; kIdx++) {
    const kurta = kurtas[kIdx];
    const variants = variantsByKurta[kurta.id] || [];
    const representativeSku = (variants[0] && variants[0].sku) || kurta.sku || kurta.product_code;

    // Determine review count: flagship kurtas (first 8) get 3-4 reviews, others get 2-3 reviews
    const numReviews = kIdx < 8 ? (kIdx % 2 === 0 ? 4 : 3) : 2;

    for (let rIdx = 0; rIdx < numReviews; rIdx++) {
      const customerEmail = customerEmails[(kIdx * 2 + rIdx) % customerEmails.length];
      const customerId = customerMap[customerEmail];
      const isVerified = rIdx < 2; // First 2 reviews are verified purchases

      // Generate staggered dates over past 40 days
      const daysAgo = Math.max(1, 40 - (kIdx * 2 + rIdx) % 38);
      const reviewDate = new Date(Date.now() - daysAgo * 86400000).toISOString();

      // Pick impression
      const baseImpression = authenticImpressions[(kIdx * 3 + rIdx) % authenticImpressions.length];

      // Custom tailored headline for specific flagship styles
      let customTitle = baseImpression.title;
      let customComment = baseImpression.comment;

      if (kurta.product_code === 'msk-003-nazm-orchid-pink-muslin-kurti') {
        if (rIdx === 0) {
          customTitle = 'The soft orchid pink tone and neckline Chikankari are breathtaking';
          customComment = 'I wore this for an intimate family puja. The pure muslin cotton is extraordinarily soft and breathable in humid weather. The tone-on-tone embroidery around the yoke is fine and delicate—authentic Lucknowi needlework at its absolute finest. True to size.';
        } else if (rIdx === 1) {
          customTitle = 'Exquisite hand-embroidery with flawless straight drape';
          customComment = 'The subtle floral butis scattered across the bodice give it such understated grace. Drapes beautifully without feeling stiff after a gentle hand-wash.';
        } else if (rIdx === 2) {
          customTitle = 'Weightless summer silhouette with royal Lucknowi grace';
          customComment = 'Sleeveless cut is very flattering and the armholes are cut to perfection with zero gaping. Paired it with pearl studs and white palazzo pants.';
        }
      } else if (kurta.product_code === 'msk-001-noor-lilac-mulmul-anarkali') {
        if (rIdx === 0) {
          customTitle = 'Graceful flare with authentic Awadhi needlework';
          customComment = 'The kalis create such a dreamy, feminine silhouette. Authentic Lucknowi craftsmanship—the Bakhiya shadow stitches on the reverse side give it a soft opaque glow.';
        } else if (rIdx === 1) {
          customTitle = 'My absolute favourite festive outfit this season';
          customComment = 'The lilac shade is so refreshing compared to the usual festive brights. Light as air mulmul cotton that keeps you cool all day.';
        }
      } else if (kurta.product_code === 'msk-005-aafreen-ivory-viscose-luxury-set') {
        if (rIdx === 0) {
          customTitle = 'An heirloom piece in pure ivory luxury';
          customComment = 'The sheer viscose georgette jaal is breathtaking. The 2-piece set has a royal Lucknowi court aesthetic that feels regal and luxurious.';
        }
      } else if (kurta.product_code === 'msk-009-shab-black-modal-set') {
        if (rIdx === 0) {
          customTitle = 'Dramatic midnight black with crisp white embroidery';
          customComment = 'The contrast of white Chikankari thread on midnight black modal cotton is an absolute showstopper. Silk-like sheen with cotton comfort.';
        }
      }

      // Create simulated verified order when a caller still wants preview orders.
      if (recordOrders && isVerified && hasOrders && hasOrderItems && customerId) {
        const orderId = `ORD-KURTA-${kurta.id}-${rIdx + 1}`;
        const orderExists = await k('orders').where({ id: orderId }).first();
        if (!orderExists) {
          const customerName = seededKurtaCustomers.find(c => c.email === customerEmail)?.name || 'Valued Patron';
          const orderPayload = {
            id: orderId,
            idempotency_key: `idemp-${orderId}`,
            status: 'delivered',
            customer: JSON.stringify({ name: customerName, email: customerEmail }),
            subtotal: Number(kurta.price || kurta.fixed_price || 999),
            shipping: 0,
            total: Number(kurta.price || kurta.fixed_price || 999),
            payment_mode: 'cod',
            created_at: new Date(Date.now() - (daysAgo + 3) * 86400000).toISOString()
          };
          if (hasOrderCustomerId) {
            orderPayload.customer_id = customerId;
          }
          await k('orders').insert(orderPayload).catch(() => {});

          const orderItemPayload = {
            order_id: orderId,
            sku: representativeSku,
            quantity: 1,
            snapshot: JSON.stringify({
              sku: representativeSku,
              name: kurta.name,
              price: Number(kurta.price || kurta.fixed_price || 999)
            })
          };
          if (hasOrderItemType) orderItemPayload.item_type = 'kurta';
          if (hasOrderItemId) orderItemPayload.item_id = kurta.id;

          await k('order_items').insert(orderItemPayload).catch(() => {});
          totalOrdersInserted++;
        }
      }

      // Check matching row in products table if available
      let legacyProductId = null;
      if (hasProductsTable) {
        const prodRow = await k('products')
          .where({ product_code: kurta.product_code })
          .orWhere({ sku: representativeSku })
          .first();
        if (prodRow) legacyProductId = prodRow.id;
      }

      // Prepare review record
      const reviewPayload = {
        user_id: customerId,
        rating: baseImpression.rating,
        title: customTitle,
        comment: customComment,
        status: 'approved',
        is_verified_purchase: isVerified ? 1 : 0,
        created_at: reviewDate,
        updated_at: reviewDate,
        deleted_at: null
      };

      if (hasProductIdCol) {
        const pairKey = legacyProductId && customerId ? `${legacyProductId}:${customerId}` : '';
        reviewPayload.product_id = pairKey && usedProductCustomers.has(pairKey) ? null : legacyProductId;
        if (pairKey && reviewPayload.product_id) usedProductCustomers.add(pairKey);
      }
      if (hasCoinIdCol) reviewPayload.coin_id = null;
      if (hasJewelryIdCol) reviewPayload.jewelry_id = null;
      if (hasKurtaIdCol) reviewPayload.kurta_id = kurta.id;
      if (hasSubjectTypeCol) reviewPayload.subject_type = 'kurta';
      if (hasItemTypeCol) reviewPayload.item_type = 'kurta';

      const [insertedReviewId] = await k('reviews').insert(reviewPayload);
      const reviewId = typeof insertedReviewId === 'object' && insertedReviewId !== null ? (insertedReviewId.id || insertedReviewId[0]) : insertedReviewId;
      totalReviewsInserted++;

      // Attach authentic photograph for selected reviews
      if (hasReviewImages && rIdx === 0 && kIdx < 6) {
        const imageUrl = `/assets/products/${kurta.slug}/hero.webp`;
        await k('review_images').insert({
          review_id: reviewId,
          image_url: imageUrl,
          created_at: reviewDate
        }).catch(() => {});
        totalImagesInserted++;
      }
    }
  }

  return {
    kurtasReviewed: kurtas.length,
    reviewsInserted: totalReviewsInserted,
    ordersInserted: totalOrdersInserted,
    imagesInserted: totalImagesInserted,
    message: `Successfully seeded ${totalReviewsInserted} optimized reviews across ${kurtas.length} Kurta designs.`
  };
}

export const seedKurtaReviews = KurtaReviewSeeder;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await KurtaReviewSeeder(db, { clean: true });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('KurtaReviewSeeder error:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
