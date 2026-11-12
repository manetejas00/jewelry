# Veyora Jewels

A mobile-first jewellery storefront and merchant studio, built from an empty workspace. React 19 + Vite, Express, Knex, Decimal.js, GSAP. SQLite is the local preview database; MySQL is the deployment target. No template, Git history, existing accounts or commerce platform was present. Design direction adapted from [Maison Perle](https://github.com/TencentEdgeOne/awesome-website-prompts-and-skills/blob/main/prompts/maison-perle.md).

## Run the preview

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Preview mode creates an ignored local database, fictional catalogue and a local owner account. The admin login at `/admin` is prefilled with `preview@veyora.local` / `preview-veyora-2026`. Do not expose preview mode to the public. No money is collected.

```sh
npm test
npm run build
```

Production uses `npm start`, explicit migrations (`npm run migrate`) and `PREVIEW_MODE=false`. Follow [Hostinger setup](docs/hostinger-setup.md); never copy the preview database into production. The original logo, catalogue, product photography, policies, supplier feeds and live gateway remain merchant inputs.

## What is implemented

- Editorial homepage, collections, URL-backed search/filter/sort, product details, variant SKUs, reference size guide, image zoom, saved pieces and persistent bag.
- Customer registration/sign-in, account-specific order history, server-saved bag/favourites and guest-item merge. See [customer accounts](docs/customer-accounts.md).
- Guest test checkout with delivery charges, explicit total acceptance, server price/stock checks, order confirmation, atomic stock decrement and idempotent payment retries.
- Role-checked staff sessions and CSRF protection, six admin sections, catalogue copy editing, tax/rounding preview, import staging, confirmation, error downloads and audit records.
- Shared scheduled/manual CSV importer, decimal gold normalisation, no automatic purity conversion, rate history, freshness gate, stock snapshots adjusted for intervening paid orders, stable SKU grouping, checksum deduplication, source ordering and transaction locks.
- Schema-generated sample downloads, migrations, repeatable fixtures and handover documentation.

## Operating notes

[Import guide](docs/import-guide.md) · [Hostinger setup](docs/hostinger-setup.md) · [Audit and change summary](docs/audit.md) · [Verification results](docs/test-results.md)

Live payment integration is deliberately unavailable until the merchant identifies the gateway and supplies its approved server-side integration details. Test checkout is not a payment gateway. There is no claim that the Hostinger database or scheduler is connected. Product structured data is populated from the published catalogue. All certification and hallmarking claims have been omitted.

## Installable storefront

The customer site can be installed from the browser on Android, iPhone, iPad, and desktop. It stays this Vite and Express application: same catalogue, sessions, and database. Prices, stock, accounts, and checkout are not stored in the service worker. Web Push is not enabled. Hosting notes are in [deployment](docs/DEPLOYMENT.md).

## Catalogue copy drafts

Merchant Studio → Catalogue copy can draft a product name or description with three Nexscope instruction skills. Drafts stay out of the live catalogue until an owner or manager approves the name, the description, or both. Setup, the skill audit, and the environment variables are in [catalogue copy](docs/AI_CATALOGUE_COPY.md). Apply migration `013_ai_drafts.js` with `npm run migrate` before using it. Preview mode applies pending migrations when the server starts.

## Expanded catalogue and image zoom

The 100-product collection uses the existing product, supplier mapping and image tables. Run `npm run seed:products` independently, or `npm run seed:catalogue` through DatabaseSeeder. Both are transactional and repeat-safe; neither removes existing records or resets sold stock. See [collection data, images and verification](docs/products-100.md). Product-image buttons reuse the full-screen viewer, and product-name links keep opening details.

## Current production audit

See [project audit](docs/PROJECT_AUDIT.md), [readiness checklist](docs/PRODUCTION_READINESS.md), [deployment](docs/DEPLOYMENT.md), [rollback](docs/ROLLBACK.md), [security](docs/SECURITY_AUDIT.md), [test results](docs/TESTING_REPORT.md) and [environment setup](docs/ENV_SETUP.md). Test3 remains a public preview; the updated source has not been deployed. Do not enable real commerce until the live preview account, database migration, merchant configuration and staging verification gates are resolved.

## Independent live verification

The active Test3 database is MySQL; the earlier SQLite inference was corrected through read-only SSH checks. See [live audit](docs/LIVE_AUDIT_REPORT.md), [current blockers](docs/PRODUCTION_BLOCKERS.md), [deployment verification](docs/LIVE_DEPLOYMENT_VERIFICATION.md), and [Git/CI status](docs/CI_CD_SETUP.md). A raw Git publication caused an outage during the audit; the legacy app and original images were recovered without commerce-record changes. The incompatible auto-publisher is paused; the tested security candidate is on the review branch, not main/live.
