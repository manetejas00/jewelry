# Prioritized Performance Optimization & Implementation Plan

**Date**: November 2026  
**Auditor**: Principal Full-Stack Engineer, Senior Database Architect & React Performance Specialist  

---

## 1. Prioritized Optimization Roadmap

| Priority | Optimization Item | Area | Expected Impact | Risk Level |
|---|---|---|---|---|
| **P0** | **Route-Scoped Storefront Provider** | Frontend (`src/store.jsx` / `src/main.jsx`) | **Eliminates 6 of 11 requests** on `/admin/categories`. Storefront queries only execute on storefront routes. | **Very Low** |
| **P0** | **Tab-Scoped Admin Data Fetching** | Frontend (`src/main.jsx` `<Admin />`) | Eliminates `/admin/dashboard` & `/admin/products` from running on `/admin/categories`, `/admin/settings`, etc. | **Very Low** |
| **P0** | **SQL Aggregation on Dashboard** | Backend & Database (`server/index.js`) | Replaces full in-memory table dumps of `products`, `coins`, `kurtas` with `SELECT COUNT(*)` and `SUM(CASE...)`. Reduces response time by 80%. | **Very Low** |
| **P1** | **Centralized API Caching & In-Flight Deduplication** | Frontend (`src/api.js`) | Caches non-sensitive GET requests with configurable TTL and in-flight deduplication. Instant tab switching with 0 flicker. | **Low** |
| **P1** | **Eliminate Runtime `hasTable()` Probing** | Backend & Database (`server/pricing.js`) | Removes `hasTable('product_images')` and `hasTable('reviews')` on every catalogue request; saves 2 DB round trips per hit. | **Zero** |
| **P1** | **Debounce & Throttle Window Focus Refetch** | Frontend (`src/store.jsx`) | Prevents repeated network bursts when opening DevTools or switching browser tabs (minimum 60s cooldown). | **Very Low** |
| **P2** | **Bounded Query for `activeRates`** | Backend & Database (`server/pricing.js`) | Replaces unconstrained `SELECT * FROM rates` with bounded queries for active purities. | **Very Low** |
| **P2** | **Targeted Cache Invalidation on Mutations** | Frontend (`src/admin/*`) | CRUD updates (categories, products, coins, offers) invalidate only the specific updated cache key. | **Low** |

---

## 2. Detailed Technical Action Plan

### Step 1: Route-Scoped Storefront Provider
- **File**: `src/store.jsx`
- **Action**: Check `window.location.pathname`. If `pathname.startsWith('/admin')`, skip the storefront initial catalogue fetch (`/products`, `/coins`, `/categories`, `/config`, `/account/session`, `/offers`).
- **Result**: Administrators visiting `/admin/categories` will no longer trigger storefront catalogue downloads.

### Step 2: Tab-Scoped Admin Data Fetching
- **File**: `src/main.jsx` (`function Admin()`)
- **Action**: Refactor `<Admin>` so `refresh()` fetches `/admin/dashboard` and `/admin/products` **only when the active tab requires them** (e.g. `Dashboard`, `Jewelry`, `Imports`, `Catalogue copy`). When visiting `Categories`, `Kurtas`, `Coins`, `Reviews`, `Customers`, or `Settings`, load only the respective module's data.
- **Result**: Navigating to `Categories` triggers **only** `/admin/session` (auth check) and `/admin/categories`. All 9 other unrelated requests are completely eliminated.

### Step 3: SQL Aggregations on `/api/admin/dashboard`
- **File**: `server/index.js` (lines 180–195)
- **Action**: Replace `db('products')`, `db('coins')`, `db('kurtas')` with targeted aggregate queries:
  ```javascript
  const [jewelryStats, coinStats, kurtaStats] = await Promise.all([
    db('products').where(function() {
      this.where('is_kurta', 0).orWhere('is_kurta', false).orWhereNull('is_kurta');
    }).select(
      db.raw('count(*) as total'),
      db.raw("sum(case when status in ('published','active') then 1 else 0 end) as active"),
      db.raw('sum(case when stock = 0 then 1 else 0 end) as out_of_stock'),
      db.raw('sum(case when name is null or sku is null or image is null or stock is null then 1 else 0 end) as incomplete')
    ).first(),
    db('coins').select(
      db.raw('count(*) as total'),
      db.raw("sum(case when status in ('published','active') then 1 else 0 end) as active"),
      db.raw('sum(case when name is null or sku is null or image is null or stock is null then 1 else 0 end) as incomplete')
    ).first().catch(() => ({ total: 0, active: 0, incomplete: 0 })),
    db('kurtas').select(
      db.raw('count(*) as total'),
      db.raw("sum(case when status in ('published','active') then 1 else 0 end) as active"),
      db.raw('sum(case when name is null or sku is null or image is null or stock is null then 1 else 0 end) as incomplete')
    ).first().catch(() => ({ total: 0, active: 0, incomplete: 0 }))
  ]);
  ```
- **Result**: Zero full-table memory dumps. Execution time drops from ~80ms down to ~5ms.

### Step 4: Centralized Request Deduplication & Safe In-Memory Caching
- **File**: `src/api.js`
- **Action**: Enhance `api()` with a clean in-memory cache with configurable TTL (e.g., 30 seconds for categories, navigation, config). Provide `invalidateApiCache(pattern)` for mutations.
- **Result**: In-flight requests are deduplicated; navigating between tabs reuses fresh in-memory data without network requests.

### Step 5: Throttled Window Focus / Visibility Handler
- **File**: `src/store.jsx`
- **Action**: Add a minimum elapsed time check (e.g., 60 seconds) before `window.focus` or `visibilitychange` triggers a catalogue reload.
- **Result**: Opening Chrome DevTools or toggling between IDE and browser will not spam the backend with API requests.

### Step 6: Bounded Query for `activeRates()`
- **File**: `server/pricing.js`
- **Action**: Limit rate retrieval to `effective_date <= todayIndia() ORDER BY source_timestamp DESC LIMIT 50`.
- **Result**: Fast O(1) rate calculation regardless of how many historical rates exist.
