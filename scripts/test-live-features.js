import assert from 'node:assert/strict';

const BASE_URL = process.argv[2] || 'https://test3.avinyacarefoundation.org';
console.log(`\n=== Running Live Feature Test Suite against ${BASE_URL} ===\n`);

async function runTests() {
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    process.stdout.write(`[${total}] Testing: ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('    Error:', err.message);
      if (err.cause) console.error('    Cause:', err.cause);
      process.exitCode = 1;
    }
  }

  // Helper for requests with cookie jar
  class SessionClient {
    constructor() {
      this.cookies = new Map();
    }
    async fetch(endpoint, options = {}) {
      const url = new URL(endpoint, BASE_URL);
      const headers = { ...(options.headers || {}) };
      if (this.cookies.size > 0) {
        headers['cookie'] = Array.from(this.cookies.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
      }
      const res = await globalThis.fetch(url, { ...options, headers });
      const setCookies = res.headers.getSetCookie?.() || [];
      for (const sc of setCookies) {
        const parts = sc.split(';')[0].split('=');
        if (parts.length >= 2) {
          this.cookies.set(parts[0].trim(), parts.slice(1).join('=').trim());
        }
      }
      return res;
    }
    async json(endpoint, options = {}) {
      const res = await this.fetch(endpoint, options);
      const text = await res.text();
      try {
        return { status: res.status, data: JSON.parse(text), headers: res.headers };
      } catch {
        return { status: res.status, raw: text, headers: res.headers };
      }
    }
  }

  // 1. Live site and bundle verification
  await test('Storefront serves latest bundle', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('index-Bg-uZ9s2.js'), 'HTML should link to index-Bg-uZ9s2.js');
    assert.ok(html.includes('index-BB5JL0N2.css'), 'HTML should link to index-BB5JL0N2.css');
  });

  // 2. Commerce config checkoutEnabled
  await test('/api/config has checkoutEnabled: true', async () => {
    const res = await fetch(`${BASE_URL}/api/config`);
    assert.equal(res.status, 200);
    const config = await res.json();
    assert.equal(config.checkoutEnabled, true, 'Checkout must be enabled');
    assert.equal(config.paymentMode, 'cod');
  });

  // 3. Products list includes rating summaries
  let testProductId;
  await test('/api/products includes rating summaries and valid items', async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    assert.equal(res.status, 200);
    const products = await res.json();
    assert.ok(Array.isArray(products) && products.length > 0);
    testProductId = products[0].id;
    const withReviews = products.find(p => p.rating && typeof p.rating.count === 'number' && p.rating.count > 0);
    assert.ok(withReviews, 'At least one product should have seeded reviews');
    assert.ok(withReviews.rating.average > 0);
  });

  // 4. Product detail page reviews endpoint
  await test(`/api/products/${testProductId}/reviews returns reviews and distribution`, async () => {
    const res = await fetch(`${BASE_URL}/api/products/${testProductId}/reviews`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.summary, 'Must contain summary');
    assert.ok(typeof body.summary.averageRating === 'number');
    assert.ok(typeof body.summary.totalReviews === 'number');
    assert.ok(body.summary.distribution, 'Must have star distribution breakdown');
    assert.ok(Array.isArray(body.reviews));
    for (const r of body.reviews) {
      assert.ok(['approved', 'pending'].includes(r.status), 'Review must have valid status');
    }
  });

  // 5. Coins list includes 6-angle image roles and rating summaries
  let testCoinSku;
  await test('/api/coins includes image angle roles and rating summaries', async () => {
    const res = await fetch(`${BASE_URL}/api/coins`);
    assert.equal(res.status, 200);
    const coins = await res.json();
    assert.ok(Array.isArray(coins) && coins.length > 0);
    testCoinSku = coins[0].sku;
    assert.ok(coins[0].images, 'Coins must contain images array');
    assert.ok(Array.isArray(coins[0].images));
  });

  // 6. Coin reviews endpoint supports coin SKUs
  await test(`/api/products/${testCoinSku}/reviews resolves coin reviews`, async () => {
    const res = await fetch(`${BASE_URL}/api/products/${testCoinSku}/reviews`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.summary);
    assert.ok(Array.isArray(body.reviews));
  });

  // 7. Customer registration, login, and review submission flow
  const customerClient = new SessionClient();
  const testEmail = `qa_test_${Date.now()}@example.invalid`;
  const testPassword = 'Password123!SafeLong';
  let customerCsrf;

  await test('Customer registers, gets session with CSRF token', async () => {
    const init = await customerClient.json('/api/account/session');
    assert.equal(init.status, 200);
    const csrf = init.data.csrf;
    assert.ok(csrf, 'CSRF token required');

    const reg = await customerClient.json('/api/account/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-customer-csrf': csrf },
      body: JSON.stringify({
        email: testEmail,
        name: 'Aarav Sharma',
        password: testPassword,
        guestState: { bag: [], saved: [] }
      })
    });
    assert.equal(reg.status, 200);
    assert.equal(reg.data.customer.email, testEmail);
    customerCsrf = reg.data.csrf;
  });

  // 8. Customer submits review -> status is pending
  let submittedReviewId;
  await test('Authenticated customer submits review (sets pending status)', async () => {
    const sub = await customerClient.json(`/api/products/${testProductId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-customer-csrf': customerCsrf },
      body: JSON.stringify({
        rating: 5,
        title: 'Outstanding Quality and Finish',
        comment: 'This piece exceeded all my expectations. The craftsmanship is world class.'
      })
    });
    assert.equal(sub.status, 201);
    assert.equal(sub.data.status, 'pending', 'Submitted review must be pending moderation');
    assert.equal(sub.data.rating, 5);
    submittedReviewId = sub.data.id;
    assert.ok(submittedReviewId, 'Must have review id');
  });

  // 9. Duplicate review prevention
  await test('Duplicate review by same customer returns 409 conflict', async () => {
    const dup = await customerClient.json(`/api/products/${testProductId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-customer-csrf': customerCsrf },
      body: JSON.stringify({
        rating: 4,
        title: 'Another review attempt',
        comment: 'Should be blocked because customer already reviewed this item.'
      })
    });
    assert.equal(dup.status, 409, 'Duplicate review submission must be blocked');
  });

  // 10. Pending review is returned with status pending for public display badge
  await test('Pending review is visible with pending status', async () => {
    const pub = await fetch(`${BASE_URL}/api/products/${testProductId}/reviews`);
    const data = await pub.json();
    const found = data.reviews.find(r => r.id === submittedReviewId);
    assert.ok(found, 'Pending review should be visible');
    assert.equal(found.status, 'pending', 'Pending review must have status: pending');
  });

  // 11. Admin login and review moderation
  const adminClient = new SessionClient();
  let adminCsrf;

  await test('Admin logs in and receives CSRF token', async () => {
    const login = await adminClient.json('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'preview@veyora.local',
        password: 'preview-veyora-2026'
      })
    });
    assert.equal(login.status, 200);
    assert.ok(login.data.csrf);
    adminCsrf = login.data.csrf;
  });

  // 12. Admin reviews dashboard listing and stats
  await test('Admin reviews API returns stats and listing', async () => {
    const res = await adminClient.json('/api/admin/reviews');
    assert.equal(res.status, 200);
    assert.ok(res.data.stats, 'Stats object required');
    assert.ok(typeof res.data.stats.total === 'number');
    assert.ok(typeof res.data.stats.pending === 'number');
    assert.ok(typeof res.data.stats.approved === 'number');
    assert.ok(typeof res.data.stats.rejected === 'number');
    assert.ok(Array.isArray(res.data.reviews));

    const pendingItem = res.data.reviews.find(r => r.id === submittedReviewId);
    assert.ok(pendingItem, 'Submitted review must be listed in admin panel');
    assert.equal(pendingItem.status, 'pending');
  });

  // 13. Admin approves review
  await test('Admin approves pending review', async () => {
    const patch = await adminClient.json(`/api/admin/reviews/${submittedReviewId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': adminCsrf },
      body: JSON.stringify({ status: 'approved' })
    });
    assert.equal(patch.status, 200);
    assert.equal(patch.data.status, 'approved');
  });

  // 14. Now approved review is publicly visible
  await test('Newly approved review is now publicly visible on PDP', async () => {
    const pub = await fetch(`${BASE_URL}/api/products/${testProductId}/reviews`);
    const data = await pub.json();
    const found = data.reviews.find(r => r.id === submittedReviewId);
    assert.ok(found, 'Approved review must now appear on public reviews');
    assert.equal(found.title, 'Outstanding Quality and Finish');
  });

  // 15. Admin deletes test review cleanly
  await test('Admin deletes test review', async () => {
    const del = await adminClient.json(`/api/admin/reviews/${submittedReviewId}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': adminCsrf }
    });
    assert.equal(del.status, 200);
  });

  // 16. Checkout and place order flow
  await test('Full checkout quote and order placement with COD', async () => {
    const bagItem = { sku: testCoinSku, quantity: 1 };
    const quoteRes = await fetch(`${BASE_URL}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [bagItem] })
    });
    assert.equal(quoteRes.status, 200);
    const quoteData = await quoteRes.json();
    assert.ok(quoteData.token, 'Quote token required');

    const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [bagItem],
        token: quoteData.token,
        customer: {
          name: 'Priya Patel',
          email: 'priya.patel@example.invalid',
          phone: '9876543210',
          address: '402 Sunrise Heights, Bandra West',
          city: 'Mumbai',
          pincode: '400050'
        },
        idempotencyKey: `qa-order-${Date.now()}`
      })
    });
    assert.equal(checkoutRes.status, 200, 'Checkout must succeed');
    const order = await checkoutRes.json();
    assert.ok(order.id, 'Order id must be returned');
    assert.ok(order.id.startsWith('VEY-'), 'Order ID should follow VEY- convention');
  });

  console.log(`\n=== All ${passed}/${total} Live Feature Tests Passed Successfully! ===\n`);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
