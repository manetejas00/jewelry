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
