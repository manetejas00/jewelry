# Comprehensive File-by-File Migration Map

This document establishes the step-by-step mapping of files from their current location to the proposed modular architecture.

---

## 1. Frontend Source Migration Map (`src/`)

| Original File Path | Proposed File Path | Category / Module | Architectural Rationale |
|---|---|---|---|
| `src/Kurtas.jsx` | `src/storefront/modules/kurtas/KurtasPage.jsx` | Kurta Storefront | Isolates Kurta PLP/PDP components into the dedicated Kurta storefront module. |
| `src/admin/KurtasAdmin.jsx` | `src/admin/modules/kurtas/KurtasAdmin.jsx` | Kurta Admin | Groups admin Kurta management, variant forms, and CSV imports. |
| `src/main.jsx` (AdminProductList) | `src/admin/modules/jewelry/JewelryAdmin.jsx` | Jewelry Admin | Extracts the 300+ line jewelry admin panel from `main.jsx` into its own module. |
| `src/main.jsx` (CoinsAdmin) | `src/admin/modules/coins/CoinsAdmin.jsx` | Coins Admin | Extracts the coin bullion admin manager from `main.jsx`. |
| `src/admin/GoldRatesAdmin.jsx` | `src/admin/modules/gold-rates/GoldRatesAdmin.jsx` | Rates Admin | Places rate ingestion and freshness monitor in dedicated rates module. |
| `src/admin/CategoriesAdmin.jsx` | `src/admin/modules/categories/CategoriesAdmin.jsx` | Taxonomy Admin | Isolates category hierarchy management. |
| `src/admin/OffersAdmin.jsx` | `src/admin/modules/offers/OffersAdmin.jsx` | Promotions Admin | Isolates discounts and coupon configuration. |
| `src/ReviewsAdmin.jsx` | `src/admin/modules/reviews/ReviewsAdmin.jsx` | Reviews Admin | Moves admin review moderation out of `src/` root into `admin/modules/reviews/`. |
| `src/CustomersAdmin.jsx` | `src/admin/modules/customers/CustomersAdmin.jsx` | Customers Admin | Moves customer directory management into `admin/modules/customers/`. |
| `src/ChatbotAdmin.jsx` | `src/admin/modules/ai-assistant/ChatbotAdmin.jsx` | AI Tools Admin | Moves chatbot configuration into AI assistant module. |
| `src/AiCopy.jsx` | `src/admin/modules/ai-assistant/AiCopyAdmin.jsx` | AI Tools Admin | Moves catalogue copy generation into AI assistant module. |
| `src/HeroBanner.jsx` | `src/storefront/layouts/HeroBanner.jsx` | Storefront Layout | Moves home hero banner into storefront layouts. |
| `src/Account.jsx` | `src/storefront/pages/AccountPage.jsx` | Storefront Account | Moves customer order history and profile into storefront pages. |
| `src/Reviews.jsx` | `src/storefront/modules/reviews/ReviewsWidget.jsx` | Storefront Reviews | Moves customer review form and ratings widget into storefront reviews. |
| `src/SearchAutocomplete.jsx` | `src/storefront/modules/search/SearchAutocomplete.jsx`| Storefront Search | Moves search overlay and keyboard navigation into search module. |
| `src/ChatWidget.jsx` | `src/storefront/modules/chat/ChatWidget.jsx` | Storefront Chat | Moves customer AI support widget into chat module. |
| `src/components/CommonPLP.jsx` | `src/components/CommonPLP.jsx` | Shared Component | Retains location; reusable across Jewelry, Kurtas, Coins PLPs. |
| `src/components/CommonPDP.jsx` | `src/components/CommonPDP.jsx` | Shared Component | Retains location; reusable across Jewelry, Kurtas, Coins PDPs. |
| `src/components/Modal.jsx` | `src/components/Modal.jsx` | Shared Component | Retains location; accessible modal dialog. |
| `src/BrandedImage.jsx` | `src/components/BrandedImage.jsx` | Shared Component | Moves into `components/`; provides universal image fallbacks. |
| `src/api.js` | `src/services/api.js` | Shared Service | Moves into `services/`; provides deduplicated fetch client. |
| `src/store.jsx` | `src/app/store.jsx` | App Core | Moves into `app/`; route-scoped storefront state provider. |
| `src/ErrorBoundary.jsx` | `src/app/ErrorBoundary.jsx` | App Core | Moves into `app/`; top-level error catcher. |

---

## 2. Backend Server Migration Map (`server/`)

| Original File Path | Proposed File Path | Module | Architectural Rationale |
|---|---|---|---|
| `server/modules/kurta/` | `server/modules/kurta/` | Kurta Backend | Already established; contains Routes, Controllers, Services, Repositories. |
| `server/modules/jewelry/` | `server/modules/jewelry/` | Jewelry Backend | Already established; contains Routes, Controllers, Services, Repositories. |
| `server/modules/coin/` | `server/modules/coin/` | Coins Backend | Already established; contains Routes, Controllers, Services, Repositories. |
| `server/kurtas.js` | `server/modules/kurta/LegacyKurtaAdapter.js` | Kurta Backend | Replaces root script with adapter delegating to `KurtaService`. |
| `server/pricing.js` | `server/modules/pricing/PricingService.js` | Pricing Module | Moves bullion calculation and catalogue pricing into dedicated module. |
| `server/rates.js` | `server/modules/rates/RatesService.js` | Rates Module | Moves daily gold/silver rate ingestion into dedicated module. |
| `server/categories.js` | `server/modules/categories/CategoriesService.js` | Taxonomy Module| Moves category querying into dedicated categories module. |
| `server/navigation.js` | `server/modules/navigation/NavigationService.js` | Taxonomy Module| Moves multi-module navigation generation into navigation module. |
| `server/offers.js` | `server/modules/offers/OffersService.js` | Offers Module | Moves promotional discount calculations into offers module. |
| `server/db.js` | `server/config/db.js` | Server Config | Moves Knex connection configuration into `config/`. |
| `server/runtime.js` | `server/config/runtime.js` | Server Config | Moves environment variable validation into `config/`. |
| `server/auth.js` | `server/middleware/auth.js` | Middleware | Moves staff RBAC and session verification into `middleware/`. |
| `server/errors.js` | `server/middleware/errors.js` | Middleware | Moves sanitized error responses into `middleware/`. |

---

## 3. Database & Tooling Migration Map

| Original File Path | Proposed File Path | Category | Architectural Rationale |
|---|---|---|---|
| `migrations/*.js` | `database/migrations/*.js` | Migrations | Consolidated database schema migrations under `database/`. |
| `seeders/*.js` | `database/seeders/*.js` | Seeders | Consolidated Knex data seeders under `database/`. |
| `scripts/seed.js` | `database/scripts/seed.js` | DB Scripts | Master database provisioning script grouped with database tooling. |
| `scripts/backfill-*.js` | `database/scripts/backfill-*.js` | DB Scripts | Backfill and reconciliation scripts grouped with database tooling. |
| `scripts/hostinger-deploy.sh` | `scripts/deployment/hostinger-deploy.sh` | DevOps | Categorized under deployment scripts. |
| `scripts/verify-deployment.js` | `scripts/deployment/verify-deployment.js` | DevOps | Categorized under deployment verification scripts. |

---

## 4. Backwards-Compatibility Import Shim Strategy

To ensure zero regressions and zero broken imports during progressive refactoring:
1. **Root Re-Exports**: Files moved from root locations leave behind lightweight 1-line re-exports (e.g. `src/Kurtas.jsx` re-exports from `src/storefront/modules/kurtas/KurtasPage.jsx`).
2. **Vite Path Aliases**: Configure `@storefront`, `@admin`, `@components`, and `@services` aliases in `vite.config.js`.
3. **Node Module Aliases**: Express routes continue supporting legacy endpoints via route aliases (`/api/kurtas` aliasing `/api/kurta`, `/api/admin/products` aliasing `/api/admin/jewelry`).
