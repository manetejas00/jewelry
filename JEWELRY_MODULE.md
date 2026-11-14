# Jewelry Module Documentation

## 1. Overview & Domain Boundaries

The **Jewelry Module** manages all fine jewelry inventory, precious metal pricing rules, diamond and gemstone caratage specifications, multi-variant ring and necklace sizes, multi-angle editorial media, and category taxonomies.

- **Domain Scope:** Fine jewelry pieces (Rings, Necklaces, Earrings, Bracelets, Pendants, Bangles).
- **Pricing Strategy:** Gold-linked daily live metal spot rate pricing with weight and purity calculation, or fixed luxury item pricing.
- **Dedicated Tables:**
  - `jewelries`: Master parent jewelry items.
  - `jewelry_categories`: Taxonomy and navigation hierarchy.
  - `jewelry_variants`: Size, finish, and metal variants.
  - `jewelry_images`: Multi-angle imagery (`hero`, `front`, `right`, `left`, `back`, `model`, `detail`).
  - `jewelry_attributes` & `jewelry_attribute_values`: Extensible EAV attribute storage.
  - `jewelry_inventory`: Double-entry inventory ledger logging every balance mutation.

---

## 2. Architecture & File Structure

```text
server/modules/jewelry/
├── Constants/
│   └── JewelryConstants.js     # Valid metals, purities, pricing modes, statuses, and CSV schemas
├── Entities/
│   └── JewelryEntity.js        # Domain entities for Jewelry and JewelryVariant
├── Models/
│   └── JewelryModel.js         # Knex database layer abstraction for queries
├── Repositories/
│   └── JewelryRepository.js    # Data access layer assembling entities, variants, and images
├── Requests/
│   └── JewelryRequest.js       # Request payload validation rules (create, update)
├── Resources/
│   └── JewelryResource.js      # API serialization (storefront card, detail, admin item)
├── Mappers/
│   └── JewelryMapper.js        # Bidirectional mapping between CSV rows and domain entities
├── Policies/
│   └── JewelryPolicy.js        # Authorization rules for viewer, manager, and owner roles
├── Services/
│   └── JewelryService.js       # Core business logic: pricing, transactions, stock mutation, CSV import/export
├── Controllers/
│   └── JewelryController.js    # Express HTTP controller handling web requests
└── Routes/
    └── jewelryRoutes.js        # Route registrations for public storefront and staff admin
```

---

## 3. Database Schema

### `jewelries`
```sql
CREATE TABLE jewelries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier VARCHAR(100) DEFAULT 'Merchant',
  product_code VARCHAR(100) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(150) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES jewelry_categories(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  metal VARCHAR(50) DEFAULT 'Gold',
  purity VARCHAR(50) DEFAULT '18K',
  gross_weight_g DECIMAL(10, 3),
  net_weight_g DECIMAL(10, 3),
  stone_details TEXT,
  diamond_details TEXT,
  gemstone_details TEXT,
  making_charges DECIMAL(14, 2) DEFAULT 0.00,
  making_percent DECIMAL(8, 4) DEFAULT 0.0000,
  gst DECIMAL(5, 2) DEFAULT 3.00,
  pricing_mode VARCHAR(50) DEFAULT 'GOLD_LINKED',
  fixed_price DECIMAL(14, 2),
  base_price DECIMAL(14, 2),
  selling_price DECIMAL(14, 2),
  stone_charge DECIMAL(14, 2) DEFAULT 0.00,
  other_charge DECIMAL(14, 2) DEFAULT 0.00,
  stock INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'published',
  image TEXT,
  seo_title VARCHAR(255),
  meta_description TEXT,
  source_timestamp VARCHAR(255),
  created_at VARCHAR(255) NOT NULL,
  updated_at VARCHAR(255) NOT NULL
);
```

### `jewelry_variants`
```sql
CREATE TABLE jewelry_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jewelry_id INTEGER NOT NULL REFERENCES jewelries(id) ON DELETE CASCADE,
  product_code VARCHAR(100) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  size VARCHAR(50) DEFAULT 'Standard',
  finish VARCHAR(100) DEFAULT 'Polished',
  metal VARCHAR(50) NOT NULL,
  purity VARCHAR(50) NOT NULL,
  gross_weight_g DECIMAL(10, 3),
  net_weight_g DECIMAL(10, 3),
  price DECIMAL(14, 2),
  fixed_price DECIMAL(14, 2),
  stock INTEGER DEFAULT 0,
  image TEXT,
  status VARCHAR(20) DEFAULT 'published',
  created_at VARCHAR(255) NOT NULL,
  updated_at VARCHAR(255) NOT NULL
);
```

### `jewelry_inventory`
```sql
CREATE TABLE jewelry_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jewelry_id INTEGER NOT NULL REFERENCES jewelries(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES jewelry_variants(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  quantity_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  reference_id VARCHAR(100),
  created_at VARCHAR(255) NOT NULL
);
```

---

## 4. Key Business Logic

### 4.1 Live Gold-Linked Pricing
When `pricing_mode === 'GOLD_LINKED'`:
$$\text{Metal Cost} = \text{net\_weight\_g} \times \text{rate.inr\_per\_gram}$$
$$\text{Full Making} = \text{making\_charges} + \left(\text{Metal Cost} \times \frac{\text{making\_percent}}{100}\right)$$
$$\text{Base Subtotal} = \text{Metal Cost} + \text{Full Making} + \text{stone\_charge} + \text{other\_charge}$$
Discounts from active promotional offers are applied to making charges or total before GST calculation.

### 4.2 Stock Deductions & Double-Entry Ledger
When an order is confirmed, `JewelryService.deductStock(trx, sku, quantity)`:
1. Decrements `jewelry_variants.stock` using `WHERE stock >= quantity`.
2. Decrements parent `jewelries.stock`.
3. Appends an immutable audit log to `jewelry_inventory` with `quantity_change: -quantity`, `reason: 'order_placed'`, and `reference_id: orderId`.

---

## 5. Endpoints & API Surface

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/jewelry` | Public | Storefront PLP with live pricing and review aggregates |
| `GET` | `/api/jewelry/categories` | Public | Active categories listing |
| `GET` | `/api/jewelry/:slug` | Public | Storefront PDP with variant choices and multi-angle photography |
| `GET` | `/api/admin/jewelry` | Staff | Admin listing with filtering by status and category |
| `POST` | `/api/admin/jewelry` | Manager/Owner | Create jewelry piece with auto-generated primary variant and media |
| `GET` | `/api/admin/jewelry/:sku` | Staff | Retrieve single item for administrative editing |
| `PATCH`| `/api/admin/jewelry/:sku` | Manager/Owner | Update pricing, inventory, descriptions, and media |
| `DELETE`| `/api/admin/jewelry/:sku`| Manager/Owner | Cascade delete master item, variants, images, and inventory |
| `GET` | `/api/admin/jewelry/export` | Staff | Stream full UTF-8 CSV inventory snapshot |
