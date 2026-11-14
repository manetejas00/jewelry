# REST API Documentation: Jewelry, Coin & Kurta Architecture

## 1. Architectural Overview & Conventions

The platform features three independent product modules—**Jewelry**, **Coin**, and **Kurta**—backed by dedicated database tables and decoupled service layers. Shared cross-cutting operations (Pricing, Orders/Checkout, Reviews, and Importer) are fully type-aware and operate polymorphically across all three domains.

- **Base URL**: `/api`
- **Storefront Endpoints**: Public, cookie-based session tracking for cart/bag and customer identity.
- **Admin Endpoints**: Prefixed with `/api/admin/`. Protected by session authentication and Role-Based Access Control (RBAC):
  - `owner` / `manager`: Full CRUD, pricing management, imports, exports, status changes.
  - `editor` / `viewer`: Read-only access to admin listings, detail views, and exports.
- **Content Types**:
  - Request: `application/json` (or `multipart/form-data` for uploads, UTF-8 CSV strings for importer).
  - Response: `application/json` (or `text/csv` for exports and sample templates).

---

## 2. Fine Jewelry Module Endpoints

### 2.1 Public Storefront Endpoints

#### `GET /api/jewelry`
Retrieves a paginated catalog of active fine jewelry items with gold-rate linked pricing calculations.

- **Query Parameters**:
  - `category` *(optional, string)*: Filter by category slug (e.g., `rings`, `earrings`, `necklaces`, `bracelets`).
  - `metal` *(optional, string)*: `Gold` or `Silver`.
  - `purity` *(optional, string)*: `18K`, `22K`, `24K`, `925`.
  - `min_price` *(optional, number)*: Lower bound on estimated price in INR.
  - `max_price` *(optional, number)*: Upper bound on estimated price in INR.
  - `search` *(optional, string)*: Keyword search across title, description, SKU, and metal type.
  - `limit` *(optional, integer, default: 24)*: Items per page.
  - `offset` *(optional, integer, default: 0)*: Pagination offset.
- **Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 101,
      "sku": "JWL-RNG-001",
      "product_code": "JWL-RNG",
      "slug": "aurora-solitaire-diamond-ring",
      "name": "Aurora Solitaire Diamond Ring",
      "category": "Rings",
      "category_slug": "rings",
      "metal": "Gold",
      "purity": "18K",
      "gross_weight_g": 3.85,
      "net_weight_g": 3.42,
      "making_charges": 2500.0,
      "gst_percent": 3.0,
      "base_price": 42000.0,
      "calculated_price": 48250.0,
      "stock": 14,
      "status": "published",
      "hero_image": "/assets/products/JWL-RNG/hero.webp",
      "thumbnails": {
        "square": "/assets/products/JWL-RNG/hero_sq.webp",
        "card": "/assets/products/JWL-RNG/hero_card.webp"
      }
    }
  ],
  "total": 206,
  "limit": 24,
  "offset": 0
}
```

#### `GET /api/jewelry/categories`
Lists all active jewelry categories.

- **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "slug": "rings",
    "name": "Rings",
    "description": "Fine artisan rings in gold and silver.",
    "thumbnail": "/assets/categories/rings.webp",
    "status": "active",
    "sort_order": 1
  }
]
```

#### `GET /api/jewelry/:slug`
Fetches a single jewelry piece by URL slug, including all variants, high-resolution media, live gold-rate breakdown, and reviews.

- **Path Parameters**:
  - `slug` *(required, string)*: SEO slug of the jewelry piece.
- **Response `200 OK`**:
```json
{
  "id": 101,
  "sku": "JWL-RNG-001",
  "product_code": "JWL-RNG",
  "slug": "aurora-solitaire-diamond-ring",
  "name": "Aurora Solitaire Diamond Ring",
  "category": "Rings",
  "description": "Handcrafted 18K Yellow Gold ring with conflict-free brilliant solitaire.",
  "metal": "Gold",
  "purity": "18K",
  "gross_weight_g": 3.85,
  "net_weight_g": 3.42,
  "stone_details": "0.50 ct Brilliant Round Cut VVS1 Diamond",
  "making_charges": 2500.0,
  "gst": 3.0,
  "live_pricing": {
    "gold_rate_per_g": 6250.0,
    "metal_value": 21375.0,
    "stone_charge": 22000.0,
    "making_charges": 2500.0,
    "subtotal": 45875.0,
    "tax_gst": 1376.25,
    "final_price": 47251.25
  },
  "variants": [
    {
      "id": 501,
      "sku": "JWL-RNG-001-S12",
      "size": "12",
      "finish": "High Polish Yellow Gold",
      "stock": 5,
      "price": 47251.25
    }
  ],
  "images": [
    { "role": "hero", "url": "/assets/products/JWL-RNG/hero.webp", "alt_text": "Front view" },
    { "role": "back", "url": "/assets/products/JWL-RNG/side.webp", "alt_text": "Profile view" }
  ],
  "rating_summary": { "average": 4.85, "count": 12 }
}
```

---

### 2.2 Admin Endpoints (Staff Only)

#### `GET /api/admin/jewelry`
Paginated search and administrative list of jewelry items.

- **Query Parameters**: `search`, `category`, `status` (`published` | `draft` | `archived`), `page`, `limit`.
- **Response `200 OK`**: Paginated array of administrative jewelry records.

#### `POST /api/admin/jewelry`
Creates a new fine jewelry item with automatic variant initialization and opening inventory ledger entry.

- **Permissions**: `owner`, `manager`
- **Request Body**:
```json
{
  "sku": "JWL-NECK-105",
  "name": "Heirloom Kundan Polki Choker",
  "category_id": 3,
  "category": "Necklaces",
  "description": "22K gold Kundan bridal necklace set with uncut diamonds.",
  "metal": "Gold",
  "purity": "22K",
  "gross_weight_g": 48.5,
  "net_weight_g": 42.0,
  "making_charges": 12000.0,
  "making_percent": 14.5,
  "gst": 3.0,
  "fixed_price": null,
  "pricing_mode": "GOLD_LINKED",
  "stone_charge": 35000.0,
  "stock": 2,
  "status": "published",
  "image": "/assets/products/JWL-NECK-105/hero.webp"
}
```
- **Response `201 Created`**: `{ "ok": true, "id": 207, "sku": "JWL-NECK-105" }`

#### `GET /api/admin/jewelry/:sku`
Fetches administrative details for a jewelry piece by master SKU.

#### `PATCH /api/admin/jewelry/:sku`
Updates jewelry specifications, weights, charges, or status.
- **Permissions**: `owner`, `manager`
- **Response `200 OK`**: `{ "ok": true, "updated": "JWL-NECK-105" }`

#### `DELETE /api/admin/jewelry/:sku`
Removes a jewelry piece, cascading variant, media, and inventory records.
- **Permissions**: `owner`, `manager`
- **Response `200 OK`**: `{ "ok": true, "deleted": "JWL-NECK-105" }`

#### `GET /api/admin/jewelry/export`
Exports the entire jewelry catalog as a CSV spreadsheet.
- **Response `200 OK`**: `Content-Type: text/csv` with `Content-Disposition: attachment; filename="jewelry-export-YYYY-MM-DD.csv"`.

---

## 3. Bullion & Coin Module Endpoints

### 3.1 Public Storefront Endpoints

#### `GET /api/coin` *(Alias: `/api/coins`)*
Lists investment gold and silver coins, bars, and medallions.

- **Query Parameters**:
  - `metal` *(optional)*: `Gold` or `Silver`.
  - `purity` *(optional)*: `24K`, `999`, `999.9`.
  - `weight` *(optional, number)*: Gram weight (e.g., `1`, `5`, `10`, `50`, `100`).
  - `category` *(optional)*: `gold-coins`, `silver-coins`, `bullion-bars`.
  - `search` *(optional)*: Query term.
- **Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 1,
      "sku": "COIN-G-1G",
      "slug": "1g-24k-999-lakshmi-gold-coin",
      "name": "1 Gram 24K 999 Lakshmi Gold Coin",
      "metal": "Gold",
      "purity": "24K",
      "weight_g": 1.0,
      "denomination": "1 Gram",
      "mint": "Veyora Bullion Refinery",
      "collection": "Divine Blessings",
      "edition": "2026 Sovereign Edition",
      "certification": "NABL Accredited Assay Card",
      "calculated_price": 7850.0,
      "stock": 50,
      "status": "published",
      "hero_image": "/assets/coins/COIN-G-1G/hero.webp"
    }
  ],
  "total": 20
}
```

#### `GET /api/coin/:slug`
Fetches a single bullion coin with assay specifications, live metal pricing, tamper-proof packaging details, and certification records.

---

### 3.2 Admin Endpoints (Staff Only)

- `GET /api/admin/coin` (or `/api/admin/coins`): Paginated administrative listing.
- `POST /api/admin/coin`: Creates a new bullion coin with weight, assay, and packaging metadata.
- `GET /api/admin/coin/:sku`: Fetches coin administrative details.
- `PATCH /api/admin/coin/:sku`: Updates coin pricing, stock, mint, or status.
- `DELETE /api/admin/coin/:sku`: Removes coin and cascades variant/media records.
- `GET /api/admin/coin/export`: Exports all bullion coins to CSV.

---

## 4. Apparel / Kurta Module Endpoints

### 4.1 Public Storefront Endpoints

#### `GET /api/kurta` *(Alias: `/api/kurtas`)*
Lists handcrafted Lucknowi Chikankari kurtas with apparel filter attributes.

- **Query Parameters**:
  - `category` *(optional)*: `chicken-curry-kurtas`, `cotton-chikankari`, `georgette-kurtas`, `chanderi-silk-kurtas`.
  - `fabric` *(optional)*: `Mulmul Cotton`, `Viscose Georgette`, `Chanderi Silk`.
  - `color` *(optional)*: Color name (e.g., `Ivory White`, `Pastel Peach`, `Powder Blue`, `Emerald Green`).
  - `size` *(optional)*: `XS (34)`, `S (36)`, `M (38)`, `L (40)`, `XL (42)`, `XXL (44)`, `XXXL (46)`.
  - `occasion` *(optional)*: `Festive`, `Daily Wear`, `Occasion Wear`.
  - `min_price`, `max_price`, `search`, `limit`, `offset`.
- **Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 1,
      "product_code": "CK-001",
      "slug": "heritage-mulmul-chikankari-kurta",
      "name": "Heritage Mulmul Chikankari Kurta",
      "category": "Chicken Curry Kurtas",
      "fabric": "Pure Mulmul Cotton",
      "pattern": "Handcrafted Lucknowi Chikankari",
      "fit": "Straight Fit",
      "available_sizes": ["XS (34)", "S (36)", "M (38)", "L (40)", "XL (42)", "XXL (44)", "XXXL (46)"],
      "available_colors": [
        { "name": "Ivory White", "code": "ivory-white", "hex": "#fdfbf7" },
        { "name": "Pastel Peach", "code": "pastel-peach", "hex": "#ffdab9" }
      ],
      "price": 3499.0,
      "sale_price": 2999.0,
      "stock": 140,
      "hero_image": "/assets/products/CK-001/hero.webp"
    }
  ],
  "total": 50
}
```

#### `GET /api/kurta/:slug`
Fetches a single kurta design silhouette along with its complete 7-size variant matrix, color options, and multi-angle fabric photos.

---

### 4.2 Admin Endpoints (Staff Only)

- `GET /api/admin/kurta` (or `/api/admin/kurtas`): Paginated administrative listing.
- `POST /api/admin/kurta`: Creates a new kurta design, automatically generating child size variants across specified colors.
- `GET /api/admin/kurta/:code`: Fetches master design, all variants, and media.
- `PATCH /api/admin/kurta/:code`: Updates design attributes, pricing, or status.
- `DELETE /api/admin/kurta/:code`: Deletes master design and all child size variants.
- `GET /api/admin/kurta/export`: Exports kurta designs and variants to CSV.

---

## 5. Shared Type-Aware Subsystems

### 5.1 Pricing Quotes (`POST /api/pricing/quote`)
Calculates item-level prices and applied discounts across heterogeneous cart contents.

- **Request Body**:
```json
{
  "items": [
    { "sku": "JWL-RNG-001-S12", "qty": 1 },
    { "sku": "COIN-G-1G", "qty": 2 },
    { "sku": "CK-001-IVR-M38", "qty": 1 }
  ],
  "offerCode": "FESTIVE10"
}
```
- **Response `200 OK`**:
```json
{
  "lines": [
    {
      "sku": "JWL-RNG-001-S12",
      "item_type": "jewelry",
      "name": "Aurora Solitaire Diamond Ring (Size 12)",
      "unit_price": 47251.25,
      "qty": 1,
      "total": 47251.25
    },
    {
      "sku": "COIN-G-1G",
      "item_type": "coin",
      "name": "1 Gram 24K 999 Lakshmi Gold Coin",
      "unit_price": 7850.0,
      "qty": 2,
      "total": 15700.0
    },
    {
      "sku": "CK-001-IVR-M38",
      "item_type": "kurta",
      "name": "Heritage Mulmul Chikankari Kurta - Ivory White (M 38)",
      "unit_price": 2999.0,
      "qty": 1,
      "total": 2999.0
    }
  ],
  "subtotal": 65950.25,
  "discount": 1500.0,
  "tax": 1978.51,
  "shipping": 0.0,
  "grand_total": 66428.76
}
```

---

### 5.2 Checkout & Orders (`POST /api/orders/checkout`)
Processes purchase, locks and decrements inventory in the appropriate module inventory table (`jewelry_inventory`, `coin_inventory`, or `kurta_inventory`), and records polymorphic order items.

- **Request Body**:
```json
{
  "customer": {
    "name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "mobile": "9876543210"
  },
  "shipping_address": {
    "line1": "Flat 402, Royal Palms",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400050",
    "country": "IN"
  },
  "items": [
    { "sku": "JWL-RNG-001-S12", "qty": 1 },
    { "sku": "CK-001-IVR-M38", "qty": 1 }
  ],
  "payment_method": "razorpay"
}
```
- **Response `200 OK`**:
```json
{
  "ok": true,
  "order_id": 1042,
  "order_number": "ORD-2026-1042",
  "grand_total": 50250.25,
  "status": "pending_payment"
}
```

---

### 5.3 Reviews & Ratings (`POST /api/reviews`)
Polymorphic customer feedback endpoint accepting target `item_type`.

- **Request Body**:
```json
{
  "item_type": "jewelry",
  "subject_id": 101,
  "rating": 5,
  "title": "Exquisite craftsmanship!",
  "body": "The diamond brilliance and gold finish surpassed expectations.",
  "author_name": "Priyanka M."
}
```
- **Supported `item_type` values**:
  - `jewelry`: Links review to `jewelry_id`
  - `coin`: Links review to `coin_id`
  - `kurta`: Links review to `kurta_id`

---

### 5.4 Bulk Importers & Sample Files

#### `GET /api/admin/samples/:file`
Downloads standardized CSV template files:
- `jewelry-template.csv`: Fine jewelry schema with metal weights, purity, making charges, and stone charges.
- `coin-template.csv`: Bullion coin schema with mint, denomination, weight, and assay fields.
- `kurta-template.csv`: Apparel schema with fabric, pattern, size matrix, and color fields.

#### `POST /api/admin/import/preview`
Pre-validates a CSV batch, checks duplicate SKUs, verifies categories, and returns row-level error reports before database insertion.

#### `POST /api/admin/import/:id/publish`
Atomically executes the validated import batch and balances inventory ledger tables.

---

## 6. HTTP Status Codes & Error Handling

All error responses adhere to the standard JSON payload:
```json
{
  "error": "Validation failed",
  "fields": {
    "sku": "SKU JWL-RNG-001 already exists in the jewelry catalog",
    "net_weight_g": "Gold-linked jewelry requires a positive net_weight_g"
  }
}
```

| HTTP Code | Description | Typical Cause |
| :--- | :--- | :--- |
| `200 OK` | Success | Request succeeded. |
| `201 Created` | Created | Item successfully created. |
| `400 Bad Request` | Bad Request | Malformed JSON or invalid query parameter. |
| `401 Unauthorized` | Auth Required | Unauthenticated request to an admin endpoint. |
| `403 Forbidden` | Access Denied | Staff role lacks required permissions (`manager` / `owner`). |
| `404 Not Found` | Not Found | Item, category, or slug does not exist. |
| `422 Unprocessable`| Validation Error | Field violation (duplicate SKU, non-positive weight, invalid metal). |
| `500 Server Error` | Server Error | Internal processing failure. |
