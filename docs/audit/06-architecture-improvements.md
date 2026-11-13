# 06 — Architecture improvements

The application should stay a single Express process and a React storefront. A rewrite into another framework is not justified. The change worth making is to stop growing `src/main.jsx` and `server/index.js`, and to close the data-model holes that those files currently paper over.

## Current shape

```
src/main.jsx          pages, admin studio, layout, modals  (~2,150 lines, many one-line functions)
src/Account.jsx       customer auth and order list
src/store.jsx         catalogue, bag, saved, session
src/*.jsx             reviews, search, hero, images, pagination
server/index.js       all HTTP routes (~800 lines)
server/*.js           pricing, orders, customers, reviews, import, otp, seo, images
migrations/*.js       schema history
```

Business rules for money and checkout are already outside the UI. That split is worth keeping. HTTP handlers in `server/index.js` still contain validation, SQL, and audit inserts for products, coins, images, and offers.

The client has no global state library. `store.jsx` is a React context. That is appropriate for one catalogue and one bag.

There is no TypeScript. Shared shapes (product, quote, order) are duplicated as object literals on both sides.

## Problems

1. **One file owns the studio and the shop.** A change to checkout scrolling risks a bad merge in the admin product form. Functions are packed onto single lines, which makes review and blame difficult.
2. **Route handlers are the service layer** for catalogue CRUD. `server/orders.js` and `server/reviews.js` show the better pattern.
3. **Two catalogues, one review table.** Jewellery and coins are separate tables with separate integer ids. Reviews assume a product id. Search, bag, and pricing then special-case `kind: 'coin'` and `COIN-` prefixes (`matchOffer`, bag links in `src/main.jsx`).
4. **Configuration is half environment, half `settings` table, then copied into `process.env`.** Feed keys can change at runtime. Shipping and payment cannot. Operators must know which edits need a restart.
5. **Preview and production share one code path** with a boolean. That is fine. The preview database binding is now also an environment hazard on Node 24.
6. **No module boundaries are enforced.** Any file can import `db` and write. There is no circular-dependency check in CI. A quick import scan did not show an obvious cycle between `pricing.js` and `reviews.js`; `pricing.js` imports `getAllProductsRatingSummaries` from `reviews.js`, and reviews do not import pricing. Keep it that way.
7. **Dead or unused surface.** `.env.example` lists `PAYMENT_PROVIDER`, `PAYMENT_SECRET`, and `PAYMENT_WEBHOOK_SECRET`. No server file reads them. `CRON_EXPRESSION` is not read by `scripts/daily.js`. SVG is accepted in the upload route’s extension list and then rejected by `saveUploadedImage`.

## Target shape (incremental)

Keep Express, React, Knex, and the existing tables.

```
server/http/           route registration only
server/catalog/        products, coins, images
server/commerce/       quote, checkout, orders, offers
server/identity/       customers, staff, otp, password reset
server/feeds/          importer, daily, settings
src/shop/              home, collection, product, bag, checkout
src/account/
src/studio/            one file per admin tab
src/ui/                Modal, buttons, money format
```

Move files only when a feature is already being changed. Do not relocate everything in one pull request.

### Concrete refactors

| Change | Reason | When |
|---|---|---|
| Extract `Product`, `Collection`, `Checkout`, and each admin tab from `main.jsx` into files that export the same components | Reviewable diffs | Next time each screen is edited |
| Move product, coin, and image SQL out of `server/index.js` into functions beside `orders.js` | Same validation on create and patch | With the NaN patch fix |
| Introduce a `catalog_items` view or a `subject_type` + `subject_id` on reviews | Stop coin/product id collisions | Before any coin review is trusted |
| Read feed settings from the database inside `daily()` instead of writing `process.env` | Predictable config | With the next feed change |
| Delete unused payment env keys or implement the gateway behind them | Stops a false sense that payments exist | When the merchant chooses a gateway |
| Add JSDoc or a small `types` module for Quote, Order, and Product | Shared contract without a TypeScript migration | Optional |
| Pin CI and local development to Node 22 | Matches `engines` intent and prebuilt native modules | Immediately, as a docs and `.nvmrc` change, not a rewrite |

## What not to do

- Do not replace Express with another HTTP framework.
- Do not introduce Redis, a queue, or a new UI kit before the order lifecycle and review identity are fixed.
- Do not split the frontend into micro-frontends.
- Do not generate a second admin application. The studio already covers the catalogue.

## Dependency notes

Runtime dependencies are all used: React, router, Express, Knex, both database drivers, sharp, bcrypt, helmet, rate limit, sessions, CSV, decimal.js, dotenv, nodemailer, GSAP, lucide-react. `npm audit` belongs in CI and was not re-run here. There is no dependency-cruiser or unused-export check. `dist/` is committed as build output in the workspace listing; confirm whether production deploys that folder or builds on the server before treating it as source.

## Maintainability

A new engineer can follow `README.md` into `server/orders.js` and understand checkout. They cannot safely edit the studio without reading a 2,000-line line-wrapped file. Splitting by screen is the highest-leverage architecture change and does not alter behaviour if the exports stay the same.
