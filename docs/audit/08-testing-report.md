# 08 — Testing report

Executed on 13 November 2026 from `c:\Ecom\jewelry` with Node.js v24.11.1:

```
npm test
```

`package.json` runs `node --test tests/*.test.js`.

## Actual result

| | Count |
|---|---:|
| Tests | 157 |
| Passed | 42 |
| Failed | 115 |
| Skipped | 0 |
| Duration | about 6 seconds |

The 115 failures did **not** fail on assertions. Each database-backed test threw:

`Could not locate the bindings file` for `better-sqlite3`.

`prebuild-install` reported no prebuilt binary for Node 24.11.1, win32, x64 (`NODE_MODULE_VERSION` 137). `npm rebuild better-sqlite3` then failed because Visual Studio Build Tools 2022 are installed without a VC++ toolset. CI (`.github/workflows/ci.yml`) uses Node 22, where a prebuild is expected to exist. This audit does not treat historical CI or `docs/TESTING_REPORT.md` as a pass on this date.

The application server was not started. No browser, no HTTP end-to-end pass, and no MySQL pass were run.

## Tests that passed here

These do not open SQLite, or they only touch files, CSS, and pure functions:

- Admin CSS scroll and hero-class collision (`tests/admin-panel.test.js`)
- Catalogue-copy wiring, claim checks, parser, missing credentials, and an in-memory draft flow that still logged draft events (`tests/ai-copy.test.js`) — the draft cases that need SQLite are in the failed set; the five file-level checks passed
- Overlapping catalogue read de-duplication (`tests/catalogue-reads.test.js`, `tests/catalogue-ui.test.js`)
- Coin CSV validation without publish (`tests/coin-imports.test.js`, one case)
- Image zoom math (`tests/image-zoom.test.js`)
- Listing thumbnail path rules and a Sharp derivative (`tests/listing-thumbnails.test.js`, `tests/thumbnails.test.js`)
- OTP phone normalisation and gateway client behaviour that does not need the store database (`tests/otp.test.js`)
- Pagination math (`tests/pagination.test.js`)
- PWA manifest, icons, service worker rules (`tests/pwa.test.js`)

Passed names are the `✔` lines in the 13 November run. Anything not in that set did not pass.

## Tests that could not run

All cases in these files that construct a Knex SQLite database failed before assertions:

- `tests/commerce.test.js` (pricing fixtures that still open the DB, import, checkout, scheduled runner)
- `tests/customers.test.js`
- `tests/reviews.test.js` (20 cases, none mention coins)
- `tests/search.test.js`
- `tests/coins.test.js` except the pure validation case
- `tests/offers.test.js`
- `tests/margins.test.js`
- `tests/otp.test.js` cases that persist challenges
- `tests/production-readiness.test.js`
- `tests/product-seeder.test.js`
- `tests/images.test.js` cases that use the DB
- `tests/navbar-auth.test.js` if they boot the DB

Re-run on Node 22, or after the VC++ toolset is installed and `better-sqlite3` is rebuilt, before treating the suite as green.

## Coverage that exists in the suite (not re-proven today)

From reading the test files, the suite is designed to cover:

- Decimal gold normalisation, fixed prices, import idempotency, stale quotes, stock decrement, guest and account checkout
- Customer registration, bag merge, order claim rules
- Review validation, moderation, and one-review-per-customer on jewellery
- Offer matching and margins
- OTP verify-once behaviour
- Production environment rejection of preview secrets and non-MySQL
- PWA cache boundaries
- Thumbnail byte validation

That design is useful. It is not a result from this run.

## Missing tests

| Area | Gap |
|---|---|
| Coin reviews | No test that a coin review is stored separately from `products.id` |
| Order lifecycle | No test for cancel, ship, refund, or stock return. Those routes do not exist |
| Payment webhooks | No test. No webhook exists |
| Email | SMTP is mocked only where password reset injects a sender. No inbox test |
| Permission matrix | No test that a viewer cannot export orders or change a product |
| CSRF | No test that checkout or admin mutations reject a missing token |
| Slug uniqueness | No test that two products cannot share a slug |
| Browser | No Playwright or similar. Responsive layout, keyboard traps, and console errors are untested |
| MySQL | Tests use SQLite. `forUpdate`, longtext, and foreign keys behave differently |
| Concurrency | No multi-process checkout test |
| SEO HTML | No test that production `renderMetadata` emits one Product schema and a 404 status |
| Performance | No latency or bundle budget test |
| Security regression | No dependency-exploit regression beyond `npm audit` in CI |

`npm audit` was not re-run in this audit. CI runs `npm audit --audit-level=high` on pull requests and on `codex/**` pushes. It does not run on every branch push to `main`.

## Recommended test plan (after the suite can execute)

1. Re-run `npm test` on Node 22 and record the real pass count.
2. Add a coin-review test that fails if `reviews.product_id` collides with a jewellery id.
3. Add viewer-versus-owner API tests for export and product patch.
4. Add a production-metadata test for robots, sitemap, and 404 status using a temporary database.
5. Add one MySQL service job in CI for checkout and migration `latest`.
6. Add a small browser smoke: home, collection filter, product, bag, checkout validation errors, admin login rejection. Do not use the preview password in CI logs.
7. Keep payment tests absent until a gateway exists. Then test signature failure, amount mismatch, and duplicate events.
