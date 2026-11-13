# 05 — Performance audit

No load test, Lighthouse run, or production trace was captured in this audit. The server could not start locally because `better-sqlite3` has no native build for Node 24 on this machine. Findings below are from the request path in source. Measurements that were not taken are marked as not measured.

## What is already reasonable

- Listing images go through generated WebP thumbnails (`server/thumbnails.js`, `server/listing-thumbnails.js`). Sharp is limited to one concurrent operation, 40 megapixels, and a small cache.
- Vite splits `gsap`, `lucide-react`, and React into separate chunks (`vite.config.js`).
- The service worker does not cache `/api/`, HTML navigations are network-first, and thumbnails are capped (`public/sw.js`).
- Search results are memoized in process memory for 60 seconds (`server/search.js`).
- Checkout locks only the SKUs in the bag, in SKU order, which reduces deadlock risk (`server/orders.js`).
- MySQL pool maximum is 10 (`server/db.js`). SQLite preview uses a single connection, which matches SQLite’s writer model.
- Catalogue GETs that overlap in the browser share one in-flight request per epoch (`src/api.js`). Completed responses are not cached in the client.

## Bottlenecks

### P1 — Full catalogue on every storefront load

`GET /api/products` returns every published jewellery calculation (`server/index.js`, `catalogue()` in `server/pricing.js`). `GET /api/coins` does the same for coins. The home page, collection filters, bag hydration, and account state all depend on that payload (`src/store.jsx`, `src/customers.js` via `customerState`).

`catalogue()` loads products, rates, rules, all images, all offers, and all rating summaries, then prices every row in JavaScript. Collection filters and “load more” run in the browser (`Collection` in `src/main.jsx` slices 24 at a time). The network and the server still pay for the full set.

At the seeded size (about 100 products plus coins) this is acceptable. It will not stay acceptable at several thousand SKUs: response size, JSON parse time, and pricing CPU all grow linearly, and every visitor pays that cost.

### P2 — HTML metadata loads the full catalogue again

In production, `pageMetadata` calls `catalogue()` or `coinCatalogue()` to find one slug (`server/seo.js`). A single product URL therefore repeats the full pricing pass before HTML is sent. There is no per-slug query and no cache around metadata.

### P3 — Search is an in-memory scan

`searchCatalogue` corrects typos with a fixed vocabulary and Levenshtein distance, then scans the cached catalogue (`server/search.js`). Indexes added in `migrations/008_search_indexes.js` (`name`, `metal`, `purity`, coin weight) are not used by this search. The cache is per process and is dropped on any catalogue mutation via `invalidateSearchCache()`.

### P4 — Admin list endpoints are unbounded

`GET /api/admin/products` loads every product and every `product_images` row (`server/index.js`). `GET /api/admin/media` uses `readdirSync` and `statSync` on the upload directory, which blocks the event loop. Order CSV export loads every order. Dashboard loads the latest 100 orders, 100 rates, and 30 batches on every studio refresh, and the studio refresh also reloads all products.

### P5 — No HTTP cache for public catalogue JSON

`/api` responses set `Cache-Control: no-store` (`server/index.js`). That is correct for account and admin data. It also prevents shared caching of anonymous catalogue reads. Thumbnails are cached for one day. Hashed Vite assets can be cached by the service worker.

### P6 — No queue, CDN, or horizontal scale story

`scripts/daily.js` is a one-shot process meant for host cron. `CRON_EXPRESSION` is documentation only (`docs/ENV_SETUP.md`). There is no job table consumer, retry worker, or dead-letter queue. Sessions live in the `sessions` table, so more than one Node process can share logins, but the search cache, Sharp queue, and `process.env` feed settings do not. A second process will price and search independently and can race on feed settings.

Uploads default to `public/uploads` unless `UPLOADS_DIR` points outside the release. A CDN is not configured. `APP_URL` is a single origin.

### P7 — SQLite preview hides production cost

Preview uses one SQLite connection. Production MySQL (`max: 10`) plus `forUpdate` on checkout is the real concurrency path. `docs/test-results.md` already says a multi-process MySQL contention test was not run. This audit did not add one.

### P8 — Fonts are render-blocking

`index.html` loads Cormorant Garamond and Manrope from Google Fonts with a stylesheet link and two preconnects. That is a Core Web Vitals input (render delay, third-party connection) and was not measured here.

## Not measured

| Item | Status |
|---|---|
| Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift | Not measured. No browser session. |
| API latency under concurrency | Not measured. Server did not start. |
| Bundle byte size | Not measured. `dist/` exists from an earlier build; this audit did not rebuild. |
| Memory of a warm catalogue | Not measured. |

## Optimization opportunities (after approval)

1. Add `GET /api/products/:slug` and `GET /api/coins/:sku` and stop calling full `catalogue()` from `pageMetadata`.
2. Paginate public catalogue and admin lists in SQL. Keep client filters only for the current page, or push filter and sort into the query.
3. Cache the priced public catalogue in memory with the existing invalidation hook, and set a short `Cache-Control` on anonymous GETs.
4. Replace `readdirSync` on the media route with async directory reads and a limit.
5. When the catalogue grows past a few hundred SKUs, move search to SQL `LIKE` or a dedicated index and delete the full-scan cache.
6. Self-host the two font families.
7. Put `UPLOADS_DIR` on durable storage and put thumbnail URLs behind a CDN with the existing one-day cache.
8. Define a concurrency target (for example 20 simultaneous checkouts) and test it on MySQL, not SQLite.
