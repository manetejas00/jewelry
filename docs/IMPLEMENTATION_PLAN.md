# Implementation Plan: Independent Chicken Curry Kurtas Module
## Comprehensive End-to-End Implementation Blueprint

**Project:** Veyora Jewels & Luxury Ethnic Wear Platform  
**Target:** Dedicated Chicken Curry Kurtas Section (Same UI/UX, Logic, Images, Admin Panel, XS–XXXL Sizing, Removal of Combos)  
**Date:** November 14, 2026  

---

## 1. Stage Breakdown & Execution Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│  Stage 1: Complete Removal of Combo Functionality (Phase 10)          │
│  - Drop combos & combo_items tables in migration 020                   │
│  - Purge combo references from server (pricing, orders, search, seo)   │
│  - Delete Combos.jsx, CombosAdmin.jsx, ComboSeeder.js, combos.test.js  │
│  - Clean frontend routes, navigation, and PDP recommendations          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Stage 2: Database Migration & Schema Expansion                        │
│  - Migration 020: add is_kurta flag, indexes, clean legacy tables      │
│  - Expand KurtaSeeder to support all 7 sizes (XS, S, M, L, XL, XXL,    │
│    XXXL) across 6 diverse Chikankari styles with real stock            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Stage 3: AI Product Photography & Multi-Angle Asset Pipeline          │
│  - Generate photorealistic Indian female models for new styles         │
│  - Process 1024x1024 square WebP + 600x800 card thumbnails             │
│  - Required views: hero, front, right, left, back, model, modal        │
│  - Verify Git tracking & un-ignore rules in .gitignore                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Stage 4: Backend Kurta Services & API Endpoints                       │
│  - server/kurtas.js: listKurtas, kurtaBySlug, adminKurtas, createKurta, │
│    updateKurta, deleteKurta                                            │
│  - Wire /api/kurtas and /api/admin/kurtas in server/index.js           │
│  - Update server/search.js with Chikankari vocabulary & filters        │
│  - Update server/seo.js for /kurtas and /kurtas/:slug                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Stage 5: Admin Panel – Dedicated Chicken Curry Kurtas Section         │
│  - Add ['Chicken Curry Kurtas', Sparkles] to adminTabs                 │
│  - Build src/admin/KurtasAdmin.jsx with full CRUD & inventory matrix   │
│  - Size management for XS through XXXL with per-size stock             │
│  - Reuse ProductAngleManager for multi-angle photography               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Stage 6: Storefront Pages & Shopping Integration                      │
│  - Dedicated listing page: /kurtas (filters, search, sorting, cards)   │
│  - Dedicated PDP: /kurtas/:slug (MagicZoom, 7-size selector, chart)    │
│  - Add "Chicken Curry Kurtas" to Navbar (desktop & mobile)             │
│  - Add featured Kurta section to Homepage                              │
│  - Integrated bag, quote, checkout, and inventory decrement            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Stage 7: Dynamic Homepage Hero Showcase                               │
│  - 8-stage sequence: Video -> 3s -> 3 Jewellery -> 3 Kurtas -> Repeat  │
│  - GSAP crossfades, video ended event listener, visibility pause       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Stage 8: Full Verification, Documentation & Production Push           │
│  - Unit & integration tests in tests/kurtas.test.js & hero.test.js     │
│  - Full suite check: npm run check (tests + build + assets)            │
│  - 10 complete docs in docs/                                           │
│  - Git commit, push, and automated deployment verification             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. File & Component Change Matrix

| Area | File Path | Action | Description |
| :--- | :--- | :--- | :--- |
| **Migrations** | `migrations/020_kurta_module_and_remove_combos.js` | Create | Adds `is_kurta` flag to `products`, drops `combos` & `combo_items`. |
| **Seeders** | `seeders/KurtaSeeder.js` | Update | Seeds 6 distinct kurta styles $\times$ 7 sizes (XS–XXXL) = 42 variants. |
| **Seeders** | `seeders/ComboSeeder.js` | Delete | Purged per Phase 10. |
| **Seeders** | `seeders/DatabaseSeeder.js` | Update | Runs clean migrations and KurtaSeeder. |
| **Backend** | `server/kurtas.js` | Create | Dedicated service for public & admin kurta operations. |
| **Backend** | `server/combos.js` | Delete | Purged per Phase 10. |
| **Backend** | `server/index.js` | Update | Mounts `/api/kurtas`, removes `/api/combos`. |
| **Backend** | `server/pricing.js` | Update | Purges combo logic from `quote()`. |
| **Backend** | `server/orders.js` | Update | Purges combo component deduction logic. |
| **Backend** | `server/search.js` | Update | Indexes kurtas, removes combo suggestions. |
| **Backend** | `server/seo.js` | Update | Adds `/kurtas`, `/kurtas/:slug`, removes `/combos`. |
| **Frontend** | `src/Kurtas.jsx` | Create | Dedicated `KurtasPage` listing and `KurtaDetailPage` PDP. |
| **Frontend** | `src/Combos.jsx` | Delete | Purged per Phase 10. |
| **Frontend** | `src/admin/KurtasAdmin.jsx` | Create | Dedicated admin management view for Chicken Curry Kurtas. |
| **Frontend** | `src/admin/CombosAdmin.jsx` | Delete | Purged per Phase 10. |
| **Frontend** | `src/HeroBanner.jsx` | Update | Exact 8-stage sequence: video -> 3s -> 3 jewels -> 3 kurtas. |
| **Frontend** | `src/main.jsx` | Update | Routes `/kurtas`, `/kurtas/:slug`, navbar link, home section. |
| **Assets** | `public/assets/products/*kurta*/` | Verify | 6 kurta styles with all required views + thumbnails. |
| **Tests** | `tests/kurtas.test.js` | Create | Comprehensive tests for kurta APIs, 7 sizes, and admin CRUD. |
| **Tests** | `tests/combos.test.js` | Delete | Purged per Phase 10. |
| **Verification** | `scripts/verify-deployment.js` | Update | Verifies `/api/kurtas` and `/kurtas`, removes `/api/combos`. |

---

## 3. Testing & Validation Strategy

1. **Size Tests (XS to XXXL):**
   - Ensure all 7 size variants exist for every style.
   - Test stock decrement for size variant on order placement.
   - Test out-of-stock disabling in size selector.
   - Test size persistence in bag and orders.
2. **Multi-Angle Image Tests:**
   - Verify all 7 roles exist for each style (`hero`, `front`, `right`, `left`, `back`, `model`, `modal`).
   - Verify `npm run assets:check` passes with zero missing files or duplicate hashes.
3. **Admin Tests:**
   - Create kurta with XS–XXXL size matrix.
   - Edit kurta price, stock, and status.
   - Upload and assign multi-angle images.
   - Delete kurta and ensure cascading image cleanup.
4. **Hero Carousel Tests:**
   - Verify video play $\rightarrow$ 3s wait $\rightarrow$ 3 jewellery images $\rightarrow$ 3 kurta images $\rightarrow$ repeat.
   - Verify GSAP transitions and reduced-motion compliance.
5. **Full Suite Execution:**
   - `npm test` $\rightarrow$ 100% passing tests.
   - `npm run build` $\rightarrow$ Zero bundle errors.
   - `node scripts/verify-deployment.js` $\rightarrow$ Acceptance checks pass.
