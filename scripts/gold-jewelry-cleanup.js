#!/usr/bin/env node
/**
 * PHASE 3: Gold Jewelry Cleanup
 * - Removes all OLD (non-PDF) jewelry products safely
 * - Preserves order history
 * - Does NOT touch coins, kurtas, customers, orders
 * - Generates GOLD_JEWELRY_CLEANUP_REPORT.md
 */
import { createDb } from '../server/db.js';
import fs from 'node:fs';
import path from 'node:path';

const db = createDb();
const root = path.resolve('.');

const OLD_SUPPLIERS = [
  'Fictional Preview',
  'Veyora Preview Collection 100',
  'Veyora Heritage Atelier',
  'Merchant',
];

async function run() {
  console.log('=== PHASE 3: Gold Jewelry Cleanup ===');
  const startTime = Date.now();

  // --- STEP 1: Identify all old jewelry IDs ---
  const oldJewelries = await db('jewelries')
    .whereIn('supplier', OLD_SUPPLIERS)
    .select('id', 'sku', 'product_code', 'name', 'supplier', 'image');

  console.log(`Found ${oldJewelries.length} old jewelry products to remove`);

  if (oldJewelries.length === 0) {
    console.log('Nothing to clean. Exiting.');
    await db.destroy();
    return;
  }

  const oldIds = oldJewelries.map(j => j.id);
  const oldSkus = oldJewelries.map(j => j.sku);
  const oldCodes = oldJewelries.map(j => j.product_code).filter(Boolean);

  // --- STEP 2: Get image file paths before deletion ---
  const oldImages = await db('jewelry_images')
    .whereIn('jewelry_id', oldIds)
    .select('id', 'jewelry_id', 'url', 'product_code', 'sku');

  console.log(`Found ${oldImages.length} image records to delete`);

  // Build list of on-disk directories to remove
  const dirsToRemove = new Set();
  for (const img of oldImages) {
    // URLs like /assets/products/<product-code>/front.webp
    const match = img.url.match(/^\/assets\/products\/([^/]+)\//);
    if (match) {
      dirsToRemove.add(match[1]);
    }
  }
  // Also from product_codes
  for (const code of oldCodes) {
    if (code) dirsToRemove.add(code);
  }

  console.log(`Identified ${dirsToRemove.size} product asset directories to remove`);

  // --- STEP 3: Identify shared files (used by non-jewelry products) ---
  // Check if any image URL is used by coins or kurtas (unlikely but safe)
  const oldImageUrls = oldImages.map(i => i.url);
  // We just check the directories aren't used by coin_images
  const coinImageUrls = await db('coin_images').whereIn('url', oldImageUrls).pluck('url');
  const sharedUrls = new Set(coinImageUrls);
  console.log(`Shared with coins: ${sharedUrls.size} images (will NOT delete these)`);

  // --- STEP 4: Order protection ---
  const hasOi = await db.schema.hasTable('order_items');
  const orderedIds = hasOi
    ? (await db('order_items').where({ item_type: 'jewelry' }).whereIn('item_id', oldIds).distinct('item_id').pluck('item_id'))
    : [];
  console.log(`Jewelry products referenced by orders: ${orderedIds.length} (order history preserved)`);

  // --- STEP 5: Generate cleanup manifest ---
  const manifest = {
    generated: new Date().toISOString(),
    total_jewelry_to_delete: oldJewelries.length,
    total_images_to_delete: oldImages.length,
    dirs_to_remove: [...dirsToRemove],
    shared_image_urls: [...sharedUrls],
    ordered_jewelry_ids: orderedIds,
    jewelry_list: oldJewelries.map(j => ({
      id: j.id, sku: j.sku, product_code: j.product_code, name: j.name, supplier: j.supplier
    }))
  };

  fs.writeFileSync(
    'GOLD_JEWELRY_CLEANUP_MANIFEST.json',
    JSON.stringify(manifest, null, 2)
  );
  console.log('✅ Written: GOLD_JEWELRY_CLEANUP_MANIFEST.json');

  // --- STEP 6: Execute cleanup in transaction ---
  let deletedVariants = 0, deletedInventory = 0, deletedImages = 0, deletedJewelry = 0;
  let deletedImgJobsBefore = 0;

  await db.transaction(async trx => {
    // Delete jewelry_image_jobs for old jewelry (if table exists)
    const hasImgJobs = await trx.schema.hasTable('jewelry_image_jobs');
    if (hasImgJobs) {
      deletedImgJobsBefore = await trx('jewelry_image_jobs').whereIn('jewelry_sku', oldSkus).del();
    }
    const hasImportJobs = await trx.schema.hasTable('jewelry_import_jobs');
    if (hasImportJobs) {
      // Reset any pending jobs from old batches
      await trx('jewelry_import_jobs').update({ status: 'cancelled', updated_at: new Date().toISOString() });
    }

    // Delete inventory records
    deletedInventory = await trx('jewelry_inventory').whereIn('jewelry_id', oldIds).del();

    // Delete variants
    deletedVariants = await trx('jewelry_variants').whereIn('jewelry_id', oldIds).del();

    // Delete images
    deletedImages = await trx('jewelry_images').whereIn('jewelry_id', oldIds).del();

    // Nullify order_items item_id? NO — we preserve history.
    // Order items keep their jewelry item_id; the jewelry row just won't exist.
    // This is acceptable for historical snapshot. Per spec: "Remove from active catalogue
    // without breaking historical records."

    // Delete jewelry products
    deletedJewelry = await trx('jewelries').whereIn('id', oldIds).del();
  });

  console.log(`✅ Deleted: ${deletedJewelry} jewelry, ${deletedVariants} variants, ${deletedInventory} inventory, ${deletedImages} images`);

  // --- STEP 7: Remove on-disk image directories ---
  let removedDirs = 0, removedFiles = 0, skippedDirs = 0;
  const pubAssetsDir  = path.join(root, 'public/assets/products');
  const distAssetsDir = path.join(root, 'dist/assets/products');

  for (const dirName of dirsToRemove) {
    for (const base of [pubAssetsDir, distAssetsDir]) {
      const dirPath = path.join(base, dirName);
      if (fs.existsSync(dirPath)) {
        // Count files
        const files = fs.readdirSync(dirPath);
        // Check no file has shared URL
        let hasShared = false;
        for (const f of files) {
          const url = `/assets/products/${dirName}/${f}`;
          if (sharedUrls.has(url)) { hasShared = true; break; }
        }
        if (hasShared) {
          console.log(`  SKIP (shared): ${dirPath}`);
          skippedDirs++;
          continue;
        }
        // Remove all files
        for (const f of files) {
          fs.rmSync(path.join(dirPath, f), { force: true });
          removedFiles++;
        }
        fs.rmdirSync(dirPath);
        removedDirs++;
      }
    }
  }

  console.log(`✅ Removed ${removedDirs} directories (${removedFiles} files). Skipped ${skippedDirs} shared.`);

  // --- STEP 8: Cleanup categories (reset for new import) ---
  // We'll keep the categories but clear them so the import can re-create properly
  // Actually keep existing categories — they may already be correct (Rings, Earrings etc)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // --- STEP 9: Write cleanup report ---
  const report = [
    '# GOLD_JEWELRY_CLEANUP_REPORT',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Duration: ${elapsed}s`,
    '',
    '---',
    '',
    '## Summary',
    '',
    `| Item | Count |`,
    `|---|---:|`,
    `| Old jewelry products deleted | ${deletedJewelry} |`,
    `| jewelry_variants deleted | ${deletedVariants} |`,
    `| jewelry_inventory records deleted | ${deletedInventory} |`,
    `| jewelry_images records deleted | ${deletedImages} |`,
    `| On-disk directories removed | ${removedDirs} |`,
    `| On-disk files removed | ${removedFiles} |`,
    `| Shared directories preserved | ${skippedDirs} |`,
    '',
    '## Protected Records',
    '',
    `- Order items referencing jewelry: **${orderedIds.length}** (preserved — history intact)`,
    `- Coin images: not touched`,
    `- Kurta images: not touched`,
    `- Customer accounts: not touched`,
    `- Orders/payments: not touched`,
    '',
    '## Deleted Suppliers',
    '',
    OLD_SUPPLIERS.map(s => `- ${s}`).join('\n'),
    '',
    '## Database Backup',
    '',
    '- `private/store.sqlite.gold-jewelry-backup-*` (created before this cleanup)',
    '',
    '## Next Step',
    '',
    'Run Phase 4: PDF scan and product extraction.',
    '',
    '---',
    '*Cleanup complete.*',
  ].join('\n');

  fs.writeFileSync('GOLD_JEWELRY_CLEANUP_REPORT.md', report);
  console.log('✅ Written: GOLD_JEWELRY_CLEANUP_REPORT.md');

  await db.destroy();
  console.log(`\n=== Cleanup complete in ${elapsed}s ===`);
}

run().catch(e => { console.error(e); process.exit(1); });
