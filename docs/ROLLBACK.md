# Rollback and recovery

> Live verification correction (10 November 2026): active storage is MySQL; the SQLite file is inactive legacy storage. The newer LIVE_AUDIT_REPORT.md and LIVE_DEPLOYMENT_VERIFICATION.md supersede earlier SQLite assumptions and describe the owner-triggered deployment incident/recovery.

No live code/data rollback or restore was executed during this audit. Restoration must be rehearsed on isolated staging before release. Do not restore an old backup over orders written since that backup.

## Retain before activation

Keep the prior source/compiled assets, private configuration, supervisor/routing configuration, a consistent database snapshot/export, schema version list, all existing uploads and a private reconciliation manifest. Record activation time. Keep backups encrypted, owner-readable and outside public_html. Choose retention/RPO/RTO with the merchant; a starting operational target is daily full backups plus frequent database snapshots during business hours, verified weekly restore drills, and backup immediately before changes. These are proposed targets, not configured services.

## Code-only failure

1. Disable checkout and pause admin/import writes through verified host controls.
2. Record the failure time, release identifier, sanitized request IDs and database migration state. Do not export customer details into public logs.
3. Repoint the actual host supervisor/routing to the retained known-good code release. Restart through that supervisor. Preserve the persistent upload directory and current database.
4. New migrations 009–011 are additive (retry hash, widened import payload capacity, reset/session-version tables). Old code may ignore these additions; verify compatibility in staging. Do not automatically run `migrate:rollback` or narrow payload columns.
5. Check HTTPS, API/ready probes (old releases may lack probes), sign-in and original orders/totals. Keep checkout closed if the previous version is the exposed preview. Reverting code does not fix that preview account.

## Database failure

1. Stop all writers, including cron and background Node processes, before recovery. Preserve the failed database and logs privately for investigation.
2. Restore the backup into a separate database/storage location first. Run integrity checks and compare customer/order counts, immutable totals, keys, stock and image paths with the backup manifest.
3. Reconcile orders/payments created after the backup. Do not re-submit orders or payment callbacks without idempotency and provider reconciliation.
4. Point the application to the recovered database only after owner review of reconciliation. Keep the original database intact until recovery is accepted.
5. For MySQL partial DDL failures, inspect actual schema plus `knex_migrations`; MySQL may have auto-committed changes. Do not blindly rerun or delete migration records.
6. In a SQLite-to-MySQL cutover failure, retain both databases. Switching back to SQLite is safe only if there have been no new MySQL writes, or after explicitly reconciling them. The new production guard intentionally requires MySQL; do not remove it as a shortcut. Use an isolated maintenance/recovery environment for inspection.

## Integration and inventory failures

- Missing/stale rates: keep last verified rates; gold/silver-linked checkout must pause. Do not substitute synthetic prices.
- Supplier outage: investigate failed daily result; retain published inventory; retry the affected authorized source only.
- Abandoned import lock: confirm no worker is running, inspect timestamps and remove only the specific stale lock through the host's controlled database tooling. Never clear a live lock blindly.
- SMTP unavailable: return unavailable recovery status; retain existing passwords; no fake email success or token logging.
- Unknown COD state: inspect the existing order by its idempotency identifier and reconcile physical fulfilment before retrying.

## Recovery acceptance

Require functional HTTPS/routing, intended production config, secure staff/customer sessions, protected order access, preserved existing data, verified totals/stock, working uploads and expected monitoring. Document the incident and restore time privately. Reopen checkout only when critical checks pass. A release archive, database export or successful application start is not proof of recovery.

## Current incident recovery

The owner-triggered raw Git publication was repaired during the live audit. Active MySQL was left unchanged. A private consistent export and web-root recovery copies are under the host's private backup directory. Media originals/thumbnails were restored from retained publication sources to `<domain-root>/storage/uploads`, linked at `<domain-root>/public_html/uploads`; preserve that storage directory in every release. The legacy Node backend and a matching frontend compiled from main b68439a restored availability. Auto-publication is off until its Node configuration is corrected. This file-level recovery is not evidence of a MySQL restore rehearsal. Never replace active MySQL with the inactive SQLite file.
