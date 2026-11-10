# Project audit — 10 November 2026

> Live verification correction (10 November 2026): active storage is MySQL; the SQLite file is inactive legacy storage. The newer LIVE_AUDIT_REPORT.md and LIVE_DEPLOYMENT_VERIFICATION.md supersede earlier SQLite assumptions and describe the owner-triggered deployment incident/recovery.

## Decision

**Not approved for production launch.** Local fixes are implemented and tested; they have not been deployed to test3. This report supersedes earlier local-only verification claims in `docs/` where they conflict. Existing source edits in `src/main.jsx` were retained. Tests regenerate sample CSV timestamps; no live catalogue, customer, order, upload or database records were changed. An explicitly approved live preview-admin login was followed by logout.

## Health score

These are evidence-based engineering estimates, not a security certification or measured availability score. Each category has 20 points. Final score includes source fixes; it does not imply the live site has received them.

| Category | Initial | Final local candidate | Evidence / remaining limitation |
|---|---:|---:|---|
| Security and configuration | 7 | 15 | Guards, CSRF, input validation, dependencies; live default login remains |
| Commerce and data integrity | 12 | 16 | Pricing and retry fixes; actual MySQL migration/concurrency unverified |
| QA and maintainability | 12 | 16 | Expanded automated checks; large UI/server modules remain |
| UX, assets and discoverability | 10 | 15 | Responsive smoke checks, SEO renderer, chunking; live routing unchanged |
| Deployment and operations | 3 | 8 | Runbooks, health checks, release packaging; restoration and production cutover unverified |
| **Total / 100** | **44** | **70** | **Live deployment remains blocked** |

## Inspected application

React 19/Vite frontend, React Router, customer accounts and local/account bags, merchant studio, Express API, Knex database access, SQLite preview, MySQL target, 11 migrations after this change, catalogue/coin/offer pricing, CSV import/export, scheduled feed runner, upload/thumbnail services, seeders, generated assets, environment/deployment configuration and automated tests.

Public and private routes are inventoried below. Existing tests cover pricing, stock handling, import staging/publication, supplier ordering, customer ownership, saved state, search, gallery mathematics and assets. Some existing UI tests inspect source/CSS; these do not prove runtime behavior. Every interaction has not been exercised in a browser.

## Findings and fixes

| ID | Priority | Finding | Source change / status |
|---|---|---|---|
| A01 | Critical live | Public test3 accepts the documented preview administrator password | Verified with explicit authorization: login 200, logout 200. No record changes. Production startup now rejects that account and known fictional catalogue suppliers. Live credential retirement pending. |
| A02 | Critical live | test3 reports preview=true; an inactive legacy SQLite file exists | Read-only SSH later verified active MySQL. Preserve that database and rehearse candidate migrations in staging. Production startup rejects preview configurations. No automatic data replacement. |
| A03 | High | Merchant readiness and payment mode were hardcoded to success | Server and UI honor explicit COD, contact and policy readiness; unknown/live gateway modes rejected. Preview orders identified as previews. |
| A04 | High | Silver fallback and wrong-purity gold coin rate | Production silver requires explicit recent rate timestamp; exact gold purity required; missing/invalid prices block checkout. |
| A05 | High | Automatic provider adapter assumed currency/unit, refreshed source time and derived purity rates | Explicit conversion approval and provider currency/unit/recent timestamp now required. Purity-specific CSV recommended. Provider integration still unverified. |
| A06 | High | Guest retry key could return another guest order | Request fingerprint includes guest session scope, customer, bag and quote. Retry mismatch rejected; unique-key races handled after rollback. Real MySQL multi-process execution pending. |
| A07 | High | Unexpected API errors exposed library/database messages | Expected validation errors classified; unexpected responses generic. Logs omit payloads, URLs, SQL, tokens and PII; correlation IDs added. |
| A08 | High | SVG originals could serve active content on store origin | New uploads limited to actual raster formats; existing upload responses sandboxed. Existing SVG files need host routing review. |
| A09 | Medium | csv-parse prototype replacement advisory | Updated to 7.0.3. Final dependency audit reports zero known vulnerabilities. |
| A10 | Medium | Offer mutations accepted negative/nonfinite/excessive discounts and invalid enums | Shared validation on create/update; negative and >100% percentages rejected. |
| A11 | Medium | No password recovery | Added SMTP recovery, hashed expiring one-use tokens, versioned session invalidation and account UI. SMTP delivery cannot be verified until configured. |
| A12 | Medium | No global API protection, oversized generic body parser, no CSP | Global and endpoint limits, route-specific request sizes, production CSP, secure-origin enforcement, explicit proxy setting. |
| A13 | Medium | Unknown API URLs returned storefront HTML | Explicit JSON 404 before frontend fallback. Browser request helper handles malformed responses/timeouts. |
| A14 | Medium | Missing server SEO and robots/sitemap | Page-specific canonical, description, OG, Product JSON-LD, sitemap, private/noindex and real missing-page 404 in Express production renderer. Host must route HTML through Express. |
| A15 | Medium | 528.80 kB monolithic JavaScript | Split main, React, animation and icon chunks; main approximately 180 kB. All dependencies still load on initial app use; this is chunking, not full route lazy loading. |
| A16 | Medium | MySQL TEXT too small for accepted 5 MB CSV payloads | Additive migration expands import payload/summary capacity on MySQL. Remote execution unverified. |
| A17 | Medium | Sessions accumulated; no probes/shutdown handling | Expired sessions/reset links cleaned hourly, liveness/readiness endpoints and bounded graceful shutdown added. |
| A18 | Low | Schedule status was always false; product edits could claim success on missing SKU | Dashboard derives missing scheduled-run status; missing product edits return 404. |

## Live evidence

Destination confirmed by user: https://test3.avinyacarefoundation.org. HTTPS requests succeeded with certificate verification. Signed-in hPanel shows Business Web Hosting, SSL enabled, app and public_html directories, and a SQLite database. Public APIs returned 107 jewellery variants / 106 styles and six coins, with 672 unique referenced image URLs. These image URLs were counted, not all re-fetched during this audit. Existing historical image verification is not treated as a new result.

The live config advertises preview mode and `contact@veyora.local`. `/robots.txt` returned HTTP 200 with storefront HTML. Homepage is delivered by LiteSpeed as a static file; only `upgrade-insecure-requests` CSP was observed there. Express metadata/security changes cannot protect HTML bypassing Node. Host routing must be verified before release.

## Pending external work

- Retire the known preview owner account; create a private merchant account, rotate the live session secret and invalidate old staff sessions through the host. Do not publish bootstrap passwords.
- Identify approved real catalogue, stock, tax, shipping and return terms. Do not relabel fictional data as approved stock merely to pass a guard.
- The later live audit created a consistent private MySQL export and restored lost media. Rehearse restore and additive migration upgrades on isolated staging; preserve current customer/order/staff state. No SQLite-to-MySQL cutover is needed.
- Verify Node process supervisor, startup command, persistent uploads path, proxy hops, database connection, DNS and HTML/API routing. hPanel access exists; authenticated shell execution and safe release cutover were not established.
- Supply and verify SMTP credentials/sender, selected payment provider if online payments are required, and actual supplier source contracts. COD is supported; online payment/refund/webhook/fulfilment integrations are absent.
- Observe an actual scheduled import; configure external alerts, uptime checks, encrypted backups/retention and restore drills. No external alerting service is configured.
- Run full live/staging E2E, physical touch and accessibility checks, MySQL contention/load tests, and Core Web Vitals measurement. No scalability SLA or complete feature certification is asserted.

## Architecture and performance

Transactions and unique keys protect core imports and orders. Search retains a bounded 60-second index; catalogue endpoints still read the whole published catalogue with multiple schema/data queries. At this store size that is acceptable for preview; measure p95 latency, pool waits and RSS on target hardware before estimating capacity. Admin and storefront remain largely co-located in large files. No unnecessary UI redesign or broad architecture rewrite was performed. No pre-existing linter or TypeScript configuration was available; syntax/build and automated tests were used.

## Sources checked

- [Express production security guidance](https://expressjs.com/advanced/best-practice-security/)
- [Hostinger Node.js deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [csv-parse advisory](https://github.com/advisories/GHSA-8cw4-87c7-c6xx)

## API inventory

Generated from route declarations. Inventory is not a claim that every endpoint and branch was executed. Public routes rely on same-origin/session ownership as appropriate; admin routes use staff role middleware and CSRF for mutations. See TESTING_REPORT.md for exercised paths.

| Method | Route |
|---|---|
| GET | `/health/live` |
| GET | `/health/ready` |
| GET | `/uploads/thumbs/:filename.webp` |
| GET | `/api/config` |
| GET | `/api/thumbnail` |
| GET | `/api/products` |
| GET | `/api/coins` |
| GET | `/api/search` |
| GET | `/api/offers` |
| GET | `/api/admin/offers` |
| POST | `/api/admin/offers` |
| PATCH | `/api/admin/offers/:id` |
| DELETE | `/api/admin/offers/:id` |
| POST | `/api/quote` |
| POST | `/api/checkout` |
| GET | `/api/orders/:id` |
| GET | `/api/account/session` |
| POST | `/api/account/forgot-password` |
| POST | `/api/account/reset-password` |
| POST | `/api/account/` |
| GET | `/api/account/orders` |
| PUT | `/api/account/state` |
| POST | `/api/account/logout` |
| POST | `/api/admin/login` |
| GET | `/api/admin/session` |
| POST | `/api/admin/logout` |
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/products` |
| PATCH | `/api/admin/products/:sku` |
| GET | `/api/admin/coins` |
| POST | `/api/admin/coins` |
| PATCH | `/api/admin/coins/:sku` |
| DELETE | `/api/admin/coins/:sku` |
| POST | `/api/admin/coins/silver-rate` |
| POST | `/api/admin/upload-image` |
| POST | `/api/admin/upload-images` |
| GET | `/api/admin/product-images/:product_code` |
| POST | `/api/admin/product-images` |
| DELETE | `/api/admin/product-images/:id` |
| GET | `/api/admin/media` |
| GET | `/api/admin/samples/:file` |
| GET | `/api/admin/export/:kind` |
| POST | `/api/admin/import/preview` |
| POST | `/api/admin/import/:id/publish` |
| GET | `/api/admin/import/:id/errors` |
| POST | `/api/admin/run` |
| POST | `/api/admin/feed-toggle` |
| POST | `/api/admin/feed-settings` |
| POST | `/api/admin/rules/preview` |
| POST | `/api/admin/rules` |
| GET | `*` |

Dynamic declarations additionally provide POST `/api/account/register` and `/api/account/login`. SEO routes provide GET `/robots.txt` and `/sitemap.xml`.
