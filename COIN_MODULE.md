# Coin & Bullion Module Documentation

## 1. Overview & Domain Boundaries

The **Coin Module** manages gold and silver bullion coins, minted bars, devotional medallions, certified weights, denominations, assay hallmarking, and minting metadata.

- **Domain Scope:** Bullion coins (Gold 24K 999, Silver 999/925) and minted collectible ingots.
- **Pricing Strategy:** Metal-linked live spot gold/silver pricing based on exact gram weight, or fixed bullion collectible pricing.
- **Dedicated Tables:**
  - `coins`: Master coin records with weight, denomination, mint, purity, and certification attributes.
  - `coin_categories`: Mint categories (Gold Bullion, Silver Bullion, Devotional Collections).
  - `coin_variants`: Weight variants and packaging configurations.
  - `coin_images`: Obverse face (`hero`), reverse hallmark (`back`), and edge detail photography.
  - `coin_attributes` & `coin_attribute_values`: EAV storage for mint marks, assay standards, and packaging.
  - `coin_inventory`: Double-entry inventory ledger logging all stock changes.

---

## 2. Architecture & File Structure

```text
server/modules/coin/
├── Constants/
│   └── CoinConstants.js        # Valid coin metals, purities, types, image roles, and CSV schemas
├── Entities/
│   └── CoinEntity.js           # Domain entities for Coin and CoinVariant
├── Models/
│   └── CoinModel.js            # Database query abstractions for coins and categories
├── Repositories/
│   └── CoinRepository.js       # Data access repository linking variants and images
├── Requests/
│   └── CoinRequest.js          # Request payload validation rules (create, update)
├── Resources/
│   └── CoinResource.js         # API response formatting (card, detail, admin item)
├── Mappers/
│   └── CoinMapper.js           # Bidirectional CSV transformation
├── Policies/
│   └── CoinPolicy.js           # Role-based authorization policy
├── Services/
│   └── CoinService.js          # Core bullion service: pricing, stock operations, export
├── Controllers/
│   └── CoinController.js       # Express controller for HTTP requests
└── Routes/
    └── coinRoutes.js           # Router mounting `/coin`, `/admin/coin`, and backward-compatible `/coins`
```

---

## 3. Database Schema

### `coins`
```sql
CREATE TABLE coins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier VARCHAR(100) DEFAULT 'Merchant',
  sku VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(150) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES coin_categories(id) ON DELETE SET NULL,
  metal VARCHAR(50) NOT NULL,
  coin_type VARCHAR(100) NOT NULL,
  purity VARCHAR(50) NOT NULL,
  weight_g DECIMAL(10, 3) NOT NULL,
  dimension VARCHAR(100),
  denomination VARCHAR(100),
  mint VARCHAR(150),
  collection VARCHAR(150),
  edition VARCHAR(150),
  year_of_issue INTEGER,
  certification VARCHAR(255),
  making_charge DECIMAL(14, 2) DEFAULT 0.00,
  pricing_mode VARCHAR(50) DEFAULT 'METAL_LINKED',
  fixed_price DECIMAL(14, 2),
  stock INTEGER DEFAULT 0,
  description TEXT,
  image TEXT,
  status VARCHAR(20) DEFAULT 'published',
  image_kind VARCHAR(50) DEFAULT 'illustration',
  seo_title VARCHAR(255),
  meta_description TEXT,
  source_timestamp VARCHAR(255),
  created_at VARCHAR(255) NOT NULL,
  updated_at VARCHAR(255) NOT NULL
);
```

### `coin_variants`
```sql
CREATE TABLE coin_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_id INTEGER NOT NULL REFERENCES coins(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  metal VARCHAR(50) NOT NULL,
  purity VARCHAR(50) NOT NULL,
  weight_g DECIMAL(10, 3) NOT NULL,
  dimension VARCHAR(100),
  price DECIMAL(14, 2),
  fixed_price DECIMAL(14, 2),
  stock INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'published',
  created_at VARCHAR(255) NOT NULL,
  updated_at VARCHAR(255) NOT NULL
);
```

### `coin_inventory`
```sql
CREATE TABLE coin_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_id INTEGER NOT NULL REFERENCES coins(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES coin_variants(id) ON DELETE CASCADE,
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

### 4.1 Metal-Linked Bullion Pricing
For gold coins, the spot price is calculated using the active approved gold rate for the coin's purity (`24K` / `999`).
For silver coins, the spot price queries the latest silver rate:
$$\text{Metal Value} = \text{weight\_g} \times \text{Spot Rate}$$
$$\text{Total} = \text{Metal Value} + \text{making\_charge}$$
Stale rates prevent checkout authorization via `checkout_available: false`.

### 4.2 Stock Deductions & Double-Entry Ledger
When an order containing bullion items is placed:
1. `CoinService.deductStock(trx, sku, quantity)` verifies and decrements stock in `coin_variants` and `coins`.
2. An inventory log entry is created in `coin_inventory`.
3. Order cancellation restores stock and logs `order_cancelled` in the inventory ledger.

---

## 5. Endpoints & API Surface

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/coin` | Public | Storefront PLP with live bullion pricing |
| `GET` | `/api/coins` | Public | Backward-compatible alias for storefront coin PLP |
| `GET` | `/api/coin/categories` | Public | List coin categories (Gold Coins, Silver Coins) |
| `GET` | `/api/coin/:slug` | Public | Storefront PDP with assay certificate and obverse/reverse media |
| `GET` | `/api/admin/coin` | Staff | Administrative bullion listing and stock overview |
| `POST` | `/api/admin/coin` | Manager/Owner | Create new coin SKU with mint and certification details |
| `GET` | `/api/admin/coin/:sku` | Staff | Retrieve coin item for modification |
| `PATCH`| `/api/admin/coin/:sku` | Manager/Owner | Update making charges, stock, mint year, or status |
| `DELETE`| `/api/admin/coin/:sku`| Manager/Owner | Cascade delete coin, variants, images, and inventory |
| `GET` | `/api/admin/coin/export` | Staff | Stream full UTF-8 bullion catalogue CSV |
