# Production readiness

> Live verification correction (10 November 2026): active storage is MySQL; the SQLite file is inactive legacy storage. The newer LIVE_AUDIT_REPORT.md and LIVE_DEPLOYMENT_VERIFICATION.md supersede earlier SQLite assumptions and describe the owner-triggered deployment incident/recovery.

Updated 10 November 2026. Decision: **NO-GO for real commerce**. Engineering score: 44/100 initially, 70/100 after local fixes; this is not a live readiness certificate.

## Completed locally

- [x] Baseline and expanded automated tests run; critical new paths have regression coverage.
- [x] Production build and local generated asset checks pass.
- [x] Dependency security audit reports zero known issues after updates.
- [x] Explicit production configuration, secure cookies, proxy setting, role checks, CSRF and rate/body limits.
- [x] Merchant/payment readiness gating; no fabricated online payment success.
- [x] Exact-purity/freshness pricing, decimal bag totals and guest retry binding.
- [x] Password recovery implementation with real SMTP path, hashed one-use tokens and session invalidation.
- [x] Generic internal errors, correlation IDs, health probes, expired-session cleanup and graceful shutdown.
- [x] Additive migration files; no destructive production deployment performed.
- [x] Server SEO renderer, sitemap, robots and private-route controls.
- [x] Local collection responsive checks at 390, 768 and 1440 px.
- [x] Deployment/rollback/environment/test/security reports and secret-excluding release package process.

## Must pass before live production release

- [ ] Replace publicly known test3 preview administrator and rotate sessions.
- [ ] Approve authoritative catalogue/specifications, actual stock and imagery rights.
- [ ] Restore the active MySQL export plus persistent uploads successfully into isolated staging.
- [ ] Reconcile existing customers/orders/stock on the staging copy and verify counts, totals, hashes and relationships; preserve the active MySQL database.
- [ ] Exercise every migration against target MySQL version, including upgrade path and payload capacity.
- [ ] Complete MySQL concurrent checkout/import contention and rollback tests.
- [ ] Configure production HTTPS origin, Node supervisor, persistent uploads and verified proxy hops.
- [ ] Route HTML, robots, sitemap and API through the intended application; avoid static HTML bypass.
- [ ] Supply verified merchant contact/policies/taxes, explicit COD approval and delivery arrangement.
- [ ] Configure SMTP; verify inbox delivery and password-reset session revocation on staging/live.
- [ ] If required, implement selected online gateway and verify payment/cancel/timeout/refund/webhook scenarios. `PAYMENT_MODE=live` is unsupported.
- [ ] Configure contracted supplier rates/stock feed; observe scheduled execution independently of a manual run.
- [ ] Verify live mobile/desktop checkout and ownership, customer/staff logout, search/filter/gallery/upload/import behavior.
- [ ] Measure actual Core Web Vitals, API p95 latency, concurrency and memory against agreed traffic goals.
- [ ] Register uptime/integration alerts, backup retention and restore drill owners.

Current test3 remains the earlier deployed preview. A release archive does not mean these checks have passed.
