import { db } from '../server/db.js';

async function cleanup() {
  console.log('--- Cleaning Up Old Kurta Data ---');

  await db.transaction(async (trx) => {
    // 1. Identify old kurtas in 'kurtas' table
    const oldKurtas = await trx('kurtas').whereNot('product_code', 'like', 'msk-%').select('id', 'product_code');
    const oldKurtaIds = oldKurtas.map(k => k.id);
    const oldKurtaCodes = oldKurtas.map(k => k.product_code);
    console.log(`Found ${oldKurtaIds.length} old kurta styles in 'kurtas' table.`);

    // 2. Identify old kurta products in 'products' table
    const oldProducts = await trx('products')
      .where(function() {
        this.where({ is_kurta: true })
          .orWhere({ category: 'Chicken Curry Kurtas' })
          .orWhere('category', 'like', '%Kurta%');
      })
      .whereNot('product_code', 'like', 'msk-%')
      .select('id', 'product_code');
    const oldProdCodes = [...new Set([...oldKurtaCodes, ...oldProducts.map(p => p.product_code)])];
    console.log(`Found ${oldProducts.length} old kurta variant rows in 'products' table.`);

    // 3. Delete from kurta_inventory
    if (await trx.schema.hasTable('kurta_inventory') && oldKurtaIds.length > 0) {
      const delInv = await trx('kurta_inventory').whereIn('kurta_id', oldKurtaIds).del();
      console.log(`Deleted ${delInv} records from 'kurta_inventory'.`);
    }

    // 4. Delete from kurta_images
    if (await trx.schema.hasTable('kurta_images') && oldKurtaCodes.length > 0) {
      const delImg = await trx('kurta_images').whereIn('product_code', oldKurtaCodes).del();
      console.log(`Deleted ${delImg} records from 'kurta_images'.`);
    }

    // 5. Delete from kurta_variants
    if (await trx.schema.hasTable('kurta_variants') && oldKurtaCodes.length > 0) {
      const delVars = await trx('kurta_variants').whereIn('product_code', oldKurtaCodes).del();
      console.log(`Deleted ${delVars} records from 'kurta_variants'.`);
    }

    // 6. Delete from kurtas table
    if (oldKurtaIds.length > 0) {
      const delKurtas = await trx('kurtas').whereIn('id', oldKurtaIds).del();
      console.log(`Deleted ${delKurtas} records from 'kurtas'.`);
    }

    // 7. Delete from product_images for old kurta codes
    if (await trx.schema.hasTable('product_images') && oldProdCodes.length > 0) {
      const delProdImg = await trx('product_images').whereIn('product_code', oldProdCodes).del();
      console.log(`Deleted ${delProdImg} records from 'product_images'.`);
    }

    // 8. Delete from products table
    const delProds = await trx('products')
      .where(function() {
        this.where({ is_kurta: true })
          .orWhere({ category: 'Chicken Curry Kurtas' })
          .orWhere('category', 'like', '%Kurta%');
      })
      .whereNot('product_code', 'like', 'msk-%')
      .del();
    console.log(`Deleted ${delProds} records from 'products'.`);
  });

  // Verify remaining data
  const remainingKurtas = await db('kurtas').select('id', 'product_code', 'name');
  const remainingProducts = await db('products').where(function() {
    this.where({ is_kurta: true })
      .orWhere({ category: 'Chicken Curry Kurtas' })
      .orWhere('category', 'like', '%Kurta%');
  }).select('id', 'product_code', 'sku');

  console.log('--- Verification ---');
  console.log(`Remaining in 'kurtas' table: ${remainingKurtas.length} styles (all MSK: ${remainingKurtas.every(k => k.product_code.startsWith('msk-'))})`);
  console.log(`Remaining in 'products' table: ${remainingProducts.length} variants across ${new Set(remainingProducts.map(p => p.product_code)).size} styles`);

  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
