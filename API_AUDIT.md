# API Architecture & Request Dependency Audit

**Audit Date**: November 2026  
**Auditor**: Backend API Engineer & Production Infrastructure Auditor  
**Total Endpoints Catalogued**: 78 API endpoints  

---

## 1. Root Cause Analysis: The "Categories Menu" 11-Request Waterfall

### Observed Network Trace When Opening Categories:
```text
categories   304  sw.js:60     (1) Document Navigation Request
session      200               (2) GET /api/account/session (Storefront Provider)
products     200               (3) GET /api/products        (Storefront Provider)
coins        200               (4) GET /api/coins           (Storefront Provider)
categories   200               (5) GET /api/categories      (Storefront Provider)
config       200               (6) GET /api/config          (Storefront Provider)
session      200               (7) GET /api/admin/session   (Admin Layout)
offers       200               (8) GET /api/offers          (Storefront Provider)
dashboard    200               (9) GET /api/admin/dashboard (Admin Layout refresh())
products     200               (10) GET /api/admin/products (Admin Layout refresh())
categories   200               (11) GET /api/admin/categories (CategoriesAdmin load())
```

### Why This Occurs:
1. **Global Storefront Provider Wrapping Admin**:
   In `src/main.jsx` (line 2512), the root React tree wraps `<Provider>` around ALL routes, including `/admin/*`.
   `<Provider>` (in `src/store.jsx` lines 31–41) unconditionally triggers:
   - `api('/products')`
   - `api('/coins')`
   - `api('/categories')`
   - `api('/config')`
   - `api('/account/session')`
   - `api('/offers')`
   These are storefront shopping queries that should **never** run when a user is interacting with the merchant studio (`/admin/*`).

2. **Unconditional Admin Root Data Fetching**:
   In `src/main.jsx` (line 1009), the `<Admin />` container component automatically calls `refresh()` on mount:
   ```javascript
   async function refresh() {
     const [d, p] = await Promise.all([api('/admin/dashboard'), api('/admin/products')]);
     setData(d);
     setProducts(p);
   }
   ```
   This means whether an administrator clicks **Categories**, **Settings**, **Orders**, or **Reviews**, `<Admin>` always downloads `/admin/dashboard` AND `/admin/products`!

3. **Submenu Independent Fetching**:
   Inside `<CategoriesAdmin>`, `load()` independently calls:
   `api('/admin/categories')`.

4. **Window Focus Re-triggers**:
   `src/store.jsx` listens to `window.addEventListener('focus', reload)`. When an administrator clicks into Chrome DevTools to inspect network requests, the main window blurs and refocuses, re-triggering another round of `/api/products`, `/api/coins`, and `/api/offers`!

---

## 2. Complete API Endpoint Catalog & Dependencies

### Public Storefront Endpoints
| Endpoint | Method | Frontend Consumer | Dependencies | Optimization Status |
|---|---|---|---|---|
| `/api/products` | GET | `src/store.jsx`, `Collection.jsx` | `products`, `rates`, `offers`, `product_images`, `reviews` | **Needs Caching & Admin Exclusion**: Must not be called on `/admin/*`. |
| `/api/products/:slug` | GET | `Product.jsx` | `products`, `product_images`, `reviews` | Clean single-record lookup. |
| `/api/coins` | GET | `src/store.jsx`, `CoinsPage.jsx` | `coins`, `rates`, `offers`, `coin_images` | **Needs Admin Exclusion**: Must not be called on `/admin/*`. |
| `/api/coins/:slug` | GET | `CoinProduct.jsx` | `coins`, `coin_images` | Clean single-record lookup. |
| `/api/kurtas` | GET | `KurtasPage.jsx` | `kurtas`, `kurta_images` | Clean on-demand route. |
| `/api/kurtas/:slug` | GET | `KurtaDetailPage.jsx` | `kurtas`, `kurta_images` | Clean single-record lookup. |
| `/api/categories` | GET | `src/store.jsx` | `categories` | **Needs Admin Exclusion**: Must not be called on `/admin/*`. |
| `/api/offers` | GET | `src/store.jsx`, `Header.jsx` | `offers` | **Needs Admin Exclusion**: Must not be called on `/admin/*`. |
| `/api/config` | GET | `src/store.jsx`, `Footer.jsx` | Static server config | Low overhead; exclude from admin. |
| `/api/navigation` | GET | `Header.jsx` | `categories` hierarchy | Cleanly cached in state. |
| `/api/brand-image` | GET | `BrandedImage.jsx` | Image pipeline / disk cache | Properly cached. |

### Customer Account & Checkout Endpoints
| Endpoint | Method | Frontend Consumer | Dependencies | Optimization Status |
|---|---|---|---|---|
| `/api/account/session` | GET | `src/store.jsx`, `Account.jsx` | `sessions`, `customers`, `customer_state` | **Needs Admin Exclusion**: Admin uses `/admin/session`. |
| `/api/account/state` | PUT | `src/store.jsx` (`persist()`) | `customer_state` | Debounced via queue. |
| `/api/account/login` | POST | `Account.jsx` | `customers`, `bcryptjs` | Rate limited. |
| `/api/account/register`| POST | `Account.jsx` | `customers`, `bcryptjs` | Rate limited. |
| `/api/account/logout` | POST | `Account.jsx` | `sessions` | Session destruction. |
| `/api/quote` | POST | `Checkout.jsx` | `pricing.js` calculatePrice | Ephemeral token quote. |
| `/api/checkout` | POST | `Checkout.jsx` | `orders`, `order_items`, `products`, `coins` | Atomic transaction. |
| `/api/orders/:id` | GET | `Order.jsx` | `orders`, `order_items` | Single order lookup. |

### Admin Endpoints
| Endpoint | Method | Frontend Consumer | Dependencies | Optimization Status |
|---|---|---|---|---|
| `/api/admin/session` | GET | `Admin.jsx` | `sessions`, `staff` | Fast, lightweight. |
| `/api/admin/login` | POST | `Admin.jsx` | `staff`, `bcryptjs` | Rate limited. |
| `/api/admin/logout` | POST | `Admin.jsx` | `sessions` | Clean. |
| `/api/admin/dashboard` | GET | `Admin.jsx` (Dashboard tab ONLY) | `import_batches`, `orders`, `pricing_rules`, `audit` | **CRITICAL FIX**: Only fetch when Dashboard tab is active; eliminate in-memory table dumps. |
| `/api/admin/products` | GET | `AdminProductList.jsx` (Jewelry tab ONLY) | `products`, `product_images` | **CRITICAL FIX**: Only fetch when Jewelry/Products tab is active. |
| `/api/admin/categories` | GET | `CategoriesAdmin.jsx` | `categories` | Correctly scoped to Categories menu. |
| `/api/admin/categories` | POST | `CategoriesAdmin.jsx` | `categories` | Invalidate categories cache on mutate. |
| `/api/admin/categories/:id`| PATCH/DELETE| `CategoriesAdmin.jsx` | `categories` | Invalidate categories cache on mutate. |
| `/api/admin/kurtas` | GET | `KurtasAdmin.jsx` | `kurtas` | Scoped to Kurtas menu. |
| `/api/admin/coins` | GET | `CoinsAdmin.jsx` | `coins` | Scoped to Coins menu. |
| `/api/admin/rates` | GET | `GoldRatesAdmin.jsx` | `rates` | Scoped to Rates menu. |
| `/api/admin/offers` | GET | `OffersAdmin.jsx` | `offers` | Scoped to Offers menu. |
| `/api/admin/reviews` | GET | `ReviewsAdmin.jsx` | `reviews`, `review_images` | Paginated. |
| `/api/admin/customers` | GET | `CustomersAdmin.jsx` | `customers` | Paginated. |
| `/api/admin/settings` | GET/PUT | `SettingsAdmin.jsx` | `settings` | Scoped to Settings menu. |
