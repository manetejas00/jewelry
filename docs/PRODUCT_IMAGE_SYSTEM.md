# Product Image System & Photography Pipeline

## Overview
This document specifies Veyora Jewels' complete product image management architecture, image generation workflows, storage structure, naming conventions, multi-angle role definitions, aspect ratios, and compression standards.

---

## 1. Storage Architecture & Directory Hierarchy
All product images follow a deterministic, slug-based folder structure rooted in `public/assets/products/`:

```
public/assets/products/<product-slug>/
├── hero.webp          # 1:1 square master hero image
├── hero-thumb.webp    # 1:1 square 200x200 mobile/grid thumbnail
├── front.webp         # 1:1 square straight front view
├── front-thumb.webp   # 1:1 square 200x200 thumbnail
├── right.webp         # 1:1 square right 45° profile view
├── right-thumb.webp   # 1:1 square 200x200 thumbnail
├── left.webp          # 1:1 square left 45° profile view
├── left-thumb.webp    # 1:1 square 200x200 thumbnail
├── back.webp          # 1:1 square back view
├── back-thumb.webp    # 1:1 square 200x200 thumbnail
├── model.webp         # 1:1 square editorial wearing shot
├── model-thumb.webp   # 1:1 square 200x200 thumbnail
├── modal.webp         # 1:1 square macro detail / zoom view
└── modal-thumb.webp   # 1:1 square 200x200 thumbnail
```

Additionally:
- **Category Banners & Thumbs**: `public/assets/categories/<slug>-banner.webp` (1600x500) and `public/assets/categories/<slug>-thumb.webp` (600x600).
- **Combos**: `public/assets/combos/<slug>.webp` (1024x1024) and `public/assets/combos/<slug>-thumb.webp` (200x200).
- **Homepage Hero Showcases**: `public/assets/banners/hero-kurta-1.webp`, `hero-kurta-2.webp`, `hero-kurta-3.webp` (1920x1080).

---

## 2. Multi-Angle Role Definitions & Specifications
| Role Name | Sort Order | Description | Required View Elements |
|---|---|---|---|
| `hero` | 1 | Primary catalog and grid presentation | Clean neutral luxury studio background (`#F8F6F0`), balanced lighting, garment or piece centered. |
| `front` | 2 | Direct frontal perspective | Straight eye-level view highlighting placket, neckline, and frontal embroidery jaal. |
| `right` | 3 | Right profile perspective | 45-degree angle showing side drape, seam finish, and side slit needlework. |
| `left` | 4 | Left profile perspective | Symmetric complementary angle confirming balanced tailoring and sleeve length. |
| `back` | 5 | Complete back view | Unobstructed back view showcasing the back Chikankari yoke and artisan *buta* motifs. |
| `model` | 6 | Editorial on-model lifestyle | Authentic Indian female model wearing the kurta and styled with complementary jewellery pieces. |
| `modal` / `detail` | 7 | High-resolution macro zoom | Extreme close-up of intricate hand stitches (*bakhiya*, *phanda*, *murri*) and fine fabric texture. |

---

## 3. Image Processing & Integrity Standards
The asset pipeline is governed by `scripts/process-kurta-assets.js` and validated via `scripts/check-product-assets.js`:

1. **Resolution & Aspect Ratio**:
   - Master product images: Strictly 1:1 square aspect ratio (`1024x1024` or higher).
   - Thumbnail images: Strictly 1:1 square aspect ratio (`200x200` to `400x400`).
   - Hero showcase banners: 16:9 cinematic landscape (`1920x1080`).
   - Category banners: Panoramic landscape (`1600x500`).
2. **Format & Compression**:
   - Format: Modern WebP format with near-lossless 88-92% quality setting via Sharp 0.35.5.
   - Metadata: EXIF rotation applied, color profiles converted to standard sRGB.
3. **Anti-Duplication & Hash Integrity (`check-product-assets.js`)**:
   - Enforces zero SHA-256 hash collisions between different angle views of the same product.
   - Enforces distinct visual extractions for `model` and `modal` views.
   - All 464 product image assets pass hash and dimension verification with 0 errors.

---

## 4. Admin Multi-Angle Upload Interface
In `ProductAngleManager` (`src/main.jsx`):
- 7 dedicated visual dropzones: Hero, Front, Right, Left, Back, Model, and Detail.
- Full drag-and-drop file upload with 8 MB client-side validation.
- Live WebP thumbnail previews with modal full-screen inspect action.
- Individual angle deletion and replacement.
- Configured count badge showing real-time completeness (e.g. `7/7 Images Configured`).
