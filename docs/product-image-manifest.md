# Product Image Manifest & Asset Registry

## 1. Directory Structure Overview
```
public/assets/
├── brand/
│   ├── logo.webp                 # Master vector-rendered brand mark
│   └── favicon.ico               # Multi-resolution favicon
├── hero/
│   ├── festive-hero-1.webp       # Frontpage hero carousel slide 1
│   ├── festive-hero-2.webp       # Frontpage hero carousel slide 2
│   ├── festive-hero-3.webp       # Frontpage hero carousel slide 3
│   └── festive-hero-video.mp4    # Cinematic ambient background video
├── coin-art/                     # 20 Bullion Coins (PNG, WebP, WebP-Thumb)
│   ├── lakshmi-gold-2g-v1.png
│   ├── lakshmi-gold-2g-v1.webp
│   ├── lakshmi-gold-2g-v1-thumb.webp
│   └── ... (20 coins × 3 variants = 60 assets)
└── products/                     # Product multi-angle directories
    ├── kurtas/                   # 50 Kurta designs × 5 colours × 6 angles
    │   ├── CCK-DES01-IVO-front.webp
    │   ├── CCK-DES01-IVO-right.webp
    │   ├── CCK-DES01-IVO-left.webp
    │   ├── CCK-DES01-IVO-back.webp
    │   ├── CCK-DES01-IVO-detail.webp
    │   ├── CCK-DES01-IVO-modal.webp
    │   └── ... (3,000 angle references)
    └── jewellery/                # 100 Fine jewellery pieces
        ├── aurelia-diamond-choker/
        │   ├── front.webp
        │   ├── detail.webp
        │   └── angle.webp
        └── ...
```

---

## 2. Bullion Coins Asset Manifest (20 Total)

| Asset Base Name | Metal | Purity | Weight | Form Factor | Theme |
|---|---|---|---|---|---|
| `lakshmi-gold-2g-v1` | Gold | 24K (999) | 2g | Round Coin | Goddess Lakshmi prosperity motif |
| `ganesha-gold-4g-v1` | Gold | 24K (999) | 4g | Round Coin | Lord Ganesha auspicious beginning |
| `om-vedic-gold-5g-v1` | Gold | 24K (999) | 5g | Round Coin | Sacred Vedic Om mandala |
| `banyan-tree-gold-8g-v1` | Gold | 24K (999) | 8g | Round Coin | Kalpavriksha eternal life tree |
| `kalash-gold-10g-v1` | Gold | 24K (999) | 10g | Round Coin | Mangal Kalash with coconut & leaves |
| `royal-emblem-gold-20g-v1` | Gold | 24K (999) | 20g | Round Coin | Imperial crest & sunburst |
| `imperial-coronation-gold-50g-v1` | Gold | 24K (999) | 50g | Round Coin | Heritage regal crest coin |
| `shagun-silver-5g-v1` | Silver | 999 Fine | 5g | Round Coin | Shagun auspicious coin |
| `saraswati-silver-20g-v1` | Silver | 999 Fine | 20g | Round Coin | Goddess Saraswati veena motif |
| `floral-silver-20g-v1` | Silver | 999 Fine | 20g | Round Coin | Mughal lotus medallion |
| `om-silver-25g-v1` | Silver | 999 Fine | 25g | Round Coin | Vedic Om with radiant sunburst |
| `kalash-silver-50g-v1` | Silver | 999 Fine | 50g | Round Coin | Sacred ceremonial Kalash |
| `peacock-silver-50g-v1` | Silver | 999 Fine | 50g | Round Coin | Royal Mayura peacock plume |
| `cast-bar-silver-250g-v1` | Silver | 999 Fine | 250g | Cast Ingot Bar | Assayed investment ingot bar |
| *(Additional bullion mints)* | Gold/Silver | 999 | 1g–100g | Coins & Minted Bars | Certified numismatics |

*Each coin asset is maintained in 3 formats: Master transparent PNG (800×800), Production WebP (800×800), and Lightweight Thumbnail WebP (240×240).*

---

## 3. Kurta Collection Manifest (50 Designs × 5 Colours)

- **Total Designs**: 50 (`CCK-DES01` through `CCK-DES50`).
- **Total Colourways per Design**: 5 (Ivory, Blush Pink, Sage Green, Powder Blue, Lavender / Sunset Ochre / Navy / Crimson).
- **Total Colour Variants**: 250 variants.
- **Sizes per Variant**: XS, S, M, L, XL, XXL, XXXL (7 sizes).
- **Total SKUs**: 1,750 SKUs.
- **Image Roles per Variant**: 6 (`front`, `right`, `left`, `back`, `detail`, `modal`).
- **Database Image Records**: 3,000 distinct gallery image records in `product_images`.

---

## 4. 100 Master Fine Jewellery Catalogue Manifest

Distributed across 9 traditional & contemporary Indian fine jewellery categories:
1. **Necklaces & Chokers** (20 designs): Polki, Temple Gold, Kundan, Pearl choker, Layered Haar.
2. **Mangalsutras** (12 designs): Contemporary Solitaire, Traditional Vati, Black Bead 18K/22K, Floral diamond.
3. **Earrings** (18 designs): Jhumkas, Chandbalis, Studs, Sui Dhaga, Ear Cuffs.
4. **Rings** (12 designs): Solitaire, Band, Cocktail Navratna, Eternity, Temple Crest.
5. **Bracelets** (10 designs): Tennis bracelet, Pearl cuff, Gold link, Delicate chain.
6. **Bangles & Kada** (10 designs): Pachheli kada, Meenakari openable, Broad temple bangle.
7. **Maang Tikka & Nath** (6 designs): Bridal tikka, Pearl nath, Kundan passaa.
8. **Anklets & Payal** (5 designs): 925 Silver ghungroo, Gold-plated payal, Minimalist chain.
9. **Curated Sets** (7 designs): Complete bridal necklace, earring, and maang tikka ensembles.
