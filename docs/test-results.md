# Verification results

Verified locally on 9 November 2026 (Asia/Kolkata). This report distinguishes local tests from real service verification.

## Build and database

- `npm run build`: passed. Vite generated `dist` successfully. React Router’s ignored module-level `use client` notices are non-fatal.
- `npm test`: **21 passed, 0 failed** using isolated in-memory SQLite and the actual importer/checkout services.
- `node scripts/check-db.js`: passed local database write/read/remove round-trip.
- MySQL on Hostinger: not connected or exercised; deployment migration/locking behaviour must be verified against the actual server.

## Automated checks

1. Synthetic 5.000 g × ₹6,000/g + ₹2,000 making = ₹32,000 subtotal.
2. ₹1,00,000 / 10g → ₹10,000/g normalisation.
3. Fixed prices unchanged by rate/tax-rule changes.
4. Both generated filled CSV files validate and publish through the actual preview importer; 7 variant rows, 3 purity rates.
5. Repeated file and repeated publish do not apply twice.
6. Malformed headers, duplicate SKU, negative stock and unknown gold units rejected.
7. Failed publication preserves previous stock and catalogue.
8. Stale source rates pause gold-linked checkout while fixed pieces remain available.
9. Effective date participates in freshness checks.
10. Out-of-stock and duplicate bag SKU lines rejected.
11. Exact selected size/SKU and price breakdown saved; repeated payment key cannot double-decrement stock.
12. Price change between quote and checkout returns a new quote requiring acceptance.
13. Stock reduction after quote rejects checkout without creating an order.
14. Stock snapshots subtract orders after their source timestamp.
15. Incremental feed creates a new SKU, preserves omitted SKUs and protects merchant copy.
16. Older supplier files cannot overwrite newer data.
17. New gold rates update current prices while existing order totals remain immutable.
18. Held import lock rejects overlapping publication; safe retry works after release.
19. Gold supplier outage retains rates and permits an independent product update.
20. Held daily workflow lock rejects an overlapping run.
21. Scheduled runner consumes staff-saved source configuration, using a mocked authorised CSV response. This is an automated integration fixture, not evidence of a Hostinger scheduled run.

## Browser journeys

Desktop and 390 × 844 mobile were exercised through the browser UI:

- Open collection, apply purity/in-stock filters, inspect a ring, select size and add the exact SKU.
- Refresh, reopen bag, confirm retained size and price.
- View shipping and full payable total, enter fictional contact details and explicitly accept the displayed total.
- Desktop simulated decline retains the bag; retry succeeds without collecting money.
- Desktop test order `VEY-FABBD966C44E`: size 14, ₹22,500 including ₹250 delivery.
- Mobile test order `VEY-E55F6CE6A82B`: size 12, ₹21,000 including ₹250 delivery.
- Both orders appeared in the authenticated merchant Orders screen with matching totals and India timestamps.
- Owner feed settings saved successfully and generated an audit record.
- Running the two unconfigured sources surfaced separate failures without discarding approved rates.
- Gold example uploaded through the actual file chooser, old/new normalised rates displayed, publication confirmed and import history updated.
- Blank gold template downloaded successfully through the authenticated admin route.
- Home inspected at 390, 768, 1024 and 1440 pixel widths. No document-wide horizontal overflow detected. Mobile admin overflow was found, repaired and rechecked (document width = viewport width = 390). Wide admin tables scroll inside their containers.
- Reference image assets loaded without broken images in the checked page; no browser console errors observed during initial storefront inspection.

## Verification limits / launch status

| Area | Actual status |
| --- | --- |
| Local storefront and admin | Implemented and exercised |
| Local database | Migration and write/read verified |
| Production MySQL | Configuration/migration code supplied; no actual connection verified |
| Supplier data | Manual preview import verified; real feed credentials/schema unavailable |
| Daily schedule | Workflow and schedule instructions supplied; no Hostinger job installed/observed |
| Payment | Simulated test checkout verified; live provider integration unavailable |
| Original brand media/catalogue | Awaiting merchant; reference photography and fictional data are preview-only |
| Claims/policies | No unsupported certification, hallmarking or press claims; actual policies/contact awaiting merchant |

Live gateway order creation, signed callbacks/webhooks, gateway cancellation/refund flows and real supplier JSON adapters require the chosen providers. A multi-process MySQL concurrency test, real-source outage test, live-domain session/HTTPS check and actual scheduled-run observation remain host verification work. See `hostinger-setup.md` for exact remaining inputs and steps.

## Customer account update

`npm test`: 29 passed, 0 failed after adding customer accounts. Eight new service tests verify bcrypt registration, duplicate/invalid account rejection, login, idempotent guest merge, persisted account state and stale-tab rejection, server-owned checkout association/atomic bag clearing, private order access, and proof-based guest order association. The existing 21 commerce checks still pass.

Browser verification used a fictional preview customer: registration merged a saved Lune Pearl Drops and exact SKU VEY-LP-01 bag line. Sign-out showed an empty guest bag, and sign-in restored it without duplication. A signed-in checkout created test order VEY-28FEDE04566A for ₹24,750, which appeared in customer order history; its purchased bag line cleared and the saved favourite remained. No money was collected. Mobile account layout was inspected at 390px and its overflow was corrected.

Customer UI follow-up: a second mobile logout/login restored order VEY-28FEDE04566A and its saved favourite. Account overview, order history and sign-in were rechecked at 390px with document width equal to viewport width. Visiting Merchant Studio while customer-authenticated still showed the separate staff sign-in screen.
