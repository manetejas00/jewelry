# Complete E-Commerce Website Audit & Architecture Report

**Project:** Veyora Jewels & Maison Perle E-Commerce Platform  
**Audit Date:** November 14, 2026  
**Auditor:** Antigravity AI Assistant  
**Environment:** Node.js v20.17.0, Express 4.21.2, React 19.0.0, Vite 6.1.0, SQLite (better-sqlite3) / Knex 3.1.0  
**Status:** Comprehensive Baseline Verified (198 passing unit/integration tests, 448 asset checks passed, production Vite build verified)

---

## 1. Executive Summary

The Veyora e-commerce platform is an artisanal luxury jewellery and bullion storefront featuring dynamic precious metal pricing (Gold and Silver bullion rates with freshness guarantees), cash-on-delivery checkout, customer account management, and a comprehensive merchant administration studio.

This audit evaluates the entire system architecture to establish the baseline and specifications for:
1. Introducing a dedicated **Chicken Curry Kurtas for Women** (Lucknowi Chikankari ethnic apparel) category with complete product variants, attributes, sizing, pricing, and photography.
2. Building an end-to-end **Product Combo & Bundle System** that pairs kurtas with complementary Veyora pearl and gold jewellery, with automated bundle pricing, discount computation, and inventory synchronization.
3. Establishing a **Rigorous Product Image System** adhering to existing 1:1 WebP multi-angle conventions (`front`, `right`, `left`, `back`, `model`, `modal`/`detail`, and thumbnails) with photorealistic consistency.
4. Upgrading the **Homepage Dynamic Hero Showcase** to implement an exact automated playback sequence: Full Hero Video -> 3s Delay -> 3 Jewellery Slides (3s each) -> 3 Kurta Slides (3s each) -> Infinite Loop with GSAP animations.
5. Expanding the **Admin Studio** with full Category Management, Combo Management, and enhanced multi-angle product image workflows.
6. Ensuring complete compliance with all installed development skills (`veyora-catalogue-copy`, `product-description-generator`, `product-page-seo`, `product-title-optimization`, `pwa-nextjs`).

---

## 2. Architecture & Tech Stack Audit

### 2.1 Backend Architecture
- **Server Framework:** Express 4.21.2 running on Node.js 20+ in ES Module mode (`"type": "module"` in `package.json`).
- **Entry Points:** `server/index.js` (main application server), `server/db.js` (Knex query builder and connection management).
- **Database Layer:** Dual-driver support: `better-sqlite3` (default for development/preview at `private/store.sqlite`) and `mysql2` (for production MySQL). Foreign keys are explicitly enforced via SQLite pragmas (`PRAGMA foreign_keys = ON`).
- **Data Validation & Ingestion:** `server/importer.js` implements strict CSV schema validation for products, bullion coins, and live gold rates, supporting batch staging, checksum deduplication, and transactional publishing.
- **Pricing Engine (`server/pricing.js`):**
  - Dynamic `GOLD_LINKED` pricing recalculated against verified purity-specific gold rates (`rates` table) with freshness enforcement (`GOLD_MAX_AGE_HOURS=48`).
  - Fixed pricing mode (`FIXED`) used for select items, supporting base price, merchant margin (`pricing_rules`), promotional offers (`offers`), and tax treatment.
- **Security & Middleware:**
  - `helmet` 8.0.0 for security headers.
  - Rate limiters via `express-rate-limit` for OTP, reviews, search, and image uploads.
  - Role-Based Access Control (RBAC): `auth(['owner', 'manager'])` protecting administrative endpoints, CSRF tokens via `sessionStorage` and `req.session.csrf`.
  - Secure file uploads with MIME verification, path traversal prevention, and filename sanitization in `server/brand-images.js` and `server/index.js`.
- **Search System (`server/search.js`):** In-memory tokenized search engine with Levenshtein distance typo tolerance, phonetic mappings, category suggestions, and popular search phrases.

### 2.2 Frontend Architecture
- **Framework & Routing:** React 19.0.0 with `react-router-dom` 7.1.5.
- **Build System:** Vite 6.1.0 with chunk splitting (`react-vendor`, `icons`, `animation`).
- **Design System & Styling:** Pure CSS in `src/style.css` (136 KB), adhering to luxury editorial aesthetic (serif headings, clean typography, neutral stone `#f9f8f6`, gold accents, subtle borders).
- **State Management:** `src/store.jsx` provides global React Context (`StoreContext`) encapsulating catalogue items, bag state, user session, active offers, saved wishlist, and drawer visibility.
- **Image Handling & Zoom:**
  - `src/ProductMagicZoom.jsx` uses `@zoom-image/core` 0.43.1 for smooth desktop cursor hover zoom.
  - `src/ImageViewer.jsx` provides full-screen modal zoom with pinch, double-tap, pan, wheel zoom (100%–500%), and keyboard controls.
  - `src/BrandedImage.jsx` and `src/listing-media.js` handle responsive WebP images and dynamic thumbnail mapping.
- **Animations:** GSAP 3.12.7 context-aware animations for hero transitions and section reveals with full `prefers-reduced-motion` compliance.

---

## 3. Database Schema & Data Models Audit

### 3.1 Existing Tables
1. `products`: Main catalogue table.
   - Fields: `id`, `sku` (unique), `product_code`, `slug`, `name`, `category`, `description`, `metal`, `purity`, `net_weight_g`, `size`, `finish`, `image`, `pricing_mode` (`GOLD_LINKED` or `FIXED`), `fixed_price`, `making_flat`, `making_percent`, `stone_charge`, `other_charge`, `stock`, `status` (`published`, `draft`), `supplier`, `source_timestamp`, `updated_at`, `seo_title`, `meta_description`.
2. `product_images`: Multi-angle photography records.
   - Fields: `id`, `product_code`, `sku`, `role` (`hero`, `front`, `left`, `right`, `model`, `detail`), `url`, `alt_text`, `sort_order`, `created_at`, `updated_at`.
3. `coins`: Bullion coin catalogue.
4. `rates`: Live precious metal rates by purity and supplier.
5. `pricing_rules`: Tax percentages, margin settings, rounding rules.
6. `offers`: Promotional discounts (`making_percent`, `total_percent`, `flat_amount`).
7. `orders` & `order_items`: Order management with customer snapshots, idempotency keys, and statuses (`confirmed`, `packed`, `shipped`, `delivered`, `cancelled`).
8. `customers` & `customer_state`: User accounts and session states.
9. `reviews` & `review_images`: Moderated product ratings and reviews.
10. `staff` & `sessions`: Admin studio authentication.

### 3.2 Gaps & Missing Schema Requirements
1. **Dedicated `categories` Table:**
   - Currently, categories are merely ad-hoc string values (`Rings`, `Earrings`, `Necklaces`, `Bracelets`) in `products.category`.
   - Missing: formal category metadata, SEO slugs, category descriptions, category thumbnails, category banners, active/inactive statuses, and display ordering.
2. **Dedicated `combos` & `combo_items` Tables:**
   - No data model currently exists for multi-product combinations (e.g. Kurta + Jewellery Sets).
   - Missing: combo SKU, combo pricing, regular sum price, discount percentage, combo savings calculation, combo availability, and component product mappings.
3. **Product Image Roles Support:**
   - Current schema roles in migration 004 are `hero`, `front`, `left`, `right`, `model`, `detail`.
   - Kurta photography requires dedicated `back` view support in both schema and UI, while remaining fully backward-compatible with existing jewellery products.

---

## 4. Product Image System Audit

### 4.1 Existing Directory Conventions & Naming Rules
- Physical assets reside in `public/assets/products/<product_code>/`.
- Each style contains 1:1 square WebP files:
  - `hero.webp` (primary card/listing thumbnail)
  - `front.webp` (straight-on front angle)
  - `left.webp` (left profile view)
  - `right.webp` (right profile view)
  - `model.webp` (on-model lifestyle view)
  - `modal.webp` (macro fabric/craftsmanship detail view)
  - Corresponding `-thumb.webp` derivatives (resized to 600×800 inside-fit, quality 82).
- Dimensions: 1024×1024 to 1254×1254 pixels.
- The asset verification script (`scripts/check-product-assets.js`) enforces:
  - Valid image buffers readable by Sharp.
  - Zero duplicate SHA-256 hashes across required views for a single product.
  - Distinct model vs detail images.
  - Presence of matching `-thumb.webp` derivatives.
  - Database alignment with `product_images`.

### 4.2 Requirements for Chicken Curry Kurta Image System
- Every new kurta product must follow the exact same storage directory:
  `public/assets/products/<product_code>/`
- Required views for each kurta:
  1. `front.webp`: Full front view, embroidery visible, proper garment proportions.
  2. `right.webp`: Right-side profile showing garment drape and side slit details.
  3. `left.webp`: Left-side profile showing consistent silhouette.
  4. `back.webp`: Full back view showcasing the back yoke and embroidery.
  5. `modal.webp`: High-resolution macro zoom shot of Chikankari stitching, fabric weave, neckline, and buttons.
  6. `model.webp`: Full lifestyle shot on authentic Indian female model.
  7. `hero.webp`: Master catalogue portrait view.
  8. Thumbnail derivatives (`*-thumb.webp`) generated via Sharp at 600×800 fit inside.
- Visual consistency rules: Same kurta garment design, identical colorway, same Indian model across views, authentic shadow and studio lighting.

---

## 5. Homepage & Hero Showcase Audit

### 5.1 Existing Implementation (`src/HeroBanner.jsx`)
- Displays an array of 4 slide configurations (`banners`).
- First slide incorporates a background video (`hero.mp4` on CDN) with infinite `loop`.
- Slide transition is triggered manually via previous/next arrows.

### 5.2 Required Upgrades for Dynamic Showcase
- Implement automated playback sequence:
  1. Hero video plays completely from start to finish.
  2. Listen to the native `ended` event on the HTML5 `<video>` element.
  3. Pause on the last frame or poster for exactly 3 seconds.
  4. Transition smoothly to Jewellery Image 1 (display for 3 seconds).
  5. Transition to Jewellery Image 2 (display for 3 seconds).
  6. Transition to Jewellery Image 3 (display for 3 seconds).
  7. Transition to Chicken Curry Kurta Image 1 (display for 3 seconds).
  8. Transition to Chicken Curry Kurta Image 2 (display for 3 seconds).
  9. Transition to Chicken Curry Kurta Image 3 (display for 3 seconds).
  10. Loop back to the Hero Video and repeat indefinitely.
- Technical constraints:
  - GSAP smooth crossfades and subtle scale animations.
  - Image preloading to eliminate blank flashes.
  - Strict cleanup of timers (`setTimeout`) and event listeners.
  - Tab visibility management (`visibilitychange`) to pause timers and video while tab is inactive.
  - Full mobile responsiveness and `prefers-reduced-motion` graceful fallback.

---

## 6. Admin Panel Audit

### 6.1 Existing Admin Capabilities
- Located at `/admin` (route handled by `Admin` component in `src/main.jsx`).
- Tabs: `Dashboard`, `Products`, `Coins`, `Offers`, `Reviews`, `Gold Rates`, `Pricing Rules`, `Imports`, `Orders`, `Customers`, `Catalogue copy`, `AI Chatbot`, `Settings`.
- Product Angle Manager (`ProductAngleManager`): allows uploading slots for `hero`, `front`, `left`, `right`, `model`, `detail`.

### 6.2 Missing Admin Features
1. **Category Management (`Categories` tab):**
   - Ability to view, create, edit, activate/deactivate, and reorder categories.
   - Upload category thumbnail and banner images.
   - Configure SEO title, description, and slug.
2. **Combo Management (`Combos` tab):**
   - Create, edit, and delete combo products.
   - Multi-select component items (e.g. choose a Chicken Curry Kurta and select matching pearl earrings or necklaces).
   - Set combo pricing, automated discount % calculation, and display savings.
   - Manage combo gallery images and stock availability.
3. **Enhanced Product Management:**
   - Support `back` angle slot in `ProductAngleManager`.
   - Support apparel attributes (sizes: XS, S, M, L, XL, XXL; fabric: Cotton, Georgette, Silk; colors: Ivory, Blush Pink, Lavender, Sage Green, Sky Blue, Mustard).

---

## 7. Installed Skills Compliance

1. **`veyora-catalogue-copy`:**
   - All kurta product titles and descriptions must be grounded strictly in stored specifications (fabric, embroidery style, fit, color, wash care).
   - Never introduce unsupported claims. Prices are in INR.
2. **`product-title-optimization`:**
   - Optimized titles: `Brand + Collection/Style + Key Feature + Fabric/Attribute + Gender`
   - Example: *"Veyora Lucknowi Chikankari Cotton Kurta – Handcrafted Floral Embroidery (Ivory White)"*.
3. **`product-description-generator`:**
   - Apply FABE framework (Feature, Advantage, Benefit, Evidence) for all new product copy.
4. **`product-page-seo`:**
   - Rich schema markup: `Product`, `Offer`, `BreadcrumbList`.
   - Clean canonical tags and descriptive, search-optimized meta descriptions.
5. **`pwa-nextjs`:**
   - Maintain PWA manifest, service worker caching, and offline usability.

---

## 8. Test Suite & Quality Assurance Baseline

- `npm test`: 198 tests passing across unit, API, integration, and security suites.
- `npm run assets:check`: 448 assets checked with 0 errors across 106 jewellery products and 6 coins.
- `npm run build`: Vite production build compiles with zero errors in ~3.2 seconds.
- Every new migration, seeder, component, and API endpoint must have corresponding automated regression tests.

---

## 9. Conclusion & Next Steps

The existing system is robust, modular, and well-tested. All required enhancements can be seamlessly integrated into the current architecture without disrupting existing jewellery or bullion workflows. Proceeding directly to `docs/IMPLEMENTATION_PLAN.md` and subsequent implementation phases.
