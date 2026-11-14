# Refactoring changelog

## Route and UI moves

- Moved customer sessions, authentication, account state, password recovery and OTP registration to `server/modules/customers/routes.js`. Extracted the customer request guards to `policies.js`.
- Moved public reviews, review uploads and Studio moderation to `server/modules/reviews/routes.js`.
- Moved quote, checkout and order lookup to `server/modules/orders/routes.js`.
- Moved supplier templates, import preview/publication, export, and feed settings to `server/modules/imports/routes.js`.
- Moved the Studio offers list and editor to `src/admin/OffersAdmin.jsx`. The existing dialog is now in `src/components/Modal.jsx`, and shared price formatting is in `src/format.js`.
- Moved coin artwork, coin image mapping, listing image selection and Kurta size measurements to `shared/`. Legacy import files re-export the same values. The package script includes the shared directory.

## Behavior and cleanup

- The SQLite native foreign-key constraint status now matches the existing missing-reference response. Request failure logs omit query strings.
- Runtime validation rejects invalid configured ports and malformed development origins. Updated the environment example with per-deployment configuration guidance.
- Removed the duplicated Kurta size table, two unused Studio route helpers and two unused React hook imports. The refactor removed no migration, public endpoint, package or business feature.
- Converted four catalogue test files from the default database to in-memory fixtures, including historical Kurta SKU coverage. Added HTTP coverage for catalogue aliases, Studio authorization, CSV access and COD checkout.
