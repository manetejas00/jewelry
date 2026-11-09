# Daily imports for Veyora Jewels

All supplied examples are fictional and are permitted only in test/preview. Generate fresh dated examples with `npm run samples`. Blank headers are generated from `schemas` in `server/importer.js`, the same schema used to parse feeds. `npm test` runs both filled examples through the actual preview importer, then publishes them into an isolated in-memory database.

## Upload and publish

Open Merchant Studio → Imports. Download a blank template, fill it, then choose the CSV. Nothing in a staged batch is published until an authorised owner or manager confirms it. Review old/new prices and stock. Download row errors if validation fails. Correct failed files and upload them again; a failed file cannot be force-published. Retry a staged batch using Publish / retry. A published checksum is idempotent. Scheduled feeds use the same preview and publish functions.

Keep the exact header order. UTF-8, comma-separated, one header row, one variant per product row. Quote fields containing commas or line breaks. Numbers are plain non-negative decimals with a full stop and up to four decimals, no ₹ signs, grouping commas, scientific notation or thousands separators. Stock is an integer. Dates: `YYYY-MM-DD`. Source timestamps: ISO UTC, e.g. `2026-11-09T03:15:00.000Z`. They identify when the supplier’s data was true, not when it was downloaded. Future source timestamps beyond five minutes are rejected. One supplier per file, 10,000 rows / 5 MB maximum.

## Gold columns

| Column | Meaning |
| --- | --- |
| supplier | Stable supplier name; required |
| purity | Explicit `24K`, `22K`, `18K` or `14K`; required |
| currency | `INR`; required. Other currencies are rejected, never silently converted |
| unit | `g` or `10g`; required |
| rate | Positive source rate per original unit; required |
| effective_date | Day the rate applies, in India; required |
| source_timestamp | Source’s explicit UTC timestamp; required |

Synthetic ₹1,00,000 per `10g` becomes ₹10,000 per gram. Rates for other purities are not derived. Both source time and effective day must satisfy `GOLD_MAX_AGE_HOURS`, default 48. Corrections append a history record. Failed, stale or invalid imports retain previously published rates. Once old rates exceed the age limit, affected gold-linked pieces pause at checkout; fixed-price pieces remain eligible.

## Product columns

| Column | Meaning / requirements |
| --- | --- |
| supplier | Required, stable supplier identity |
| product_code | Required, stable product grouping code, used for descriptive URL; use lower-case hyphenated codes |
| sku | Required, globally unique sellable variant SKU; never recycle |
| name | Required product title |
| category | Required category; storefront has Earrings, Necklaces, Rings, Bracelets |
| description | Merchant product copy; optional |
| metal | Required; `Gold` for GOLD_LINKED |
| purity | Required for GOLD_LINKED; one of the supported purity codes |
| net_weight_g | Positive grams for GOLD_LINKED; optional non-negative weight for FIXED |
| size | Sellable size or length (e.g. `12`, `14`, `42 cm`, `One size`) |
| finish | Variant finish description |
| image | HTTPS product photograph URL; use merchant-owned media in production |
| pricing_mode | Required `FIXED` or `GOLD_LINKED` |
| fixed_price | Positive final INR selling price for FIXED; blank for GOLD_LINKED |
| making_flat | Optional non-negative INR flat making charge |
| making_percent | Optional percentage applied to metal value only |
| stone_charge | Optional non-negative INR stone charge |
| other_charge | Optional approved non-negative INR charge |
| stock | Required absolute available-stock snapshot, non-negative integer |
| status | Required `published` or `draft` |
| source_timestamp | Required UTC time of the supplier snapshot |

`FIXED`: use the final merchant price including the merchant’s applicable tax treatment. Daily rate/rule changes do not modify it. `GOLD_LINKED`: weight × approved purity rate + flat making + percentage of metal value + stones + other charges. Apply the active inclusive/exclusive tax rule and final rounding. Default preview tax is zero; this is not tax advice or a live tax configuration. Synthetic check: 5.000 g × ₹6,000 + ₹2,000 = ₹32,000 before other charges/tax.

## Overwrite, inventory and ordering

New SKUs are created, existing SKUs match on exact SKU and must belong to the same supplier. `SUPPLIER_OVERWRITE_FIELDS` defaults to `stock,fixed_price,net_weight_g,making_flat,stone_charge,other_charge`. Merchant titles, copy, imagery and publication status remain protected. Owners can change the overwrite allowlist, maximum rate age and inventory mode in Imports → Feed settings after agreeing field ownership. Source URLs can also be updated there; tokens remain server-side. Changes are recorded in the audit history. Existing `sku`, `supplier` and `product_code` cannot be changed by the allowlist. Supplier SKU mappings are stored alongside variants.

`INVENTORY_MODE=incremental` leaves omitted SKUs unchanged. `full` treats omitted SKUs belonging to that supplier as stock zero. The input is always a snapshot, never a stock delta. Paid order quantities placed after the snapshot time are subtracted; stock floors at zero. There is no live refund/cancellation-restock flow until the gateway/order operations are configured.

Checksums prevent replay, source dates prevent older batches or older SKU rows overwriting newer data, and transactions retain the previous catalogue on failure. Overlapping publication is serialised/locked. A changed source timestamp with identical content is counted as unchanged. Order item snapshots store the purchased SKU, quantity, metal weight, rate, charges, tax, unit price and total; later imports do not rewrite them.

## Private sources

Configure `GOLD_FEED_URL` / `GOLD_FEED_TOKEN` and `PRODUCT_FEED_URL` / `PRODUCT_FEED_TOKEN` in server secrets. HTTPS CSV responses only; tokens are Bearer credentials. A supplier JSON API needs a supplier-specific adapter once its schema is supplied. Alternatively `PRODUCT_FEED_FILE` is an absolute private incoming CSV path, delivered atomically by the supplier (write a temporary file then rename). Source URLs are not editable or displayed in the browser. Credentials never belong in CSV, screenshots or Git.

Owner can publish pricing rules and edit products/imports. Manager can edit catalogue and import, but cannot change pricing rules. Viewer can read only. Staff actions record actor IDs and timestamps. Upload contents are stored in a private database field accessible only to staff routes; schedule encrypted database backups and a merchant-approved retention policy.

## Excel / Google Sheets

Excel: File → Save As → CSV UTF-8 (Comma delimited). Keep SKUs and timestamps as text, avoid automatic date/number conversion, and inspect the exported file. Google Sheets: File → Download → Comma Separated Values (.csv), current sheet. Export each feed separately. Do not include instructional or total rows. Use the error report’s row number (header is row 1), field, rejected value and correction to repair mistakes.
