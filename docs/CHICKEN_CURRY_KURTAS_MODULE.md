# Chicken Curry Kurtas Module — Architecture & Implementation

## 1. Executive Summary & Core Objective

The **Chicken Curry Kurtas** module provides a dedicated, premium storefront and administrative experience for authentic Lucknowi Chikankari ethnic wear. In accordance with architectural mandates, Chicken Curry Kurtas is **not a generic product category** within the standard category hierarchy. Instead, it is an independent, first-class merchandising section operating on the shared, high-performance commerce and pricing engine of the Maison Veyora platform.

```
 Storefront Routes                 Shared Backend Engine                     Admin Studio
─────────────────────            ─────────────────────────                ──────────────────
/kurtas                          GET  /api/kurtas                         /admin?tab=Chicken+Curry+Kurtas
 (Storefront Listing)             -> Style Families (XS-XXXL)              (Size-wise Stock Matrix)
/kurtas/:slug                    GET  /api/kurtas/:slug                   POST /api/admin/kurtas
 (Product Detail PDP)             -> 7 Variants & Multi-Angle              PUT  /api/admin/kurtas/:code
                                                                          DELETE /api/admin/kurtas/:code
```

---

## 2. Distinction from Generic Categories

| Dimension | Generic Jewellery Category (e.g., Rings) | Dedicated Kurta Section (`/kurtas`) |
| :--- | :--- | :--- |
| **Storefront Route** | `/collections/:category` (e.g. `/collections/rings`) | `/kurtas` and `/kurtas/:slug` |
| **Catalog Identification** | `category = 'Rings'` | `is_kurta = 1` indexed column |
| **Sizing Architecture** | Finger sizes (e.g. 12, 14) or lengths (16", 18") | 7 Standard Apparel Sizes: **XS, S, M, L, XL, XXL, XXXL** |
| **Measurement Specs** | Gold purity, stone weight, making charges | Chest, Waist, Hip, Shoulder, Kurta Length, Sleeve Length |
| **Admin Panel** | `ProductsAdmin.jsx` (generic SKU list) | `KurtasAdmin.jsx` (Style-grouped card view with per-size matrix) |
| **Pricing Model** | Gold/Silver rate-linked with live daily recalculations | Fixed artisan retail price with offer discount support |

---

## 3. Storefront User Experience (`src/Kurtas.jsx`)

### 3.1 Kurtas Listing Page (`/kurtas`)
- **Family-Level Merchandising:** Groups individual size variants under a single visual style card.
- **Dynamic Pricing Range:** Computes and displays `minPrice` – `maxPrice` across available in-stock variants, highlighting savings tags when active offers apply.
- **Filters & Sizing Badges:** Direct filtering by fabric (`Mulmul Cotton`, `Viscose Georgette`, `Chanderi Silk`), size availability (`XS` through `XXXL`), price brackets, and sorting (`price-asc`, `price-desc`, `name-asc`).
- **Interactive Quick Options:** Allows immediate size selection or 1-click navigation to the dedicated PDP.

### 3.2 Kurta Detail Page (`/kurtas/:slug`)
- **Seamless Redirection:** If a customer navigates to a legacy URL `/products/:slug` for a kurta item, `Product` automatically redirects to `/kurtas/:slug`.
- **7-Size Selection Pill UI:** Interactive pill buttons for XS (34), S (36), M (38), L (40), XL (42), XXL (44), and XXXL (46). Out-of-stock sizes are disabled with strikethrough styling and prevented from checkout.
- **Multi-Angle Imagery:** Powered by `ProductMagicZoom`, supporting high-resolution inspection of Front, Left Profile, Right Profile, Back, On-Model lifestyle, and Close-Up Embroidery stitches.
- **Interactive Sizing Chart Modal:** Displays exact garment dimensions (Garment Chest, Waist, Hip, Shoulder, Garment Length, Sleeve Length) with guidance on traditional ease allowances (+2" to +3" over body measurements).

---

## 4. Merchant Administration (`src/admin/KurtasAdmin.jsx`)

1. **Size-Wise Inventory Matrix:** The studio displays pills for all 7 sizes with color-coded stock availability:
   - Green: Healthy stock (>= 5 units).
   - Amber: Low stock (1–4 units).
   - Red: Sold out (0 units).
2. **Atomic 7-Variant Creation:** Creating a new style automatically provisions all 7 size variants with standardized SKUs (`CCK-<STYLE>-<SIZE>`) and links all multi-angle photo roles.
3. **Multi-Angle Photo Manager:** Direct integration with `ProductAngleManager` to reorder, replace, or preview front, back, profile, and detail views.

---

## 5. Seeded Kurta Styles

| Product Code | Name | Fabric | Purity / Embroidery | Base Price | Sizes Supported |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `lucknowi-ivory-chikankari-cotton-kurta` | Noor-e-Awadh Ivory Mulmul Kurta | Pure Mulmul Cotton | White-on-White Bakhiya & Phanda | ₹2,990 | XS, S, M, L, XL, XXL, XXXL |
| `rose-blush-georgette-chikankari-kurta` | Gulzar Rose Blush Georgette Kurta | Viscose Georgette | Floral Jaal, Ghaspatti Needlework | ₹3,490 | XS, S, M, L, XL, XXL, XXXL |
| `sage-green-chanderi-chikankari-kurta` | Nazakat Sage Green Chanderi Kurta | Chanderi Silk | Murri Needlework & Subtle Zari | ₹3,890 | XS, S, M, L, XL, XXL, XXXL |
| `sky-blue-mulmul-chikankari-kurta` | Fiza Sky Blue Mulmul Kurta | Fine Mulmul Cotton | Pastel Shadow-Work & Buti motifs | ₹2,790 | XS, S, M, L, XL, XXL, XXXL |
