# Project architecture

## Folder structure

```text
server/index.js                   Express composition, middleware and startup
server/modules/jewelry/          Jewelry API, services and persistence
server/modules/coin/             Coin API, services and persistence
server/modules/kurta/            Kurta API, services and persistence
server/modules/customers/        Account and verification routes, customer policies
server/modules/reviews/          Storefront and Studio review routes
server/modules/orders/           Quote, checkout and public order routes
server/modules/imports/          Supplier import, export and settings routes
server/chat/                     Chat configuration, routes, service and provider
server/*.js                      Existing commerce services and infrastructure
src/main.jsx                     SPA routes and storefront/Studio composition
src/admin/                       Studio feature modules and reusable components
src/components/                  Shared catalogue views
src/api.js, src/store.jsx        HTTP client and storefront state
shared/                          Public catalogue data and media URL mapping
migrations/, seeders/, scripts/  Schema history, seed data and operator tools
tests/                           Node unit and integration suites
```

## Extraction plan and ownership

| Existing implementation | Destination |
| --- | --- |
| Customer account and OTP route registrations in `server/index.js` | `server/modules/customers/routes.js`, with shared customer request guards in `policies.js` |
| Public and staff review routes in `server/index.js` | `server/modules/reviews/routes.js`; retain `server/reviews.js` as the business entry point |
| Quote, checkout and order lookup | `server/modules/orders/routes.js`; retain transactional operations in `server/orders.js` |
| Templates, CSV endpoints and supplier settings | `server/modules/imports/routes.js`; retain preview/publish and daily feed services |
| Coin artwork, public media mappings and Kurta measurements | `shared/`; keep existing module exports as compatibility entry points |
| Studio offers list and editor | `src/admin/OffersAdmin.jsx`; reuse the existing API client and shared amount formatting |

HTTP routes use the existing asynchronous wrapper and explicit dependencies from the composition root. Authentication and CSRF policies precede handlers. Business services accept a Knex connection or a transaction and do not depend on Express. Existing product repositories remain the persistence boundary for the dedicated modules. UI depends on the HTTP client and state provider. Frontend and backend may both depend on `shared/`, which contains only public, runtime-neutral modules.

Route groups are extracted at their existing registration points. Maintain response shapes, aliases, limits, role checks, invalidation, and write transactions. Keep legacy and dedicated catalogue storage in service until their SKU, stock, order and import contracts can be verified together. The release archive must include `shared/`.

Use PascalCase for components and classes, camelCase for functions and variables, and UPPER_SNAKE_CASE for domain constants. Choose one file per responsibility when it has independent callers or a clear boundary. Add repositories and policies when they own meaningful persistence and authorization rules.
