# Jewelry and coin catalogue purge migration

Migration `027_purge_jewelry_and_coin_catalogue.js` permanently clears all jewelry and coin catalogue data.

It removes legacy non-Kurta `products`, independent `jewelries` and `coins`, their images, variants, inventory, reviews, import tracking, categories, attributes, supplier SKU mappings, and product lookup mappings. It retains customers, orders and order snapshots, Kurtas, rates, offers, and shared settings.

## Local database

Back up the database first, then apply versioned migrations:

```sh
sqlite3 private/store.sqlite ".backup private/store.sqlite.before-catalogue-purge"
npm run migrate
```

## Production database

Take a verified database backup and maintenance window before applying this irreversible migration. The migration refuses to run against MySQL unless the explicit confirmation variable is set:

```sh
CONFIRM_CATALOGUE_PURGE=true npm run migrate
```

Do not run `knex migrate:rollback` for this migration: deleted data cannot be recreated. Restore the pre-migration database backup if recovery is needed.
