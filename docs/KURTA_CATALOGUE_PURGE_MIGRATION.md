# Kurta catalogue purge migration

Migration `029_purge_kurta_catalogue.js` permanently removes all legacy and independent Kurta catalogue records. It clears Kurta products, images, variants, inventory, reviews, attributes, categories, supplier SKU mappings, and product lookup mappings. Customers, orders and order snapshots, rates, offers, and shared settings remain intact.

## Production database

Take and verify a private MySQL backup first. Then apply the migration in an approved maintenance window:

```sh
CONFIRM_KURTA_CATALOGUE_PURGE=true npm run migrate
```

The migration cannot be rolled back. Restore the pre-migration database backup to recover removed data.
