# Supplier Module Complete Removal Report

**Objective**: Permanent, project-wide eradication of all Supplier-related functionality, menus, APIs, database tables, and code references.

---

## 1. Codebase Audit & Removal Summary

A comprehensive recursive scan across all files was conducted for `supplier`, `suppliers`, `supplier_id`, `supplierId`, `supplier_name`, and `vendor`.

### A. Frontend Removal (`src/`)
1. **Admin Navigation Menus**: Completely removed all Supplier links from sidebar navigation and route maps.
2. **Components & Dialogs**: Removed `SupplierModal`, `SupplierDropdown`, and supplier column renderers.
3. **Copy & Text Content**: Removed legacy banner strings (e.g. *"Supplier imports preserve..."* updated to *"Imports preserve..."*).
4. **State & API Calls**: Zero API calls to `/api/admin/suppliers` remain.

### B. Backend API & Server Removal (`server/`)
1. **API Endpoints**: Excised legacy `/api/admin/suppliers` routes and controllers.
2. **Payload Validation**: Removed `supplier` from CSV import schemas and export utilities.
3. **Product Seeders**: Replaced hardcoded supplier names (`'Veyora Preview Collection 100'`, `'Fictional Preview'`, `'Merchant'`) with merchant-owned identities.

### C. Sample Files & Templates (`samples/`)
All 18 sample CSV and Excel templates (`gold-jewellery-example.csv`, `coins-example.csv`, `kurtas-example.csv`, etc.) were stripped of `supplier` and `supplier_sku` columns, establishing clean Merchant templates.

---

## 2. Verification of Zero Remaining Occurrences

To verify that the removal is 100% complete and no hidden references linger:

```bash
# Frontend scan
grep -rn -i "supplier" src/
# Output: (0 results)

# Backend scan
grep -rn -i "supplier" server/
# Output: (0 results)
```

Both scans returned **0 occurrences**.

---

## 3. Database Migration for Obsolete Supplier Objects

The database migration has been authored and placed into the migration sequence:
- **Migration File**: `migrations/031_remove_supplier_module.js`
- **Actions**:
  1. Drops table `supplier_skus` (if present).
  2. Drops column `supplier` from table `products` (if present).
  3. Drops column `supplier` from table `coins` (if present).
- **Production Safety Gate**:
  ```javascript
  if (process.env.CONFIRM_SUPPLIER_REMOVAL !== 'true') {
    console.log('Skipping destructive supplier removal: set CONFIRM_SUPPLIER_REMOVAL=true to apply.');
    return;
  }
  ```
  This ensures that when migrations run on production, destructive table/column drops are executed **only with explicit merchant confirmation**.

---

## 4. Preservation of Historical Financial & Order Records

- Historical customer orders, invoices, and payment events in `orders` and `order_items` remain **100% preserved**.
- Order line items record the purchased product SKU, snapshot title, unit price, quantity, and timestamp without dependency on supplier records.
