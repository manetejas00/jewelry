# GOLD_JEWELRY_PRE_CLEANUP_AUDIT

Generated: 2026-11-14T21:14:05.095Z

---

## 1. Database Record Counts (Before Cleanup)

| Table | Records |
|---|---:|
| jewelries | 206 |
| jewelry_images | 737 |
| jewelry_variants | 207 |
| jewelry_inventory | 207 |
| jewelry_categories | 4 |

## 2. Existing Jewelry Products by Supplier

| Supplier | Count |
|---|---:|
| Fictional Preview | 6 |
| Veyora Heritage Atelier | 100 |
| Veyora Preview Collection 100 | 100 |

## 3. Existing Jewelry Categories

| ID | Slug | Name | Status |
|---|---|---|---|
| 1 | rings | Rings | active |
| 2 | earrings | Earrings | active |
| 3 | necklaces | Necklaces | active |
| 4 | bracelets | Bracelets | active |

## 4. Sample Existing Products (First 10)

| ID | SKU | Name | Category | Supplier | Pricing Mode | Price |
|---|---|---|---|---|---|---:|
| 1 | VEY-ER-12 | Eclipse Pearl Ring | Rings | Fictional Preview | GOLD_LINKED | - |
| 2 | VEY-LP-01 | Lune Pearl Drops | Earrings | Fictional Preview | FIXED | 24500 |
| 3 | VEY-AC-01 | Atelier Pearl Collar | Necklaces | Fictional Preview | GOLD_LINKED | - |
| 4 | VEY-NH-01 | Noir Halo Studs | Earrings | Fictional Preview | FIXED | 18900 |
| 5 | VEY-NC-01 | Nocturne Pearl Cuff | Bracelets | Fictional Preview | FIXED | 32750 |
| 6 | VEY-VE-01 | Velours Pearl Earrings | Earrings | Fictional Preview | FIXED | 28900 |
| 7 | VEY-RG-101 | Aurelia Sunburst Pearl Ring | Rings | Veyora Preview Collection 100 | FIXED | 21700 |
| 8 | VEY-RG-102 | Solenne Twist Pearl Ring | Rings | Veyora Preview Collection 100 | FIXED | 22800 |
| 9 | VEY-RG-103 | Celeste Crescent Pearl Ring | Rings | Veyora Preview Collection 100 | FIXED | 23800 |
| 10 | VEY-RG-104 | Iris Petal Pearl Ring | Rings | Veyora Preview Collection 100 | FIXED | 24900 |

## 5. Order Protection

- Order items referencing jewelry: **5**
- Distinct jewelry IDs in orders: **5**

### Jewelry Products Referenced by Orders (PRESERVE THESE IN HISTORY)

| ID | SKU | Name | Supplier |
|---|---|---|---|
| 1 | VEY-ER-12 | Eclipse Pearl Ring | Fictional Preview |
| 2 | VEY-LP-01 | Lune Pearl Drops | Fictional Preview |
| 3 | VEY-AC-01 | Atelier Pearl Collar | Fictional Preview |
| 4 | VEY-NH-01 | Noir Halo Studs | Fictional Preview |
| 5 | VEY-NC-01 | Nocturne Pearl Cuff | Fictional Preview |

> These products will be REMOVED from active catalogue but their order_items records preserved.

## 6. Image Storage Analysis

- Total jewelry_images records: **737**
- Images in /assets/products/: **737**
- Images in /uploads/: **0**
- Product asset directories on disk: **236**

## 7. Database Column Extensions Needed

| Column | Exists in jewelries table |
|---|---|
| source_pdf | ❌ No — will add via migration |
| source_page | ❌ No — will add via migration |
| price_source | ❌ No — will add via migration |

## 8. PDF Catalogue Inventory

Total PDFs found: **32**

| File | Size (MB) |
|---|---:|
| 1) Bahubali & Yuvraj Rings (Gold).pdf | 95.0 |
| 10) Baby Kadli(Gold).pdf | 43.0 |
| 11) Challa Rings(Gold).pdf | 13.0 |
| 12) Tortoise Rings(Gold).pdf | 7.6 |
| 13) Fancy Plain Pendants(Gold).pdf | 12.8 |
| 14) Fancy Stone Pendants(Gold).pdf | 20.9 |
| 15) God Plain Pendants(Gold).pdf | 14.1 |
| 16) Peacock Mala(Gold).pdf | 179.9 |
| 17) Vertical Mala(Gold).pdf | 7.2 |
| 18) Mangalsutra(Gold).pdf | 48.3 |
| 19) Chain Set(Gold).pdf | 10.9 |
| 2) Ladies Ring Plain (Gold).pdf | 53.1 |
| 20) Dokiya Mala(Gold).pdf | 84.7 |
| 21) Lariat(Gold).pdf | 13.7 |
| 22) Kanchan Tara Mala(Gold).pdf | 56.4 |
| 23) Turkey Mala (Gold).pdf | 45.8 |
| 24) Rudraksh Mala(Gold).pdf | 15.5 |
| 25) Flexi Kada Plain(Gold).pdf | 95.7 |
| 26) Paper Casting Pro Max Kada(Gold).pdf | 35.9 |
| 27) Tanmaniya Paper Casting Pro Max(Gold).pdf | 10.0 |
| 28) Cz Tops(Gold).pdf | 38.2 |
| 3) Ladies Ring Stone(Gold).pdf | 42.3 |
| 4) Ladies Paper Casting Plain(Gold).pdf | 14.0 |
| 5) Gents Ring Plain(Gold).pdf | 96.5 |
| 6) Gents Ring Stone(Gold).pdf | 35.6 |
| 7) Gents Rings Papercasting Plain(Gold).pdf | 33.6 |
| 8) Gents Bracelets(Gold).pdf | 47.9 |
| 9) Baby Ring Plain(Gold).pdf | 27.5 |
| 9kt/9KT BULK PCPM.pdf | 44.4 |
| 9kt/9KT BULK REGULAR CASTING.pdf | 17.0 |
| COUPLE RINGS 1-26Pages - Google Docs.pdf | 4.2 |
| Paper Casting Pro Max Kada.pdf | 35.9 |

## 9. What Will Be Deleted

**IN SCOPE (will delete):**
- All jewelry products with supplier: "Fictional Preview", "Veyora Preview Collection 100", "Veyora Heritage Atelier"
- All associated jewelry_variants records
- All associated jewelry_inventory records
- All associated jewelry_images records
- All files under public/assets/products/<product_code>/ for jewelry products
- All dist/assets/products/<product_code>/ copies for jewelry products

**OUT OF SCOPE (will NOT touch):**
- coins, coin_* tables
- kurtas, kurta_* tables
- customers, orders, order_items, payments
- staff, sessions, settings
- reviews (item_type = coin or kurta)
- Coin images (/assets/coin-art/)
- Kurta images
- Shared website assets (logos, banners)
- product_images table (legacy, coins use it)

## 10. Backup

- Database backup: `private/store.sqlite.gold-jewelry-backup-*`

---
*Audit complete. Proceed to Phase 2: Cleanup.*