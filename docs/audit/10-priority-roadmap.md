# 10 — Priority roadmap and score

Audit date: 13 November 2026. Do not start implementation until this report is reviewed and the implementation phase is explicitly approved.

## Score

| Category | Weight | Score | Reason |
|---|---:|---:|---|
| Functionality | 15 | 9 | Browse, variants, gold pricing, bag, accounts, COD checkout, imports, offers, reviews, and the studio are implemented in code. Online payment, order lifecycle, order email, and coin-review storage are not complete. Journeys were not exercised in a browser. |
| Architecture and code quality | 10 | 5 | Domain modules for pricing and checkout are sound. `src/main.jsx` and `server/index.js` concentrate too much behaviour. No types. Config is copied into `process.env`. |
| Security | 15 | 10 | Sessions, bcrypt, CSRF on account and admin mutations, rate limits, upload checks, and production boot gates are real. Remaining: order PII for viewers, coin-review foreign key, no payment webhook (correctly disabled), recovery email off by default. |
| Database design | 10 | 6 | Clear commerce tables, decimals, idempotency, and some foreign keys. Missing uniqueness on slugs, missing foreign keys on order lines, coin ids reused as product ids, no order status, SQLite foreign keys off. |
| UI and responsiveness | 10 | 6 | CSS covers phone through desktop, dialogs manage focus, and empty/error states exist in code. This audit did not render the UI, so interaction, contrast, and console health are unverified. |
| SEO, AEO, and GEO | 10 | 5 | Robots, sitemap, canonical, Open Graph, and Product schema exist and stay noindex until the merchant is ready. Missing organization schema, FAQ, unique slugs, analytics, Search Console, and crawlable body copy. |
| Performance | 10 | 6 | Thumbnails, asset splitting, and checkout row locks are in place. Every visitor downloads a fully priced catalogue, and product HTML repeats that work. No measurement was taken. |
| Testing and QA | 10 | 4 | 157 tests exist. This run: 42 passed, 115 failed before assertions because the SQLite native module does not load on Node 24. No browser or MySQL run. |
| DevOps and deployment | 5 | 2 | Health checks, env gates, and CI on pull requests exist. No automated deploy, backup, alerting, or observed cron. Prior hosting notes describe a mismatched publisher. |
| Documentation and maintainability | 5 | 4 | README and `docs/` explain operations well. The densest source files are hard to maintain, and older test reports do not match this run. |
| **Total** | **100** | **57** | |

### What 100 in each category would require

- **Functionality:** COD or a verified gateway, emails, shipment states, stock restored on cancel, coin reviews stored correctly, unique URLs, and those paths clicked through on staging.
- **Architecture:** Route files and studio screens split without a framework change; feed settings read from the database; create and patch sharing one validator.
- **Security:** Viewer PII removed, staff revocation, checkout CSRF, foreign keys on in preview and production, secrets only on the host, a reviewed gateway design before any online payment.
- **Database:** Unique slugs, order status history, real foreign keys, backups proven by restore.
- **UI:** Browser pass on phone and desktop for shop and studio, including keyboard use, with no console errors.
- **SEO:** Indexable production HTML, one Product schema, Organization and breadcrumbs, sitemap `lastmod`, Search Console, and honest FAQ copy.
- **Performance:** Slug queries, paginated lists, a recorded mobile Lighthouse run within an agreed budget.
- **Testing:** The 157 tests green on Node 22, plus permission, coin-review, and one browser smoke.
- **DevOps:** Node 22 on the host, forward-only migrations, external health check, backup restore drill, cron row observed.
- **Documentation:** This audit plus a short merchant daily checklist. Code split so the checklist maps to files.

## Overall health

**57 / 100. Usable as a private preview of a custom jeweller. Not production-ready.**

The business model is coherent: gold-linked jewellery, bullion coins, supplier CSV, and COD. The dangerous launch mistakes (taking card payments in the browser, indexing fictional stock, booting preview data as production) are actively refused. The remaining work is the operating loop around a real order: identity of reviews, staff access to customer data, email, shipment, backups, and a runtime that can be tested.

## Critical blockers

1. Do not set `MERCHANT_READY=true` on a public host until the launch gates in `09-production-readiness.md` are done.
2. Do not enable a payment provider until webhook verification exists. None exists today.
3. Coin reviews can attach to the wrong jewellery id or fail the foreign key (S2 in `04-security-audit.md`).
4. Local Node 24 cannot run the database or the app until `better-sqlite3` is rebuilt or Node 22 is used. QA is blocked on this machine.
5. Historical staging notes still list a preview administrator and a mismatched Git publisher. Those were not re-verified here and must be re-checked before any cutover.

## Top 20 improvements

| # | Item | Priority | Complexity | Depends on |
|---|---|---|---|---|
| 1 | Run tests on Node 22 and record a real pass | Critical | Low | Nothing |
| 2 | Separate coin review identity from `products.id` and test it | Critical | Medium | 1 |
| 3 | Stop viewers exporting customer addresses; minimise dashboard PII | Critical | Low | 1 |
| 4 | Unique index on `products.slug` after a duplicate check | High | Low | Database backup |
| 5 | Shared validator for product create and patch; reject non-numeric weight and price | High | Low | 1 |
| 6 | Order status changes, cancel, and stock restoration in one transaction | High | Medium | Merchant status list |
| 7 | Order and merchant email via existing nodemailer | High | Medium | SMTP credentials |
| 8 | Customer CSRF on signed-in checkout | High | Low | 1 |
| 9 | Staff disable and role change, or a documented CLI plus a `disabled` column checked at login | High | Medium | 3 |
| 10 | Enable SQLite `PRAGMA foreign_keys=ON` | High | Low | Review existing preview data |
| 11 | Pin `.nvmrc` / host to Node 22 | High | Low | Nothing |
| 12 | Prove one MySQL backup restore on a spare database | High | Medium | Host access |
| 13 | Observe one scheduled `daily_runs` row from host cron | High | Low | Supplier file |
| 14 | Slug and product HTML metadata without loading the full catalogue | Medium | Medium | 4 |
| 15 | SQL pagination for public catalogue and admin products | Medium | Medium | 14 |
| 16 | Offer codes, start, and end actually applied in `quote` | Medium | Medium | Merchant rules |
| 17 | Organization schema, sitemap `lastmod`, information URLs, single Product schema | Medium | Low | Final `APP_URL` and policies |
| 18 | Split `main.jsx` screens into files without visual changes | Medium | Medium | Avoid during behaviour fixes |
| 19 | External health check and import-failure alert | Medium | Low | 12, 13 |
| 20 | Browser smoke on home, product, bag, checkout errors, and admin login | Medium | Medium | 1 and a running server |

Complexity is relative to this codebase: Low is about a day, Medium is several days, including tests. No multi-week rewrite is recommended.

## Acceptance criteria for a production candidate

- `npm test` passes on the same Node version as production.
- A staging COD order is placed, retried, cancelled, and the stock figures match.
- A coin review cannot change a jewellery product’s rating.
- A viewer session receives no customer address export.
- Password reset arrives once in a real inbox and invalidates old sessions.
- `GET /health/ready` fails when the database is stopped and succeeds when it is up.
- `robots.txt` on the public origin matches the merchant-ready decision.
- A restore from backup has been completed on a non-production database.

## Suggested sequence

**Week A — make it testable and safe.** Items 1, 2, 3, 5, 8, 10, 11.

**Week B — make an order operable.** Items 4, 6, 7, 9, plus merchant policy text. Still `PAYMENT_MODE=cod` or `disabled`.

**Week C — make the host believable.** Items 12, 13, 17, 19, 20. Only then consider `MERCHANT_READY`.

**Later.** Items 14–16 and 18, then a gateway design if COD is not enough. Gateway work is a separate project with its own security review.

## Files written by this audit

- `docs/audit/01-project-overview.md`
- `docs/audit/02-complete-audit-report.md`
- `docs/audit/03-missing-features.md`
- `docs/audit/04-security-audit.md`
- `docs/audit/05-performance-audit.md`
- `docs/audit/06-architecture-improvements.md`
- `docs/audit/07-seo-audit.md`
- `docs/audit/08-testing-report.md`
- `docs/audit/09-production-readiness.md`
- `docs/audit/10-priority-roadmap.md`

No application source, schema, or configuration was changed.
