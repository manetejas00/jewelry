# 09 — Production readiness

**Status: not ready for real customer payments or a public launch.**

COD can be considered only after the launch gates below are true on a staging host. This audit did not deploy, did not change DNS, and did not open the documented staging site.

## What the repository already provides

| Piece | State |
|---|---|
| Production env gate | `validateRuntime` blocks preview mode, weak secrets, non-HTTPS `APP_URL`, and non-MySQL |
| Preview data gate | Boot fails if fictional suppliers or the preview staff email are in the database |
| Checkout gate | Off until merchant email, shipping policy, and returns policy are set, and payment mode is `cod` |
| Migrations | `npm run migrate` runs Knex `latest`. Migration `010` widens MySQL text columns. Down migrations exist; `010` down is intentionally a no-op |
| Health | `/health/live`, `/health/ready` |
| Process | `npm start` is `NODE_ENV=production node server/index.js`. Listen address is `0.0.0.0` in production |
| Cookies | Secure when `APP_URL` is https |
| CI | On pull requests and `codex/**` pushes: `npm ci`, `npm test`, `npm run build`, `npm audit --audit-level=high` on Node 22 |
| Release helper | `scripts/package-release.js`, `scripts/preflight.js`, `scripts/verify-deployment.js` |
| Rollback notes | `docs/ROLLBACK.md` (manual) |
| Upload path | `UPLOADS_DIR` can sit outside the release directory |
| Secrets in git | `.env` and `.env.*` are ignored except `.env.example`. This audit did not open a real `.env` |

## Gaps

### Deployment

- CI does not deploy. A green pull request does not update a host.
- Prior operations notes say the Hostinger Git integration expected a PHP/Composer publish and that auto-publish was paused (`docs/PRODUCTION_BLOCKERS.md`, `docs/CI_CD_SETUP.md`). That was not rechecked on 13 November 2026.
- There is no staging-versus-production compose file for the app. `docker-compose.otp.yml` is only the optional OTP gateway.
- `start` uses a Unix-style `NODE_ENV=production` prefix in `package.json`. On Windows `npm start` will not set the variable unless the shell does. Production on Linux is unaffected. Local Windows production checks are.

### Database

- No backup schedule, retention, or restore drill in the repo.
- No migration dry-run against a copy of production MySQL in this audit.
- SQLite must not be the production client. The runtime gate enforces that.

### Runtime

- One Node process. A crash loses in-memory rate limits and the search cache. Sessions survive in the database.
- Cron is external. Nobody is paged if `scripts/daily.js` exits non-zero.
- Logs are stdout JSON lines. No rotation, no error tracker, no uptime monitor.
- TLS is assumed to terminate at the proxy. The app does not redirect HTTP itself. `TRUST_PROXY` must match the real hop count or rate limits key on the proxy address.

### Domain

- Canonical URLs follow `APP_URL` only.
- No in-app www or apex redirect.
- The staging hostname mentioned in older docs must stay `noindex`. Preview robots already disallow all crawlers when `MERCHANT_READY` is not `true`.

### Dependencies and local QA

- This workstation’s Node 24 cannot load `better-sqlite3`. Production on Node 22 is the intended target (`ci.yml`). Pin the host to Node 22 so native modules match CI.
- `npm audit` was not executed in this pass.

### Rollback

- Code rollback is “deploy the previous release” if `UPLOADS_DIR` and the database live outside the release. That layout is documented, not proven on the current host.
- Schema rollback via Knex `down` can drop columns. Do not run `down` on production. Restore the database backup instead. Migration `010` cannot be narrowed safely.

## Launch gates

All of these are required before `MERCHANT_READY=true` on a public origin.

1. Node 22 (or another version with a working `better-sqlite3` or, in production, a tested `mysql2` only) and `npm test` green on that runtime.
2. Empty production database, migrations applied forward only, preview staff absent.
3. `SESSION_SECRET` unique, 32+ characters, not in git.
4. `APP_URL` is the final `https://` origin. `TRUST_PROXY` matches the proxy. Cookies observed as `Secure` in a browser.
5. `UPLOADS_DIR` outside the git checkout, writable, and included in backups.
6. SMTP verified with one password-reset email to a staff inbox.
7. Shipping and returns text approved by the merchant. Contact email is a real domain.
8. Gold rate file fresher than `GOLD_MAX_AGE_HOURS`, and a host cron entry whose next `daily_runs.trigger = scheduled` row has been seen.
9. One staging COD order: stock decreases once, a second submit with the same idempotency key does not decrease stock again, guest and account order pages enforce `mayReadOrder`.
10. Viewer staff cannot download the order CSV, after that fix is implemented.
11. Coin review fix deployed before coin reviews are enabled, or coin reviews hidden.
12. Backup taken, then a restore onto a spare database proven once.
13. `robots.txt` and `sitemap.xml` fetched on the production origin and checked by the merchant’s Search Console property.
14. Health check watched by an external monitor.
15. Rollback owner and previous release artifact identified before the DNS or proxy cutover.

Until those are done, keep `MERCHANT_READY=false` and `PAYMENT_MODE=disabled` on any public host.

## Readiness score

DevOps and deployment category in the scorecard is 2/5. The application has the gates and health routes a small Node shop needs. It does not have an automated, observed, restorable production path.
