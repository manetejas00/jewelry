# Database Architecture & Performance Audit

**Audit Date**: November 2026  
**Engines Evaluated**: MySQL (Production host) & SQLite (Local / Test)  
**Database Tooling**: Knex.js Migration Suite (`migrations/001_commerce.js` through `migrations/031_remove_supplier_module.js`)  

---

## 1. Schema Inventory & Table Classifications

The database consists of 59 functional tables categorized by business domain:

| Domain | Tables | Primary Key / Indexing Strategy |
|---|---|---|
| **Core Catalogue** | `products`, `jewelries`, `kurtas`, `coins`, `categories` | Integer auto-increment / UUID; indexed by `sku`, `product_code`, `slug`, `status` |
| **Media & Assets** | `product_images`, `jewelry_images`, `kurta_images`, `coin_images`, `review_images` | Indexed by `sku`, `product_code`, `role`, `review_id` |
| **Taxonomy & Attributes** | `jewelry_categories`, `kurta_categories`, `coin_categories`, `materials`, `craftsmanship`, `finishes`, `collections` | Indexed by `slug`, `sort_order`, `status` |
| **Mapping & Relations** | `product_materials`, `product_craftsmanship`, `product_finishes`, `product_collections`, `product_recommendations`, `product_source_references` | Composite foreign key mappings |
| **Pricing & Bullion** | `rates`, `pricing_rules`, `offers` | Indexed by `purity`, `effective_date`, `status` |
| **Orders & Commerce** | `orders`, `order_items`, `payment_events` | `idempotency_key` unique, `orders.created_at` indexed, `order_items.sku` indexed |
| **Customer & Identity** | `customers`, `customer_state`, `sessions`, `password_resets`, `otp_challenges` | `email` unique, `deleted_at` indexed, `expires` indexed |
| **Import & Ingestion** | `import_batches`, `import_errors`, `import_locks`, `jewelry_import_sessions`, `jewelry_import_jobs`, `jewelry_image_jobs` | `kind`, `checksum`, `batch_id` |
| **Customer Support & AI** | `chat_conversations`, `chat_messages`, `chat_daily_usage`, `chatbot_user_settings`, `chatbot_usage_logs`, `chatbot_admin_audit_logs`, `ai_drafts` | `user_id`, `conversation_id`, `usage_date` indexed |
| **Administration** | `staff`, `settings`, `audit`, `daily_runs` | `staff.email` unique, `settings.key` primary |

---

## 2. In-Depth Query & Performance Issues

### Issue 1: Dashboard Memory Exhaustion via Unbounded `SELECT *`
- **Location**: `server/index.js` lines 180–195 (`/api/admin/dashboard`)
- **Query**:
  ```javascript
  db('products'), db('coins'), db('kurtas')
  ```
- **Analysis**:
  - Translates to `SELECT * FROM products`, `SELECT * FROM coins`, `SELECT * FROM kurtas`.
  - Transmits full text descriptions, image URLs, SEO metadata, and JSON strings over the MySQL socket into Node.js memory.
  - Done exclusively to count status values in JavaScript:
    `[...products, ...coins, ...kurtas].filter(p => !p.name || !p.sku || !p.image || p.stock == null).length`
- **Recommended SQL Fix**:
  Replace with targeted aggregate counts directly on the database engine:
  ```sql
  SELECT count(*) as total,
         sum(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
         sum(CASE WHEN status IN ('published', 'active') THEN 1 ELSE 0 END) as active
  FROM products WHERE is_kurta = 0 OR is_kurta IS NULL;
  ```

### Issue 2: Unbounded Historical Scan in `activeRates()`
- **Location**: `server/pricing.js` line 126 (`activeRates(k)`)
- **Query**:
  ```sql
  SELECT * FROM rates ORDER BY source_timestamp DESC, id DESC;
  ```
- **Analysis**:
  - Fetches every rate row ever imported in the history of the store.
  - Iterates through all rows in JavaScript to pick the first entry per purity (`24K`, `22K`, `18K`, `14K`).
- **Recommended SQL Fix**:
  Fetch only the latest rate row per purity or limit the historical scan window:
  ```sql
  SELECT * FROM rates 
  WHERE effective_date <= ?
  ORDER BY source_timestamp DESC 
  LIMIT 50;
  ```
  Or using a subquery grouping by `purity` and `metal`.

### Issue 3: Table Existence Probing on Every Request
- **Location**: `server/pricing.js` line 309
- **Code**:
  ```javascript
  const hasImages = await k.schema.hasTable('product_images').catch(() => false);
  const hasReviews = await k.schema.hasTable('reviews').catch(() => false);
  ```
- **Analysis**:
  - Knex executes `SHOW TABLES` (MySQL) or queries `sqlite_master` on every single catalogue request.
  - Both tables are permanently part of the baseline schema since migrations 004 and 012.
- **Recommended Fix**:
  Cache table existence or remove schema reflection from the runtime request path.

### Issue 4: Missing Composite Index on `product_images (sku, role)` & `(product_code, role)`
- **Location**: `server/pricing.js` & `server/index.js`
- **Query Pattern**:
  `WHERE sku IN (...) OR product_code IN (...)` joined with `WHERE role = 'hero'`.
- **Analysis**:
  - Separate indexes exist on `sku` and `product_code`, but hero lookup involves `role` filtering.
- **Recommended Fix**:
  Ensure indexing on `(sku, role)` and `(product_code, role)`.

### Issue 5: Redundant Database Queries in Session Deserialization
- **Location**: `server/auth.js` (`auth()` middleware)
- **Analysis**:
  - Staff sessions store `{ staff: { id, email, role } }` in the session cookie/store.
  - The middleware validates `req.session.staff`, which is fast. However, endpoints frequently re-query `db('staff').where({ id })` unnecessarily.
- **Recommended Fix**:
  Rely on validated session payload and refresh staff state only on role mutations or explicit session refresh.

---

## 3. Database Connection Pool Status

- **Configuration in `server/db.js`**:
  ```javascript
  {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: 'Z'
    },
    pool: { min: 0, max: 10 }
  }
  ```
- **Finding**:
  - Connection pooling is properly configured with a maximum of 10 connections.
  - However, when unoptimized endpoints run multiple concurrent full-table scans via `Promise.all([db('products'), db('coins'), db('kurtas')])`, pool connection starvation can occur under concurrent traffic.
  - Resolving Issues 1 and 2 directly preserves connection availability.

---

## 4. Completed Product Table Separation (Kurta, Jewelry, Coins)

In accordance with architectural requirements:
1. **Kurta**: Completely separated into dedicated table `kurtas`, `kurta_variants`, `kurta_images`, and `kurta_categories`.
   - Category `'Chicken Curry Kurtas'` fully migrated to `'Kurta'`.
   - Admin CRUD routes: `/api/admin/kurtas` query `kurtas` table.
   - Storefront routes: `/api/kurtas` query `kurtas` table.
2. **Jewelry**: Completely separated into dedicated table `jewelries` (with `jewelry` view alias), `jewelry_images`, and `jewelry_categories`.
   - All 107 fine jewelry styles stored independently.
   - Admin CRUD routes: `/api/admin/jewelry` query `jewelries` table.
   - Storefront routes: `/api/jewelry` query `jewelries` table.
3. **Coins**: Completely separated into dedicated table `coins`, `coin_images`, `coin_categories`, and `coin_inventory`.
   - Bullion calculation logic tied directly to metal rates (`rates` and `settings`).
   - Admin CRUD routes: `/api/admin/coins` query `coins` table.
   - Storefront routes: `/api/coins` query `coins` table.
4. **Generic `products` Table**:
   - Deprecated as the primary product repository.
   - Zero kurtas remain in `products`.
   - Zero coins remain in `products`.
   - `catalogue()` seamlessly delegates to `jewelries`.
   - `order_items` stores historical snapshots independently.

---

## 5. Summary of Audit Deliverables
- `PROJECT_AUDIT.md`: Complete system architecture & findings.
- `DATABASE_AUDIT.md`: Database structure & queries audit.
- `API_AUDIT.md`: Complete inventory of all endpoints and consumers.
- `SUPPLIER_DEPENDENCY_AUDIT.md`: Supplier references and removal proof.
- `OPTIMIZATION_PLAN.md`: Performance and query optimizations.
- `SCHEMA_BEFORE_AFTER.md`: Schema before and after separation.
- `MIGRATION_PLAN.md`: Execution plan for production MySQL migration.
- `MIGRATION_VALIDATION.md`: Integrity checks and query proofs.
- `ROLLBACK_PLAN.md`: Emergency rollback procedures.

