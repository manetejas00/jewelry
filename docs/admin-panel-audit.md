# Veyora Jewels – Admin Panel Deep Audit & Upgrade Plan

**Date:** November 14, 2026  
**Document:** `docs/admin-panel-audit.md`  

---

## 1. Existing Admin Panel Review

The Veyora Jewels admin panel is accessible at `/admin/*` and provides role-based access control (`owner`, `manager`, `viewer`) with dedicated routes and active sidebar highlighting.

### Module-by-Module Audit

| Menu Route | Current Status | Current Capabilities | Gaps & Required Upgrades |
|---|---|---|---|
| `/admin/dashboard` | Functional | Stats on gold rates, orders, imports, supplier freshness. | Needs accurate breakdown of: Total Products, Jewellery Count (100), Kurta Designs (50), Kurta Variants (250), Coins (20), Gold/Silver splits, and missing asset alerts. |
| `/admin/categories` | Functional | Category listing, CRUD, banner/thumbnail uploads, product counts. | Ready. Needs new Indian jewellery categories populated. |
| `/admin/products` | Functional | Product list, edit modal, delete, multi-photo picker, search/filter. | Product modal only accepts a single `metal` string and single `purity` string. Needs multi-material selector, craftsmanship tagging, finish selection, and collection associations. |
| `/admin/chicken-curry-kurtas` | Functional | Kurta style list, size inventory, multi-angle role image manager, CSV import toggle. | Form is tailored to 20 styles and 3 colors. Needs scaling to manage 50 unique designs with 5 distinct color variants each (250 variants). |
| `/admin/coins` | Functional | Coins listing, metal rate linkage, dimension/weight fields, CSV import. | Contains 6 coins. Needs expansion to manage 20 coins with dedicated gold and silver tagging. |
| `/admin/offers` | Functional | Coupon codes, percentage/flat discounts, product code / SKU matching. | Functional. |
| `/admin/reviews` | Functional | Customer review moderation, star ratings, verified purchase badge, bulk approval/rejection. | Functional. |
| `/admin/gold-rates` | Functional | Real-time 24K, 22K, 18K, 14K rates, source freshness, audit history. | Functional. |
| `/admin/pricing-rules` | Functional | Tax treatment, margin type (percent/flat), rounding rules. | Functional. |
| `/admin/imports` | Functional | Batch preview, diff view, error reporting, locks, export links for Gold, Products, Coins, Kurtas. | Needs downloadable sample templates for Materials, Craftsmanship, Finishes, Collections, and upgraded multi-attribute Jewellery. |
| `/admin/orders` | Functional | Order listing, status transitions (confirmed -> packed -> shipped -> delivered), customer info, CSV export. | Functional. |
| `/admin/customers` | Functional | Customer profiles, phone OTP status, address books, soft deletion. | Functional. |
| `/admin/catalogue-copy` | Functional | AI draft generation for descriptions and SEO metadata with human-in-the-loop review. | Functional. |
| `/admin/ai-chatbot` | Functional | System prompt configuration, model parameters, knowledge base indexing, usage telemetry. | Functional. |
| `/admin/settings` | Functional | Feed automation toggles, inventory mode (delta/full), staff access management. | Functional. |

---

## 2. New Admin Capabilities Required

### 2.1 Material Management
A dedicated management interface for master materials:
- **Attributes:** Name, Slug, Description, Thumbnail, Status (`active`/`inactive`), Sort Order, SEO Title, Meta Description.
- **Actions:** Create, Edit, Toggle Status, Delete (safely blocked if products are assigned), Reorder.
- **Master Records:** Gold, Silver, Oxidised Silver, Pearl, Gemstones, Diamond, Brass, Alloy, Black Beads, Mixed Materials.

### 2.2 Craftsmanship & Technique Management
- **Attributes:** Name, Slug, Description, Thumbnail, Status, Sort Order.
- **Master Records:** Kundan, Polki, Meenakari, Temple Craft, Filigree, Jadau, Nakshi, Handcrafted, Stone Setting, Traditional Engraving, Antique Craft.

### 2.3 Finish Management
- **Attributes:** Name, Slug, Description, Status, Sort Order.
- **Master Records:** Polished Gold, Antique Gold Finish, Rose Gold Finish, Rhodium Finish, Oxidised Finish, Matte Finish, High Polish, Silver Finish, Gold Plated.

### 2.4 Collection Management
- **Attributes:** Name, Slug, Description, Banner Image, Status, Sort Order, SEO Metadata.
- **Master Records:** Gold Collection, Silver Collection, Bridal Collection, Festive Edit, Everyday Elegance, Traditional Heritage.

### 2.5 AI Recommendation Management (PDP Integration)
Under Settings or a dedicated Recommendation sub-panel:
- **Toggles:** Enable / Disable AI Recommendations.
- **Sections:** Configure visibility and maximum item count for:
  - Similar Products (Default: 4–8)
  - You May Also Like (Default: 4–8)
  - Complete the Look (Default: 4–8)
- **Manual Curation:** Ability to pin specific recommended products or exclude specific products from appearing.
- **Cache Control:** "Clear Recommendation Cache" button.
- **Diagnostics:** View recent recommendation response times and algorithm sources (AI vs. Rule-based database fallback).

---

## 3. UI/UX Consistency Standards
All new admin forms and tables will reuse:
- Standard Veyora admin styling (`.admin-panel`, `.admin-content`, `.table-wrap`, `.section-heading`).
- Common components (`CommonStatusBadge`, `CommonFilterBar`, `CommonEmptyState`, `CommonModal`).
- Role-based disabling (`readonly={staff.role === 'viewer'}`).
- Mobile-responsive sliding drawer behavior.
