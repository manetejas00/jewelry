# 01 — Project overview

Audit date: 13 November 2026. Scope: the repository at `c:\Ecom\jewelry` (package name `veyora-jewels` 1.0.0). No application code, schema, or data was changed for this audit.

## Business purpose

Veyora Jewels is a custom jewellery and bullion-coin storefront with a merchant studio. Customers browse gold-linked and fixed-price jewellery, gold and silver coins, save pieces, keep a bag, and place cash-on-delivery orders when merchant configuration allows it. Staff import supplier CSVs, publish gold rates, set tax and margin rules, manage offers, reviews, catalogue copy drafts, and product photography.

Live card or UPI collection is intentionally not installed. `PAYMENT_MODE` accepts only `disabled` or `cod` in production (`server/runtime.js`). Checkout is a confirmed COD order with an atomic stock decrement, not a payment gateway.

## Technology stack

Versions below are the ranges declared in `package.json`. This machine is Node.js v24.11.1. The project engine is `>=20.17.0`. CI (`.github/workflows/ci.yml`) uses Node 22.

| Layer | Choice |
|---|---|
| UI | React 19, React DOM 19, React Router 7 |
| Build | Vite 6, no TypeScript |
| Motion / icons | GSAP 3.12, lucide-react 0.468 |
| HTTP | Express 4.21 |
| Sessions | express-session, database-backed store |
| Security middleware | helmet 8, express-rate-limit 7, bcryptjs 3 |
| Data | Knex 3, better-sqlite3 11 (preview), mysql2 3 (production target) |
| Money | decimal.js 10 |
| Images | sharp 0.35 |
| Mail | nodemailer 10 (password recovery only) |
| Import | csv-parse 7, csv-stringify 6 |
| Tests | Node.js built-in test runner, `tests/*.test.js` |
| PWA | `public/manifest.webmanifest`, `public/sw.js`, `public/pwa-boot.js` |

There is no Redis, queue broker, ORM beyond Knex, component test runner, or end-to-end browser suite.

## Repository layout

```
src/                 React storefront and merchant studio
server/              Express application and domain modules
migrations/          Knex migrations 001–014
seeders/             Catalogue and review seeders
scripts/             migrate, seed, daily import, preflight, release packaging
tests/               23 test files, 157 test() cases
public/              PWA shell, icons, uploads, placeholders
samples/             CSV templates and examples
docs/                Existing operations and prior audits
.github/workflows/   CI: npm test, npm run build, npm audit --audit-level=high
```

`server.js` loads `server/index.js`. Development serves Vite in middleware mode. Production serves `dist/` and injects per-path HTML metadata.

## Existing modules

**Storefront routes** (`src/main.jsx`):

- `/` home
- `/collections/:category` jewellery listing, including `saved`
- `/products/:slug` jewellery detail
- `/coins`, `/coins/:category`, `/coins/product/:sku`
- `/bag`, `/checkout`, `/order/:id`
- `/account` sign-in, registration, orders, saved pieces, password recovery
- `/information/:page` shipping, care, returns, contact, about, privacy, terms
- `/admin/*` merchant studio
- unmatched paths render a designed 404

**Merchant studio tabs** (same file, `adminTabs`): Dashboard, Products, Coins, Offers, Reviews, Gold Rates, Pricing Rules, Imports, Orders, Catalogue copy, Settings.

**Server domains:**

| File | Responsibility |
|---|---|
| `server/index.js` | HTTP routes, sessions, auth gates, uploads, admin APIs |
| `server/pricing.js` | Catalogue assembly, gold/coin pricing, offers, quotes |
| `server/orders.js` | COD checkout, idempotency, stock decrement |
| `server/customers.js` | Registration, login, bag/saved merge, order history |
| `server/reviews.js` | Review validation, moderation, rating summaries |
| `server/importer.js` / `server/coin-imports.js` | CSV preview and publication |
| `server/daily.js` | Manual or host-cron supplier fetch |
| `server/otp.js` / `server/otp-gateway.js` | Optional email, SMS, WhatsApp OTP |
| `server/password-reset.js` | SMTP reset links and session invalidation |
| `server/seo.js` | robots, sitemap, canonical, Open Graph, Product JSON-LD |
| `server/search.js` | In-memory search with a small typo map |
| `server/ai-copy.js` | Staff-only catalogue copy drafts |
| `server/thumbnails.js` / `server/listing-thumbnails.js` | Upload checks and WebP derivatives |
| `server/pwa.js` | Manifest and service worker delivery |
| `server/runtime.js` | Production environment gates and checkout enablement |

## Architecture

```
Browser (React SPA, local bag until sign-in)
    → same-origin /api (Express, cookie session, CSRF on account and admin mutations)
        → Knex
            → SQLite file in preview (private/store.sqlite)
            → MySQL in production (pool max 10)
    → /uploads (sharp-validated raster files)
    → optional SMTP, OTP gateway, HTTPS supplier CSV, OpenAI-compatible copy API
```

Preview mode (`PREVIEW_MODE=true`, or anything other than explicit `false` outside production) migrates and seeds on startup. Production refuses to boot if the fictional preview catalogue or `preview@veyora.local` staff row is present (`server/index.js`).

Prices are computed on the server from purity-specific rates, weight, making charges, tax, rounding, margin, and the highest-priority matching offer. The client displays those prices. Checkout re-quotes and rejects a stale quote token.

## What this audit verified

- Source of routes, schema, auth, checkout, SEO, and admin modules was read.
- `npm test` was executed on 13 November 2026: **157 tests, 42 passed, 115 failed**. Failures are the missing `better-sqlite3` native binding for Node 24 (`NODE_MODULE_VERSION` 137). No prebuilt binary exists, and Visual Studio Build Tools on this PC lack a VC++ toolset, so the binding could not be rebuilt. Those 115 cases did not reach their assertions.
- The application server was not started, and the browser was not exercised, because the same binding is required to open the preview database.
- The documented Hostinger site was not re-probed in this pass. Earlier notes in `docs/PRODUCTION_BLOCKERS.md` and `docs/LIVE_AUDIT_REPORT.md` remain historical evidence, not a fresh live result.
