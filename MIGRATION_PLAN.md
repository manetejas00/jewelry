# Operational Production Database Migration Plan

**Target Database**: Hostinger Production MySQL 8.x / Local SQLite  
**Scope**: Supplier Module Removal & Table Separation (Kurta, Jewelry, Coins)  
**Safety Protocol**: Strictly Non-Destructive without explicit staging verification and rollback checkpoints.

---

## 1. Pre-Migration Checklist

1. **Production Full Database Backup**:
   ```bash
   mysqldump -u <DB_USER> -p<DB_PASSWORD> -h <DB_HOST> \
     --single-transaction --quick --lock-tables=false \
     <DB_NAME> > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
   ```
2. **Verify Backup Integrity**:
   ```bash
   head -n 25 backup_pre_migration_*.sql
   tail -n 25 backup_pre_migration_*.sql
   ```
3. **Verify Git SHA & Deployment Artifacts**:
   - Ensure local `main` matches target release SHA.
   - Vite bundle built and verified (`npm run build`).
   - All tests passing (`npm test` 242/242 passing).

---

## 2. Migration Execution Phases

### Phase A: Migration 031 — Supplier Module Removal
- **File**: `migrations/031_remove_supplier_module.js`
- **Actions**:
  - Drops redundant `supplier_skus` table.
  - Drops obsolete `supplier` column from `products` and `coins`.
- **Environment Gate**: Requires `CONFIRM_SUPPLIER_REMOVAL='true'`.
- **Zero Business Impact**: No customer orders, payments, carts, or active stock rely on `supplier`.

### Phase B: Migration 032 — Table Separation (Kurta, Jewelry, Coins)
- **File**: `migrations/032_separate_kurta_jewelry_coin_tables.js`
- **Actions**:
  - Creates `jewelry` VIEW alias for `jewelries` (support both singular and plural conventions).
  - Normalizes Kurta category names: changes any `'Chicken Curry Kurtas'` to `'Kurta'`.
  - Migrates any legacy jewelry items from `products` to `jewelries` table.
  - Copies multi-angle media from `product_images` to `jewelry_images`.
- **Referential Integrity**:
  - `order_items` stores immutable JSON snapshots (`snapshot_name`, `snapshot_price`, `item_type`, `item_id`).
  - Historical transactions remain 100% intact.

### Phase C: Backfill & Data Integrity Verification
- **Script**: `node scripts/backfill-legacy-products-to-independent-tables.js`
- **Actions**:
  - Counts records across `jewelries`, `kurtas`, `coins`.
  - Confirms no cross-contamination (0 kurtas in `jewelries`, 0 jewelry in `kurtas`).
  - Validates all image URLs, stock quantities, and prices.

---

## 3. Post-Migration Service Verification

1. **Verify Public Endpoints**:
   ```bash
   curl -fsS https://test3.avinyacarefoundation.org/api/jewelry | grep -v 'error'
   curl -fsS https://test3.avinyacarefoundation.org/api/kurtas | grep -v 'error'
   curl -fsS https://test3.avinyacarefoundation.org/api/coins | grep -v 'error'
   curl -fsS https://test3.avinyacarefoundation.org/api/navigation | grep -v 'error'
   ```
2. **Verify Admin Studio**:
   - `/admin/jewelry`: Displays only fine jewelry items (107 pieces).
   - `/admin/kurtas`: Displays all 30 kurta styles with full size variants (XS-XXXL).
   - `/admin/coins`: Displays all gold and silver bullion coins (20 coins).
   - Supplier menus, forms, inputs, and references: 0 remaining.
