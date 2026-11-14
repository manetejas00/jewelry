# Product & Catalogue Import Templates Reference

## 1. Overview
Veyora Jewels provides production-ready CSV templates and populated example datasets for all catalogue entities under the `samples/` directory and downloadable via the admin API:
- `GET /api/admin/samples/:file`
- `GET /api/admin/export/:kind`

---

## 2. Template Catalog & Column Specifications

### 2.1 Jewellery Master (`jewellery-template.csv`)
Columns:
- `sku` (String, Required, Unique): Product identifier (e.g. `VY-NK-001`).
- `product_code` (String, Required): Shared base style identifier for grouped variants.
- `name` (String, Required): Title of the piece.
- `category` (String, Required): e.g. Necklaces, Earrings, Rings, Bracelets.
- `metal` (String, Required): Gold, Silver, Rose Gold.
- `purity` (String, Required): 18K, 22K, 925.
- `pricing_mode` (String, Required): `FIXED` or `GOLD_LINKED`.
- `price` (Number, Required if FIXED): Retail selling price in INR.
- `original_price` (Number, Optional): Strikethrough comparison price.
- `net_weight_g` (Number, Required if GOLD_LINKED): Net pure metal weight in grams.
- `gross_weight_g` (Number, Optional): Gross weight with stones.
- `making_charge` (Number, Optional): Making charge amount in INR.
- `stock` (Integer, Required): Available inventory quantity.
- `description` (String, Optional): Editorial product description.
- `image` (String, Required): Primary front image URL.
- `materials` (String, Optional): Pipe-separated slugs (e.g. `18k-gold|natural-diamond`).
- `craftsmanship` (String, Optional): Pipe-separated slugs (e.g. `jadau|kundan`).
- `collections` (String, Optional): Pipe-separated slugs (e.g. `gold|royal-bridal`).

### 2.2 Bullion Coins (`coins-template.csv`)
Columns:
- `sku` (String, Required, Unique): Bullion identifier (e.g. `COIN-GOLD-10G-KALASH`).
- `name` (String, Required): Coin title (e.g. `10g 24K Mangal Kalash Gold Coin`).
- `metal` (String, Required): `gold` or `silver`.
- `purity` (String, Required): `24K (999)` or `999 Fine Silver`.
- `weight_g` (Number, Required): Bullion weight in grams (e.g. `2`, `5`, `10`, `50`).
- `pricing_mode` (String, Required): `METAL_LINKED` or `FIXED`.
- `making_charge` (Number, Required): Premium/minting charge per coin.
- `stock` (Integer, Required): Stock inventory.
- `dimension` (String, Optional): e.g. `28 mm diameter`.
- `packaging` (String, Optional): Tamper-evident certicard / velvet case.
- `image` (String, Required): Master coin artwork path.

### 2.3 Kurta Designs (`kurta-designs-template.csv`)
Columns:
- `product_code` (String, Required, Unique): Design code (e.g. `CCK-DES01`).
- `name` (String, Required): Design title (e.g. `Aria Hand-Embroidered Chanderi Kurta`).
- `fabric` (String, Required): Pure Cotton, Chanderi Silk, Mulmul, Georgette.
- `silhouette` (String, Required): Straight Cut, A-Line, Anarkali, Angrakha.
- `neckline` (String, Required): V-Neck, Mandarin Collar, Round Neck with Slit.
- `sleeves` (String, Required): Three-Quarter, Full Length, Elbow Sleeve.
- `model_identity` (String, Required): Model identifier for photographic consistency.
- `description` (String, Optional): Detailed garment description.

### 2.4 Kurta Colour Variants (`kurta-variants-template.csv`)
Columns:
- `sku` (String, Required, Unique): Variant SKU (e.g. `CCK-DES01-IVO-M`).
- `product_code` (String, Required): References master design code.
- `color_name` (String, Required): Ivory, Blush Pink, Sage Green, etc.
- `color_code` (String, Required): 3-letter uppercase code (IVO, BLU, SAG, PIN, LAV).
- `hex_color` (String, Required): `#FFFFF0`, `#FFD1DC`, `#9CAF88`, etc.
- `size` (String, Required): XS, S, M, L, XL, XXL, XXXL.
- `price` (Number, Required): Retail price in INR.
- `stock` (Integer, Required): Stock count for this specific size and colour.
- `image_front` (String, Required): Front angle image URL.
- `image_right` (String, Optional): Right profile image URL.
- `image_left` (String, Optional): Left profile image URL.
- `image_back` (String, Optional): Back view image URL.
- `image_detail` (String, Optional): Macro embroidery detail URL.
- `image_modal` (String, Optional): Editorial modal look URL.

### 2.5 Master Entity Templates
- `materials-template.csv`: `slug`, `name`, `type`, `description`, `sort_order`, `status`.
- `craftsmanship-template.csv`: `slug`, `name`, `origin_region`, `technique_type`, `description`, `sort_order`, `status`.
- `collections-template.csv`: `slug`, `name`, `banner_image`, `description`, `sort_order`, `status`.
