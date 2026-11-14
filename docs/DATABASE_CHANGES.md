# Database Schema Changes & Migrations

## Overview
This document logs all database schema changes, table creations, foreign keys, indexes, and idempotency guarantees introduced to support the **Categories & Taxonomy** and **Product Combos** architecture.

---

## 1. Migration: `019_categories_and_combos.js`
Executed via Knex migration runner (`npm run migrate`).

### Table: `categories`
Stores store taxonomy, SEO metadata, banners, thumbnails, and display ordering.

```sql
CREATE TABLE `categories` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `thumbnail` TEXT NULL,
  `banner` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `sort_order` INTEGER DEFAULT 0,
  `seo_title` VARCHAR(150) NULL,
  `meta_description` VARCHAR(255) NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) NOT NULL
);

CREATE INDEX `categories_slug_index` ON `categories` (`slug`);
CREATE INDEX `categories_status_index` ON `categories` (`status`);
CREATE INDEX `categories_sort_order_index` ON `categories` (`sort_order`);
```

### Table: `combos`
Stores curated bundle sets, pricing, discount percentages, savings amounts, and publication state.

```sql
CREATE TABLE `combos` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(100) NULL,
  `image` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'published',
  `combo_price` DECIMAL(14, 2) NOT NULL,
  `original_price` DECIMAL(14, 2) NULL,
  `discount_percent` DECIMAL(5, 2) NULL,
  `savings` DECIMAL(14, 2) NULL,
  `stock` INTEGER DEFAULT 10,
  `seo_title` VARCHAR(150) NULL,
  `meta_description` VARCHAR(255) NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) NOT NULL
);

CREATE INDEX `combos_slug_index` ON `combos` (`slug`);
CREATE INDEX `combos_sku_index` ON `combos` (`sku`);
CREATE INDEX `combos_status_index` ON `combos` (`status`);
CREATE INDEX `combos_category_index` ON `combos` (`category`);
```

### Table: `combo_items`
Relational join table mapping component products to combos.

```sql
CREATE TABLE `combo_items` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `combo_id` INTEGER NOT NULL REFERENCES `combos`(`id`) ON DELETE CASCADE,
  `product_sku` VARCHAR(100) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `is_primary` BOOLEAN NOT NULL DEFAULT 0
);

CREATE INDEX `combo_items_combo_id_index` ON `combo_items` (`combo_id`);
CREATE INDEX `combo_items_product_sku_index` ON `combo_items` (`product_sku`);
```

---

## 2. Seeders
All seeders execute idempotently (can be run repeatedly without duplicating records or throwing unique constraint violations):

### 1. `CategorySeeder.js`
- Populates 13 categories:
  - 8 new collections (`Chicken Curry Kurtas for Women`, `Chicken Curry Kurta Collection`, `Kurta & Jewellery Combo`, `Premium Ethnic Wear`, `Festive Kurta Collection`, `Everyday Women's Ethnic Wear`, `Kurta Gift Sets`, `Premium Jewellery & Kurta Sets`).
  - 5 existing jewellery and bullion categories (`The Pearl Edit`, `Earrings`, `Necklaces`, `Rings`, `Bracelets`, `Gold & Silver Coins`).

### 2. `KurtaSeeder.js`
- Populates 4 flagship Chikankari kurta styles (`CCK-IVORY`, `CCK-BLUSH`, `CCK-SAGE`, `CCK-SKY`).
- Generates 20 size variants (`S`, `M`, `L`, `XL`, `XXL`).
- Links 28 multi-angle image entries (`hero`, `front`, `right`, `left`, `back`, `model`, `modal`) into `product_images`.

### 3. `ComboSeeder.js`
- Populates 4 curated combos with component mappings and 15% bundle discounts.

### 4. `DatabaseSeeder.js` & `scripts/seed.js`
- Chained to execute in sequence:
  ```javascript
  await CategorySeeder(db);
  await KurtaSeeder(db);
  await ComboSeeder(db);
  ```
