# Live production audit — 10 November 2026

## Decision and score

**Test3 is not production-ready. Live health estimate: 42/100.** The local candidate's 70/100 score and 116 passing tests do not establish live readiness. Scores are engineering estimates, not certification or an availability SLA.

| Area | Live points / 20 | Reason |
|---|---:|---|
| Security | 3 | Known preview administrator remains usable; public preview configuration |
| Database/integrity | 15 | Active MySQL verified; existing data preserved and consistent export taken; new migration/restore rehearsal pending |
| Functional journeys | 13 | Browsing, search, gallery, guest bag and quotes pass; account mutations/orders/payments intentionally not executed |
| Search discoverability | 3 | Generic initial HTML, no real robots/sitemap and missing server metadata |
| Deployment/operations | 8 | Deployment outage recovered; incorrect publisher paused; no observed scheduled imports or tested full rollback |
| **Total** | **42** | **NO-GO for real commerce** |

## Important correction

The active application uses **MySQL (`mysql2`)**, confirmed through its actual runtime configuration and successful read-only database queries. The SQLite file found earlier is an **inactive legacy file**. Earlier reports inferred too much from that file's existence; their SQLite-to-MySQL migration requirement is superseded. The real schema has migrations `001` through `008`. Candidate migrations `009`–`011` remain undeployed.

## What was actually checked

Two independently saved public HTTP scans covered 107 jewellery variants / 106 product styles, six coins, 137 HTML responses including error/probe paths, and 786 referenced same-origin assets. Both completed without request errors; the post-recovery scan had zero failed assets. HTTP checks are not equivalent to exercising every page interaction.

Live browser checks covered pagination (24 → 48), price filters, ascending sorting, autocomplete → product details, matching selected-product price, image viewer/zoom/next/Escape, size guide, guest bag quantity and subtotal, checkout quote, refresh persistence, mobile navigation, account/registration form rendering and contact content. Four representative pages passed width checks at 390, 768 and 1440 px, with no horizontal overflow or broken loaded images in those checks. A fresh final browser session captured no console errors. No order was submitted and no customer account was created or altered.

Transport checks verified HTTPS certificate trust, an HTTP 301 to HTTPS, Secure/HttpOnly/SameSite Strict session cookies and rejection of a foreign mutation origin. Unauthenticated customer history and staff catalogue requests were denied. Known preview access remains a critical finding, not a successful security outcome.

## Deployment incident and recovery

At 23:18 IST the owner started a GitHub deployment while the audit was running, then explicitly authorized finishing/repairing it. Hostinger reported “Completed” but its log showed Composer installation and raw repository publication to `public_html`, without a Node/Vite build. API and direct page requests then returned hosting 404s; the existing public assets/uploads had been removed.

Recovery restored the preserved Passenger Node routing, a matching frontend compiled from existing remote `main` commit `b68439a`, and 672 original product images plus their thumbnails from retained publication sources. The full transfer checksum was verified. Images now live outside the Git-published root, linked through the public uploads path. Source/config routes exposed by the raw publication were blocked. No orders, customers, products, prices or staff credentials were changed. Aggregate data-preservation checks remained unchanged; detailed financial evidence stays in ignored private evidence, not this report.

The incompatible automatic publisher is now **off**, verified in hPanel. This prevents another push from deleting the restored web root. The newer security candidate is pushed to `codex/live-production-audit`; it has not been presented as deployed.

## Current blockers

The default preview administrator; preview/fictional merchant data; absent real contact/sender configuration; unsupported online gateway; zero recorded scheduled imports; missing server SEO/probes; unapplied candidate migrations; unverified MySQL upgrade/restore and critical mutation journeys; and an incompatible Git publisher. See PRODUCTION_BLOCKERS.md for owners and next steps.

Evidence is in ignored `artifacts/live-audit/`; private host backups remain outside the web root. No credentials, session values, customer records, database exports or recovery archives are committed. See the six companion live reports for exact scope and limits.
