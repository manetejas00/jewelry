import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { stringify } from 'csv-stringify/sync';
import { createDb, db, migrate } from '../server/db.js';
import { previewImport, publishImport, schemas } from '../server/importer.js';
import { products, gold } from '../scripts/samples.js';
import { registerCustomer } from '../server/customers.js';
import { catalogue } from '../server/pricing.js';
import {
  sanitizeText,
  checkSpam,
  validateReviewInput,
  resolveProduct,
  checkVerifiedPurchase,
  formatCustomerName,
  submitReview,
  updateCustomerReview,
  getProductReviews,
  getAllProductsRatingSummaries,
  getAdminReviews,
  getAdminReviewById,
  adminUpdateReviewStatus,
  adminBulkReviewStatus,
  adminEditReview,
  adminDeleteReview
} from '../server/reviews.js';
import { seedReviews } from '../seeders/ReviewSeeder.js';

let k;
let customerA, customerB, customerC;
const password = 'A secure test password 123!';

before(async () => {
  k = createDb(':memory:');
  await migrate(k);

  // Import gold and products fixtures
  for (const [kind, rows] of [['gold', gold], ['products', products]]) {
    const batch = await previewImport(k, kind, stringify(rows, { header: true, columns: schemas[kind] }));
    await publishImport(k, batch.id);
  }

  // Register test customers
  customerA = await registerCustomer(k, { name: 'Aarav Mehta', email: 'aarav.mehta@example.invalid', password });
  customerB = await registerCustomer(k, { name: 'Priya Sharma', email: 'priya.sharma@example.invalid', password });
  customerC = await registerCustomer(k, { name: 'Rohan Gupta', email: 'rohan.gupta@example.invalid', password });
});

after(async () => {
  await k.destroy();
  await db.destroy();
});

test('text sanitization strips HTML tags and control characters', () => {
  assert.equal(sanitizeText('Hello <script>alert(1)</script> World'), 'Hello alert(1) World');
  assert.equal(sanitizeText('<b>Great</b> <img src=x onerror=alert(1)> piece!'), 'Great  piece!');
  assert.equal(sanitizeText('  clean text  '), 'clean text');
  assert.equal(sanitizeText(null), '');
  assert.equal(sanitizeText(undefined), '');
});

test('spam check catches repetitive characters and banned promotion patterns', () => {
  assert.doesNotThrow(() => checkSpam('Stunning finish', 'The 18K yellow gold luster exceeded my expectations.'));
  assert.throws(() => checkSpam('Great', 'So good aaaaaaaaaaaaaaa piece'), /repetitive/i);
  assert.throws(() => checkSpam('Check out casino', 'Visit this casino link now'), /prohibited/i);
  assert.throws(() => checkSpam('Crypto promo', 'Get your crypto airdrop fast'), /prohibited/i);
  assert.throws(() => checkSpam('Visit here', 'See https://spam.example.com for discounts'), /prohibited/i);
});

test('input validation enforces valid star rating (1-5), non-empty title and meaningful comment', () => {
  const valid = { rating: 5, title: 'Spectacular luster', comment: 'Exquisite craftsmanship with radiant finish.' };
  assert.doesNotThrow(() => validateReviewInput(valid));

  // Invalid star ratings
  assert.throws(() => validateReviewInput({ ...valid, rating: 0 }), /between 1 and 5/i);
  assert.throws(() => validateReviewInput({ ...valid, rating: 6 }), /between 1 and 5/i);
  assert.throws(() => validateReviewInput({ ...valid, rating: 3.5 }), /integer/i);
  assert.throws(() => validateReviewInput({ ...valid, rating: 'invalid-number' }), /integer/i);
  assert.throws(() => validateReviewInput({ ...valid, rating: null }), /integer/i);
  assert.throws(() => validateReviewInput({ ...valid, rating: -1 }), /between 1 and 5/i);

  // Invalid title
  assert.throws(() => validateReviewInput({ ...valid, title: '' }), /title/i);
  assert.throws(() => validateReviewInput({ ...valid, title: '    ' }), /title/i);
  assert.throws(() => validateReviewInput({ ...valid, title: 'a'.repeat(151) }), /150 characters/i);

  // Invalid comment
  assert.throws(() => validateReviewInput({ ...valid, comment: 'Too short' }), /at least 10 characters/i);
  assert.throws(() => validateReviewInput({ ...valid, comment: 'a'.repeat(3001) }), /3000 characters/i);

  // Invalid image array
  assert.throws(() => validateReviewInput({ ...valid, images: [123] }), /valid image URL/i);
  assert.throws(() => validateReviewInput({ ...valid, images: Array(6).fill('/uploads/test.jpg') }), /up to 5 images/i);
});

test('customer name privacy formatting masks last name while showing initial', () => {
  assert.equal(formatCustomerName('Aarav Mehta'), 'Aarav M.');
  assert.equal(formatCustomerName('Priya'), 'Priya');
  assert.equal(formatCustomerName('Ananya Deep Roy'), 'Ananya R.');
  assert.equal(formatCustomerName(''), 'Customer');
});

test('verified purchase check recognizes completed orders matching product SKU', async () => {
  const stamp = new Date().toISOString();
  const orderId = 'ORD-TEST-001';

  // Create an order for customerA containing VEY-ER-14 (eclipse-ring)
  await k('orders').insert({
    id: orderId,
    customer_id: customerA.id,
    customer: JSON.stringify({ name: 'Aarav Mehta', email: customerA.email }),
    subtotal: 50000,
    shipping: 0,
    total: 50000,
    status: 'delivered',
    payment_mode: 'cod',
    created_at: stamp
  });

  await k('order_items').insert({
    order_id: orderId,
    sku: 'VEY-ER-14',
    quantity: 1,
    snapshot: JSON.stringify({ sku: 'VEY-ER-14', size: '14' })
  });

  // customerA purchased eclipse-ring
  assert.equal(await checkVerifiedPurchase(k, customerA.id, 'eclipse-ring'), true);

  // customerB did not purchase eclipse-ring
  assert.equal(await checkVerifiedPurchase(k, customerB.id, 'eclipse-ring'), false);

  // customerA did not purchase lune-pearl-drops
  assert.equal(await checkVerifiedPurchase(k, customerA.id, 'lune-pearl-drops'), false);
});

test('submitting a review sets status to pending and records verified purchase status', async () => {
  const rev = await submitReview(k, customerA.id, 'eclipse-ring', {
    rating: 5,
    title: 'Heirloom craftsmanship',
    comment: 'The band has substantial weight and brilliant stone setting.',
    images: ['/uploads/review-photo-1.jpg']
  });

  assert.ok(rev.id > 0);
  assert.equal(rev.status, 'pending');
  assert.equal(rev.isVerifiedPurchase, true); // Since customerA purchased it
  assert.equal(rev.rating, 5);
  assert.equal(rev.title, 'Heirloom craftsmanship');
  assert.equal(rev.images.length, 1);
  assert.equal(rev.images[0], '/uploads/review-photo-1.jpg');

  // Verify review exists in DB
  const inDb = await k('reviews').where({ id: rev.id }).first();
  assert.equal(inDb.status, 'pending');
  assert.equal(inDb.user_id, customerA.id);

  // Verify review_images table has the row
  const imgRow = await k('review_images').where({ review_id: rev.id }).first();
  assert.equal(imgRow.image_url, '/uploads/review-photo-1.jpg');
});

test('duplicate review submission for the same product and customer throws 409 conflict', async () => {
  await assert.rejects(
    submitReview(k, customerA.id, 'eclipse-ring', {
      rating: 4,
      title: 'Trying a second review',
      comment: 'This should be blocked as duplicate.'
    }),
    err => {
      assert.equal(err.status, 409);
      assert.match(err.message, /already/i);
      return true;
    }
  );
});

test('public query getProductReviews hides pending reviews from the public while customer sees myReview', async () => {
  // Public query without customer context
  const publicRes = await getProductReviews(k, 'eclipse-ring', {});
  assert.equal(publicRes.reviews.length, 0); // Pending review is hidden
  assert.equal(publicRes.summary.totalReviews, 0);
  assert.equal(publicRes.summary.averageRating, null);
  assert.equal(publicRes.myReview, null);

  // Query as author customerA with currentCustomerId
  const authorRes = await getProductReviews(k, 'eclipse-ring', { currentCustomerId: customerA.id });
  assert.equal(authorRes.reviews.length, 0); // Public list still 0
  assert.ok(authorRes.myReview !== null);
  assert.equal(authorRes.myReview.status, 'pending');
  assert.equal(authorRes.myReview.title, 'Heirloom craftsmanship');

  // Query as customerB with currentCustomerId
  const otherRes = await getProductReviews(k, 'eclipse-ring', { currentCustomerId: customerB.id });
  assert.equal(otherRes.myReview, null);
});

test('admin can approve review, making it publicly visible and updating summary statistics', async () => {
  const authorRes = await getProductReviews(k, 'eclipse-ring', { currentCustomerId: customerA.id });
  assert.ok(authorRes.myReview);
  const reviewId = authorRes.myReview.id;

  // Admin approves review
  const updated = await adminUpdateReviewStatus(k, reviewId, 'approved');
  assert.equal(updated.status, 'approved');

  // Public query now reflects the review
  const publicRes = await getProductReviews(k, 'eclipse-ring', {});
  assert.equal(publicRes.reviews.length, 1);
  assert.equal(publicRes.reviews[0].customerName, 'Aarav M.');
  assert.equal(publicRes.reviews[0].isVerifiedPurchase, true);
  assert.equal(publicRes.summary.totalReviews, 1);
  assert.equal(publicRes.summary.averageRating, 5);
  assert.equal(publicRes.summary.distribution[5], 1);
  assert.equal(publicRes.summary.percentages[5], 100);
});

test('submitting a second customer review and calculating multiple ratings and distributions', async () => {
  // customerB reviews eclipse-ring (unverified)
  const revB = await submitReview(k, customerB.id, 'eclipse-ring', {
    rating: 3,
    title: 'Nice but slightly tight',
    comment: 'The band profile is slightly thicker than expected.'
  });

  assert.equal(revB.isVerifiedPurchase, false);

  // Admin approves customerB review
  await adminUpdateReviewStatus(k, revB.id, 'approved');

  const publicRes = await getProductReviews(k, 'eclipse-ring', {});
  assert.equal(publicRes.reviews.length, 2);
  assert.equal(publicRes.summary.totalReviews, 2);
  // Average of 5 and 3 is 4.0
  assert.equal(publicRes.summary.averageRating, 4.0);
  assert.equal(publicRes.summary.distribution[5], 1);
  assert.equal(publicRes.summary.distribution[3], 1);
  assert.equal(publicRes.summary.percentages[5], 50);
  assert.equal(publicRes.summary.percentages[3], 50);
  assert.equal(publicRes.summary.verifiedPurchasesCount, 1);
});

test('filtering by star rating and sorting by highest/lowest/recent', async () => {
  // Filter by 5 stars
  const filtered5 = await getProductReviews(k, 'eclipse-ring', { rating: 5 });
  assert.equal(filtered5.reviews.length, 1);
  assert.equal(filtered5.reviews[0].rating, 5);

  // Filter by 3 stars
  const filtered3 = await getProductReviews(k, 'eclipse-ring', { rating: 3 });
  assert.equal(filtered3.reviews.length, 1);
  assert.equal(filtered3.reviews[0].rating, 3);

  // Filter by 1 star (empty)
  const filtered1 = await getProductReviews(k, 'eclipse-ring', { rating: 1 });
  assert.equal(filtered1.reviews.length, 0);

  // Sort by highest
  const highest = await getProductReviews(k, 'eclipse-ring', { sort: 'highest' });
  assert.equal(highest.reviews[0].rating, 5);
  assert.equal(highest.reviews[1].rating, 3);

  // Sort by lowest
  const lowest = await getProductReviews(k, 'eclipse-ring', { sort: 'lowest' });
  assert.equal(lowest.reviews[0].rating, 3);
  assert.equal(lowest.reviews[1].rating, 5);
});

test('customer editing review resets status to pending for re-moderation', async () => {
  const authorRes = await getProductReviews(k, 'eclipse-ring', { currentCustomerId: customerA.id });
  const reviewId = authorRes.myReview.id;

  const edited = await updateCustomerReview(k, customerA.id, reviewId, {
    rating: 5,
    title: 'Heirloom craftsmanship - Updated',
    comment: 'Updated review after wearing it for three months continuously.'
  });

  assert.equal(edited.status, 'pending'); // Must reset to pending!
  assert.equal(edited.title, 'Heirloom craftsmanship - Updated');

  // Public reviews should now only show 1 approved review (customerB's)
  const publicRes = await getProductReviews(k, 'eclipse-ring', {});
  assert.equal(publicRes.reviews.length, 1);
  assert.equal(publicRes.reviews[0].title, 'Nice but slightly tight');
  assert.equal(publicRes.summary.totalReviews, 1);
  assert.equal(publicRes.summary.averageRating, 3.0);

  // Re-approve customerA's review
  await adminUpdateReviewStatus(k, reviewId, 'approved');
});

test('customer cannot edit another customer review', async () => {
  const authorRes = await getProductReviews(k, 'eclipse-ring', { currentCustomerId: customerA.id });
  const reviewId = authorRes.myReview.id;

  await assert.rejects(
    updateCustomerReview(k, customerC.id, reviewId, {
      rating: 1,
      title: 'Malicious modification',
      comment: 'Trying to tamper with another review.'
    }),
    err => {
      assert.ok([403, 404].includes(err.status));
      return true;
    }
  );
});

test('variants of same product code share reviews and ratings', async () => {
  // Query by variant SKU or product_code
  const res1 = await getProductReviews(k, 'eclipse-ring', {});
  const res2 = await getProductReviews(k, 'VEY-ER-14', {});
  const res3 = await getProductReviews(k, 'VEY-ER-12', {});

  assert.equal(res1.summary.totalReviews, res2.summary.totalReviews);
  assert.equal(res2.summary.totalReviews, res3.summary.totalReviews);
  assert.equal(res1.summary.averageRating, res2.summary.averageRating);
});

test('catalogue attaches rating summary to all product listings', async () => {
  const cat = await catalogue(k);
  assert.ok(Array.isArray(cat));
  assert.ok(cat.length > 0);

  const eclipse = cat.find(p => p.product_code === 'eclipse-ring');
  assert.ok(eclipse);
  assert.equal(eclipse.rating_count, 2);
  assert.equal(eclipse.rating_average, 4.0);
  assert.deepEqual(eclipse.rating, { average: 4.0, count: 2 });

  // Unreviewed product has 0 count and null average
  const lune = cat.find(p => p.product_code === 'lune-pearl-drops');
  assert.ok(lune);
  assert.equal(lune.rating_count, 0);
  assert.equal(lune.rating_average, null);
  assert.deepEqual(lune.rating, { average: null, count: 0 });
});

test('admin review listing, statistics, search, and filtering', async () => {
  // Submit a review for customerC that is rejected
  const revC = await submitReview(k, customerC.id, 'lune-pearl-drops', {
    rating: 1,
    title: 'Did not match expectations',
    comment: 'The pearls were not as pictured on website.'
  });
  await adminUpdateReviewStatus(k, revC.id, 'rejected');

  const adminList = await getAdminReviews(k, { page: 1, limit: 10 });
  assert.ok(adminList.pagination.total >= 3);
  assert.equal(adminList.stats.total, 3);
  assert.equal(adminList.stats.approved, 2);
  assert.equal(adminList.stats.rejected, 1);
  assert.equal(adminList.stats.pending, 0);

  // Search by customer name
  const searched = await getAdminReviews(k, { search: 'Aarav' });
  assert.equal(searched.reviews.length, 1);
  assert.equal(searched.reviews[0].customerName, 'Aarav Mehta');

  // Search by product name
  const searchedProd = await getAdminReviews(k, { search: 'Eclipse' });
  assert.equal(searchedProd.reviews.length, 2);

  // Filter by status rejected
  const filteredRejected = await getAdminReviews(k, { status: 'rejected' });
  assert.equal(filteredRejected.reviews.length, 1);
  assert.equal(filteredRejected.reviews[0].id, revC.id);

  // Detail view
  const detail = await getAdminReviewById(k, revC.id);
  assert.equal(detail.id, revC.id);
  assert.equal(detail.customerName, 'Rohan Gupta');
  assert.equal(detail.status, 'rejected');
});

test('admin bulk status update approves and rejects multiple reviews at once', async () => {
  // Submit two new reviews from customerB and customerC on atelier-pearl-collar
  const rev1 = await submitReview(k, customerB.id, 'lune-pearl-drops', {
    rating: 4,
    title: 'Graceful drops',
    comment: 'Lustrous south sea pearls that hang elegantly.'
  });

  const rev2 = await submitReview(k, customerC.id, 'atelier-pearl-collar', {
    rating: 5,
    title: 'Stately collar',
    comment: 'Remarkable gold collar with architectural contours.'
  });

  assert.equal(rev1.status, 'pending');
  assert.equal(rev2.status, 'pending');

  // Bulk approve
  const result = await adminBulkReviewStatus(k, [rev1.id, rev2.id], 'approved');
  assert.equal(result.updatedCount, 2);

  const check1 = await getAdminReviewById(k, rev1.id);
  const check2 = await getAdminReviewById(k, rev2.id);
  assert.equal(check1.status, 'approved');
  assert.equal(check2.status, 'approved');
});

test('admin edit allows modifying review rating, headline, and body', async () => {
  const reviews = await k('reviews').where({ status: 'approved' });
  assert.ok(reviews.length > 0);
  const target = reviews[0];

  const edited = await adminEditReview(k, target.id, {
    rating: 4,
    title: 'Moderated Headline',
    comment: 'Moderated description by administrator.'
  });

  assert.equal(edited.rating, 4);
  assert.equal(edited.title, 'Moderated Headline');
  assert.equal(edited.comment, 'Moderated description by administrator.');
});

test('admin delete removes review and cascading review_images', async () => {
  const rev = await submitReview(k, customerA.id, 'atelier-pearl-collar', {
    rating: 4,
    title: 'Temporary collar review',
    comment: 'Will be deleted shortly to test cascade.',
    images: ['/uploads/temporary-image.jpg']
  });

  assert.ok(rev.id > 0);
  assert.equal((await k('review_images').where({ review_id: rev.id })).length, 1);

  // Admin delete
  const deleted = await adminDeleteReview(k, rev.id);
  assert.equal(deleted.ok, true);

  // Review should not exist in DB
  const inDb = await k('reviews').where({ id: rev.id }).first();
  assert.equal(inDb, undefined);

  // review_images should also be removed
  const imgInDb = await k('review_images').where({ review_id: rev.id }).first();
  assert.equal(imgInDb, undefined);
});

test('ReviewSeeder populates realistic preview reviews from scratch and runs idempotently', async () => {
  // Test ReviewSeeder on a fresh in-memory database with seeded products
  const freshDb = createDb(':memory:');
  try {
    await migrate(freshDb);
    for (const [kind, rows] of [['gold', gold], ['products', products]]) {
      const batch = await previewImport(freshDb, kind, stringify(rows, { header: true, columns: schemas[kind] }));
      await publishImport(freshDb, batch.id);
    }

    const seedResult = await seedReviews(freshDb);
    assert.equal(seedResult.inserted, 21);
    assert.equal(seedResult.customersSeeded, 10);

    const count = await freshDb('reviews').count('* as total').first();
    assert.equal(Number(count.total), 21);

    // Verify all seeded reviews are identified with preview tags
    const previewReviews = await freshDb('reviews').where('title', 'like', '%[Preview Test]%');
    assert.equal(previewReviews.length, 21);

    // Second run must be idempotent (skipped: true)
    const secondRun = await seedReviews(freshDb);
    assert.equal(secondRun.skipped, true);
    assert.equal(secondRun.existing, 21);

    const countAfter = await freshDb('reviews').count('* as total').first();
    assert.equal(Number(countAfter.total), 21);
  } finally {
    await freshDb.destroy();
  }
});
