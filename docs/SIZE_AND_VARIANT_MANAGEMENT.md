# Size and Variant Management System — XS to XXXL

## 1. System Overview

Every Chicken Curry Kurta style supports seven discrete sizes conforming to international and Indian apparel standards:
`XS (34)`, `S (36)`, `M (38)`, `L (40)`, `XL (42)`, `XXL (44)`, and `XXXL (46)`.

The platform implements true variant-level stock management, ensuring each size possesses independent inventory tracking, stock decrement locks during checkout, and out-of-stock disabling.

---

## 2. Definitive Sizing Specification (`KURTA_SIZES`)

The measurement specifications defined in `src/kurta-constants.js` and enforced by `server/kurtas.js`:

| Size Code | Label | Garment Chest | Waist | Hip | Shoulder | Kurta Length | Sleeve Length |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **XS** | XS (34) | 36" | 32" | 38" | 14.0" | 44" | 18.5" |
| **S** | S (36) | 38" | 34" | 40" | 14.5" | 44" | 19.0" |
| **M** | M (38) | 40" | 36" | 42" | 15.0" | 44" | 19.0" |
| **L** | L (40) | 42" | 38" | 44" | 15.5" | 45" | 19.5" |
| **XL** | XL (42) | 44" | 40" | 46" | 16.0" | 45" | 19.5" |
| **XXL** | XXL (44) | 46" | 42" | 48" | 16.5" | 46" | 20.0" |
| **XXXL** | XXXL (46) | 48" | 44" | 50" | 17.0" | 46" | 20.0" |

> **Fitting Advice for Customers:** Lucknowi Chikankari kurtas feature a straight-cut silhouette with side slits. Customers should select a garment chest measurement that is 2 to 3 inches larger than their natural body chest circumference for ideal movement and comfort.

---

## 3. Database Schema & Data Integrity

Each variant is recorded as a dedicated row in the `products` table sharing a common `product_code`:

```sql
SELECT sku, product_code, size, stock, is_kurta 
FROM products 
WHERE product_code = 'lucknowi-ivory-chikankari-cotton-kurta';
```

Output:
- `CCK-IVORY-XS` | `XS (34)` | Stock: 8 | `is_kurta: 1`
- `CCK-IVORY-S`  | `S (36)`  | Stock: 12 | `is_kurta: 1`
- `CCK-IVORY-M`  | `M (38)`  | Stock: 15 | `is_kurta: 1`
- `CCK-IVORY-L`  | `L (40)`  | Stock: 18 | `is_kurta: 1`
- `CCK-IVORY-XL` | `XL (42)` | Stock: 10 | `is_kurta: 1`
- `CCK-IVORY-XXL`| `XXL (44)`| Stock: 8 | `is_kurta: 1`
- `CCK-IVORY-XXXL`| `XXXL (46)`| Stock: 5 | `is_kurta: 1`

### Concurrency & Cart Safety
1. **Quote Verification:** `/api/quote` validates that the requested SKU has sufficient stock.
2. **Order Decrement:** Upon placing an order, `orders.js` executes an atomic decrement in a SQLite transaction (`UPDATE products SET stock = stock - ? WHERE sku = ? AND stock >= ?`).
3. **Out-of-Stock Prevention:** Sizes with 0 stock are disabled in the storefront selector with strikethrough styling and cannot be added to the shopping bag.
