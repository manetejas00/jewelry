# Database Migration Rollback Plan

**Target Database**: Hostinger Production MySQL 8.x / Local SQLite  
**Scope**: Recovery procedures for Migration 031 (Supplier Removal) and Migration 032 (Table Separation)

---

## 1. Automatic Safe Points

Both migrations 031 and 032 implement atomic transactions where supported and explicit `down()` reversal functions.

### Rollback via Knex Migrations
To step backwards one migration:
```bash
node -e "import('./server/db.js').then(async ({ db, migrate }) => {
  await db.migrate.rollback();
  console.log('Rolled back last migration successfully');
  process.exit(0);
});"
```

---

## 2. Granular Rollback Steps

### If Migration 032 (Table Separation) Fails:
1. **Drop Created Views & Aliases**:
   ```sql
   DROP VIEW IF EXISTS jewelry;
   ```
2. **Revert Kurta Category Renaming**:
   ```sql
   UPDATE kurtas SET category = 'Chicken Curry Kurtas' WHERE category = 'Kurta';
   UPDATE kurta_categories SET slug = 'chicken-curry-kurtas', name = 'Chicken Curry Kurtas' WHERE slug = 'kurta';
   ```
3. **Clean Backfilled Jewelries**:
   Any records backfilled with `price_source = 'DEFAULT'` can be selectively purged without affecting existing records:
   ```sql
   DELETE FROM jewelries WHERE price_source = 'DEFAULT';
   ```

### If Migration 031 (Supplier Removal) Needs Reversion:
1. Re-add the `supplier` columns:
   ```sql
   ALTER TABLE products ADD COLUMN supplier VARCHAR(100) DEFAULT 'Merchant';
   ALTER TABLE coins ADD COLUMN supplier VARCHAR(100) DEFAULT 'Merchant';
   ```
2. Re-create the `supplier_skus` table:
   ```sql
   CREATE TABLE IF NOT EXISTS supplier_skus (
     id INT AUTO_INCREMENT PRIMARY KEY,
     supplier_name VARCHAR(100),
     supplier_sku VARCHAR(100),
     internal_sku VARCHAR(100),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

---

## 3. Disaster Recovery (Full Dump Restoration)

If any catastrophic or unrecoverable error occurs during execution:

1. **Stop Application Process / Traffic**:
   ```bash
   touch /home/u382139760/domains/test3.avinyacarefoundation.org/app/tmp/restart.txt
   ```
2. **Restore Pre-Migration Dump**:
   ```bash
   mysql -u <DB_USER> -p<DB_PASSWORD> -h <DB_HOST> <DB_NAME> < backup_pre_migration_YYYYMMDD_HHMMSS.sql
   ```
3. **Verify Restored Row Counts**:
   ```sql
   SELECT 'products' AS tbl, count(*) FROM products
   UNION ALL
   SELECT 'coins', count(*) FROM coins
   UNION ALL
   SELECT 'kurtas', count(*) FROM kurtas;
   ```
4. **Restart Application Server**:
   ```bash
   touch /home/u382139760/domains/test3.avinyacarefoundation.org/app/tmp/restart.txt
   ```
