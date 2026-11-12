# Deployment to test3

10 November 2026. **Release prepared locally; not deployed.** Test3 is currently an internet-accessible preview with active MySQL and a publicly known preview owner login. Do not replace it blindly or switch configuration before data reconciliation and restoration checks.

Host access observed: signed-in hPanel, Business Web Hosting, SSL enabled, `app/` source tree, `public_html/` web root, an inactive legacy `app/private/store.sqlite` file. Active MySQL was later verified over SSH. The exact Node supervisor/start command, absolute account filesystem path, reverse-proxy mapping and actual MySQL configuration were not verified. The static homepage is served by LiteSpeed; `/robots.txt` currently falls back to HTML.

## 1. Local pre-deployment checks

From the repository root:

```sh
npm ci
npm test
npm run build
npm run assets:check
npm audit
npm run release:package
```

The package is `artifacts/veyora-reviewed-release.tar.gz`. Packaging includes compiled and source assets, migrations, tests and reports. It excludes `.env`, `.git`, `private/`, node_modules and existing public uploads. This is deliberate: live data/uploads must be preserved separately. Do not publish the archive under a public URL. Installation must include development dependencies for the build/test stage; a later runtime-only environment may omit them after assets exist.

## 2. Verified backup and isolated staging — stop until complete

The live audit confirmed active MySQL and created a consistent private MySQL export plus filesystem recovery copies. The legacy SQLite file is not the active order store; do not migrate it over MySQL. Restoring lost uploads preserved existing commerce records. See LIVE_DEPLOYMENT_VERIFICATION.md for the actual incident and recovery.

Before the next release, choose a maintenance window and pause actual writers through verified controls. Take a fresh consistent MySQL export and persistent upload/configuration backup. Use the host's private environment or protected client configuration, never password arguments or chat. Keep exports outside public_html with owner-only permissions. Restore into an isolated MySQL database and verify counts, immutable totals, keys, stock and image relationships. No successful restoration drill is claimed.

The active schema has migrations 001–008. Rehearse additive 009–011 against the isolated copy, including realistic payload sizes and concurrent order/import behavior. Do not run preview/catalogue seeders, delete customer/order rows or use Knex down on the existing store. MySQL DDL may auto-commit, so transaction syntax does not replace a tested backup.

## 3. Stage the release and configuration

Use the confirmed Node-capable deployment facility or supervised backend. Hostinger's current [official guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) supports Node.js apps; the existing PHP/static-style dashboard alone does not establish this application's process management. Do not create a competing live store or delete the current website to change hosting type.

Unpack into a separate staging/release folder. Configure private variables per ENV_SETUP.md: production, preview false, actual MySQL, HTTPS origin, strong secret, verified proxy hops and persistent uploads. Keep `PAYMENT_MODE=disabled` until merchant approval and data reconciliation. Retire the default preview owner through a controlled account change, and clear existing staff sessions after secret rotation. The owner should enter private credentials directly in the host interface.

From the staged release root with its private environment loaded:

```sh
npm ci
npm run build
npm run preflight
npm run migrate
node scripts/check-db.js
```

Preflight intentionally fails against the current preview environment. Do not bypass it. `check-db.js` writes/reads/deletes only its random verification setting; use the intended staging/production connection deliberately. MySQL DDL may auto-commit; the backup/restore gate applies before migrations.

On a fresh approved database without a merchant owner, configure bootstrap credentials privately and run:

```sh
node scripts/create-admin.js
```

Remove ADMIN_PASSWORD after successful creation. Existing accounts must be reconciled; duplicate-owner errors are not permission to wipe staff or order tables.

## 4. Routing, assets and runtime

- Entry: `server/index.js` (or existing thin `server.cjs` if the verified host runtime requires CommonJS).
- Start: `npm start`. Register/restart through the actual host supervisor, not an untracked background shell process.
- Serve `/api/*`, `/health/*`, `/robots.txt`, `/sitemap.xml` and HTML page requests through Express. Its production HTML renderer provides canonical/social/schema tags and real 404 status. Static `public_html/index.html` fallback bypasses this work and must be corrected in the actual host routing configuration.
- Compiled assets are under `dist/assets`; preserve referenced public asset directories. Existing live uploads must stay at the verified persistent location. Set `UPLOADS_DIR` explicitly; the old implicit sibling public_html detection was replaced with explicit configuration.
- The reverse proxy must preserve HTTPS forwarding safely and bypass cache for API/account/order HTML. Never cache sessions or personalized API responses.
- New SVG uploads are rejected. Verify existing uploads served directly by LiteSpeed get equivalent restrictive headers or are routed through Express.
- Test native modules and dependency installation on the chosen current supported Node runtime. Local verification used Node 20.17.0; do not assume that establishes compatibility with every host runtime.

## 5. Staging acceptance, then controlled cutover

Run the full application against staging MySQL with realistic restored data. Check all migrations, production secure sessions, customer/staff flows, order ownership, CSRF, rejected origins, approved COD stock/total/idempotency, offer/catalogue/coin CRUD, CSV imports/exports, images, search, gallery and mobile layouts. Test overlapping import/checkout processes on MySQL and simulate source/SMTP failure. Online payment remains unavailable until separately implemented and tested.

Only after these pass, choose a short maintenance window; take a final consistent backup and reconcile writes since the first snapshot. Activate the verified release/supervisor mapping atomically where supported. Keep the previous code release, configuration and database backup. Do not run Knex `down` during cutover.

## 6. Post-deployment verification

```sh
curl --fail --show-error https://test3.avinyacarefoundation.org/health/live
curl --fail --show-error https://test3.avinyacarefoundation.org/health/ready
curl --fail --show-error https://test3.avinyacarefoundation.org/api/config
curl --fail --show-error https://test3.avinyacarefoundation.org/robots.txt
curl --fail --show-error https://test3.avinyacarefoundation.org/sitemap.xml
```

Verify config explicitly says preview false and intended payment mode, robots has text content and sitemap is XML. Check initial HTML source for product-specific metadata and canonical HTTPS URLs, missing products return 404, unknown APIs return JSON 404, secure cookie/header behavior, database read/write, original order totals and asset URLs. Complete a designated merchant-authorized live test order only after the order/delivery process is ready; do not create fake customer orders in the existing store. Confirm no client console errors or failed required requests.

Register uptime checks for both probes (60-second interval; alert after three failures), application error-rate alarms and daily-run failure/staleness checks with the owner's chosen service. Probes and log events exist locally; no external monitoring subscription/alert was created.

## 7. Scheduled imports

Use the host's actual executable and private environment loader with an absolute script path; no secret arguments:

```sh
node --env-file=/verified/private/production.env /verified/release/scripts/daily.js
```

The exact Node path and directories must come from the host. Desired example UTC cron is `30 3 * * *` (09:00 Asia/Kolkata); changing CRON_EXPRESSION alone does not register it. Test manually and independently observe the next scheduled run. Inspect recorded failures without logging tokens/private supplier bodies. No background queue is configured.

If any post-deployment critical check fails, close checkout through the verified environment/supervisor and follow ROLLBACK.md. Do not mark deployment complete based solely on a successful upload or process restart.

## Subsequent availability repair

On 10 November 2026, the existing deployed frontend's direct-route entry was repaired to match the already-working homepage assets. See [live asset repair](live-asset-repair.md). This restored `/admin`; it was not deployment of the locally audited backend/release.
