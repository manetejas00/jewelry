# Veyora Jewels – Product Import/Export Pipeline Audit & Upgrade Plan

**Date:** November 14, 2026  
**Document:** `docs/product-import-audit.md`  

---

## 1. Existing Import/Export Pipeline

### 1.1 Architecture & Flow
The import system implemented in `server/importer.js` and `server/coin-imports.js` follows a secure, 3-stage transactional lifecycle:

```
[ Upload CSV ] 
      ↓
[ validate(kind, text) ] ── (Errors found) ──> Return row-level error array
      ↓ (No blocking errors)
[ previewImport() ] ──> Insert staged record into `import_batches` (status: 'staged')
                         Calculate before/after price diffs & inventory changes
      ↓ (Admin reviews & confirms)
[ publishImport() ] ──> Acquire mutex lock in `import_locks`
                         Execute database updates inside atomic transaction
                         Deduct subsequent paid orders placed after `source_timestamp`
                         Register SKUs in `supplier_skus`
                         Log audit trail (`publish_${kind}`)
                         Release `import_locks`
```

### 1.2 Existing Supported Feeds
| Feed Kind | Primary Table | Key Identifier | Schema Columns |
|---|---|---|---|
| `gold` | `rates` | `supplier + purity` | `['supplier','purity','currency','unit','rate','effective_date','source_timestamp']` |
| `products` | `products` | `sku` | `['supplier','product_code','sku','name','category','description','metal','purity','net_weight_g','size','finish','image','pricing_mode','fixed_price','making_flat','making_percent','stone_charge','other_charge','stock','status','source_timestamp']` |
| `coins` | `coins` | `sku` | `['supplier','sku','name','metal','coin_type','purity','weight_g','dimension','making_charge','pricing_mode','fixed_price','stock','description','image','status','image_kind','source_timestamp']` |
| `kurtas` | `products` (`is_kurta = true`) | `sku` | `['supplier','product_code','sku','name','category','description','fabric','craftsmanship','size','color','finish','image','pricing_mode','fixed_price','stock','status','source_timestamp']` |

---

## 2. Backward Compatibility & Upgrade Requirements

### 2.1 Preserving Existing Importers
All existing import scripts, cron jobs, and supplier files targeting `gold`, `products`, `coins`, and `kurtas` **must remain 100% backward compatible**. The system will:
- Continue accepting existing column sets without throwing header errors.
- Parse existing files safely while intelligently defaulting new relational attributes (e.g., mapping `metal` to primary material, `finish` to primary finish).

### 2.2 Extended Master & Relational Templates
To support the full relational classification system, the import architecture will introduce schemas and downloadable templates for:
1. **Jewellery Products (Multi-Attribute):**
   `supplier,product_code,sku,name,category,primary_material,additional_materials,craftsmanship,finish,collections,description,net_weight_g,size,image,pricing_mode,fixed_price,stock,status,source_timestamp`
2. **Gold Jewellery:** Filtered template optimized for 22K/18K/14K gold pieces.
3. **Silver Jewellery:** Filtered template for 925 sterling and oxidised silver pieces.
4. **Bullion Coins:** Expanded template for 20 coin varieties.
5. **Kurta Designs & Variants:** Supports parent design attributes with 5 colour variant SKUs and angle images per design.
6. **Product Images Gallery:**
   `product_code,sku,role,url,color,alt_text,sort_order`
7. **Master Entity Feeds:**
   - Materials (`name,slug,description,thumbnail,status,sort_order`)
   - Craftsmanship (`name,slug,description,thumbnail,status,sort_order`)
   - Finishes (`name,slug,description,status,sort_order`)
   - Collections (`name,slug,description,banner,status,sort_order`)

---

## 3. Validation & Error Handling Engine

### 3.1 Strict Pre-Flight Checks
- **Header Exactness:** CSV headers must match the registered schema.
- **Data Integrity:** Numeric validation for prices (`fixed_price > 0`, max 2 decimals), stock (`stock >= 0`, integer), and dimensions.
- **Reference Integrity:** Foreign entity validation (verifies that referenced categories, materials, and collections exist in the database or reports an actionable error).
- **Security:** Checks image URLs for valid HTTPS or local safe roots (`/uploads/`, `/assets/`) and rejects path traversal (`..`).

### 3.2 Row-Level Error Reports
When invalid rows are detected, the system generates a structured error manifest:
```json
[
  { "row": 4, "field": "sku", "value": "VEY-RG-01", "correction": "Duplicate SKU in batch" },
  { "row": 9, "field": "primary_material", "value": "Titanium", "correction": "Use a supported master material (Gold, Silver, etc.)" }
]
```
Administrators can download this report immediately as an error CSV via `/api/admin/import/:id/errors`.
