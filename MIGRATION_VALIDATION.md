# Database Migration Validation & Integrity Proofs

**Validation Scope**: Kurta, Jewelry, and Coins Table Separation & Supplier Removal  
**Target Environments**: Staging & Live Production MySQL / Local SQLite  

---

## 1. Automated Schema Verification Checks

### Check 1: Dedicated Tables Exist & Correctly Typed
```sql
-- Verify table presence
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name IN ('kurtas', 'jewelries', 'coins', 'jewelry');
```
*Expected Result*: `kurtas` (BASE TABLE), `jewelries` (BASE TABLE), `coins` (BASE TABLE), `jewelry` (VIEW or BASE TABLE).

### Check 2: Supplier Columns and Tables Completely Purged
```sql
-- Verify supplier_skus table dropped
SELECT COUNT(*) AS supplier_table_count 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'supplier_skus';
-- Expected: 0

-- Verify supplier columns dropped
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND column_name IN ('supplier', 'supplier_id', 'supplier_name', 'vendor');
-- Expected: 0
```

### Check 3: Zero Cross-Contamination Across Modules
```sql
-- 1. No Kurtas in Jewelries
SELECT COUNT(*) AS kurtas_in_jewelry 
FROM jewelries 
WHERE category LIKE '%Kurta%' OR name LIKE '%Kurta%' OR category LIKE '%Chikankari%';
-- Expected: 0

-- 2. No Jewelry in Kurtas
SELECT COUNT(*) AS jewelry_in_kurtas 
FROM kurtas 
WHERE category IN ('Necklaces', 'Earrings', 'Rings', 'Bracelets', 'Mangalsutra');
-- Expected: 0

-- 3. No Coins in Jewelries
SELECT COUNT(*) AS coins_in_jewelry 
FROM jewelries 
WHERE sku LIKE 'COIN-%';
-- Expected: 0
```

### Check 4: Category Naming Normalization ('Kurta' instead of 'Chicken Curry Kurtas')
```sql
-- Verify no Chicken Curry Kurtas string in kurtas table
SELECT COUNT(*) AS legacy_curry_kurtas 
FROM kurtas 
WHERE category = 'Chicken Curry Kurtas';
-- Expected: 0

-- Verify no Chicken Curry Kurtas in kurta_categories
SELECT COUNT(*) AS legacy_curry_categories 
FROM kurta_categories 
WHERE slug = 'chicken-curry-kurtas' OR name = 'Chicken Curry Kurtas';
-- Expected: 0
```

### Check 5: Historical Order Integrity
```sql
-- Verify order items count and snapshot preservation
SELECT 
  COUNT(*) AS total_order_items,
  SUM(CASE WHEN item_type IS NULL THEN 1 ELSE 0 END) AS untyped_items,
  SUM(CASE WHEN snapshot_name IS NULL AND name IS NULL THEN 1 ELSE 0 END) AS unnamed_items
FROM order_items;
-- Expected: untyped_items = 0, unnamed_items = 0. All financial totals preserved.
```

---

## 2. API Contract Verification

| Endpoint | Expected Status | Result Format | Dedicated Table Read |
|---|---|---|---|
| `GET /api/jewelry` | 200 | Array of 107 jewelry pieces | `jewelries` |
| `GET /api/kurtas` | 200 | Array of 30 kurta styles with variants | `kurtas` |
| `GET /api/coins` | 200 | Array of 20 bullion coins | `coins` |
| `GET /api/navigation` | 200 | Array of 3 navigation modules with clean subcategories | `jewelry_categories`, `kurta_categories`, `coin_categories` |
| `GET /api/admin/jewelry` | 200 (auth) | 107 pieces, 0 kurtas | `jewelries` |
| `GET /api/admin/kurtas` | 200 (auth) | 30 styles, XS-XXXL stock matrices | `kurtas` & `kurta_variants` |
| `GET /api/admin/coins` | 200 (auth) | 20 coins, metal/purity pricing | `coins` |
| `GET /api/admin/dashboard` | 200 (auth) | Clean stats without `supplier` fields | Independent counts |
