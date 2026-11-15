# Admin restructuring audit

## Scope and current architecture

The application has three independently modelled catalogue modules: Jewelry
(`products` plus jewelry module services), Coins (`coins`), and Kurta
(`kurtas` and compatible legacy product rows). Manual CRUD, image upload,
multi-image associations, CSV export, staged imports, categories, offers, and
checkout snapshots already exist. Orders retain a serialized item snapshot, so
subsequent pricing changes do not alter order history.

The review found legacy supplier/feed automation alongside these manual
workflows: `server/daily.js`, `scripts/daily.js`, feed environment settings,
feed settings endpoints, a dashboard supplier-freshness widget, and the old
feed run controls. These were not needed for manual administration.

## Navigation

| Previous focus | Revised focus |
| --- | --- |
| Dashboard with supplier freshness and feed status | Dashboard with catalogue counts, recent imports/activity, incomplete items, and internal metal-rate status |
| Feed synchronization and source connections | Manual Imports for Jewelry, Coins, and Kurta |
| Supplier overwrite configuration | Normal manual edit/import fields |
| Separate product modules | Jewelry, Coins, and Kurta remain independent modules using shared admin patterns |

Categories, Offers, Pricing Rules, Orders, Customers, and staff access remain
centralized. Product categories and offers are database records; they are not
introduced as new frontend constants.

## Manual import workflow

1. Download the module's CSV sample template or export the current catalogue.
2. Upload a CSV, XLS, or XLSX file from the relevant manual import panel.
3. The first worksheet is converted to the same validated tabular format as
   CSV. Validation returns per-row errors, duplicate detection, and a preview.
4. Review the staged changes and publish explicitly. Failed batches retain a
   downloadable error CSV and can be corrected and re-imported.

No upload triggers a remote fetch, scheduled job, supplier reconciliation, or
automatic price update.

## Pricing, offers, and market rates

`server/pricing.js` is the calculation boundary used by catalogue reads and
order quoting. Offers are ordered by priority and only one matching current
offer is selected, preventing stacking. The central pricing-rule record
provides margin, tax treatment, and rounding; fixed-price products and
metal-linked products keep their module-specific inputs.

Metal rate records are internal/admin-approved business inputs. They are not
obtained from an external market API. If a dashboard-only market display is
added later, it must live in an isolated read-only service and must never call
the pricing service, import service, or product update path.

## Data safety and migration

`030_retire_feed_automation` removes obsolete feed configuration keys only.
It intentionally does **not** drop products, images, import history, orders,
payments, legacy source columns, or supplier mapping history. This makes the
change safe for existing installations and preserves auditability.

## Verification

- `npm run build` passes.
- The repository test run executes its non-network suite successfully. In this
  restricted execution environment, 27 HTTP integration tests cannot bind to
  `127.0.0.1` and report `EPERM`; those failures are environmental rather than
  assertions from this change.
- Before deployment, run migrations against a staging copy, then exercise
  manual Jewelry, Coin, and Kurta imports plus their create/edit/image flows.
