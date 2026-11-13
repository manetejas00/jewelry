# 02 — Complete audit report

Date: 13 November 2026. Method: source inspection of the Veyora Jewels repository, plus `npm test`. The server was not started and the browser was not used, because `better-sqlite3` does not load on Node 24 here. Live hosting was not contacted. Nothing in the application was modified.

Scores and the roadmap are in `10-priority-roadmap.md`.

## 1. Frontend

The storefront is a React 19 single-page app. Almost every page lives in `src/main.jsx` (about 2,150 lines). Account screens are in `src/Account.jsx`. Shared client state is `src/store.jsx`. Smaller modules cover reviews, search suggestions, pagination, image zoom, PWA install, and hero media.

**Routing.** `BrowserRouter` registers the paths listed in `01-project-overview.md`. Unknown URLs render `NotFound`. Production also returns HTTP 404 for those paths (`server/seo.js`).

**Responsive layout.** `src/style.css` defines breakpoints around 1500, 1100, 800, 768, 680, 640, 600, 500, 440, 420, and 380 pixels, including a collapsible header and a single-column admin shell. This was not rechecked in a browser in this audit.

**Forms.** Checkout requires name, email, 10-digit mobile, address, city, and PIN code, with matching server checks (`server/orders.js`). Account passwords require 12 characters. Admin product and coin forms validate through the CSV schema (`validate()` in the admin create routes).

**States.** Collection and product views have loading, error-with-retry, and empty copy (`Collection`, `Product` in `src/main.jsx`). The bag drawer has an empty state. Admin import panels surface server errors.

**Search and lists.** Header search uses `SearchAutocomplete`. Collection query params hold filter and sort. The grid loads 24 more items at a time in the client after the full catalogue download. Admin lists use `AdminCatalogueList` and `src/pagination.js`.

**Modals.** `Modal` traps Tab, closes on Escape, and restores focus. Confirmation before destructive admin deletes should be confirmed in the browser; the product list has delete handlers, and this audit did not click them.

**Accessibility.** Icon buttons on the header have `aria-label`s. The dialog uses `role="dialog"` and `aria-modal`. Account errors use `role="alert"`. A full keyboard and screen-reader pass was not done. Colour contrast and focus rings were not measured.

**Broken links and console errors.** Not observed. No browser session.

**Consistency.** Editorial type and ivory/ink colours are centralized in CSS. Admin and storefront share that file, so studio screens are dense tables inside the same visual system.

## 2. Backend

Routes are registered directly in `server/index.js` (about 800 lines). Domain work is split into the modules listed in the overview, which is the right direction. Several admin handlers still validate, write, and audit inline, especially product patch, image upload, and the dashboard query.

**Validation.** Checkout, customer state, offers, pricing rules, reviews, and CSV rows have explicit validators. Product patch coerces `stock`, `net_weight_g`, and `fixed_price` with `parseInt` / `Number`. A non-numeric weight becomes `NaN` and can be written. Create-product goes through `validate('products', ...)`, which is stricter than patch.

**Responses.** Errors use `{error}` plus an optional `quote` on price conflicts (`server/errors.js`). Success bodies are inconsistent: `{ok:true}`, raw arrays, or domain objects.

**Transactions.** Checkout, customer registration, imports, pricing-rule writes, and feed setting writes use transactions. Product create inserts the product and its hero image in two statements without one transaction. Hard delete of a product and its images is also two statements.

**Queries.** Catalogue pricing is a few bulk reads, then in-memory joins. That avoids N+1 SQL. It loads every image and every rating summary on each catalogue request. Admin product listing builds an image map in memory the same way. `customerState` calls full `catalogue()` and `coinCatalogue()` to hydrate one bag.

**Jobs.** There is no in-process scheduler. `scripts/daily.js` calls `daily(db, 'scheduled')`. The dashboard flag `scheduleMissed` is true unless a scheduled run finished in the last 36 hours. `CRON_EXPRESSION` does not register a cron job.

**Caching.** Search cache, 60 seconds, process-local. No catalogue cache. API responses are `no-store`.

**Rate limits.** Present on `/api`, login, checkout, OTP, reviews, and AI copy. They are in-memory, so they reset on process restart and do not coordinate across instances.

**Webhooks.** None. See security finding S1.

**Third-party failure.** Supplier fetch uses a 30-second timeout, a 5 MB cap, and `redirect: 'error'`. Failures are stored on `daily_runs` with URLs redacted (`server/daily.js`). Gold auto-conversion stays off unless `GOLD_AUTO_CONVERSION_APPROVED=true`. AI copy failures return HTTP errors and do not publish (`tests/ai-copy.test.js` covered the missing-key path). OTP delivery failure is designed not to reveal the code.

## 3. Database

Fourteen Knex migrations, `001_commerce.js` through `014_otp_challenges.js`.

**Tables:** `staff`, `sessions`, `settings`, `products`, `supplier_skus`, `rates`, `pricing_rules`, `import_batches`, `import_errors`, `import_locks`, `orders`, `order_items`, `payment_events`, `audit`, `daily_runs`, `customers`, `customer_state`, `coins`, `product_images`, `offers`, `password_resets`, `reviews`, `review_images`, `ai_drafts`, `otp_challenges`.

**Relationships that are enforced:** `customer_state.customer_id`, `orders.customer_id`, `password_resets.customer_id`, `reviews.product_id` → `products.id`, `reviews.user_id` → `customers.id`, `review_images.review_id`, `otp_challenges.customer_id`.

**Relationships that are not enforced:** `order_items.order_id`, `order_items.sku`, `product_images` to products or coins, `rates.batch_id`, `import_errors.batch_id`, `audit.staff_id`, `supplier_skus.sku`, `payment_events.order_id`, `ai_drafts.staff_id`. Deleting a product does not restrict orders because line items keep a JSON snapshot, which is appropriate, but image rows are deleted by a manual query that can miss a code mismatch.

**Indexes:** unique SKU on products and coins, unique customer email, unique idempotency key, unique import checksum, review composites in `012_reviews.js`, and search indexes in `008_search_indexes.js`. Missing unique constraints: `products.slug`, `products.product_code`, `offers.code`.

**Integrity bugs:**

- Coin reviews use `coins.id` as `reviews.product_id` (`server/reviews.js` versus `migrations/012_reviews.js`). Documented as S2.
- SQLite foreign keys are not enabled (`server/db.js`).
- Orders have no status machine. Checkout inserts `status: 'confirmed'` and nothing updates it.
- Product and coin deletes are hard deletes. Reviews are the only soft-delete (`deleted_at`).
- `audit` records staff actions, not customer actions, and has no foreign key.
- Money and weight columns are decimals in MySQL migrations. Application code also uses Decimal.js for quotes. Some admin patches pass JavaScript numbers, which can lose precision before the database sees them.
- Seeds: `scripts/seed.js` for preview, `seeders/ProductSeeder.js`, `ReviewSeeder.js`, `DatabaseSeeder.js`. Preview seed must never be copied to production. The boot guard checks two fictional supplier names and one staff email.

**Backup and recovery:** not implemented in the application. `docs/ROLLBACK.md` describes a manual release rollback. There is no scheduled `mysqldump` in the repo.

## 4. Authentication and accounts

Customers can register, log in, log out, and recover a password when SMTP or OTP is configured. Email and phone verification routes exist and are optional (`OTP_REQUIRE_*` default false). Sessions last 8 hours. Guest bag and saved pieces merge on login with revision checks.

There is no profile editor, address book, or password change while signed in except through the reset flow. Account UI shows orders, bag, and saved pieces (`src/Account.jsx`).

Staff accounts are created only by `scripts/create-admin.js`. The studio cannot invite staff, change roles, or revoke them.

## 5. Admin studio

Implemented and wired to APIs:

- Dashboard counts for rates, imports, orders, and a missed-schedule flag
- Product and coin create, edit, delete, multi-angle images
- Offers with priority, badge, and discount type
- Review moderation, including bulk status
- Gold rate import and silver rate setting
- Pricing rule preview and publish (owner)
- CSV preview, publish, error download, and export of products, coins, gold, and orders
- Catalogue-copy drafts that stay unpublished until a manager approves them
- Feed URL and inventory overwrite settings (owner)

Not implemented:

- Customer list, disable, or password help
- Staff and role management
- Order status changes, packing, shipment, cancellation, refund, or invoice
- Coupon redemption at checkout (`offers.code` is stored and ignored by `matchOffer` in `server/pricing.js`)
- Offer start and end dates
- Activity log screen beyond the last 20 audit rows on the dashboard
- Saved-view filters shared across modules
- A responsive check of the studio in this audit

Orders in the studio are the latest 100 rows from the dashboard payload. There is no `PATCH /api/admin/orders/:id`.

## 6. Customer journeys

| Journey | In code | Verified in a browser this audit |
|---|---|---|
| Land on home, open a collection, filter, open a product | yes | no |
| Search with typo correction | yes | no |
| Save a piece and open `/collections/saved` | yes | no |
| Add to bag, change quantity, checkout COD | yes | no |
| See confirmation and reopen `/order/:id` | yes | no |
| Register, merge guest bag, see order history | yes | no |
| Reset password | only if SMTP or OTP is configured | no |
| Pay online | no | — |
| Receive an order email | no | — |
| Track shipment | no | — |
| Review a coin | route exists; storage collides with jewellery ids | no |
| Contact the merchant | `/information/contact` plus `MERCHANT_EMAIL` when set | no |

Checkout is disabled in production until `MERCHANT_READY=true` and `PAYMENT_MODE=cod` (`server/runtime.js`). Preview forces COD so the fictional shop can be exercised.

## 7. Payments, media, and integrations

- **Payments:** COD only. No Razorpay, Stripe, PayU, or UPI intent.
- **Email:** nodemailer for reset links only.
- **OTP:** optional gateway, Kaleyra, or Pinpoint. All default off (`.env.example`).
- **Supplier feeds:** HTTPS CSV or a local file. Gold auto conversion is off by default.
- **AI copy:** optional OpenAI-compatible HTTP API. The key stays on the server (`server/ai-copy.js`).
- **Media:** base64 JSON upload, sharp check, original plus WebP thumb. No object storage.

## 8. Environment and deployment

`.env.example` documents the variables. `.env` is gitignored. Production checks are in `validateRuntime`. CI tests and builds on pull requests. It does not deploy. `docs/PRODUCTION_BLOCKERS.md` (10 November 2026) says the Hostinger Git integration publishes as if the app were PHP, preview credentials were still a concern, and scheduled imports had not been observed. This audit did not repeat those live checks.

Health routes: `GET /health/live` and `GET /health/ready` (database `SELECT 1`).

## 9. Logging and monitoring

Request ids are set on `X-Request-ID`. Failures log a small JSON object to stdout. There is no log drain, error tracker, uptime check, or metric in the repository. Session cleanup runs hourly in-process (`server/index.js`).

## 10. Documentation already in the repo

`README.md` and `docs/` cover imports, deployment, environment, PWA, reviews, pricing, prior audits, and production blockers. Those documents are operationally useful. They disagree in places with a fresh run: older test reports describe passes this environment could not reproduce. Treat `docs/audit/` as the 13 November source audit.

## Functional defects to fix first

1. Coin review identity versus `products.id` foreign key (S2).
2. Product patch can persist `NaN` weights and prices.
3. Product create and image insert are not one transaction.
4. Offer codes never affect checkout.
5. Orders cannot move past `confirmed`, and cancellation cannot restore stock.
6. Slugs and product codes can collide, so one URL hides another product.
7. The app cannot be started or tested on the developer Node 24 install until the SQLite binding is rebuilt or Node 22 is used.
