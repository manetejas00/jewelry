#!/usr/bin/env node
/**
 * PHASE 1: Pre-Cleanup Audit
 * Generates GOLD_JEWELRY_PRE_CLEANUP_AUDIT.md
 */
import { createDb } from '../server/db.js';
import fs from 'node:fs';
import path from 'node:path';

const db = createDb();
const root = path.resolve('.');

async function run() {
  console.log('=== PHASE 1: Pre-Cleanup Audit ===');

  // 1. Jewelry table counts
  const jCount   = (await db('jewelries').count('* as n').first()).n;
  const imgCount = (await db('jewelry_images').count('* as n').first()).n;
  const varCount = (await db('jewelry_variants').count('* as n').first()).n;
  const invCount = (await db('jewelry_inventory').count('* as n').first()).n;
  const catCount = (await db('jewelry_categories').count('* as n').first()).n;

  // 2. Sample of existing products (first 10)
  const sampleProducts = await db('jewelries')
    .select('id', 'sku', 'name', 'category', 'pricing_mode', 'fixed_price', 'selling_price', 'status')
    .orderBy('id', 'asc')
    .limit(10);

  // 5. Existing categories
  const cats = await db('jewelry_categories').select('id', 'slug', 'name', 'status');

  // 6. Image URLs analysis
  const assetImgs = (await db('jewelry_images').where('url', 'like', '/assets/products/%').count('* as n').first()).n;
  const uploadImgs = (await db('jewelry_images').where('url', 'like', '/uploads/%').count('* as n').first()).n;

  // 7. Count product asset directories
  const assetsDir = path.join(root, 'public/assets/products');
  const assetDirs = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(d => {
    return fs.statSync(path.join(assetsDir, d)).isDirectory();
  }) : [];

  // 8. Order protection: which jewelry IDs are in orders
  const orderedJewelryDetail = orderedJewelry.length
    ? await db('jewelries').whereIn('id', orderedJewelry).select('id', 'sku', 'name', 'supplier')
    : [];

  // 9. Reviews referencing jewelry
  const hasReviews = await db.schema.hasTable('reviews');
  const reviewCount = hasReviews
    ? (await db('reviews').where({ item_type: 'jewelry' }).count('* as n').first()).n
    : 0;

  // 10. Check columns
  const hasSrcPdf  = await db.schema.hasColumn('jewelries', 'source_pdf');
  const hasPriceSrc = await db.schema.hasColumn('jewelries', 'price_source');
  const hasSrcPage = await db.schema.hasColumn('jewelries', 'source_page');

  // 11. PDF inventory
  const pdfDir = path.join(root, 'catalogue/Jewelry/Gold catelogue');
  const pdfFiles = [];
  function scanPdfs(dir, base = '') {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('.')) continue;
      const full = path.join(dir, f);
      const rel  = base ? `${base}/${f}` : f;
      if (fs.statSync(full).isDirectory()) {
        scanPdfs(full, rel);
      } else if (f.toLowerCase().endsWith('.pdf')) {
        const stat = fs.statSync(full);
        pdfFiles.push({ name: rel, size_mb: (stat.size / 1048576).toFixed(1) });
      }
    }
  }
  scanPdfs(pdfDir);

  // Build report
  const lines = [
    '# GOLD_JEWELRY_PRE_CLEANUP_AUDIT',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '---',
    '',
    '## 1. Database Record Counts (Before Cleanup)',
    '',
    `| Table | Records |`,
    `|---|---:|`,
    `| jewelries | ${jCount} |`,
    `| jewelry_images | ${imgCount} |`,
    `| jewelry_variants | ${varCount} |`,
    `| jewelry_inventory | ${invCount} |`,
    `| jewelry_categories | ${catCount} |`,
    '',
    '## 2. Existing Jewelry Categories',
    '',
    '| ID | Slug | Name | Status |',
    '|---|---|---|---|',
    ...cats.map(c => `| ${c.id} | ${c.slug} | ${c.name} | ${c.status} |`),
    '',
    '## 3. Sample Existing Products (First 10)',
    '',
    '| ID | SKU | Name | Category | Pricing Mode | Price |',
    '|---|---|---|---|---|---:|',
    ...sampleProducts.map(p =>
      `| ${p.id} | ${p.sku} | ${p.name} | ${p.category} | ${p.pricing_mode} | ${p.fixed_price || p.selling_price || '-'} |`
    ),
    '',
    '## 5. Order Protection',
    '',
    `- Order items referencing jewelry: **${orderedJewelry.length}**`,
    `- Distinct jewelry IDs in orders: **${[...new Set(orderedJewelry)].length}**`,
    '',
    '### Jewelry Products Referenced by Orders (PRESERVE THESE IN HISTORY)',
    '',
    '| ID | SKU | Name | Supplier |',
    '|---|---|---|---|',
    ...orderedJewelryDetail.map(j => `| ${j.id} | ${j.sku} | ${j.name} | ${j.supplier} |`),
    '',
    '> These products will be REMOVED from active catalogue but their order_items records preserved.',
    '',
    '## 6. Image Storage Analysis',
    '',
    `- Total jewelry_images records: **${imgCount}**`,
    `- Images in /assets/products/: **${assetImgs}**`,
    `- Images in /uploads/: **${uploadImgs}**`,
    `- Product asset directories on disk: **${assetDirs.length}**`,
    '',
    '## 7. Database Column Extensions Needed',
    '',
    `| Column | Exists in jewelries table |`,
    `|---|---|`,
    `| source_pdf | ${hasSrcPdf ? '✅ Yes' : '❌ No — will add via migration'} |`,
    `| source_page | ${hasSrcPage ? '✅ Yes' : '❌ No — will add via migration'} |`,
    `| price_source | ${hasPriceSrc ? '✅ Yes' : '❌ No — will add via migration'} |`,
    '',
    '## 8. PDF Catalogue Inventory',
    '',
    `Total PDFs found: **${pdfFiles.length}**`,
    '',
    '| File | Size (MB) |',
    '|---|---:|',
    ...pdfFiles.map(p => `| ${p.name} | ${p.size_mb} |`),
    '',
    '## 9. What Will Be Deleted',
    '',
    '**IN SCOPE (will delete):**',
    '- All jewelry products with supplier: "Fictional Preview", "Veyora Preview Collection 100", "Veyora Heritage Atelier"',
    '- All associated jewelry_variants records',
    '- All associated jewelry_inventory records',
    '- All associated jewelry_images records',
    '- All files under public/assets/products/<product_code>/ for jewelry products',
    '- All dist/assets/products/<product_code>/ copies for jewelry products',
    '',
    '**OUT OF SCOPE (will NOT touch):**',
    '- coins, coin_* tables',
    '- kurtas, kurta_* tables',
    '- customers, orders, order_items, payments',
    '- staff, sessions, settings',
    '- reviews (item_type = coin or kurta)',
    '- Coin images (/assets/coin-art/)',
    '- Kurta images',
    '- Shared website assets (logos, banners)',
    '- product_images table (legacy, coins use it)',
    '',
    '## 10. Backup',
    '',
    '- Database backup: `private/store.sqlite.gold-jewelry-backup-*`',
    '',
    '---',
    '*Audit complete. Proceed to Phase 2: Cleanup.*',
  ];

  const report = lines.join('\n');
  fs.writeFileSync('GOLD_JEWELRY_PRE_CLEANUP_AUDIT.md', report);
  console.log('✅ Written: GOLD_JEWELRY_PRE_CLEANUP_AUDIT.md');
  console.log(`   ${jCount} jewelry products, ${imgCount} images, ${pdfFiles.length} PDFs found`);

  await db.destroy();
}

run().catch(e => { console.error(e); process.exit(1); });
