# Chicken Curry (Chikankari) Kurtas Collection Implementation

## Overview
This document details the architectural design, database modeling, asset generation pipeline, storefront experience, and admin workflows implemented for the **"Chicken Curry Kurtas for Women"** collection at Veyora Jewels.

---

## 1. Product System & Architecture
The Chicken Curry Kurta collection integrates seamlessly into the existing Veyora multi-variant architecture without introducing parallel or duplicate systems.

### Garment Specifications & Taxonomy
- **Primary Category**: `Chicken Curry Kurtas for Women` (slug: `chicken-curry-kurtas`)
- **Parent Collection**: Women's Ethnic & Festive Wear
- **Craftsmanship**: Authentic handcrafted Lucknowi Chikankari (Bakhiya, Shadow work, Phanda, Murri, Tonal Jaal)
- **Fabric Formulations**:
  - Pure 100% Breathable Mulmul Cotton (`CCK-IVORY`)
  - Sheer Flowing Viscose Georgette (`CCK-BLUSH`)
  - Luminous Handwoven Chanderi Silk (`CCK-SAGE`)
  - Feathery Pure Mulmul Cotton (`CCK-SKY`)
- **Sizes & Grading**: 5 distinct size variants per style:
  - `S` (Chest 38", Shoulder 14.5", Length 44")
  - `M` (Chest 40", Shoulder 15.0", Length 44")
  - `L` (Chest 42", Shoulder 15.5", Length 45")
  - `XL` (Chest 44", Shoulder 16.0", Length 45")
  - `XXL` (Chest 46", Shoulder 16.5", Length 46")

### Flagship Product Styles
| Product Code | Style Name | Fabric / Metal Column | Base Price | Variants (SKUs) |
|---|---|---|---|---|
| `CCK-IVORY` | Lucknowi Ivory Chikankari Cotton Kurta | Pure Mulmul Cotton | ₹3,990 | `CCK-IVORY-S` through `CCK-IVORY-XXL` (5) |
| `CCK-BLUSH` | Rose Blush Georgette Chikankari Kurta | Viscose Georgette | ₹5,490 | `CCK-BLUSH-S` through `CCK-BLUSH-XXL` (5) |
| `CCK-SAGE` | Sage Green Chanderi Chikankari Kurta | Chanderi Silk | ₹6,990 | `CCK-SAGE-S` through `CCK-SAGE-XXL` (5) |
| `CCK-SKY` | Sky Blue Mulmul Chikankari Kurta | Pure Mulmul Cotton | ₹4,290 | `CCK-SKY-S` through `CCK-SKY-XXL` (5) |

**Total Kurta Variants**: 20 distinct SKUs across 4 flagship handcrafted designs.

---

## 2. Multi-Angle Product Photography System
Each of the 4 styles features an exhaustive, high-resolution 1:1 square photography collection complying strictly with Veyora's asset pipeline:

1. **`hero` (Sort Order 1)**: Full-length frontal portrait highlighting garment drape, neckline, and overall silhouette.
2. **`front` (Sort Order 2)**: Direct straight-angle view capturing chest yoke needlework and placket finish.
3. **`right` (Sort Order 3)**: Right 45° profile showing side seam fit, hip ease, and side slit embroidery.
4. **`left` (Sort Order 4)**: Left 45° profile maintaining symmetry, silhouette flow, and sleeve drape.
5. **`back` (Sort Order 5)**: Complete back view showcasing the distinctive Chikankari back motif (*buta* / yoke).
6. **`model` (Sort Order 6)**: Editorial lifestyle shot showing natural movement, styling, and fine jewellery pairings.
7. **`modal` / `detail` (Sort Order 7)**: Macro close-up capturing intricate artisan stitches (*bakhiya*, *phanda*, *murri*) and sheer fabric grain.

All assets are stored under `public/assets/products/<slug>/` with lossless WebP compression and companion `*-thumb.webp` derivatives for ultra-fast mobile catalog browsing.

---

## 3. Storefront Integration
- **Header Navigation**: Added "Chicken Curry Kurtas" link to desktop navigation bar and mobile drawer.
- **Homepage Categories**: Featured category card in the homepage grid with dedicated photography and direct CTA.
- **Dynamic Category Page (`/collections/chicken-curry-kurtas`)**:
  - Displays high-resolution 1600x500 panoramic collection banner.
  - Category intro copy highlighting artisanal heritage.
  - Price bracket filtering, in-stock filtering, and dynamic sorting.
- **Product Detail Page (PDP)**:
  - Multi-angle interactive viewer (`ProductMagicZoom`) supporting all 7 image angles.
  - Interactive size selector (`S` through `XXL`) dynamically routing between variant SKUs.
  - Dedicated "Kurta Sizing Chart" modal with garment chest, shoulder, and length measurements.
  - Integrated "Curated Complements" recommending matching Veyora pearl and gold jewellery.
  - Integrated "Complete the Look" pairing card recommending curated combos with instant bundle savings.

---

## 4. Admin Management
In the Merchant Studio (`/admin`):
- **Categories Tab**: Full CRUD support for Category Title, Slug, Description, Thumbnail, Banner, Sort Order, and Active/Inactive toggle. Shows live assigned product count.
- **Products Tab**: Manage Kurta SKUs, descriptions, pricing, sizes, inventory levels, and publication status.
- **Multi-Angle Manager**: Extended to support `back` angle upload, preview, drag-and-drop, and deletion alongside `hero`, `front`, `right`, `left`, `model`, and `detail`.
