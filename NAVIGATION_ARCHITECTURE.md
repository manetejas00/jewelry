# Navigation architecture

## Audit and outcome

The previous header treated Kurtas, All jewellery, Coins, Earrings, Necklaces,
Rings, and Bracelets as peers. The data layer already separates Jewelry,
Kurtas, and Coins into independent modules (`jewelries`, `kurtas`, and
`coins`), but the header did not reflect that structure.

The storefront header now has exactly three parent entries: **Jewelry**,
**Kurta**, and **Coins**. Its mega-menu is populated by `/api/navigation`,
which reads published catalogue data. It therefore never presents a category,
metal, or gender with no matching published product.

## Browsing rules

- `/jewelry` is All Jewelry; `/jewelry?gender=Men|Women|Unisex` filters it.
- `/jewelry/browse/:category` is a type/category listing.
- `/kurtas` is All Kurtas; `/kurtas?gender=Men|Women|Unisex` filters it.
- `/coins`, `/coins/gold`, and `/coins/silver` retain their existing URLs.
- Existing product detail and legacy collection URLs are unchanged.
- Unisex Jewelry and Kurtas appear in both Men and Women browsing. `Not
  Specified` products appear only in the module-wide All view.

## Data changes

Migration `030_navigation_hierarchy_and_gender` is additive. It adds
`parent_id`, `show_in_nav`, and optional category gender metadata to category
tables, adds Jewelry `gender` (`Men`, `Women`, `Unisex`, `Not Specified`), and
indexes Kurta gender/category browsing. It does not seed, rename, or delete
products or categories.

Apply with `npm run migrate`. Rollback is supported only for migration 030;
it removes these added navigation fields and index. Earlier catalogue purge
migrations remain intentionally irreversible and are unrelated to this work.

## Admin and import compatibility

Jewelry create/update accepts and returns `gender`; existing imports without a
gender value remain valid and receive `Not Specified`. Kurta gender already
exists and is now returned to storefront listing cards. The existing category
admin remains the place for category status, order, SEO fields, and imagery.

## Verification

`npm run build` passes after the navigation changes. Manual browser validation
is still recommended after applying the migration with the production catalogue:
open each parent menu, test a gender path, verify an empty type is absent, and
confirm mobile drawer close/outside/Escape behavior.
