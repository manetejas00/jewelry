# Admin Panel Architecture & Updates

## 1. 15 Dedicated Sidebar Routes & Dynamic Active States
The Veyora Merchant Studio (`/admin/*`) features dedicated URLs for every management function with automated active state detection:

| Menu Item | URL | Primary Functional Ownership |
|---|---|---|
| **Dashboard** | `/admin/dashboard` | KPI analytics, gross sales, revenue charts, stock alerts |
| **Categories** | `/admin/categories` | Categories, Collections, Materials, Craftsmanship management |
| **Products** | `/admin/products` | Jewellery master catalogue, variants, stock, pricing modes |
| **Chicken Curry Kurtas** | `/admin/chicken-curry-kurtas` | 50 kurta designs, 250 colourways, 1,750 SKUs, multi-angle imagery |
| **Coins** | `/admin/coins` | Bullion mint management, making charges, coin specifications |
| **Offers** | `/admin/offers` | Festive banner offers, discount coupons, percentage/flat deductions |
| **Reviews** | `/admin/reviews` | Verified buyer review moderation, ratings, customer photo approvals |
| **Gold Rates** | `/admin/gold-rates` | Live metal rate imports, daily fixing, 24K/22K/18K/Silver prices |
| **Pricing Rules** | `/admin/pricing-rules` | Bullion markup calculation formulas, wastage, making charge rules |
| **Imports** | `/admin/imports` | Bulk CSV imports for Jewellery, Kurtas, Coins, and Classifications |
| **Orders** | `/admin/orders` | Order fulfilment, shipping tracking numbers, invoice downloads |
| **Customers** | `/admin/customers` | Registered patrons, guest merge verification, lifetime value (LTV) |
| **Catalogue Copy** | `/admin/catalogue-copy` | AI-assisted product descriptions, SEO tags, approval workflows |
| **AI Chatbot** | `/admin/ai-chatbot` | Concierge chat logs, jewellery recommendation monitoring |
| **Settings** | `/admin/settings` | Storefront branding, payment gateways, and AI Recommendation weights |

---

## 2. Dynamic Active State System (`matchAdminRoute`)
- **URL-Driven Highlighting**: Active menu state is computed directly from `window.location.pathname`.
- **Sub-Path Resilience**: When navigating to `/admin/products/new` or `/admin/orders/123`, the parent menu item remains correctly highlighted.
- **Refresh & Back/Forward Support**: Full synchronization with React Router `useLocation()`.

---

## 3. Relational Sub-Tab Navigation in Categories
To prevent cluttering the primary 15-item sidebar while enabling full CRUD over the normalized relational tables, `CategoriesAdmin` provides seamless tabbed navigation:
- **Tab 1: Categories**: Standard product categories (Necklaces, Earrings, Rings, etc.).
- **Tab 2: Curated Collections**: Thematic collections with custom banner uploads, SEO titles, and product association counts (`CollectionsAdmin`).
- **Tab 3: Materials Master**: Master material entries (18K Gold, 925 Silver, Pearls, Diamonds) with product counts and delete protection (`MaterialsAdmin`).
- **Tab 4: Craftsmanship**: Artisanal techniques (Jadau, Kundan, Chikankari, Filigree) with origin regions and technique classifications (`CraftsmanshipAdmin`).

---

## 4. AI Recommendation Tuning in Settings
`RecommendationsAdmin` provides fine-grained controls for store merchants:
- Slider controls for similarity feature weights: Category Match (0–100%), Material Match (0–100%), Craftsmanship Match (0–100%), Price Proximity (0–100%).
- Shelf title customizations for PDP ("Similar Pieces", "You May Also Adore", "Complete the Look").
- Cache TTL management and instant in-memory cache purge button.

---

## 5. Defensive Error Boundaries & Resilience
- **Safe Optional Chaining**: `b.summary?.created ?? 0` prevents null batch parsing exceptions from crashing the view.
- **Isolated Error Boundary**: Catches unforeseen rendering errors inside admin views and provides a one-click "Reload View" button without disturbing customer storefront transactions.
- **Admin SEO Title Isolation**: Fixed `/admin` title to `Merchant Studio | Veyora Jewels` and disabled indexing (`noindex, nofollow`).
