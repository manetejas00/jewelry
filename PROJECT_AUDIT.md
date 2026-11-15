# Project Technical Audit: Veyora Jewels Architecture & Findings

**Audit Date**: November 2026  
**Auditor**: Principal Full-Stack Engineer, Senior Database Architect & Infrastructure Auditor  
**Repository**: `/Users/tejasmane/Documents/ChatGPT/ecom`  
**Live Target**: `https://test3.avinyacarefoundation.org`  

---

## 1. Executive Summary & Stack Discovery

| Layer | Discovered Technology | Version / Configuration |
|---|---|---|
| **Runtime Environment** | Node.js | v20+ ESM (`"type": "module"`) |
| **Backend Framework** | Express | 4.21.2 with custom JSON route wrappers |
| **Production Database** | MySQL | Connected via `mysql2` 3.12.0 connection pool (`min:0, max:10`, UTC timezone) |
| **Development / Test DB** | SQLite | `better-sqlite3` 11.8.1 (WAL mode, foreign keys enforced) |
| **ORM / Query Builder** | Knex.js | 3.1.0 with incremental migrations in `migrations/` |
| **Frontend Framework** | React | 19.0.0 with React Router DOM 7.1.5 |
| **Bundler & Build Tool** | Vite | 6.4.6 with code splitting chunks |
| **PWA & Caching** | Service Worker | Custom `sw.js` (shell precaching + upload thumbnails) |
| **Hosting & Process Manager**| Phusion Passenger | Hostinger VPS Nginx/Apache reverse-proxying Passenger Node.js app |
| **Security & Auth** | Helmet & bcryptjs | Session cookies (HttpOnly, SameSite, CSRF token validation) |

---

## 2. Architecture & Request Lifecycle

```
[Browser / PWA Client]
       │
       ▼ (HTTPS)
[Hostinger VPS / Reverse Proxy]
       │
       ▼
[Phusion Passenger Node.js Engine (server/index.js)]
       │
       ├── Middleware Pipeline (Helmet, CORS/Origin, Express Session, CSRF, Rate Limiting)
       │
       ├── Public Routes (/api/products, /api/coins, /api/kurtas, /api/categories, /api/offers)
       │
       ├── Customer Routes (/api/account/*, /api/quote, /api/checkout, /api/chat/*)
       │
       ├── Admin Routes (/api/admin/* with staff auth and role checks)
       │
       ▼
[Knex.js Query Builder]
       │
       ▼
[Database Engine: MySQL (Production) / SQLite (Dev & Test)]
```

---

## 3. Key Architectural Findings & Bottlenecks

### Finding 1: Unconditional Global Storefront Fetching Across Admin Menus
- **Location**: `src/store.jsx` (lines 31–41) wrapped around root `<Provider>` in `src/main.jsx`.
- **Finding**: On every page load—including when opening any `/admin/*` menu such as `/admin/categories`—`<Provider>` executes an initial batch of 6 API requests:
  1. `GET /api/products`
  2. `GET /api/coins`
  3. `GET /api/categories`
  4. `GET /api/config`
  5. `GET /api/account/session`
  6. `GET /api/offers`
- **Impact**: When an administrator visits `/admin/categories`, the storefront catalogue for jewellery, coins, and customer sessions is needlessly downloaded and evaluated, consuming bandwidth, CPU cycles, and database connections.

### Finding 2: Window Focus & Visibility Triggers Redundant Catalogue Refetches
- **Location**: `src/store.jsx` (lines 55–62).
- **Finding**: `window.addEventListener('focus', reload)` and `document.addEventListener('visibilitychange', visible)` trigger `refreshCatalogue()` every time the window gains focus or tab visibility changes.
- **Impact**: When developers or administrators switch between Chrome DevTools, other browser tabs, or applications, the application fires redundant concurrent GET requests to `/api/products`, `/api/coins`, and `/api/offers`.

### Finding 3: Admin Root Component Fetches Dashboard & All Products on Every Submenu
- **Location**: `src/main.jsx` (line 1009 in `Admin()` component).
- **Finding**: On mount, `<Admin>` checks `/api/admin/session` and immediately calls `refresh()`, which executes:
  1. `GET /api/admin/dashboard`
  2. `GET /api/admin/products`
- **Impact**: When opening `/admin/categories` or `/admin/settings`, the admin panel always loads the full dashboard statistics, recent orders, import batches, and the entire product list alongside the specific submenu's data.

### Finding 4: In-Memory Table Scans in Dashboard Aggregations
- **Location**: `server/index.js` (lines 180–185).
- **Finding**: The `/api/admin/dashboard` endpoint queries:
  ```javascript
  const [rates, batches, orders, rule, audits, products, coins, kurtas] = await Promise.all([
    activeRates(db),
    db('import_batches').select('id','kind','status','summary','created_at','published_at').orderBy('id','desc').limit(30),
    db('orders').orderBy('created_at','desc').limit(100),
    db('pricing_rules').orderBy('id','desc').first(),
    db('audit').orderBy('id','desc').limit(20),
    db('products'), // Full table dump!
    db('coins').catch(() => []), // Full table dump!
    db('kurtas').catch(() => []) // Full table dump!
  ]);
  ```
- **Impact**: Instead of executing SQL count/aggregation queries (`SELECT count(*)`), the server queries all rows and columns across `products`, `coins`, and `kurtas` into Node.js process memory to count incomplete products and active/inactive items. As catalogue size increases, this causes memory bloat and database connection exhaustion.

### Finding 5: Table Existence Probing on Every Public Catalogue Request
- **Location**: `server/pricing.js` (lines 309–310).
- **Finding**: Inside `catalogue()`, `hasTable('product_images')` and `hasTable('reviews')` execute schema queries on every single user catalogue request.
- **Impact**: Extra database round trips on high-traffic storefront routes checking for tables that are permanently present.

### Finding 6: Full Table Scan on `rates` for Purity Resolution
- **Location**: `server/pricing.js` (lines 126–137 in `activeRates`).
- **Finding**: `activeRates` queries all records from `rates` ordered by `source_timestamp DESC` without any SQL filter on `purity` or date bounds.
- **Impact**: As rates history grows over months, this fetches thousands of historical rows into memory to filter out just the latest rates for 24K, 22K, 18K, 14K, and silver.

### Finding 7: Lack of Client-Side Cache Storing Valid Data Across Routes
- **Location**: `src/api.js` (lines 47–55).
- **Finding**: While `pendingCatalogue` deduplicates in-flight requests during the same epoch, it deletes the promise as soon as it resolves. Navigating from `/admin/categories` to `/admin/jewelry` and back to `/admin/categories` re-fetches everything from scratch.
- **Impact**: Excessive network round trips and UI loading flickers.
