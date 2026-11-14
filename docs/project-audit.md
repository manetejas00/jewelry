# Veyora Jewels – Comprehensive Project Architecture Audit

**Date:** November 14, 2026  
**Environment:** Production (`https://test3.avinyacarefoundation.org`) & Local Workspace  
**Document:** `docs/project-audit.md`  

---

## 1. Executive Summary

This audit evaluates the entire existing Veyora Jewels codebase, spanning frontend single-page application (SPA), backend API services, relational database structures, image delivery pipelines, administrative tooling, and customer shopping workflows.

The objective of the upcoming transformation is to elevate Veyora Jewels from a limited pearl-centric catalogue into a comprehensive, high-scale Indian fine jewellery and ethnic fashion platform comprising:
- **100 Unique Jewellery Products** across 9 diverse traditional and contemporary Indian categories (including Mangalsutras, Temple Jewellery, Kundan, Polki, and Meenakari).
- **50 Unique Kurta Designs** with **5 colour variants each (250 variants)**, featuring 50 distinct Indian model identities consistent across their respective colour variants.
- **20 Unique Bullion & Numismatic Coins** in 24K pure gold and 999 fine silver with strictly isolated product photography (no human models).
- **Independent Classification Entities** for Materials (10+ classes), Craftsmanship Techniques (12+ techniques), Finishes (10+ finishes), and Collections (Gold Collection, Silver Collection, Bridal, Festive, Everyday Wear, Traditional).
- **Dedicated Material and Craftsmanship Landing Pages** (`/materials/:slug`, `/craftsmanship/:slug`).
- **Independent Gold and Silver Shopping Destinations** (`/collections/gold`, `/collections/silver`).
- **AI-Powered Product Recommendations on PDP** ("Similar Products", "You May Also Like", "Complete the Look") with database fallbacks, caching, and admin control.
- **Upgraded Bulk Import/Export Engine** with row-level error reporting, batch preview, and downloadable templates.

---

## 2. Frontend Architecture Audit

### 2.1 Technology Stack & Build Pipeline
- **Framework:** React 18 with Vite 6.4.6.
- **Routing:** React Router DOM v6 with browser history and dynamic slug matching.
- **State Management:** React hooks (`useState`, `useEffect`, `useMemo`, `useRef`), custom store context (`src/store.jsx`), and dedicated utility hooks.
- **Icons & Styling:** `lucide-react`, custom CSS architecture (`src/style.css`, 144 KB) adhering to a quiet luxury aesthetic (deep emerald `#102124`, antique gold `#c5a059`, cream `#fcfbf9`).
- **Media Handling:** `BrandedImage` component with automatic watermarking fallback, `ImageViewer`, `ProductMagicZoom`, and responsive WebP thumbnails.

### 2.2 Storefront Route Inventory
| Route | Component | Current State | Audit Assessment |
|---|---|---|---|
| `/` | `MainStore` / `HeroBanner` | Functional | Features pearl hero carousel, category cards, and trending pieces. Needs expansion to showcase new collections (Gold, Silver, Kundan, Ethnic Wear). |
| `/collections/:slug` | `CommonPLP` | Functional | Reusable across categories. Currently handles `earrings`, `necklaces`, `rings`, `bracelets`, `coins`. Needs support for `/collections/gold`, `/collections/silver`, and multi-attribute filters. |
| `/products/:slug` | `CommonPDP` | Functional | Clean gallery, angle views, price calculations, and reviews. Needs AI recommendation sections ("Similar Products", "You May Also Like", "Complete the Look"). |
| `/kurtas` | `Kurtas` / `CommonPLP` | Functional | Dedicated ethnic wear listing. Handles 20 styles currently. Needs expansion to 50 designs with 5 colour variants (250 variants). |
| `/kurtas/:slug` | `KurtasPDP` / `CommonPDP` | Functional | Features size selector (XS–XXXL) and colour swatches. Needs integration with 5 colour variants and high-definition multi-angle galleries. |
| `/coins` | `CoinsPLP` | Functional | Bullion coin listing with live market rates. Currently contains only 6 coins. Needs expansion to 20 coin products. |
| `/coins/:slug` | `CoinPDP` | Functional | Metal rate breakdowns and making charge calculation. Strictly non-model product photography. |
| `/materials/:slug` | *Missing* | Not implemented | Currently materials are filter parameters only. Dedicated landing pages (`/materials/gold`, `/materials/silver`, etc.) must be built. |
| `/craftsmanship/:slug` | *Missing* | Not implemented | Currently craftsmanship is embedded in product text. Dedicated landing pages (`/craftsmanship/kundan`, etc.) must be built. |
| `/cart` & `/checkout` | `CartModal` / `Checkout` | Functional | Supports Cash on Delivery (COD) and payment gateway flows. |
| `/account/*` | `Account` | Functional | Phone/Email OTP authentication, order tracking, address management, and wishlist. |

### 2.3 Storefront Navigation & Header
- The header features an active nav underline system matching 8 routes.
- **Requirement:** Integrate access to "Shop by Category", "Shop by Material", "Shop by Craftsmanship", and "Shop by Collection" seamlessly into the luxury header without visual clutter or breaking existing navigation routes.

---

## 3. Backend Architecture Audit

### 3.1 Server Entry Point & Routing
- Entry file: `server/index.js` (Express ES modules).
- Database abstraction: Knex.js (`server/db.js`), supporting SQLite (`dev.sqlite3` / memory) and MySQL (`mysql2` in production on Hostinger).
- Core modules:
  - `server/pricing.js`: Gold/metal rate pricing, margin calculation, pricing rules, and active offers.
  - `server/kurtas.js`: Kurta variants, family card grouping, size charts, and admin CRUD.
  - `server/categories.js`: Category queries and admin management.
  - `server/coin-imports.js`: Numismatic and bullion coin imports.
  - `server/importer.js`: CSV feed validation, batch diff preview, atomic publishing, and exports.
  - `server/search.js`: Autocomplete and search indexing.
  - `server/reviews.js`: Customer review submissions, moderation, and verified buyer checks.
  - `server/ai-copy.js`: AI copywriting and SEO drafts.

### 3.2 Database Schema State
The database currently tracks 34 tables. Key current schemas:
1. `products`: Contains jewellery products and kurtas (`is_kurta = true`). Uses text columns `metal`, `purity`, `finish` rather than normalized foreign keys.
2. `coins`: Bullion coin records with weight, purity, dimension, and live pricing mode.
3. `product_images`: Multi-angle imagery linked by `product_code` or `sku` with `role` and `color`.
4. `categories`: Basic category table (`slug`, `name`, `description`, `thumbnail`, `banner`).

**Identified Schema Limitations:**
- No independent `materials` master table.
- No independent `craftsmanship` master table.
- No independent `finishes` master table.
- No independent `collections` master table.
- No normalized join tables (`product_materials`, `product_craftsmanship`, `product_finishes`, `product_collections`).
- No `product_recommendations` table to store AI/rule-based recommendation scores, types, and admin overrides.

---

## 4. Admin Panel Audit

### 4.1 Route & View Architecture
Admin navigation uses dedicated URLs with active sidebar highlighting:
- `/admin/dashboard`
- `/admin/categories`
- `/admin/products`
- `/admin/chicken-curry-kurtas`
- `/admin/coins`
- `/admin/offers`
- `/admin/reviews`
- `/admin/gold-rates`
- `/admin/pricing-rules`
- `/admin/imports`
- `/admin/orders`
- `/admin/customers`
- `/admin/catalogue-copy`
- `/admin/ai-chatbot`
- `/admin/settings`

### 4.2 Admin Strengths & Gaps
- **Strengths:** Consistent dark emerald layout, RBAC (`owner`, `manager`, `viewer`), mobile slide-out drawer, batch import preview with error CSV download, multi-angle image uploader.
- **Gaps:**
  - Cannot manage Materials, Craftsmanship techniques, Finishes, or Collections as distinct entities.
  - Cannot manage or review AI product recommendations on PDP.
  - Product creation form does not yet support multi-material or multi-craftsmanship tagging.
  - Kurta admin handles 20 styles with 3 colors; needs expansion to handle 50 designs with 5 colors (250 variants).

---

## 5. Security, Performance & Integrity

1. **Authentication:** Session-based with signed cookies (`staff_session`), role enforcement on all mutating routes.
2. **Import Security:** Private payload stored safely in `import_batches`; formulas escaped; paths validated against directory traversal (`..`).
3. **Database Transactions:** Staged import publications run inside isolation-level transactions with pessimistic row locking (`forUpdate`) and `import_locks`.
4. **Asset Optimization:** WebP image format, responsive breakpoints, lazy loading, and SHA-256 deduplication.

---

## 6. Implementation Risk Matrix

| Risk | Severity | Mitigation Strategy |
|---|---|---|
| Existing order history disruption | High | Retain all existing order items, customer accounts, and payment logs without modifying legacy foreign keys. |
| Duplicate SKUs during catalogue expansion | Medium | Enforce unique SKU constraints across `products`, `coins`, and kurta variants with seeder validation. |
| Memory exhaustion during bulk image generation | Medium | Batch image generation through rate-limited subagents; record progress in `product-image-manifest.md`. |
| Breaking existing CSV imports | High | Maintain legacy column support in `server/importer.js` alongside newly introduced relational fields. |
| AI recommendation latency on PDP | Medium | Cache PDP recommendations in memory/database with instant rule-based fallback if the AI service fails. |
