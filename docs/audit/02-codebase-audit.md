# Codebase Architecture & Systems Audit

**Project:** Veyora Jewels (E-Commerce Platform)  
**Audit Date:** 2026-11-11  
**Auditor:** Automated Engineering Pair (Antigravity)  
**Repository Working Directory:** `/Users/tejasmane/Documents/ChatGPT/ecom`  
**Target Environment:** Local Node.js 22 / Vite / React 18 / Express / Knex / SQLite & MySQL2

---

## 1. Executive Summary

This codebase implements a high-end luxury jewellery e-commerce platform and bullion investment portal ("Veyora Jewels"). The platform features:
- Live bullion pricing dynamically linked to official daily 24K Gold and 999 Fine Silver market rates.
- Multi-tier customer authentication with guest-to-customer shopping bag reconciliation, account isolation, and cryptographically secure password reset tokens.
- Cash on Delivery and online bag quotes with stock validation and idempotency protection.
- Customer ratings and reviews with verified-purchase badges, moderation workflows, and multi-angle photo uploads.
- A Merchant Studio (Admin Panel) with catalogue management, bullion coin operations, automated daily feed synchronization, promotional offers management, and CSV batch import/export pipelines.

While the application is robust, performant, and has 137 passing automated tests, several critical architectural gaps, error handling vulnerabilities, and component duplications were identified.

---

## 2. Architectural Overview

```mermaid
graph TD
    Client[React 18 SPA / Vite] -->|Fetch API + CSRF| Express[Express 4 Server (server/index.js)]
    Express --> Router[Route Handlers with async error catcher]
    Router --> Services[Domain Services]
    Services --> DB[(Knex Query Builder: SQLite / MySQL2)]
    Services --> Importers[CSV & Feed Synchronization Engines]
    Services --> Pricing[Dynamic Pricing Engine]
    Services --> Media[Thumbnails & WebP Optimization Engine]
```

### Component Breakdown
- **Frontend (`src/`):**
  - Framework: React 18 with Vite SPA architecture.
  - State Management: React Context (`useStore` in `src/store.jsx`) with localStorage synchronization for guest users and server state synchronization for authenticated users.
  - Icons: `lucide-react`.
  - Styling: Custom vanilla CSS (`src/style.css`, ~2,800 lines) following luxury aesthetic (Cormorant Garamond, Montserrat, ivory/gold/charcoal palettes).
  - Main App Entry: `src/main.jsx` (~2,300 lines) which acts as an all-in-one router, storefront view container, and admin panel view container.
- **Backend (`server/`):**
  - Framework: Express 4 with ESM modules (`server/index.js`, ~710 lines).
  - Database: Knex query builder connecting to SQLite3 (`db.sqlite`) in development/preview or MySQL2 (`mysql2`) in production.
  - Sessions: `express-session` with Knex session store (`connect-session-knex`).
  - Security: `helmet` (CSP, frameguard, nosniff), `bcryptjs` password hashing, `express-rate-limit` endpoint protection, timing-safe tokens.
  - Automated Feeds: `server/daily.js` and `server/settings.js` managing automated external feed polling.

---

## 3. Backend Audit & Code Structure Assessment

### 3.1 Oversized Monolithic Server Entry (`server/index.js`)
- **Observation:** `server/index.js` contains 710 lines and handles all API route registrations, session configuration, helmet headers, file upload routes, admin endpoints, and static fallback serving.
- **Impact:** While manageable, high line density increases merge conflict risk and makes modular testing difficult.
- **Recommendation:** Maintain domain routers or modular service delegations while preserving API contract stability.

### 3.2 Database Layer & Multi-Database Compatibility (`server/db.js`)
- **Strengths:** 
  - Dual support for SQLite3 and MySQL2 via Knex.
  - Automatic migration runner (`migrate()`) and seeder execution.
- **Gaps Identified:**
  - Date format inconsistency: SQLite stores ISO strings (`YYYY-MM-DDTHH:mm:ss.sssZ`), whereas MySQL datetime fields may format differently depending on connection timezone flags.
  - Missing column handling: When inserting records (e.g. `products`), attempting to write non-existent columns (like `created_at` which does not exist in `products` table) causes SQLite/MySQL fatal schema exceptions.
  - Soft-deletes: The `reviews` table includes `deleted_at`, but several queries throughout `server/reviews.js` must carefully check `.whereNull('deleted_at')` to avoid query leaks.

### 3.3 Dynamic Pricing Engine (`server/pricing.js`)
- **Strengths:** 
  - Implements formulaic metal price calculation:
    $$\text{Price} = (\text{Net Weight} \times \text{Purity Multiplier} \times \text{Rate/g}) + \text{Making Charges} + \text{Stone} + \text{Other} + \text{Tax}$$
  - Dynamic cache invalidation via `invalidateSearchCache()`.
  - Real-time quote generation with 15-minute price lock and stock reservation check.

---

## 4. Frontend Audit & Code Structure Assessment

### 4.1 Monolithic `src/main.jsx`
- **Observation:** `src/main.jsx` is over 2,290 lines long. It contains:
  - Storefront routes (Homepage, PDP, Collection Listing, Bullion Coins, Cart, Checkout, Information pages).
  - Admin Shell and Dashboard.
  - Admin Products, Coins, Offers, Settings, Import/Export views.
  - Modals and forms (`ProductForm`, `CatalogueEditForm`, `ProductRow`, etc.).
- **Impact:** Heavy re-renders, complex maintenance, and duplicate state logic.

### 4.2 State Management (`src/store.jsx`)
- **Strengths:**
  - Guest cart and favorites are cleanly stored in `localStorage` and automatically migrated to the customer account upon sign-in.
  - Cross-tab synchronization via `BroadcastChannel('veyora-catalogue')`.
- **Gaps Identified:**
  - Lack of centralized session expiration handler: when `/api/account/state` or `/api/account/orders` returns 401 or 403, the client leaves the user in an ambiguous state rather than cleanly prompting a sign-in dialog.
  - Silent `.catch(() => {})` in several background queries.

### 4.3 Missing Top-Level React Error Boundary
- **Issue:** The React tree has no `<ErrorBoundary>` wrapper.
- **Risk:** Any unhandled runtime exception (such as a malformed image URL, null property access on an unexpected order item, or rendering glitch in an admin table) unmounts the entire React tree, leaving the user with a completely blank screen.
- **Fix Required:** Add a resilient `ErrorBoundary` component with user-friendly retry and return-to-home actions.

---

## 5. Admin Panel Architecture & Duplication Analysis

### 5.1 Listing Modules Duplication
Across the Admin Panel modules:
1. `AdminProductList` (Products)
2. `CoinsAdmin` (Bullion Coins)
3. `ReviewsAdmin` (Customer Reviews)
4. `OffersAdmin` (Promotional Discounts)
5. `BatchTable` (Import Batches)
6. `Orders` (Customer Orders)

**Identified Duplications:**
- **Filter Bars:** Both `AdminProductList` and `CoinsAdmin` re-implement identical filter states (`search`, `stockFilter`, `statusFilter`, `pricingFilter`) and identical DOM markup for `.admin-filter-bar`.
- **Pagination Controls:** `Pagination.jsx` is used for client-side lists, while `ReviewsAdmin.jsx` implements its own custom previous/next pagination buttons, and `Orders` renders an unpaginated raw table.
- **Action Buttons & Badges:** Status badges (`status-badge`, `coin-badge`, `published`, `draft`, `active`, `paused`) are styled inline with slightly varying CSS classes.
- **Modals & Confirmation Dialogs:** Delete confirmations use native `window.confirm(...)`, which is blocking, inaccessible, and inconsistent across mobile/desktop browsers.

---

## 6. Code Duplication Summary Table

| Duplicated Pattern | Locations Found | Proposed Refactoring |
| :--- | :--- | :--- |
| Filter Bar UI & Logic | `AdminProductList`, `CoinsAdmin` | Create reusable `AdminFilterBar` component |
| Pagination Bar | `Pagination.jsx`, `ReviewsAdmin.jsx`, `Orders` table | Standardize on reusable `CommonPagination` supporting both server & client pagination |
| Status & Purity Badges | `src/main.jsx`, `src/ReviewsAdmin.jsx`, `src/store.jsx` | Extract unified `CommonStatusBadge` |
| Empty State Display | 8+ different locations in `src/main.jsx` | Extract `CommonEmptyState` component |
| Delete Confirmation | Native `window.confirm()` in Products, Coins, Offers, Reviews | Standardize with `CommonDeleteModal` |

---

## 7. Database & API Issues

1. **Foreign Key Constraints & Cascade:**
   - The `review_images` table cascades on `reviews.id` deletion.
   - The `order_items` table cascades on `orders.id` deletion.
   - However, when a product is deleted via `DELETE /api/admin/products/:sku`, related `product_images` must be explicitly cleaned up to prevent orphaned records in storage and database.
2. **Missing Search Index on Reviews:**
   - Admin review search filters by customer name, product title, and comment body. For large datasets, a composite index or fulltext search index on `reviews (status, created_at)` is recommended.
3. **Consistent Error Payload:**
   - Backend APIs mostly return `{error: string}`, but some validation errors attach `{quote: ...}`, and health endpoints return `{status: 'unavailable'}`. Standardizing on `{success: false, error: string, code?: string}` improves client-side prediction.

---

## 8. Conclusion

The architecture is fundamentally sound with high performance and solid foundational security. The primary areas requiring engineering focus are:
1. Centralized, high-context error logging on the backend (P0).
2. Frontend Error Boundary and network error normalization (P1).
3. Common reusable component architecture across all admin listing pages (P2).
4. Code quality, dead code removal, and strict documentation (P3).
