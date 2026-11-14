# Kurta & Apparel Module Documentation

## 1. Overview & Domain Boundaries

The **Kurta Module** manages the luxury apparel category, specializing in authentic handcrafted Lucknowi Chikankari kurtas, tunics, and ethnic wear. It introduces multi-variant family cards, 7 standardized sizing codes (`XS` to `XXXL`), fabric attributes, multi-color palette grouping, and specialized size-chart recommendations.

- **Domain Scope:** Lucknowi Chikankari apparel (Mulmul Cotton, Chanderi Silk, Georgette, Modal).
- **Pricing Strategy:** Fixed luxury price per style/variant, with promotional percentage/flat discounts.
- **Dedicated Tables:**
  - `kurtas`: Master design silhouettes and style codes.
  - `kurta_categories`: Apparel category taxonomy.
  - `kurta_variants`: Size variants (`XS (34)` to `XXXL (46)`) and color variations.
  - `kurta_images`: Multi-angle editorial photography (`hero`, `front`, `right`, `left`, `back`, `model`, `detail`).
  - `kurta_attributes` & `kurta_attribute_values`: EAV fabric, weave, and embroidery details.
  - `kurta_inventory`: Double-entry inventory ledger per size SKU.

---

## 2. Architecture & File Structure

```text
server/modules/kurta/
├── Constants/
│   └── KurtaConstants.js       # 7-size definitions (measurements in inches/cm), fabrics, roles, CSV schemas
├── Entities/
│   └── KurtaEntity.js          # KurtaEntity and KurtaVariantEntity
├── Models/
│   └── KurtaModel.js           # Database queries for kurtas, variants, and categories
├── Repositories/
│   └── KurtaRepository.js      # Data access layer assembling style variants and angles
├── Requests/
│   └── KurtaRequest.js         # Input validation (size stock maps, price boundaries)
├── Resources/
│   └── KurtaResource.js        # Family card grouping, color swatch mapping, and PDP size charts
├── Mappers/
│   └── KurtaMapper.js          # CSV importer/exporter transformations
├── Policies/
│   └── KurtaPolicy.js          # Staff permission enforcement
├── Services/
│   └── KurtaService.js         # Core apparel service: 7-size auto-variant creation, stock transactions
├── Controllers/
│   └── KurtaController.js      # Express HTTP controller
└── Routes/
    └── kurtaRoutes.js          # Public routes (`/kurta`, `/kurta/:slug`) and admin (`/admin/kurta`)
```

---

## 3. Database Schema

### `kurtas`
```sql
CREATE TABLE kurtas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier VARCHAR(100) DEFAULT 'Lucknow Heritage Maison',
  product_code VARCHAR(100) NOT NULL UNIQUE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(150) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES kurta_categories(id) ON DELETE SET NULL,
  category VARCHAR(100) DEFAULT 'Kurtas',
  description TEXT,
  fabric VARCHAR(100),
  pattern VARCHAR(100),
  fit VARCHAR(100),
  sleeve_type VARCHAR(100),
  neck_type VARCHAR(100),
  occasion VARCHAR(100),
  gender VARCHAR(50) DEFAULT 'Women',
  available_sizes TEXT,
  available_colors TEXT,
  material VARCHAR(100),
  price DECIMAL(14, 2),
  sale_price DECIMAL(14, 2),
  fixed_price DECIMAL(14, 2),
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

### `kurta_variants`
```sql
CREATE TABLE kurta_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kurta_id INTEGER NOT NULL REFERENCES kurtas(id) ON DELETE CASCADE,
  product_code VARCHAR(100) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(150) NOT NULL UNIQUE,
  size VARCHAR(50) NOT NULL,
  color VARCHAR(100),
  color_code VARCHAR(100),
  hex_color VARCHAR(50),
  finish VARCHAR(100),
  price DECIMAL(14, 2),
  fixed_price DECIMAL(14, 2),
  stock INTEGER DEFAULT 0,
  image TEXT,
  status VARCHAR(20) DEFAULT 'published',
  created_at VARCHAR(255) NOT NULL,
  updated_at VARCHAR(255) NOT NULL
);
```

### `kurta_inventory`
```sql
CREATE TABLE kurta_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kurta_id INTEGER NOT NULL REFERENCES kurtas(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES kurta_variants(id) ON DELETE CASCADE,
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

### 4.1 Standardized 7-Size System
Every Kurta style automatically configures 7 dedicated size variants:
- `XS (34)`: Chest 36", Waist 32", Hip 38", Length 44"
- `S (36)`: Chest 38", Waist 34", Hip 40", Length 44"
- `M (38)`: Chest 40", Waist 36", Hip 42", Length 44"
- `L (40)`: Chest 42", Waist 38", Hip 44", Length 45"
- `XL (42)`: Chest 44", Waist 40", Hip 46", Length 45"
- `XXL (44)`: Chest 46", Waist 42", Hip 48", Length 46"
- `XXXL (46)`: Chest 48", Waist 44", Hip 50", Length 46"

### 4.2 Family Card Aggregation & Swatches
The storefront listing clusters variants by `product_code`. It dynamically generates:
- `minPrice` and `maxPrice` range.
- Available color swatches with respective representative thumbnails and hex codes.
- Size chips showing live stock availability per size.

### 4.3 Stock Deductions
When an order item specifies a size SKU (e.g., `CCK-NOOR-BLU-M`):
1. `KurtaService.deductStock(trx, sku, quantity)` decrements the specific variant's stock.
2. It decrements the master style's total stock.
3. It appends an audit entry into `kurta_inventory`.

---

## 5. Endpoints & API Surface

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/kurta` | Public | Storefront PLP returning style family cards |
| `GET` | `/api/kurtas` | Public | Backward-compatible alias for kurta PLP |
| `GET` | `/api/kurta/categories`| Public | Active kurta categories |
| `GET` | `/api/kurta/:slug` | Public | Storefront PDP with size selector, color swatches, and size chart modal |
| `GET` | `/api/admin/kurta` | Staff | Admin listing with per-size stock matrix |
| `POST` | `/api/admin/kurta` | Manager/Owner | Create new kurta style with 7-size auto-variant generation |
| `GET` | `/api/admin/kurta/:code`| Staff | Retrieve kurta style details for admin modal |
| `PATCH`| `/api/admin/kurta/:code`| Manager/Owner | Update per-size stock counts and master details |
| `DELETE`| `/api/admin/kurta/:code`| Manager/Owner | Cascade delete kurta style, all 7 size variants, images, and inventory |
| `GET` | `/api/admin/kurta/export`| Staff | Download complete apparel CSV snapshot |
