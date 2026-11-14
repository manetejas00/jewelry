# Catalogue Import Validation Rules & Constraint Matrix

## 1. Global Field Validation Rules

| Field Name | Type | Constraints | Failure Action |
|---|---|---|---|
| `sku` | String | 3–64 chars, regex `^[A-Za-z0-9_-]+$`, unique | Row rejected with `INVALID_SKU` |
| `name` | String | 3–255 chars, non-empty, trimmed | Row rejected with `NAME_REQUIRED` |
| `price` | Decimal | >= 0, max 99,999,999.00 INR | Row rejected with `INVALID_PRICE` |
| `stock` | Integer | >= 0, integer | Defaults to 0 if empty |
| `status` | Enum | `published`, `draft`, `archived` | Defaults to `published` |

---

## 2. Category & Bullion Constraints

### 2.1 Bullion Coins
- **`metal`**: Must be either `gold` or `silver` (case-insensitive).
- **`purity`**: Gold must be `24K (999)` or `24K`; Silver must be `999 Fine Silver` or `999`.
- **`weight_g`**: Must be positive float (e.g. `1`, `2`, `4`, `5`, `8`, `10`, `20`, `25`, `50`, `100`, `250`).
- **`making_charge`**: Must be non-negative number.
- **`image`**: Must reference a valid image path under `/assets/coin-art/` or HTTPS URL.

### 2.2 Chicken Curry Kurtas
- **`size`**: Must be one of `['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']`. Any unrecognized size (e.g. `38`, `Free Size`) fails validation.
- **`hex_color`**: Must match hex color pattern `^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$`.
- **`color_code`**: 3–5 alphanumeric uppercase characters (e.g. `IVO`, `BLU`, `SAG`).
- **`image_front`**: Mandatory; cannot be null or empty.

---

## 3. Relational Foreign Key Integrity
- When `materials` column contains pipe-separated slugs (`18k-gold|natural-diamond`), each slug is queried against `materials.slug`. Unrecognized slugs are logged as non-blocking warnings, and valid matches are inserted into `product_materials`.
- When `craftsmanship` contains slugs (`jadau|kundan`), each is verified against `craftsmanship.slug` and linked in `product_craftsmanship`.
- When `collections` contains slugs (`gold|silver|royal-bridal`), entries are linked in `product_collections`.
