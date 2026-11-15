# Current Codebase Folder Structure & Architectural Analysis

**Audit Date**: November 2026  
**Repository**: `ecom` (Veyora Jewels E-Commerce Platform)  
**Deployment Target**: Hostinger Cloud / Passenger Node.js (`test3.avinyacarefoundation.org`)  

---

## 1. High-Level Architecture Overview

The application currently operates as a unified full-stack monorepo:
- **Frontend**: Single-Page Application (SPA) built with React 18, React Router v6, and Vite v6. Includes both the public luxury storefront and the Merchant Studio admin panel.
- **Backend**: Express.js REST API application serving both public storefront routes and authenticated staff admin endpoints.
- **Database Layer**: Knex.js query builder supporting MySQL 8 (production) and SQLite3 (local development and automated testing).
- **Static Assets & Public Distribution**: Client assets bundled by Vite into `dist/` and published to `public_html/`.

---

## 2. Directory Tree Inventory

```text
/Users/tejasmane/Documents/ChatGPT/ecom/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Continuous integration test runner
│       └── deploy.yml                 # Automated deployment over SSH to Hostinger
├── artifacts/                         # Historic test evidence and audit snapshots
├── catalogue/                         # Product data exports and reference files
├── dist/                              # Vite production build artifacts
│   ├── assets/                        # Minified JS, CSS, and split chunks
│   └── index.html                     # Production entrypoint HTML
├── docker/                            # Containerization configs
├── docs/                              # Architecture notes, SEO, and historical audits
├── migrations/                        # 32 Knex schema migration files
│   ├── 001_commerce.js                # Core tables (products, orders, rates)
│   ├── ...
│   ├── 025_independent_modules_jewelry_coin_kurta.js # Module separation schemas
│   ├── 031_remove_supplier_module.js  # Drop supplier_skus and supplier columns
│   └── 032_separate_kurta_jewelry_coin_tables.js     # Kurta/Jewelry/Coins isolation
├── node_modules/                      # Installed npm dependencies
├── public/                            # Static public web assets
│   ├── assets/                        # Brand logos, icons, SVGs
│   └── manifest.webmanifest           # PWA manifest
├── samples/                           # CSV and Excel templates & examples for imports
│   ├── coins-example.csv
│   ├── gold-rates-example.csv
│   ├── jewelry-example.csv
│   └── kurtas-example.csv
├── scripts/                           # Maintenance, seeding, and migration scripts
│   ├── hostinger-deploy.sh            # Production deployment bash script
│   ├── backfill-legacy-products-to-independent-tables.js
│   ├── seed.js                        # Master database seeder
│   └── verify-deployment.js           # Post-release availability verifier
├── seeders/                           # Modular Knex data seeders
│   ├── CategorySeeder.js
│   ├── CoinSeeder.js
│   ├── JewelrySeeder.js
│   ├── KurtaCategorySeeder.js
│   └── KurtaSeeder.js
├── server/                            # Backend Express API and business logic
│   ├── chat/                          # AI customer chatbot logic
│   ├── modules/                       # Domain modules
│   │   ├── coin/                      # Controller, Service, Repo, Resources for Coins
│   │   ├── customers/                 # Customer account and profile management
│   │   ├── imports/                   # CSV/Excel bulk ingestion engine
│   │   ├── jewelry/                   # Controller, Service, Repo, Resources for Jewelry
│   │   ├── kurta/                     # Controller, Service, Repo, Resources for Kurta
│   │   ├── orders/                    # Order processing, checkout, OTP verification
│   │   └── reviews/                   # Customer ratings and review moderation
│   ├── ai-copy.js                     # AI catalogue copy generation
│   ├── auth.js                        # Staff authentication and RBAC middleware
│   ├── brand-images.js                # Dynamic brand image generation
│   ├── categories.js                  # Category taxonomy logic
│   ├── db.js                          # Knex database connection and pooling
│   ├── errors.js                      # Centralized error handler and validation errors
│   ├── importer.js                    # Ingestion parser and diff engine
│   ├── index.js                       # Express application server and route registration
│   ├── kurtas.js                      # Kurta service and admin listing logic
│   ├── navigation.js                  # Storefront multi-module navigation taxonomy
│   ├── offers.js                      # Promotional discounts and coupon engine
│   ├── pricing.js                     # Bullion pricing calculations and catalogue logic
│   ├── rates.js                       # Daily gold and silver rate ingestion
│   ├── runtime.js                     # Environment variable validation
│   └── seo.js                         # Dynamic OpenGraph, JSON-LD, and meta tags
├── shared/                            # Reusable cross-boundary helper utilities
├── src/                               # Frontend React source code
│   ├── admin/                         # Admin panel tab components
│   │   ├── CategoriesAdmin.jsx
│   │   ├── CollectionsAdmin.jsx
│   │   ├── CraftsmanshipAdmin.jsx
│   │   ├── GoldRatesAdmin.jsx
│   │   ├── KurtasAdmin.jsx
│   │   ├── MaterialsAdmin.jsx
│   │   ├── OffersAdmin.jsx
│   │   └── RecommendationsAdmin.jsx
│   ├── components/                    # Reusable UI components
│   │   ├── CommonPDP.jsx              # Reusable Product Detail Page component
│   │   ├── CommonPLP.jsx              # Reusable Product Listing Page component
│   │   └── Modal.jsx                  # Standard dialog wrapper
│   ├── Account.jsx                    # Customer account page
│   ├── AiCopy.jsx                     # Admin catalogue copy tool
│   ├── api.js                         # Centralized fetch client with request deduplication
│   ├── BrandedImage.jsx               # Adaptive image component with error fallbacks
│   ├── ChatWidget.jsx                 # Storefront AI chat assistant
│   ├── ChatbotAdmin.jsx               # Chatbot configuration panel
│   ├── CustomersAdmin.jsx             # Admin customer management
│   ├── ErrorBoundary.jsx              # Top-level React error boundary
│   ├── HeroBanner.jsx                 # Storefront hero carousel
│   ├── Kurtas.jsx                     # Kurta storefront PLP & PDP
│   ├── main.jsx                       # Monolithic app entrypoint & admin/storefront routing
│   ├── Reviews.jsx                    # Customer review UI
│   ├── ReviewsAdmin.jsx               # Review moderation panel
│   ├── SearchAutocomplete.jsx         # Live search bar with keyboard navigation
│   ├── store.jsx                      # Storefront React Context & state management
│   └── style.css                      # Global design system stylesheet
├── tests/                             # Node test runner suite (242 tests)
├── index.html                         # Vite root HTML template
├── package.json                       # Dependencies and script definitions
├── server.js                          # Root server entrypoint
└── vite.config.js                     # Vite build configuration
```

---

## 3. Structural Deficiencies & Pain Points

1. **Monolithic `src/main.jsx` (165 KB)**:
   - Houses storefront routing, admin routing, `AdminProductList`, `JewelryAdmin`, `CoinsAdmin`, checkout dialogs, order confirmation views, and editorial components in a single 2,587-line file.
   - High cognitive overhead and high risk of accidental regressions when modifying individual features.

2. **Scattered Admin Components**:
   - Some admin panels live in `src/admin/` (`KurtasAdmin`, `GoldRatesAdmin`, `OffersAdmin`), while others live in `src/` root (`ReviewsAdmin.jsx`, `CustomersAdmin.jsx`, `ChatbotAdmin.jsx`, `AiCopy.jsx`), and some are embedded directly inside `src/main.jsx` (`AdminProductList`, `CoinsAdmin`, `SettingsAdmin`).

3. **Backend Root File Clutter**:
   - `server/` root contains 27 individual JavaScript files alongside `server/modules/`.
   - Domain logic for `pricing.js`, `kurtas.js`, `rates.js`, `categories.js`, `orders.js`, and `reviews.js` exists concurrently with `server/modules/kurta/`, `server/modules/jewelry/`, etc.

4. **Split Seeders & Scripts**:
   - Database seeders reside in `seeders/`, while master orchestration scripts reside in `scripts/`, and sample CSV generators live in `scripts/samples.js`.
