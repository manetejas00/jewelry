# Database Schema Changes & Migrations

## Overview
This document specifies all database schema changes, migrations, indexes, and idempotency guarantees implemented for the **Dedicated Chicken Curry Kurtas Module** and the complete removal of combo-related tables.

---

## 1. Migration: `020_kurta_module_and_remove_combos.js`
Executed via Knex migration runner (`npm run migrate`).

### A. Dedicated `is_kurta` Identification
Added boolean column `is_kurta` to the `products` table with an index to facilitate lightning-fast queries and distinguish Chicken Curry Kurtas from fine jewellery and bullion coins:

```sql
ALTER TABLE `products` ADD COLUMN `is_kurta` BOOLEAN DEFAULT 0;
CREATE INDEX `products_is_kurta_index` ON `products` (`is_kurta`);
```

### B. Complete Removal of Combo Functionality (Phase 10 Mandate)
Dropped legacy combo tables and purged combo records from categories:

```sql
DROP TABLE IF EXISTS `combo_items`;
DROP TABLE IF EXISTS `combos`;
DELETE FROM `categories` WHERE `slug` = 'combos' OR `name` LIKE '%Combo%';
```

---

## 2. Updated Table Specifications

### Table: `products` (Expanded for Kurta Styles & Sizes)
Stores both jewellery pieces, bullion coins, and dedicated Chicken Curry Kurta size variants:

```sql
CREATE TABLE `products` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `supplier` VARCHAR(255) NULL,
  `product_code` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(255) NOT NULL UNIQUE,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `is_kurta` BOOLEAN DEFAULT 0,
  `description` TEXT NULL,
  `metal` VARCHAR(255) NULL,           -- Stores fabric (e.g., 'Pure Mulmul Cotton')
  `purity` VARCHAR(255) NULL,          -- Stores embroidery craft (e.g., 'Handcrafted Chikankari')
  `finish` VARCHAR(255) NULL,          -- Stores stitch technique (e.g., 'Shadow Work')
  `size` VARCHAR(50) NULL,             -- Stores size (e.g., 'XS (34)', 'S (36)', etc.)
  `image` TEXT NULL,
  `pricing_mode` VARCHAR(50) NOT NULL, -- 'FIXED' for kurtas
  `fixed_price` DECIMAL(14, 2) NULL,
  `stock` INTEGER DEFAULT 0,
  `status` VARCHAR(50) NOT NULL DEFAULT 'published',
  `seo_title` VARCHAR(255) NULL,
  `meta_description` TEXT NULL,
  `source_timestamp` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) NOT NULL
);

CREATE INDEX `products_is_kurta_index` ON `products` (`is_kurta`);
CREATE INDEX `products_product_code_index` ON `products` (`product_code`);
CREATE INDEX `products_sku_index` ON `products` (`sku`);
CREATE INDEX `products_status_index` ON `products` (`status`);
```

### Table: `product_images` (Multi-Angle Photography Roles)
Maps high-resolution WebP photographs to product styles and roles:

```sql
CREATE TABLE `product_images` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `product_code` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(255) NULL,
  `role` VARCHAR(50) NOT NULL,         -- 'hero', 'front', 'right', 'left', 'back', 'model', 'detail'
  `url` TEXT NOT NULL,
  `alt_text` TEXT NULL,
  `sort_order` INTEGER DEFAULT 0,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) NOT NULL
);

CREATE INDEX `product_images_product_code_index` ON `product_images` (`product_code`);
CREATE INDEX `product_images_sku_index` ON `product_images` (`sku`);
```

---

## 3. Idempotent Seeders

### 1. `KurtaSeeder.js`
- Populates all 4 authentic Chikankari styles:
  1. `lucknowi-ivory-chikankari-cotton-kurta`
  2. `rose-blush-georgette-chikankari-kurta`
  3. `sage-green-chanderi-chikankari-kurta`
  4. `sky-blue-mulmul-chikankari-kurta`
- Generates all 7 sizes (`XS` to `XXXL`) for each style = 28 variants total.
- Associates 6 distinct image roles (`hero`, `front`, `right`, `left`, `back`, `model`, `detail`) per style.

### 2. `CategorySeeder.js`
- Restored to the 5 pure jewellery and coin categories: `Earrings`, `Necklaces`, `Rings`, `Bracelets`, and `Gold & Silver Coins`.
