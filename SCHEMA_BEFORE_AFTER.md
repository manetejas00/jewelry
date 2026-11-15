# Database Schema Before vs After: Dedicated Module Separation

**Date**: November 2026  
**Auditor**: Senior Database Architect & Production Migration Specialist  

---

## 1. Architectural Transformation Overview

```
BEFORE: Monolithic & Mixed Model
┌────────────────────────────────────────────────────────┐
│                        products                        │
│  - Legacy Jewellery Pieces                             │
│  - Kurtas (is_kurta = 1, Chicken Curry Kurtas)         │
│  - Mixed column usage & shared status                  │
└────────────────────────────────────────────────────────┘
  ▲                   ▲                   ▲
  │ (shared queries)  │ (mixed filters)   │ (composite scans)
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Storefront   │   │  Storefront   │   │  Storefront   │
│    Jewelry    │   │    Kurtas     │   │     Coins     │
└───────────────┘   └───────────────┘   └───────────────┘

AFTER: Clean Modular Separation
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    jewelries     │    │      kurtas      │    │      coins       │
│  (view: jewelry) │    │                  │    │                  │
│  - 107 Pieces    │    │  - 30 Styles     │    │  - 20 Coins      │
│  - Metal purity  │    │  - Fabrics/Sizes │    │  - Mint/Assay    │
│  - Gross/Net Wt  │    │  - Fit/Patterns  │    │  - Denominations │
│  - Making charge │    │  - Size variants │    │  - Bullion rates │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ /api/jewelry     │    │ /api/kurtas      │    │ /api/coins       │
│ /api/admin/      │    │ /api/admin/      │    │ /api/admin/      │
│     jewelry      │    │     kurtas       │    │     coins        │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 2. Table-by-Table Schema Specification

### A. Kurta Module (`kurtas`)

```sql
CREATE TABLE kurtas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100) UNIQUE NOT NULL,
  product_code VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id INT NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  fabric VARCHAR(100) NULL,
  pattern VARCHAR(100) NULL,
  fit VARCHAR(100) NULL,
  sleeve_type VARCHAR(100) NULL,
  neck_type VARCHAR(100) NULL,
  occasion VARCHAR(100) NULL,
  gender VARCHAR(50) DEFAULT 'Women',
  available_sizes TEXT NULL,
  available_colors TEXT NULL,
  material VARCHAR(100) NULL,
  price DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2) NULL,
  fixed_price DECIMAL(10, 2) NULL,
  stock INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'published',
  image TEXT NULL,
  seo_title VARCHAR(255) NULL,
  meta_description TEXT NULL,
  source_timestamp VARCHAR(100) NULL,
  created_at VARCHAR(100) NOT NULL,
  updated_at VARCHAR(100) NOT NULL,
  INDEX idx_kurtas_gender_category (gender, category_id),
  INDEX idx_kurtas_status (status),
  INDEX idx_kurtas_slug (slug)
);
```

**Associated Normalized Tables**:
- `kurta_categories` (taxonomies & navigation)
- `kurta_variants` (sizes XS through XXXL, distinct SKUs and barcoding)
- `kurta_images` (angles: hero, front, back, model, detail)
- `kurta_attributes` & `kurta_attribute_values` (extensible craft specs)
- `kurta_inventory` (per-size stock movement audit log)

---

### B. Jewelry Module (`jewelries` / `jewelry`)

```sql
CREATE TABLE jewelries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100) UNIQUE NOT NULL,
  product_code VARCHAR(100) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id INT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NULL,
  metal VARCHAR(50) NOT NULL,
  purity VARCHAR(20) NOT NULL,
  gross_weight_g DECIMAL(10, 3) DEFAULT 0.000,
  net_weight_g DECIMAL(10, 3) NOT NULL,
  stone_details TEXT NULL,
  diamond_details TEXT NULL,
  gemstone_details TEXT NULL,
  making_charges DECIMAL(14, 2) DEFAULT 0.00,
  making_percent DECIMAL(8, 4) DEFAULT 0.0000,
  gst DECIMAL(5, 2) DEFAULT 3.00,
  base_price DECIMAL(14, 2) NULL,
  selling_price DECIMAL(14, 2) NULL,
  fixed_price DECIMAL(14, 2) NULL,
  pricing_mode VARCHAR(50) DEFAULT 'FIXED',
  stone_charge DECIMAL(14, 2) DEFAULT 0.00,
  other_charge DECIMAL(14, 2) DEFAULT 0.00,
  stock INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'published',
  image TEXT NULL,
  seo_title VARCHAR(255) NULL,
  meta_description TEXT NULL,
  source_timestamp VARCHAR(100) NULL,
  created_at VARCHAR(100) NOT NULL,
  updated_at VARCHAR(100) NOT NULL,
  source_pdf VARCHAR(500) NULL,
  source_page INT NULL,
  price_source VARCHAR(20) DEFAULT 'DEFAULT',
  original_pdf_price DECIMAL(14, 2) NULL,
  import_batch VARCHAR(100) NULL,
  gender VARCHAR(50) DEFAULT 'Unisex',
  INDEX idx_jewelries_metal (metal),
  INDEX idx_jewelries_purity (purity),
  INDEX idx_jewelries_status (status),
  INDEX idx_jewelries_category_id (category_id),
  INDEX idx_jewelries_slug (slug)
);

-- Backward-compatibility & singular naming support
CREATE VIEW jewelry AS SELECT * FROM jewelries;
```

**Associated Normalized Tables**:
- `jewelry_categories` (Earrings, Necklaces, Rings, Bracelets)
- `jewelry_variants` (sizes, finishes, purity options)
- `jewelry_images` (angles: hero, front, right, left, model, detail)
- `jewelry_inventory` (transactional inventory tracking)
- `jewelry_import_sessions` & `jewelry_import_jobs` (PDF catalog processing)

---

### C. Coin Module (`coins`)

```sql
CREATE TABLE coins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(150) NULL,
  name VARCHAR(255) NOT NULL,
  category_id INT NULL,
  metal VARCHAR(50) NOT NULL,
  coin_type VARCHAR(100) NULL,
  purity VARCHAR(20) NOT NULL,
  weight_g VARCHAR(50) NOT NULL,
  dimension VARCHAR(100) NULL,
  denomination VARCHAR(100) NULL,
  mint VARCHAR(150) NULL,
  collection VARCHAR(150) NULL,
  edition VARCHAR(150) NULL,
  year_of_issue INT DEFAULT 2026,
  certification VARCHAR(150) NULL,
  making_charge VARCHAR(50) NULL,
  pricing_mode VARCHAR(50) DEFAULT 'FIXED',
  fixed_price VARCHAR(50) NULL,
  stock INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'published',
  image TEXT NULL,
  image_kind VARCHAR(50) DEFAULT 'photo',
  description TEXT NULL,
  seo_title VARCHAR(255) NULL,
  meta_description TEXT NULL,
  source_timestamp VARCHAR(100) NULL,
  created_at VARCHAR(100) NOT NULL,
  updated_at VARCHAR(100) NOT NULL,
  INDEX idx_coins_metal (metal),
  INDEX idx_coins_purity (purity),
  INDEX idx_coins_weight_g (weight_g),
  INDEX idx_coins_status (status),
  INDEX idx_coins_slug (slug)
);
```

**Associated Normalized Tables**:
- `coin_categories` (Gold Coins, Silver Coins)
- `coin_variants` (weight denominations)
- `coin_images` (obverse hero, reverse hallmark, assay packaging)
- `coin_inventory` (vault stock changes)

---

## 3. Order Items Polymorphic Relationship Strategy

In `order_items`:
```sql
ALTER TABLE order_items 
  ADD COLUMN item_type VARCHAR(50) NOT NULL DEFAULT 'jewelry',
  ADD COLUMN item_id INT NULL;
```
Every line item records:
- `sku`: canonical item identity
- `item_type`: `'jewelry'` | `'kurta'` | `'coin'`
- `item_id`: foreign key into the respective module table
- `snapshot`: immutable JSON copy of name, price, breakdown, tax, and image at the exact instant of checkout
