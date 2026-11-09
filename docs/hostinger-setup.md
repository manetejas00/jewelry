# Hostinger deployment and verification

Status: no hPanel account, plan, website, domain, database credentials or server access was supplied. No live database has been created or migrated, and no cron job has been registered. Local SQLite read/write is verified. MySQL migration and remote read/write must be tested on the actual plan.

## Select the actual runtime

Open the correct website in hPanel and confirm that its plan supports a Node.js backend (not just static React files). Hostinger currently documents Business/Cloud Node.js deployments and Express support; see its [official Node.js deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/). A VPS requires a separately managed Node process/reverse proxy. Do not assume a PHP-only plan can execute this Express app. Record the account username, domain, chosen Node version and absolute deployment path.

Deploy as an Express/backend application with entry `server/index.js`, install `npm ci`, build `npm run build`, start `npm start`. Use Node 20.6+ (22 or 24 if available) and `dist` for frontend assets, while retaining the server, migrations and scripts. Test native SQLite dependency installation; production uses MySQL, but preview uses better-sqlite3. Do not use a static-only deployment for the API. HTTPS must work before production sessions are tested.

## Database, backup and secrets

1. Confirm whether the merchant already has an authoritative commerce database/platform. If a live store exists elsewhere, stop before creating a competing product/order authority; integrate its supported APIs instead.
2. In the correct website’s database tools, create or reuse its MySQL database and a dedicated user. Record the exact prefixed database/user names and supplied host/port. Restrict database access to the application.
3. Before migrations on any existing database: take an hPanel backup and an independent database export, label it with timestamp/schema version, and test restore into a separate staging database. This repository has no backup of a remote database.
4. Enter `.env.example` values through hPanel environment variables or a private server configuration file. Set `NODE_ENV=production`, `PREVIEW_MODE=false`, `DB_CLIENT=mysql2`, the real database keys, HTTPS `APP_URL` and a random `SESSION_SECRET` at least 32 characters. Do not commit secrets. Never copy `private/store.sqlite` or preview staff into production.
5. From the actual app root, run `npm run migrate`. Migrations are versioned in `migrations/` and recorded by Knex. MySQL DDL may auto-commit: a tested backup is required even when the migration runner uses transactions.
6. Run `node scripts/check-db.js`. It writes a random temporary verification setting, reads it and removes only that key. Record output, database name and timestamp privately.
7. Set a real `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of 16+ characters; run `node scripts/create-admin.js` once. Remove the bootstrap password afterwards. Production sessions are SQL-backed, HTTP-only, SameSite Strict and Secure.
8. Configure actual shipping/contact/returns, `MERCHANT_READY`, source secrets, freshness age, inventory mode and overwrite policy. Test source connectivity using the studio. Live gateway remains disabled until provider-specific order creation, signature verification and webhook handling are implemented and verified. Do not set `PAYMENT_MODE=live` expecting a generic gateway to work.

## One daily workflow

The workflow in `scripts/daily.js` runs gold then products, even if gold fails. `daily_runs` records trigger, UTC start/finish, independent outcomes, source date and created/updated/unchanged/rejected counts. Supplier imports use the same validation/publication code as manual uploads.

Hostinger’s [official Node cron guide](https://www.hostinger.com/support/how-to-run-cron-jobs-for-node-js-websites-at-hostinger/) specifies UTC scheduling and explicitly loading website environment variables. In Advanced → Cron Jobs, use the exact executable/path shown for the selected website. A Node 20 deployment command using the currently documented layout is:

```text
/opt/alt/alt-nodejs20/root/bin/node --env-file=/home/u123456789/domains/domain.tld/hbuilds/config/.env /home/u123456789/domains/domain.tld/hbuilds/current/nodejs/scripts/daily.js
```

Replace the account, domain, Node version and paths with verified values; these are placeholders, not a verified command for your account. Keep the command within hPanel’s limit. The private env file must be readable only by the account owner. Do not put credential values in the command.

Default UTC schedule: `30 3 * * *` = 09:00 Asia/Kolkata. Configure a different UTC cron expression after confirming supplier publication time. `CRON_EXPRESSION` in `.env.example` documents the desired setting; the actual hPanel schedule is authoritative and must be edited there.

Run that exact command once in the host shell and inspect its exit code and studio results. Then wait for the scheduled time and verify a second run with `trigger=scheduled` and the expected timestamp. A successful manual run does not verify cron. Use hPanel cron output and application logs; do not log response bodies, tokens or customer details.

## Recovery

- Missing/stale feed: retain verified rates, correct credentials/source data, rerun affected feed. Fixed items can remain available while gold-linked checkout pauses.
- Failed CSV: download row errors, fix the source, preview again; never force publication of invalid rows.
- Staged valid batch: use Publish / retry. Published checksums cannot apply stock twice.
- Crashed daily runner: its persistent `daily` lock needs inspection. Confirm no process is running, inspect run history, then remove that exact abandoned lock. Never clear a live lock blindly. Publication locks are inside the transaction and roll back on failure.
- Failed migration: restore the tested backup into staging first; examine the recorded migration and any auto-committed DDL before retrying. Do not run `down` on a live database as a substitute for restore.
- Keep supplier CSV payloads, SQL backups, sessions and PII private. Agree retention and encrypted backup policies with the merchant.

## Launch checklist

- [ ] Original logo and owned on-body/product photographs; remove reference media.
- [ ] Real SKU catalogue, variant/size chart, material/weight data and supported product claims.
- [ ] Actual shipping charges, areas, times, returns, contact and tax rules approved.
- [ ] Correct Hostinger website/plan/runtime and production MySQL read/write verified.
- [ ] Both authorised supplier feeds or private folder configured and observed.
- [ ] Manual command and next scheduled 09:00 India run separately verified.
- [ ] Live gateway provider supplied, integration implemented, server verification/webhook retries tested.
- [ ] Mobile/desktop live-domain checkout and order audit completed with real configuration.
