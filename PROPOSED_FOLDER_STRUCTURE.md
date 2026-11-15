# Proposed Codebase Architecture & Folder Structure

**Design Goal**: Clean, modular, domain-driven architecture providing strict separation between Kurta, Jewelry, and Coins, while preserving zero-breakage compatibility with Vite, Express, and Hostinger Passenger deployments.

---

## 1. Architectural Philosophy

1. **Domain-Driven Modularization**:
   - Kurta, Jewelry, and Coins are treated as first-class, independent vertical slices across frontend and backend.
   - Each module encapsulates its own routes, components, controllers, services, repositories, and validation.
2. **Clean Boundary Separation**:
   - Storefront features and Admin Studio views are logically separated into their respective subtrees.
   - Core reusable UI widgets (buttons, modals, tables, badges, pagination) reside in shared component directories.
3. **Preserved Single-App Deployment**:
   - Avoids overengineering a multi-repo or complex Yarn/npm monorepo that would complicate Hostinger’s Phusion Passenger deployment.
   - Retains a unified `package.json` and single-process Express server hosting both API endpoints and bundled client assets.

---

## 2. Proposed Directory Tree

```text
ecommerce-project/
│
├── src/                               # Frontend React Application
│   ├── app/                           # App initialization & core routing
│   │   ├── App.jsx                    # Root router & route declarations
│   │   ├── ErrorBoundary.jsx          # Global React crash boundary
│   │   └── store.jsx                  # Storefront global context & cart state
│   │
│   ├── storefront/                    # Customer-facing shopping experience
│   │   ├── layouts/                   # Header, Footer, HeroBanner, Layout wrappers
│   │   ├── pages/                     # Home, Account, Bag, Checkout, OrderStatus
│   │   └── modules/                   # Independent Storefront Domain Features
│   │       ├── jewelry/               # Jewelry PLP, PDP, filtering, carat selectors
│   │       ├── kurtas/                # Kurta PLP, PDP, size matrix, fabric facets
│   │       ├── coins/                 # Bullion coin PLP, PDP, live rate displays
│   │       ├── categories/            # Category browse pages
│   │       └── search/                # Live autocomplete and search modal
│   │
│   ├── admin/                         # Merchant Studio Admin Panel
│   │   ├── layouts/                   # AdminLayout, Sidebar, AdminHeader, Navigation
│   │   ├── pages/                     # AdminDashboard, AdminSettings
│   │   └── modules/                   # Dedicated Admin Business Modules
│   │       ├── jewelry/               # Jewelry inventory, multi-angle photos, weights
│   │       ├── kurtas/                # Kurta styles, size inventory (XS-XXXL)
│   │       ├── coins/                 # Bullion management, premium markups
│   │       ├── categories/            # Category taxonomy manager
│   │       ├── orders/                # Order status management, tracking
│   │       ├── customers/             # Customer directory and verification
│   │       ├── gold-rates/            # Daily gold/silver rate imports
│   │       ├── pricing-rules/         # Storewide pricing margin rules
│   │       ├── offers/                # Discount coupons and banner deals
│   │       ├── reviews/               # Customer review moderation
│   │       ├── imports/               # CSV/XLS upload pipelines
│   │       └── ai-assistant/          # AI chatbot & catalogue copy tools
│   │
│   ├── components/                    # Reusable Cross-Cutting UI Components
│   │   ├── CommonPLP.jsx              # Universal Product Listing Page grid
│   │   ├── CommonPDP.jsx              # Universal Product Detail Page template
│   │   ├── Modal.jsx                  # Accessible dialog modal
│   │   ├── Pagination.jsx             # Clamped pagination controls
│   │   ├── CommonFilterBar.jsx        # Standard search, filter, and reset bar
│   │   └── BrandedImage.jsx           # Adaptive image with missing-asset fallback
│   │
│   ├── services/                      # API clients and HTTP transports
│   │   └── api.js                     # Request deduplicator & session interceptor
│   │
│   └── styles/                        # Design System Stylesheets
│       └── style.css                  # Global luxury theme, variables, utilities
│
├── server/                            # Backend Node.js / Express Application
│   ├── config/                        # Server runtime configuration & environment gates
│   │   ├── runtime.js                 # Environment validator
│   │   └── db.js                      # Knex client & connection pool
│   │
│   ├── middleware/                    # HTTP Interceptors
│   │   ├── auth.js                    # Staff authentication & RBAC
│   │   └── errors.js                  # Centralized error formatting & sanitization
│   │
│   ├── modules/                       # Independent Backend Domain Modules
│   │   ├── jewelry/                   # Routes, Controllers, Services, Repositories
│   │   ├── kurta/                     # Routes, Controllers, Services, Repositories
│   │   ├── coin/                      # Routes, Controllers, Services, Repositories
│   │   ├── categories/                # Category taxonomy & module routing
│   │   ├── pricing/                   # Bullion live pricing calculation engine
│   │   ├── rates/                     # Gold & silver daily rate ingestion
│   │   ├── orders/                    # Checkout, quotation, and payment events
│   │   ├── customers/                 # Customer profiles, OTP verification, sessions
│   │   ├── offers/                    # Promotional discounts and coupon validation
│   │   ├── reviews/                   # Customer ratings and review moderation
│   │   ├── imports/                   # Batch CSV/XLS ingestion and diff engine
│   │   └── chat/                      # Customer AI assistant & copy generation
│   │
│   └── index.js                       # Express app bootstrap & route registration
│
├── database/                          # Persistence & Database Tooling
│   ├── migrations/                    # Versioned Knex schema migrations (001-032)
│   ├── seeders/                       # Idempotent database seeders
│   └── scripts/                       # Migration verification & backfill utilities
│
├── public/                            # Static Web Assets (Favicons, PWA, Icons)
├── samples/                           # Public CSV/Excel upload templates
├── tests/                             # Automated Test Runner Suite
├── docs/                              # Technical Documentation & Audit Reports
├── .github/workflows/                 # CI/CD and deployment pipelines
├── package.json                       # Project manifests & dependencies
└── vite.config.js                     # Build bundler configuration
```

---

## 3. Benefits of the Proposed Structure

1. **Clear Module Ownership**:
   - Any Kurta enhancement touches only `src/storefront/modules/kurtas/`, `src/admin/modules/kurtas/`, and `server/modules/kurta/`.
   - Jewelry and Coins cannot accidentally introduce bugs or regressions into Kurta workflows.
2. **Simplified Onboarding & Code Navigation**:
   - Instead of navigating a 2,500-line `main.jsx`, developers locate specific screens within intuitive subdirectories.
3. **Optimized Build & Bundle Splitting**:
   - Vite automatically chunks modular routes, reducing the initial storefront bundle size and speeding up Largest Contentful Paint (LCP).
4. **Zero Deployment Friction**:
   - Preserves the existing `node server.js` entrypoint and `dist/` directory layout required by Hostinger’s Phusion Passenger setup.
