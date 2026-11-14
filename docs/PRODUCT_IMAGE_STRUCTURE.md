# Product Image Structure & Asset Hierarchy Specification

## Overview
Every product and variant in the catalog follows a standardized folder structure, naming convention, and aspect ratio to ensure crisp rendering across desktop and mobile devices.

## Kurta Image Structure
For each style (e.g., `lucknowi-ivory-chikankari-cotton-kurta`):
```
public/assets/products/<style_slug>/
├── hero.webp          # 1200x1600 master hero shot
├── hero-thumb.webp    # 600x800 listing thumbnail
├── front.webp         # Full front angle
├── front-thumb.webp
├── model.webp         # Editorial model wearing shot
├── model-thumb.webp
├── back.webp          # Back view displaying full embroidery
├── back-thumb.webp
├── left.webp          # Left profile
├── left-thumb.webp
├── right.webp         # Right profile
├── right-thumb.webp
├── detail.webp        # Close-up needlework & texture
├── detail-thumb.webp
├── modal.webp         # Zoom & modal view
├── modal-thumb.webp
├── neckline.webp      # Yoke & neckline craftsmanship
├── neckline-thumb.webp
├── embroidery.webp    # Shadow-work & stitch precision
├── embroidery-thumb.webp
├── fabric.webp        # Natural weave texture
├── fabric-thumb.webp
├── sleeve.webp        # Cuff & sleeve border detail
├── sleeve-thumb.webp
├── <color_2_slug>/    # Nested variant directory for secondary colour
│   ├── hero.webp
│   └── ... (all 12 views + thumbnails)
└── <color_3_slug>/    # Nested variant directory for tertiary colour
    ├── hero.webp
    └── ... (all 12 views + thumbnails)
```

## Photography & Cleanliness Standards
- **Zero Watermarks**: No overlay logos, AI signatures, promotional badges, or text.
- **Realistic Photography**: Authentic Indian female models, natural drape, genuine Lucknowi Chikankari needlework.
- **Aspect Ratio**: Standardized 3:4 portrait aspect ratio (600x800 for thumbnails, 1200x1600 for master views).
- **Optimization**: Pristine WebP format with high visual fidelity and rapid load times.
