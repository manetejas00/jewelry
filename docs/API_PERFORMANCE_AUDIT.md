# API performance audit

Local preview only. Nothing in this audit was deployed.

Measured on 16 November 2026 against `private/store.sqlite` with the Node 22 preview server on `http://127.0.0.1:3000`. The catalogue in that database is 100 jewellery rows, 20 coins, 30 kurtas, 72 reviews, and 10 orders. SQLite uses one connection (`pool.max` is 1). Production MySQL, which pools up to 10 connections, was not queried and was not load-tested.

Latency below is server time on the same machine. It does not include browser rendering. With 8 samples, p95 is the slowest sample (`ceil(0.95 × n) − 1`). A few milliseconds of movement on a sub-10 ms endpoint is sample noise.

Improvement is `((Before − After) / Before) × 100`. A negative number means the after sample was slower.

## Result

Warm storefront reads were already inside the target times before any code change. The measured waste was duplicate work inside one catalogue read: jewellery pricing and the legacy product path each loaded rates, the latest pricing rule, offers, and the full rating summary, and every request re-checked table and column existence.

After the change, a warm catalogue read runs **14 SQL statements instead of 44**. Coin, kurta, and navigation reads drop from 23, 23, and 14 statements to 12, 11, and 3. Schema probes on the warm call drop to 0. HTTP p95 for `GET /api/products` moved from 42.8 ms to 12.3 ms. Response bodies for the paired endpoints are the same size as before.

| | Count |
|---|---|
| Route registrations discovered in `server/` | 187, including the production HTML fallback `GET *` |
| Endpoints with paired before/after HTTP timings | 9 |
| Additional public reads timed only after the change | 13 |
| Read paths with a measured SQL reduction | 4 (`catalogue`, `coinCatalogue`, `listKurtas`, `storefrontNavigation`) |
| Endpoints left on their previous code path | the rest of the inventory below |
| Indexes added | 0 |
| Frontend requests removed | 0 (in-flight GET dedupe and search debounce were already in place) |

## Paired HTTP timings

Eight successful responses each. The before run counted all eight calls. The after run discarded one warmup call per path, then counted eight. Both processes were already serving. A separate cold `GET /api/products` immediately after the server restart took **50.9 ms** and returned **160,478 bytes**.

| API Endpoint | Before p95 | After p95 | Improvement | Status |
|---|---|---|---|---|
| GET /api/products | 42.8 ms | 12.3 ms | 71.3% | Verified. SQL 44 → 14. Body 160,478 bytes both times. p50 11.9 → 8.7 ms |
| GET /api/coins | 6.4 ms | 5.7 ms | 10.9% | Verified. SQL 23 → 12. Body 36,611 bytes both times. p50 4.9 → 4.6 ms |
| GET /api/navigation | 2.7 ms | 2.4 ms | 11.1% | Verified. SQL 14 → 3. Body 1,098 bytes both times. p50 1.7 → 1.3 ms |
| GET /api/kurtas | 8.8 ms | 15.9 ms | −80.7% | Query load reduced (23 → 11). This 8-sample HTTP p95 did not improve. p50 7.1 → 6.4 ms. Body 306,837 bytes both times |
| GET /api/categories | 1.5 ms | 1.7 ms | −13.3% | Unchanged. p50 1.2 → 1.0 ms. Body 8,870 bytes |
| GET /api/config | 0.8 ms | 0.9 ms | −12.5% | Unchanged. p50 0.7 ms both times. Body 299 bytes |
| GET /api/account/session | 2.3 ms | 1.3 ms | 43.5% | Unchanged code path. p50 0.9 ms both times. Body 88 bytes |
| GET /api/offers | 1.0 ms | 1.5 ms | −50.0% | Unchanged. p50 0.8 ms both times. Body 1,052 bytes |
| GET /api/search?q=kurta | 14.6 ms | 2.5 ms | 82.2% | Not attributed to this change. The before p95 includes the search-cache miss. A warm search was already 1.3 ms and 0 SQL. After samples are cache hits. Body 279 bytes |

The same percentile on the in-process handlers, without HTTP or the rate limiter:

| Handler | Before SQL | After SQL | Before p50 / p95 | After p50 / p95 |
|---|---|---|---|---|
| catalogue() | 44 | 14 | 12.3 / 58.5 ms | 6.4 / 86.1 ms |
| coinCatalogue() | 23 | 12 | 6.0 / 11.9 ms | 3.4 / 7.7 ms |
| listKurtas() | 23 | 11 | 4.6 / 19.3 ms | 3.9 / 13.4 ms |
| storefrontNavigation() | 14 | 3 | 1.8 / 2.9 ms | 0.3 / 1.8 ms |

The catalogue in-process p95 of 86.1 ms is one slow sample in eight. The p50, 12.3 ms to 6.4 ms, is the stable handler change. The first catalogue call in the before profile, before the connection was warm, took 297.3 ms and still issued 44 statements.

## Homepage fan-out

The storefront loads products, coins, categories, config, account session, offers, kurtas, and navigation together. Six parallel bursts, all HTTP 200:

| | Before | After |
|---|---|---|
| Wall-clock samples (ms) | 29.8, 30, 26.6, 23.5, 22.8, 27.3 | 25.9, 21.3, 21.1, 22.4, 18.5, 21.7 |
| p50 / p95 of the wall | 26.6 / 30.0 ms | 21.3 / 25.9 ms |
| p95 improvement | | 13.7% |

An in-process parallel run of catalogue + coins + kurtas + navigation, after the schema cache worked, finished in 10.6 ms. There is no paired in-process burst from before the schema-cache fix.

## Reads timed only after the change

These had no paired before sample, so no improvement is calculated. The first of the eight calls is included, which is why `GET /api/jewelry` p95 is 90.1 ms while its median is 7.5 ms.

| Endpoint | After p50 | After p95 | Bytes | Notes |
|---|---|---|---|---|
| GET /api/jewelry | 7.5 ms | 90.1 ms | 151,286 | Same jewellery catalogue service. Registered after `GET /api/products`, so it is a separate route |
| GET /api/jewelry/categories | 1.4 ms | 2.8 ms | 1,955 | |
| GET /api/coin | 5.4 ms | 17.2 ms | 29,844 | `GET /api/coins` is served by the earlier pricing route, not this router |
| GET /api/coin/categories | 1.0 ms | 1.5 ms | 991 | |
| GET /api/kurta | 7.2 ms | 17.7 ms | 306,837 | Same payload size as `GET /api/kurtas` |
| GET /api/kurta/categories | 1.2 ms | 2.3 ms | 1,405 | |
| GET /api/collections | 1.2 ms | 4.3 ms | 2 | Empty list |
| GET /api/materials | 0.8 ms | 1.7 ms | 2 | Empty list |
| GET /api/craftsmanship | 0.8 ms | 4.6 ms | 2 | Empty list |
| GET /health/live | 0.4 ms | 0.6 ms | 15 | Outside the `/api` rate limit |
| GET /health/ready | 0.6 ms | 1.2 ms | 15 | One `SELECT 1` |
| GET /robots.txt | 0.5 ms | 0.7 ms | 26 | |
| GET /sitemap.xml | 5.0 ms | 7.2 ms | 54,468 | |

All of these p95 values are under the listing and lookup targets. The targets were already met on this dataset before the change.

## What was slow, and what the code does now

One warm `catalogue()` call issued the rates query, the latest pricing rule, active offers, and the rating group-bys twice: once for the jewellery service and once for the legacy product rows. The SQL log also showed `sqlite_master` and `PRAGMA table_info` on that same call. `EXPLAIN QUERY PLAN` for published products uses `products_status_index`. The review group-by uses `reviews_next_status_rating_index` and then a temporary b-tree. At 72 reviews that group-by was not the cost, so no index was added.

The change is in `server/read-share.js` and the catalogue read path:

- Overlapping identical reads share one in-flight promise. The promise is dropped when it finishes, so the next call reads current stock and prices.
- Jewellery catalogue rows reuse the rates, rule, offers, and ratings already loaded for that catalogue call.
- `activeRates`, `activeOffers`, and `getAllProductsRatingSummaries` use the same single-flight helper.
- After migrations, `hasTable` and `hasColumn` answers are remembered for the process. Knex returns a new schema builder on every `db.schema` access, so the cache sits outside that builder. The first check still hits SQLite. Later checks do not.

No response field, query parameter, price formula, stock rule, or route was changed. Payload sizes on the nine paired endpoints match the before run.

A retained cache of catalogue JSON was not added. Prices and stock change on write, and a TTL cache would be able to serve a stale copy. Search already keeps its own 60-second suggestion cache and clears it when orders, rules, imports, or reviews change.

## Frontend

No client code was changed.

`src/api.js` already shares one in-flight GET for the same URL. Catalogue URLs (`/products`, `/coins`, `/offers`, `/categories`) also carry `catalogueEpoch`, and writers bump that epoch so the next read is not the previous promise. Search suggestions already wait 150 ms and abort the previous request. A second client cache was not added, because it could show a stock count or a price from before the last write.

## Load

Local only. The global `/api` limiter is 300 requests per minute. An earlier 1/10/50 run happened after that window was already exhausted, so every response was HTTP 429. Those timings are discarded.

The run below was made after the code change. Latency at concurrency 50 is not reported: most of those responses were rejected by the limiter (30 of 40 for products, 40 of 40 for kurtas) and the recorded times are the rejection, not the handler. Concurrency 100 was not run. SQLite would also queue those requests on its single connection.

| Endpoint | Concurrency | Requests | Errors | Requests/s | p50 | p95 | p99 |
|---|---|---|---|---|---|---|---|
| GET /api/products | 1 | 12 | 0 | 123 | 7.7 ms | 9.6 ms | 9.6 ms |
| GET /api/kurtas | 1 | 12 | 0 | 145 | 6.5 ms | 9.0 ms | 9.0 ms |
| GET /api/products | 10 | 20 | 0 | 127 | 71.8 ms | 76.4 ms | 91.5 ms |
| GET /api/kurtas | 10 | 20 | 0 | 182 | 54.1 ms | 56.9 ms | 57.6 ms |

At 10 concurrent callers, p95 rises because the one SQLite connection serves the requests one after another. That queueing is a property of the local database, not a new regression. Memory, CPU, and pool gauges were not sampled. No external API was called.

## Regression

`node --test --test-concurrency=1` on the catalogue, pricing, checkout, review, and search files: **91 passed, 0 failed**.

Covered behaviour includes jewellery catalogue and CRUD, coin price and checkout stock decrement, kurta list and per-size stock updates, margin and tax maths, quote invalidation when a price changes, offer application, review approval updating the public summary, and search results after checkout. An earlier parallel run failed only because several test files tried to write the same sample CSV at once. Those failures were not reclassified as product regressions; the sequential run above includes `tests/commerce.test.js` and passed.

## Endpoints not given a paired timing

| Group | Routes | Why |
|---|---|---|
| Benchmarked above | 9 | Paired HTTP p95 |
| Timed after only | 13 | No before sample |
| Writes and other actions | 96 | POST, PUT, PATCH, and DELETE were not called. Checkout, import, upload, and delete change data |
| Parameterised reads | 24 | Need a real id or slug. They were not called without a fixture |
| Staff reads | 22 | Admin login had already hit its own limiter, so an authenticated HTTP sample would have been a 429 |
| Binary, auth, or external | 19 | Thumbnails, brand images, exports, login, logout, chat, and AI draft routes |
| Customer order list | 1 | `GET /api/account/orders` depends on a customer session and was not called |
| Production HTML fallback | 1 | `GET *` is source text for production. The preview server does not register it as an API |

Admin dashboard reads were timed in-process once, after the change only: the rates, import batch, order, pricing rule, and audit queries together took 3.7 ms (10 orders, 4 batches, 10 rates). There is no before sample.

`quote()` still builds a catalogue when nothing else is already reading it. Overlapping quote and catalogue calls share that work. A lone quote was not part of the paired sample.

## Remaining limits

- `GET /api/kurtas` is 306,837 bytes because each card includes images, variants, colours, and sizes. The kurta listing filters on variant stock and reads those images. Those fields were left in place.
- Local SQLite serialises concurrent catalogue reads. Ten concurrent callers measured about 54–76 ms p95. A hundred concurrent callers were not attempted.
- The 300-request minute limit rejected the 50-concurrent burst. The limit was not raised.
- The review group-by still builds a temporary b-tree after it uses the status index. At 72 rows that was left as it is.
- Schema answers are remembered for the life of the process and are installed only after migrations. A table created later in that same process would not be visible to the cache. Tests do not install the cache.
- Production MySQL round-trip time was not measured. The SQL reduction is the part that would show up there. This audit does not claim a production number.
