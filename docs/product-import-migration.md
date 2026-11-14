# Catalogue Import & Migration Guide

## 1. Migration Overview
This guide provides an end-to-end operational roadmap for importing legacy inventory data or bulk ERP export files into the Veyora Jewels relational database.

---

## 2. Pre-Import Preparation & Validation Steps

1. **Cleanse Legacy Metadata**:
   - Verify that all SKUs are alphanumeric without forbidden special characters (`[A-Za-z0-9_-]`).
   - Standardize metal names to standard values: `Gold`, `Silver`, `Rose Gold`, `Platinum`.
   - Ensure purities match certified hallmarks: `18K`, `22K`, `24K`, `925`, `999`.

2. **Master Entities First (Foreign Key Integrity)**:
   - Always verify that master Materials, Craftsmanship techniques, and Categories exist in the database before running product imports.
   - Run seeders or upload `materials-template.csv` and `craftsmanship-template.csv` first if new classifications are introduced.

3. **Asset Staging**:
   - Stage all product WebP images into `/public/assets/products/<slug>/` or configure valid absolute CDN URLs.
   - Run the automated thumbnail generator to ensure companion `-thumb.webp` derivatives exist.

---

## 3. Transactional Execution & Dry-Run Protocol
- The Veyora Import Service executes CSV parsing inside an atomic database transaction.
- If a fatal constraint error occurs (e.g. invalid foreign key, malformed currency string), the transaction rolls back cleanly, leaving existing orders, customers, and inventory uncorrupted.
- The import batch summary reports:
  - `total_rows`: Total records parsed.
  - `created`: Net-new products inserted.
  - `updated`: Existing products modified via idempotent SKU matching.
  - `errors`: Specific line numbers with localized error messages.
  - `duration_ms`: Execution time in milliseconds.

---

## 4. Rollback & Disaster Recovery Procedures
1. **Automated Snapshot**:
   Before initiating a bulk migration batch exceeding 500 records, export the current catalogue state via:
   `GET /api/admin/export/products` and `GET /api/admin/export/kurtas`.
2. **Batch Invalidation**:
   If an accidental batch is ingested with incorrect pricing, the batch can be deactivated in bulk by changing its status to `draft` via `PUT /api/admin/products/bulk-status`.
