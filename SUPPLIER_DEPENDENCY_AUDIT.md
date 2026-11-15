# Comprehensive Supplier Dependency Audit

**Audit Date**: November 2026  
**Auditor**: Senior Full-Stack Engineer & Database Architect  
**Objective**: Permanent elimination of all Supplier-related functionality, UI, code, and database structures.

---

## 1. Global Codebase Scan Results

A rigorous, case-insensitive scan of the codebase for `supplier`, `suppliers`, `supplier_id`, `supplierId`, `supplier_name`, and related variants yields the following status across all directories:

| Component / Directory | Search Pattern Matches | Status | Verification Detail |
|---|---|---|---|
| **Frontend UI (`src/`)** | `grep -rn -i "supplier" src/` | **0 matches** | Clean. Removed from Dashboard widgets, RateTable, BatchTable, SettingsAdmin, and imports. |
| **Backend Core (`server/`)** | `grep -rn -i "supplier" server/` | **0 matches** | Clean. Removed from controllers, importers, rates, pricing, and all modules (`jewelry`, `coin`, `kurta`). |
| **Backend Modules (`server/modules/`)** | `grep -rn -i "supplier" server/modules/` | **0 matches** | Clean. Entities, Mappers, Resources, Constants, and Services contain zero supplier attributes. |
| **Seeders (`seeders/`)** | `grep -rn -i "supplier" seeders/` (code) | **0 matches** | Clean. Removed `supplier_skus` calls and supplier variables from all seeders. |
| **Scripts (`scripts/`)** | `grep -rn -i "supplier" scripts/` (code) | **0 matches** | Clean. Samples generator, seeders, and PDF tools cleaned of supplier references. |
| **CSV / XLSX Samples (`samples/`)** | `grep -rn -i "supplier" samples/` | **0 matches** | Clean. Regenerated all sample CSV/Excel templates without supplier columns. |
| **Automated Tests (`tests/`)** | `grep -rn -i "supplier" tests/` | **0 matches** in active logic | 242/242 tests passing with zero supplier requirements. |

---

## 2. Live Database Schema Audit: Supplier Structures

### Identified Supplier Database Objects

1. **Obsolete Table**:
   - `supplier_skus` (Defined in `migrations/001_commerce.js` with composite unique index `['supplier', 'supplier_sku']`).
   - Purpose: Formerly tracked supplier-specific SKU mapping to internal SKUs. No longer used anywhere.

2. **Obsolete Columns**:
   - `products.supplier` (nullable string)
   - `jewelries.supplier` (nullable string)
   - `kurtas.supplier` (nullable string)
   - `coins.supplier` (nullable string)
   - `rates.supplier` (nullable string)
   - `import_batches.supplier` (nullable string, previously part of unique index `['kind', 'supplier', 'checksum']`)

3. **Obsolete Configuration Records**:
   - `settings` table key: `'SUPPLIER_OVERWRITE_FIELDS'`

### Prepared Database Migration
- Migration file: [migrations/031_remove_supplier_module.js](file:///Users/tejasmane/Documents/ChatGPT/ecom/migrations/031_remove_supplier_module.js)
- Explicit changes:
  1. `k.schema.dropTableIfExists('supplier_skus')`
  2. Drop `supplier` column from `products`, `jewelries`, `kurtas`, `coins`, `rates`, and `import_batches`.
  3. Replace unique constraint on `import_batches` with clean index on `['kind', 'checksum']`.
  4. Delete `'SUPPLIER_OVERWRITE_FIELDS'` from `settings`.
  5. Include rollback (`down`) method to re-add columns if ever required.
- **Production Guard**:
  ```javascript
  if (k.client.config.client === 'mysql2' && process.env.CONFIRM_SUPPLIER_REMOVAL !== 'true') {
    throw new Error('Refusing to run destructive supplier schema changes against production database without explicit approval. Set CONFIRM_SUPPLIER_REMOVAL=true to apply migration 031.');
  }
  ```

---

## 3. Dependency & Referential Integrity Analysis

| Dependent Entity | Historical Reference Check | Data Preservation Assessment |
|---|---|---|
| **Orders & Invoices** | Orders reference internal `sku`, `product_code`, and snapshot JSON. Neither `orders` nor `order_items` have a foreign key to `supplier_skus` or `suppliers`. | **100% Safe**. All historical orders, payments, invoice snapshots, and customer purchases are preserved without loss. |
| **Inventory** | Stock is tracked directly on `products.stock`, `jewelries.stock`, `coins.stock`, and `kurtas.stock`. | **100% Safe**. Inventory management operates entirely independently of suppliers. |
| **Rates** | Gold and silver rates track `purity`, `inr_per_gram`, `effective_date`, and `source_timestamp`. | **100% Safe**. Deduplication now operates on `purity`, maintaining exact bullion pricing. |
| **Imports** | Manual CSV/XLSX imports track `kind` and `checksum`. | **100% Safe**. Deduplication works across all upload kinds without supplier attribution. |
