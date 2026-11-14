# End-to-End Implementation Plan: Chicken Curry Kurta Collection, Combos, Image System & Dynamic Hero Showcase

**Project:** Veyora Jewels & Maison Perle E-Commerce Storefront  
**Date:** November 14, 2026  
**Status:** Approved for Execution  

---

## 1. Overview & Strategy

This implementation plan outlines the sequential phases to introduce the **Chicken Curry Kurtas for Women** collection, **Product Combos & Sets**, **Complete Multi-Angle Product Image System**, **Admin Panel Extensions**, and **Dynamic Homepage Hero Showcase**.

All implementations adhere strictly to the existing architecture:
- Database: Knex migrations with idempotent seeders.
- Backend: Express API endpoints with RBAC and validation.
- Frontend: React 19 components with pure CSS and GSAP animations.
- Image System: 1:1 square WebP assets with 600×800 thumbnails, verified via Sharp.
- Coding Guidelines: Strict adherence to all installed development skills (`veyora-catalogue-copy`, `product-description-generator`, `product-page-seo`, `product-title-optimization`, `pwa-nextjs`).

---

## 2. Implementation Phases & Milestones

### Phase 2: Category Architecture & Chicken Curry Kurta Products
1. **Database Migration (`migrations/019_categories_and_combos.js`):**
   - Create `categories` table:
     - `id` (increments)
     - `slug` (unique, indexed)
     - `name` (string, not null)
     - `description` (text)
     - `thumbnail` (text)
     - `banner` (text)
     - `status` (`active`, `inactive`, default `active`, indexed)
     - `sort_order` (integer, default 0)
     - `seo_title` (string)
     - `meta_description` (string)
     - `created_at`, `updated_at` (timestamps)
   - Create `combos` table:
     - `id` (increments)
     - `slug` (unique, indexed)
     - `sku` (unique, indexed)
     - `name` (string, not null)
     - `description` (text)
     - `category` (string, indexed)
     - `image` (text)
     - `status` (`published`, `draft`, default `published`, indexed)
     - `combo_price` (decimal 14,2)
     - `original_price` (decimal 14,2)
     - `discount_percent` (decimal 5,2)
     - `savings` (decimal 14,2)
     - `stock` (integer, default 0)
     - `seo_title` (string)
     - `meta_description` (string)
     - `created_at`, `updated_at` (timestamps)
   - Create `combo_items` table:
     - `id` (increments)
     - `combo_id` (foreign key -> `combos.id` CASCADE)
     - `product_sku` (string, indexed)
     - `quantity` (integer, default 1)
     - `is_primary` (boolean, default false)
2. **Category Seeders (`seeders/CategorySeeder.js`):**
   - Seed primary categories:
     - *Chicken Curry Kurtas for Women* (`chicken-curry-kurtas`)
     - *Chicken Curry Kurta Collection* (`chicken-curry-collection`)
     - *Kurta & Jewellery Combo* (`kurta-jewellery-combos`)
     - *Premium Ethnic Wear* (`premium-ethnic-wear`)
     - *Festive Kurta Collection* (`festive-kurtas`)
     - *Everyday Women's Ethnic Wear* (`everyday-ethnic-wear`)
     - *Kurta Gift Sets* (`kurta-gift-sets`)
     - *Premium Jewellery & Kurta Sets* (`premium-jewellery-kurta-sets`)
     - In addition to existing jewellery categories (`Rings`, `Earrings`, `Necklaces`, `Bracelets`, `Coins`).
3. **Kurta Product Seeding (`seeders/KurtaSeeder.js`):**
   - Populate realistic Chicken Curry Kurtas (Lucknowi Chikankari) with varied colors, fabrics (Pure Mulmul Cotton, Handloom Chanderi, Viscose Georgette), sizes (XS, S, M, L, XL, XXL), SKUs, fixed pricing, and inventory.
   - Grounded descriptions following `veyora-catalogue-copy` and `product-description-generator`.

---

### Phase 3: Product Photography & Image System Generation
1. **Asset Architecture:**
   - Establish directory: `public/assets/products/<product_code>/`
   - Generate full 1:1 image collection for each kurta style:
     - `hero.webp`: Master catalog portrait view.
     - `front.webp`: Direct front angle displaying full neckline, bodice, and hem embroidery.
     - `right.webp`: Right-side profile highlighting silhouette, fitting, and side slits.
     - `left.webp`: Left-side profile maintaining exact symmetry and fabric texture.
     - `back.webp`: Full back view showcasing the back motif and finish.
     - `model.webp`: Full-length lifestyle shot with authentic Indian model wearing the piece.
     - `modal.webp` (`detail` role): High-resolution macro zoom of delicate hand embroidery, threadwork, and fabric texture.
   - Generate corresponding `-thumb.webp` derivatives (600×800 inside fit, quality 82) for every role.
2. **Asset Validation Script Update:**
   - Enhance `scripts/check-product-assets.js` to support and verify the new `back` role and apparel categories without regression on jewellery.
   - Run `assets:recreate` and `assets:check` to confirm zero hash collisions and 100% integrity.

---

### Phase 4: Product Combos & Bundles System
1. **Combo Business Logic (`server/combos.js`):**
   - Pairing logic: Chicken Curry Kurtas paired with complementary Veyora Pearl & Gold Jewellery (e.g. *Ivory Chikankari Kurta + Lune Pearl Drops*, *Blush Pink Kurta + Atelier Pearl Collar*, *Sage Green Kurta + Nocturne Pearl Cuff*).
   - Automated pricing:
     - `original_price` = Sum of component product prices.
     - `combo_price` = Bundled promotional price with bundle discount (e.g., 15%–25% savings).
     - `savings` = `original_price - combo_price`.
   - Inventory calculation: Combo available stock dynamically reflects minimum stock across its component items or dedicated combo stock.
2. **Cart & Checkout Integration:**
   - Enhance `server/pricing.js` (`quote()` and `catalogue()`) to recognize combo items in the shopping bag.
   - Enable single-click "Add Combo to Bag" with bundle breakdown lines and pricing guarantees.

---

### Phase 5: Brand, Promotional & Category Assets
1. **Category Assets:**
   - Create category thumbnails (600×600 WebP) and high-definition banners (1600×600 WebP) for all 8 ethnic and combo categories.
2. **Combo Product Photography:**
   - Generate dedicated styled combo imagery showcasing the styled kurta alongside the paired jewellery in flat-lay and lifestyle editorial views.
3. **Hero Showcase Kurta Images:**
   - Generate 3 high-resolution editorial Chicken Curry Kurta hero images:
     - `hero-kurta-1.webp`: Royal Ivory Chikankari with pearl accents.
     - `hero-kurta-2.webp`: Rose Blush festive Chikankari ensemble.
     - `hero-kurta-3.webp`: Mint Sage modern ethnic drape.

---

### Phase 6: Admin Panel Management Extensions
1. **Admin Categories Management (`src/admin/CategoriesAdmin.jsx`):**
   - New tab in Merchant Studio: `Categories`.
   - Category listing with active status toggles, sort ordering, thumbnail previews.
   - Create and Edit modals with slug auto-generation, banner upload, description, and SEO metadata fields.
2. **Admin Combo Management (`src/admin/CombosAdmin.jsx`):**
   - New tab in Merchant Studio: `Combos`.
   - Create/edit combos with interactive product picker (kurtas + jewellery items).
   - Real-time price and discount calculator.
   - Combo image manager and inventory synchronization.
3. **Enhanced Product Angle Photography Manager (`ProductAngleManager`):**
   - Add support for the `back` view slot with preview, upload, and deletion controls.
   - Support apparel attributes (sizes, colors, fabric) in product creation and editing.

---

### Phase 7: Dynamic Homepage Hero Showcase
1. **Component Enhancement (`src/HeroBanner.jsx`):**
   - Implement the exact 10-step sequence:
     1. Existing hero video plays completely from start to finish (`ended` event listener).
     2. Wait exactly 3 seconds after video finishes.
     3. Slide to Jewellery Image 1 (3 seconds).
     4. Slide to Jewellery Image 2 (3 seconds).
     5. Slide to Jewellery Image 3 (3 seconds).
     6. Slide to Kurta Image 1 (3 seconds).
     7. Slide to Kurta Image 2 (3 seconds).
     8. Slide to Kurta Image 3 (3 seconds).
     9. Seamlessly transition back to the Hero Video and loop forever.
2. **Technical Excellence:**
   - GSAP timeline / context for subtle zoom and fade transitions.
   - Smart image preloading via `new Image().src` to prevent flash of unstyled content.
   - Single timer reference with cleanup on unmount.
   - Page Visibility API (`document.addEventListener('visibilitychange')`) to pause execution when the browser tab is hidden.
   - Reduced-motion support (`prefers-reduced-motion`) displaying a clean static poster with manual navigation.

---

### Phase 8: Storefront Integration
1. **Navigation & Header:**
   - Update navigation menus and category drawer to feature Chicken Curry Kurtas and Combos.
2. **Collection Pages (`/collections/:category`):**
   - Dynamic rendering of categories from database.
   - Filter by size (XS, S, M, L, XL, XXL), color, price bracket, and availability.
3. **Product Detail Page (PDP):**
   - Full multi-angle selector: Front, Right, Left, Back, Model, Detail.
   - Size picker with sizing guide modal.
   - "Curated Complements": Show matching jewellery on kurta PDPs, and matching kurtas on jewellery PDPs.
   - "Complete the Look" combo bundle card with 1-click Add to Bag.
4. **Combos Storefront Experience:**
   - Dedicated combo listing and detail views showcasing bundle savings, included items, and total discount.
5. **Search & Autocomplete:**
   - Update `server/search.js` token maps and vocabulary with kurta, chikankari, and combo keywords.

---

### Phase 9: SEO, Performance & Security
1. **SEO:**
   - Update `server/seo.js` with category labels, canonicals, OpenGraph tags, and sitemap generation for new categories, products, and combos.
   - Inject rich Schema.org `Product` and `BreadcrumbList` structured data.
2. **Performance:**
   - WebP format throughout with Sharp compression.
   - Lazy loading for below-the-fold assets, high-priority preloading for hero slides.
3. **Security:**
   - Input validation on combo and category CRUD.
   - Transactional checkout ensuring combo component inventory consistency.

---

### Phase 10: Complete Testing & Re-Audit
1. **Automated Test Suite:**
   - New test files:
     - `tests/categories.test.js`: Category CRUD, active filters, SEO routes.
     - `tests/combos.test.js`: Combo calculation, savings, inventory, bag quote, checkout.
     - `tests/hero-banner.test.js`: Video ended event detection, 3s interval timing, slide sequence.
     - `tests/kurta-assets.test.js`: Multi-angle presence, WebP validity, thumbnail consistency.
2. **Verification Suite Execution:**
   - `npm test` -> 100% passing tests.
   - `npm run assets:check` -> All products & coins verified.
   - `npm run build` -> Clean production build.

---

### Phase 11: Comprehensive Documentation & Git Commit
1. Author all 10 mandatory markdown documentation files in `docs/`.
2. Git status review, clean up temporary scratch files, and commit with descriptive git message.
