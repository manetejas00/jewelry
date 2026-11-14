# Complete E-Commerce Website Audit & Architecture Report
## Independent Chicken Curry Kurtas Module & Complete Products Replication

**Project:** Veyora Jewels & Luxury Ethnic Wear E-Commerce Platform  
**Audit Date:** November 14, 2026  
**Auditor:** Antigravity AI Assistant  
**Environment:** Node.js v20+, Express 4.21.2, React 19.0.0, Vite 6.1.0, SQLite (better-sqlite3) / Knex 3.1.0  
**Status:** Architecture Audited & Implementation Blueprint Established

---

## 1. Executive Summary

This audit evaluates the entire system architecture to establish an independent, fully-featured **Chicken Curry Kurtas** module that operates as a distinct top-level storefront section—sharing the exact same UI/UX design, frontend components, business logic, image zoom, modal inspection, cart, checkout, and admin management workflows as the existing Products module.

### Core Architectural Mandates:
1. **Independent Section, NOT a Category:** Chicken Curry Kurtas is NOT a normal product category. It possesses its own dedicated storefront presentation (`/kurtas`, `/kurtas/:slug`), dedicated admin management (`/admin?tab=kurtas`), and distinct product identification (`is_kurta = 1`), while leveraging the shared product engine and checkout pipeline.
2. **Complete UI/UX & Business Logic Replication:** Reuse identical `ProductCard`, `ProductMagicZoom`, full-screen `ImageViewer`, `RatingBadge`, breadcrumbs, accordion specifications, dynamic pricing breakdown, stock status indicators, and recommendation carousels.
3. **Comprehensive Size System (XS to XXXL):** Support all seven sizes: `XS (34)`, `S (36)`, `M (38)`, `L (40)`, `XL (42)`, `XXL (44)`, `XXXL (46)` with variant-level SKU generation, size-specific stock tracking, availability validation, and an interactive Kurta Size Chart (Bust, Waist, Hip, Shoulder, Kurta Length, Sleeve Length).
4. **Complete Multi-Angle AI Photography:** Photorealistic Indian female models across diverse authentic Chikankari styles (mulmul cotton, viscose georgette, Chanderi silk). Strictly enforce within-product model and garment consistency across all multi-angle views (`hero`, `front`, `right`, `left`, `back`, `model`, `modal`/`detail`, and companion mobile card thumbnails).
5. **Dynamic 8-Stage Infinite Hero Showcase:** Seamless sequence: Hero Video (full playback) $\rightarrow$ 3s delay $\rightarrow$ 3 Jewellery Campaign Slides (3s each) $\rightarrow$ 3 Kurta Campaign Slides (3s each) $\rightarrow$ Infinite Loop with GSAP crossfades and tab visibility listeners.
6. **Complete Combo Removal (Phase 10):** Cleanly purge all newly introduced combo functionality (combo tables, seeders, routes, pricing, cart logic, admin tabs) without touching or impacting any core jewellery or kurta functionality.

---

## 2. Existing Products Module Breakdown

### 2.1 Product Listing & Storefront (`Collection` & `ProductCard`)
- **Grid Layout:** CSS grid with responsive columns (`--cols: 4` on desktop, `2` on tablet/mobile).
- **Product Card (`ProductCard`):**
  - Displays `ListingImage` with hover transition to secondary view (`front.webp` or `model.webp`).
  - Badges: Promotional offers (`Sparkles` offer ribbon), status indicators (`CURRENTLY UNAVAILABLE`, `IN STOCK`).
  - Saved wishlist toggle (`Heart` icon bound to `saved` array in `store.jsx`).
  - Pricing display: Price range for multi-variant products (`minPrice – maxPrice`), single price, or strike-through original price with `SAVE {discount}` badge.
- **Filtering & Sorting:** In-memory and parameter-driven filters for material/fabric, purity, price bracket, and in-stock only.

### 2.2 Product Detail Page (`Product`)
- **Image Gallery & Zoom:**
  - `ProductMagicZoom` component: Desktop cursor hover magnification using `@zoom-image/core`.
  - Multi-angle thumbnails selector underneath the main image: displays role badges (`hero`, `front`, `right`, `left`, `back`, `model`, `detail`).
  - Full-screen high-res modal viewer (`ImageViewer`) supporting double-tap, wheel zoom (100%–500%), pan, and pinch gesture.
- **Variant & Size Selection:**
  - Dropdown/button selection mapped to individual size variant SKUs.
  - Automatically updates price, stock availability, SKU display, and URL slug.
  - Out-of-stock sizes are disabled and clearly marked.
- **Accordion & Specs (`specs` & `details`):**
  - Displays Fabric / Metal, Craftsmanship / Needlework, Size / Fit, and SKU.
  - Collapsible price details (base price, merchant margin, applied promotional discounts, taxes).
  - Shipping & care policy accordions.
- **Recommendations:** Related products carousel displaying complementary pieces.

### 2.3 Cart, Checkout & Orders Pipeline
- **Cart Storage:** Session and global context state managed by `useStore()`.
- **Pricing Verification (`/api/quote`):** Server-side verification via `quote()` in `server/pricing.js`. Verifies stock, applies active offers, computes subtotal, taxes, shipping charges, and returns an HMAC SHA-256 integrity token.
- **Checkout (`/checkout`):** Cash on Delivery (COD) flow with OTP verification, full address inputs (PIN code, phone number validation), and idempotency keys to prevent duplicate orders.
- **Order Creation & Inventory Deduction:** Atomically decreases stock for the exact size variant SKU upon order placement and restores inventory upon cancellation.

### 2.4 Admin Panel (`AdminProducts` & `ProductAngleManager`)
- **Table View:** Search by name/SKU, filter by category/fabric/status, pagination (20 items/page), quick stock edit, status toggle.
- **Create & Edit Modal:** Full form for product details, pricing mode (`FIXED` vs `GOLD_LINKED`), base price, stock, SEO title/description.
- **Multi-Angle Image Manager (`ProductAngleManager`):** Reusable component supporting file upload, drag-and-drop, role assignment (`hero`, `front`, `left`, `right`, `back`, `model`, `detail`), and delete/replace operations.

---

## 3. Dedicated Chicken Curry Kurtas Architecture

### 3.1 Independence from Category Hierarchy
Rather than being an entry in `categories` or treated as standard jewellery:
- **Database Identification:** Identified via `is_kurta = 1` flag in `products` table and `category = 'Chicken Curry Kurtas'`.
- **Dedicated Storefront Route:**
  - `/kurtas`: Independent catalogue listing with tailored ethnic filters (Fabric: Mulmul Cotton, Georgette, Chanderi Silk; Size: XS to XXXL; Price bracket).
  - `/kurtas/:slug`: Dedicated PDP with ethnic breadcrumbs (`Home / Chicken Curry Kurtas / {Product Name}`), Lucknowi craftsmanship badges, 7-size selector, and Kurta Sizing Chart modal.
- **Dedicated Admin Studio Navigation:**
  - Tab: `['Chicken Curry Kurtas', Sparkles]` in `adminTabs`.
  - Component: `KurtasAdmin` with dedicated kurta inventory metrics, size-wise stock matrix (XS, S, M, L, XL, XXL, XXXL), and multi-angle photography management.

### 3.2 Sizing System (XS to XXXL)
All Chicken Curry Kurta products support 7 discrete size variants:

| Size Code | Tag Size | Garment Bust | Waist | Hip | Shoulder | Kurta Length | Sleeve Length |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **XS** | XS (34) | 36 in (91 cm) | 32 in (81 cm) | 38 in (97 cm) | 14.0 in | 44 in | 18.5 in |
| **S** | S (36) | 38 in (97 cm) | 34 in (86 cm) | 40 in (102 cm) | 14.5 in | 44 in | 19.0 in |
| **M** | M (38) | 40 in (102 cm) | 36 in (91 cm) | 42 in (107 cm) | 15.0 in | 44 in | 19.0 in |
| **L** | L (40) | 42 in (107 cm) | 38 in (97 cm) | 44 in (112 cm) | 15.5 in | 45 in | 19.5 in |
| **XL** | XL (42) | 44 in (112 cm) | 40 in (102 cm) | 46 in (117 cm) | 16.0 in | 45 in | 19.5 in |
| **XXL** | XXL (44) | 46 in (117 cm) | 42 in (107 cm) | 48 in (122 cm) | 16.5 in | 46 in | 20.0 in |
| **XXXL** | XXXL (46) | 48 in (122 cm) | 44 in (112 cm) | 50 in (127 cm) | 17.0 in | 46 in | 20.0 in |

Each variant possesses:
- A unique SKU: `CCK-{STYLE}-{SIZE}` (e.g. `CCK-IVORY-XS` through `CCK-IVORY-XXXL`).
- Individual stock quantity in the database.
- Availability toggle (disabled in size selector if stock = 0).

---

## 4. Product Image System & Multi-Angle Consistency

### 4.1 Required Image Types per Product
For every kurta style:
1. `hero.webp`: Primary catalog presentation shot on model.
2. `front.webp`: Full front elevation showing full neckline, bodice, and hem embroidery.
3. `right.webp`: Right 3/4 profile showing garment drape, side slits, and sleeve fit.
4. `left.webp`: Left 3/4 profile maintaining identical lighting and model pose.
5. `back.webp`: Full back view showing back yoke motifs and neckline finish.
6. `model.webp`: Full-length editorial lifestyle shot on a realistic Indian female model.
7. `modal.webp` (`detail`): Ultra high-resolution close-up macro view of the authentic Lucknowi Chikankari needlework (Bakhiya, Phanda, Keel Kangan stitches and fabric grain).
8. Companion `-thumb.webp` derivatives for every role (600×800 inside-fit WebP, quality 82).

### 4.2 Git Tracking Compliance
- Modified `.gitignore` ensures `public/assets/products/*kurta*/` and `dist/assets/products/*kurta*/` are never ignored.
- All generated WebP files are committed directly into the Git repository so they deploy reliably over SSH to Hostinger without runtime missing file errors.

---

## 5. Removal of All Combo Functionality (Phase 10 Plan)

To fulfill Phase 10 completely:
1. **Database:** Drop `combos` and `combo_items` tables via migration `020_kurta_module_and_remove_combos.js`.
2. **Backend:**
   - Remove `server/combos.js`.
   - Remove combo endpoints `/api/combos` and `/api/combos/:slug` from `server/index.js`.
   - Remove combo pricing resolution from `server/pricing.js` `quote()`.
   - Remove combo inventory management from `server/orders.js`.
   - Remove combo sitemap URLs and metadata from `server/seo.js`.
   - Remove combo search indexing and phrases from `server/search.js`.
3. **Frontend:**
   - Delete `src/Combos.jsx` and `src/admin/CombosAdmin.jsx`.
   - Remove `/combos` and `/combos/:slug` routes from `src/main.jsx`.
   - Remove "Curated Combos" from navigation bars and home category grids.
   - Remove "Complete the Look" paired combo section from `Product()` in `src/main.jsx`.
4. **Seeders & Tests:**
   - Delete `seeders/ComboSeeder.js` and remove from `DatabaseSeeder.js`.
   - Replace `tests/combos.test.js` with comprehensive `tests/kurtas.test.js`.
   - Remove `/api/combos` from `scripts/verify-deployment.js`.

---

## 6. Audit Conclusion
The platform has a robust foundation capable of housing the independent Chicken Curry Kurtas module cleanly. Reusing the battle-tested `ProductCard`, `ProductMagicZoom`, size dropdown, and checkout pipelines guarantees a frictionless, premium luxury shopping experience with zero disruption to the existing jewellery and bullion systems.
