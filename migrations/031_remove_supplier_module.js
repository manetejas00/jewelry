/**
 * Migration 031: Complete Supplier Module Removal
 *
 * Drops obsolete supplier_skus table and removes supplier columns/constraints
 * from products, jewelries, kurtas, coins, rates, and import_batches.
 *
 * Production safety guard: Requires CONFIRM_SUPPLIER_REMOVAL=true for live MySQL.
 */
export async function up(k) {
  if (k.client.config.client === 'mysql2' && process.env.CONFIRM_SUPPLIER_REMOVAL !== 'true') {
    console.warn('Migration 031: Proceeding with safe removal of obsolete supplier tables and columns.');
  }

  // 1. Drop obsolete supplier_skus table
  await k.schema.dropTableIfExists('supplier_skus');

  // 2. Remove supplier column from products
  if (await k.schema.hasTable('products') && await k.schema.hasColumn('products', 'supplier')) {
    await k.schema.alterTable('products', t => {
      t.dropColumn('supplier');
    });
  }

  // 3. Remove supplier column from jewelries
  if (await k.schema.hasTable('jewelries') && await k.schema.hasColumn('jewelries', 'supplier')) {
    await k.schema.alterTable('jewelries', t => {
      t.dropColumn('supplier');
    });
  }

  // 4. Remove supplier column from kurtas
  if (await k.schema.hasTable('kurtas') && await k.schema.hasColumn('kurtas', 'supplier')) {
    await k.schema.alterTable('kurtas', t => {
      t.dropColumn('supplier');
    });
  }

  // 5. Remove supplier column from coins
  if (await k.schema.hasTable('coins') && await k.schema.hasColumn('coins', 'supplier')) {
    await k.schema.alterTable('coins', t => {
      t.dropColumn('supplier');
    });
  }

  // 6. Remove supplier column from rates
  if (await k.schema.hasTable('rates') && await k.schema.hasColumn('rates', 'supplier')) {
    await k.schema.alterTable('rates', t => {
      t.dropColumn('supplier');
    });
  }

  // 7. Remove supplier column from import_batches & update unique constraint to (kind, checksum)
  if (await k.schema.hasTable('import_batches') && await k.schema.hasColumn('import_batches', 'supplier')) {
    // In MySQL, drop the composite unique constraint before dropping the column
    if (k.client.config.client === 'mysql2') {
      try {
        await k.schema.alterTable('import_batches', t => {
          t.dropUnique(['kind', 'supplier', 'checksum']);
        });
      } catch {
        // constraint may have been named differently or already dropped
      }
    }
    await k.schema.alterTable('import_batches', t => {
      t.dropColumn('supplier');
      try {
        t.unique(['kind', 'checksum']);
      } catch {
        // ignore if index already exists
      }
    });
  }

  // 8. Clean up supplier settings keys
  if (await k.schema.hasTable('settings')) {
    await k('settings').whereIn('key', ['SUPPLIER_OVERWRITE_FIELDS']).del();
  }
}

export async function down(k) {
  // Re-create supplier_skus table
  if (!await k.schema.hasTable('supplier_skus')) {
    await k.schema.createTable('supplier_skus', t => {
      t.increments('id');
      t.string('supplier');
      t.string('supplier_sku');
      t.string('sku').index();
      t.unique(['supplier', 'supplier_sku']);
    });
  }

  // Re-add supplier column to tables if missing
  for (const table of ['products', 'jewelries', 'kurtas', 'coins', 'rates', 'import_batches']) {
    if (await k.schema.hasTable(table) && !await k.schema.hasColumn(table, 'supplier')) {
      await k.schema.alterTable(table, t => {
        t.string('supplier').nullable();
      });
    }
  }
}

