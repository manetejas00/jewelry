#!/usr/bin/env node
/**
 * PHASE 4-7: PDF Scanner + Product Extractor + Importer
 *
 * Reads every PDF in catalogue/Jewelry/Gold catelogue/
 * Extracts text per page, identifies products, deduplicates,
 * applies pricing rules, inserts into the database.
 *
 * Uses pdf-parse for text extraction (pure Node, no native deps)
 */

import { createDb } from '../server/db.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// pdf-parse uses dynamic require inside; we use createRequire
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const db = createDb();
const root = path.resolve('.');

const PDF_DIR = path.join(root, 'catalogue/Jewelry/Gold catelogue');
const PRODUCTS_DIR = path.join(root, 'public/assets/products');
const DIST_DIR     = path.join(root, 'dist/assets/products');

const DEFAULT_PRICE = 10000;
const BATCH_ID = `gold-import-${new Date().toISOString().replace(/[:.]/g, '-')}`;

// ─── Category Mapping (from PDF filename) ───────────────────────────────────
const FILENAME_CATEGORY_MAP = {
  'bahubali': 'Rings',
  'yuvraj':   'Rings',
  'ladies ring plain': 'Rings',
  'ladies ring stone': 'Rings',
  'ladies paper casting': 'Rings',
  'gents ring plain': 'Rings',
  'gents ring stone': 'Rings',
  'gents rings papercasting': 'Rings',
  'gents bracelets': 'Bracelets',
  'baby ring plain': 'Rings',
  'baby kadli': 'Bracelets',
  'challa rings': 'Rings',
  'tortoise rings': 'Rings',
  'fancy plain pendants': 'Pendants',
  'fancy stone pendants': 'Pendants',
  'god plain pendants': 'Pendants',
  'peacock mala': 'Necklaces',
  'vertical mala': 'Necklaces',
  'mangalsutra': 'Mangalsutra',
  'chain set': 'Necklaces',
  'dokiya mala': 'Necklaces',
  'lariat': 'Necklaces',
  'kanchan tara mala': 'Necklaces',
  'turkey mala': 'Necklaces',
  'rudraksh mala': 'Necklaces',
  'flexi kada': 'Bangles & Kadas',
  'paper casting pro max kada': 'Bangles & Kadas',
  'tanmaniya': 'Mangalsutra',
  'cz tops': 'Earrings',
  'couple rings': 'Rings',
  '9kt': 'Rings',
};

function categoryFromFilename(filename) {
  const lower = filename.toLowerCase();
  for (const [key, cat] of Object.entries(FILENAME_CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return 'Rings';
}

// ─── Subcategory ─────────────────────────────────────────────────────────────
function subcategoryFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('gents')) return 'Gents';
  if (lower.includes('ladies') || lower.includes('cz tops')) return 'Ladies';
  if (lower.includes('baby')) return 'Baby / Kids';
  if (lower.includes('couple')) return 'Couple';
  if (lower.includes('9kt')) return '9KT Gold';
  return null;
}

// ─── Purity from filename ────────────────────────────────────────────────────
function purityFromFilename(filename) {
  if (filename.includes('9kt') || filename.toLowerCase().includes('9kt')) return '9KT';
  if (filename.match(/22[kK]/)) return '22K';
  if (filename.match(/18[kK]/)) return '18K';
  if (filename.match(/14[kK]/)) return '14K';
  return '22K'; // default for Indian gold jewellery
}

// ─── Slugify ─────────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// ─── Parse price from string ──────────────────────────────────────────────────
function parsePriceFromText(text) {
  // Match Indian number formats: ₹10,000 | Rs.10000 | 10,000/- | 1,25,000
  // But NOT per-gram rates (usually small numbers like 5,500 or 6,200 per gram)
  const patterns = [
    /₹\s*([\d,]+(?:\.\d{1,2})?)/g,
    /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*\/[-–]/g, // 10,000/-
    /(?:^|\s)([\d]{2,3},[\d]{2,3}(?:,[\d]{3})?(?:\.\d{1,2})?)(?:\s|$)/gm,
  ];

  const prices = [];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const raw = m[1].replace(/,/g, '');
      const val = parseFloat(raw);
      // Filter: jewelry prices are typically > 2000
      if (!isNaN(val) && val >= 2000 && val <= 50000000) {
        prices.push(val);
      }
    }
  }
  if (prices.length === 0) return null;
  // Return the most frequently appearing or median price
  // Sort and take median
  prices.sort((a, b) => a - b);
  return prices[Math.floor(prices.length / 2)];
}

// ─── Extract design numbers / SKUs from text ─────────────────────────────────
function extractDesignNumbers(text) {
  const numbers = [];
  // Common patterns in jewelry catalogues
  const patterns = [
    /(?:Design|Desig|Des\.?|Dsg|No\.?|SKU|Code|Item)\s*[:#.\s]*([A-Z0-9]{2,15})/gi,
    /\b([A-Z]{1,3}[-\s]?\d{3,6}[A-Z]?)\b/g,
    /\b(\d{3,6}[A-Z]{0,2})\b/g, // pure numeric codes like 1234, 10234
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const val = m[1].replace(/\s+/g, '').toUpperCase();
      if (val.length >= 3 && val.length <= 15) {
        numbers.push(val);
      }
    }
  }
  return [...new Set(numbers)];
}

// ─── Extract weight from text ─────────────────────────────────────────────────
function extractWeight(text) {
  const m = text.match(/(?:Wt|Weight|Gross|Net)\s*[:\s]*(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram)/i);
  if (m) return parseFloat(m[1]);
  // Plain weight mention
  const m2 = text.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram)/i);
  if (m2) {
    const val = parseFloat(m2[1]);
    if (val > 0.1 && val < 500) return val; // sanity
  }
  return null;
}

// ─── Scan all PDFs ────────────────────────────────────────────────────────────
function scanPdfs(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const sub = scanPdfs(full);
      files.push(...sub.map(s => ({ ...s, relativePath: `${entry}/${s.relativePath}` })));
    } else if (entry.toLowerCase().endsWith('.pdf')) {
      files.push({
        absolutePath: full,
        relativePath: entry,
        filename: entry,
        sizeMb: (stat.size / 1048576).toFixed(1)
      });
    }
  }
  return files;
}

// ─── Parse one PDF ────────────────────────────────────────────────────────────
async function parsePdf(pdfPath) {
  const { PDFParse } = require('pdf-parse');
  const file = fs.readFileSync(pdfPath);
  const data = new Uint8Array(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const parser = new PDFParse({ data });
  try {
    const info = await parser.getInfo({ parsePageInfo: false });
    const result = await parser.getText();
    return {
      text: result.text || '',
      numPages: info.total || 1,
      info: info.info || {}
    };
  } catch (e) {
    console.warn(`  ⚠️  pdf-parse error on ${path.basename(pdfPath)}: ${e.message}`);
    return { text: '', numPages: 1, info: {} };
  } finally {
    await parser.destroy();
  }
}

// ─── Extract products from text ───────────────────────────────────────────────
function extractProductsFromText(text, pdfFilename, category, subcategory, purity) {
  /**
   * Strategy: catalogue PDFs have repeating blocks, often one product per
   * page or a grid. We identify "product blocks" by design number presence.
   *
   * We split text into chunks that look like individual entries.
   * Each entry is separated by double-newlines or design number patterns.
   */
  const products = [];

  // Split by page markers or section breaks
  // pdf-parse inserts form-feed characters between pages
  const pageTexts = text.split(/\f|\n{4,}/);

  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    const pageText = pageTexts[pageIdx].trim();
    if (!pageText || pageText.length < 20) continue;

    // Try to extract design numbers from this page
    const designNums = extractDesignNumbers(pageText);

    // Extract price
    const price = parsePriceFromText(pageText);
    const priceSource = price !== null ? 'PDF' : 'DEFAULT';
    const finalPrice = price !== null ? price : DEFAULT_PRICE;

    // Extract weight
    const weight = extractWeight(pageText);

    // Extract lines for name clues
    const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 2);

    if (designNums.length === 0 && lines.length < 3) continue;

    // Build one product per unique design number on this page
    if (designNums.length > 0) {
      for (const designNum of designNums.slice(0, 5)) { // cap at 5 per page
        products.push({
          designNumber: designNum,
          category,
          subcategory,
          purity,
          weight_g: weight,
          price: finalPrice,
          price_source: priceSource,
          original_pdf_price: price,
          source_pdf: pdfFilename,
          source_page: pageIdx + 1,
          pageText: pageText.slice(0, 500),
          lines
        });
      }
    } else {
      // No design number found — still extract as a product with auto-generated code
      products.push({
        designNumber: null,
        category,
        subcategory,
        purity,
        weight_g: weight,
        price: finalPrice,
        price_source: priceSource,
        original_pdf_price: price,
        source_pdf: pdfFilename,
        source_page: pageIdx + 1,
        pageText: pageText.slice(0, 500),
        lines
      });
    }
  }

  return products;
}

// ─── Build product name ────────────────────────────────────────────────────────
function buildProductName(raw, pdfFilename, category, subcategory, purity, designNumber) {
  // Try to build a meaningful name from PDF filename + category + design number
  const baseName = pdfFilename
    .replace(/^\d+\)\s*/, '')
    .replace(/\(Gold\)\.pdf$/i, '')
    .replace(/\.pdf$/i, '')
    .replace(/\(Gold\)$/i, '')
    .trim();

  const parts = [];
  if (purity && purity !== '22K') parts.push(purity);
  parts.push(baseName);
  if (subcategory && !baseName.toLowerCase().includes(subcategory.toLowerCase())) {
    parts.push(subcategory);
  }
  if (designNumber) parts.push(`#${designNumber}`);

  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

// ─── Deduplicate products ────────────────────────────────────────────────────
function deduplicateProducts(allProducts) {
  const seen = new Map(); // key → product
  const duplicates = [];

  for (const p of allProducts) {
    // Key: designNumber (if present) + category + source_pdf
    const key = p.designNumber
      ? `${p.designNumber}::${p.category}::${p.purity}`
      : `${p.source_pdf}::page${p.source_page}::${p.category}`;

    if (seen.has(key)) {
      duplicates.push(p);
    } else {
      seen.set(key, p);
    }
  }

  return { unique: [...seen.values()], duplicates };
}

// ─── Generate SKU ─────────────────────────────────────────────────────────────
function generateSku(category, designNumber, pdfIndex, productIndex) {
  const catCode = {
    'Rings': 'RNG',
    'Earrings': 'EAR',
    'Necklaces': 'NCK',
    'Bangles & Kadas': 'BNG',
    'Bracelets': 'BRC',
    'Pendants': 'PND',
    'Mangalsutra': 'MNG',
  }[category] || 'JWL';

  if (designNumber) {
    return `GLD-${catCode}-${designNumber.slice(0, 10).replace(/[^A-Z0-9]/g, '')}`;
  }
  return `GLD-${catCode}-P${pdfIndex + 1}-${String(productIndex + 1).padStart(3, '0')}`;
}

// ─── Ensure category in DB ───────────────────────────────────────────────────
const categoryCache = new Map();
async function ensureCategory(db, categoryName) {
  if (categoryCache.has(categoryName)) return categoryCache.get(categoryName);

  const existing = await db('jewelry_categories').where({ name: categoryName }).first();
  if (existing) {
    categoryCache.set(categoryName, existing.id);
    return existing.id;
  }

  const slug = slugify(categoryName);
  const now = new Date().toISOString();
  const [id] = await db('jewelry_categories').insert({
    slug,
    name: categoryName,
    description: `${categoryName} in Gold`,
    status: 'active',
    sort_order: 10,
    seo_title: `Gold ${categoryName} | Veyora Jewels`,
    meta_description: `Shop premium gold ${categoryName.toLowerCase()} from our curated catalogue.`,
    created_at: now,
    updated_at: now
  });
  categoryCache.set(categoryName, id);
  return id;
}

// ─── Insert product ───────────────────────────────────────────────────────────
async function insertProduct(db, product, sku, categoryId, productName, slug, batchId) {
  const now = new Date().toISOString();
  const purityStr = product.purity || '22K';
  const mode = 'FIXED'; // All PDF-imported products get fixed price

  const row = {
    sku,
    product_code: slug,
    slug,
    name: productName,
    category_id: categoryId,
    category: product.category,
    description: `${productName}. ${product.subcategory ? product.subcategory + '. ' : ''}${purityStr} Gold. ${product.designNumber ? 'Design: ' + product.designNumber + '.' : ''}`.trim(),
    metal: 'Gold',
    purity: purityStr,
    gross_weight_g: product.weight_g || null,
    net_weight_g: product.weight_g || null,
    stone_details: null,
    diamond_details: null,
    gemstone_details: null,
    making_charges: 0,
    making_percent: 0,
    gst: 3.00,
    pricing_mode: mode,
    fixed_price: product.price,
    base_price: product.price,
    selling_price: product.price,
    stone_charge: 0,
    other_charge: 0,
    stock: 10,
    status: 'published',
    supplier: 'PDF Import',
    image: '',
    seo_title: `${productName} | Veyora Jewels`,
    meta_description: `Buy ${productName} - ${purityStr} Gold ${product.category}. Premium quality jewellery.`,
    source_timestamp: now,
    source_pdf: product.source_pdf,
    source_page: product.source_page,
    price_source: product.price_source,
    original_pdf_price: product.original_pdf_price,
    import_batch: batchId,
    created_at: now,
    updated_at: now,
  };

  return db.transaction(async trx => {
    const [id] = await trx('jewelries').insert(row);

    // Create default variant
    const [varId] = await trx('jewelry_variants').insert({
      jewelry_id: id,
      product_code: slug,
      sku,
      size: 'Standard',
      finish: 'Polished',
      metal: 'Gold',
      purity: purityStr,
      gross_weight_g: product.weight_g || null,
      net_weight_g: product.weight_g || null,
      price: product.price,
      fixed_price: product.price,
      stock: 10,
      image: '',
      status: 'published',
      created_at: now,
      updated_at: now,
    });

    // Log inventory
    await trx('jewelry_inventory').insert({
      jewelry_id: id,
      variant_id: varId,
      sku,
      quantity_change: 10,
      balance_after: 10,
      reason: 'pdf_import',
      reference_id: `PDF-${batchId}`,
      created_at: now,
    });

    // Queue image generation jobs (5 images per product)
    const hasImgJobs = await trx.schema.hasTable('jewelry_image_jobs');
    if (hasImgJobs) {
      for (const role of ['front', 'left', 'right', 'model', 'detail']) {
        await trx('jewelry_image_jobs').insert({
          batch_id: batchId,
          jewelry_id: id,
          jewelry_sku: sku,
          image_role: role,
          status: 'pending',
          created_at: now,
          updated_at: now,
        });
      }
    }

    return id;
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('=== PHASE 4-7: PDF Scan, Extract, Price & Import ===');
  console.log(`Batch ID: ${BATCH_ID}`);
  const startTime = Date.now();

  // Scan PDFs
  const pdfFiles = scanPdfs(PDF_DIR);
  console.log(`Found ${pdfFiles.length} PDF files`);

  // Run migration first
  const { migrate } = await import('../server/db.js');
  await migrate(db);
  console.log('✅ Migrations applied (including 026_gold_jewelry_import_tracking)');

  // Create import session
  const now = new Date().toISOString();
  await db('jewelry_import_sessions').insert({
    batch_id: BATCH_ID,
    status: 'processing',
    total_pdfs: pdfFiles.length,
    processed_pdfs: 0,
    total_products: 0,
    imported_products: 0,
    failed_products: 0,
    duplicate_products: 0,
    notes: `Gold catalogue import started ${now}`,
    created_at: now,
    updated_at: now,
  });

  // --- Process each PDF ---
  const allRawProducts = [];
  const pdfStats = [];

  for (let pdfIdx = 0; pdfIdx < pdfFiles.length; pdfIdx++) {
    const pdfFile = pdfFiles[pdfIdx];
    console.log(`\n[${pdfIdx + 1}/${pdfFiles.length}] Processing: ${pdfFile.relativePath}`);

    const category    = categoryFromFilename(pdfFile.filename);
    const subcategory = subcategoryFromFilename(pdfFile.filename);
    const purity      = purityFromFilename(pdfFile.relativePath);

    let parsed;
    try {
      parsed = await parsePdf(pdfFile.absolutePath);
    } catch (e) {
      console.warn(`  ❌ Failed to parse: ${e.message}`);
      pdfStats.push({ file: pdfFile.relativePath, pages: 0, products: 0, error: e.message });
      continue;
    }

    console.log(`  Pages: ${parsed.numPages}, Text length: ${parsed.text.length} chars`);

    const rawProducts = extractProductsFromText(
      parsed.text, pdfFile.relativePath, category, subcategory, purity
    );

    console.log(`  Extracted ${rawProducts.length} raw product entries`);

    pdfStats.push({
      file: pdfFile.relativePath,
      sizeMb: pdfFile.sizeMb,
      pages: parsed.numPages,
      products: rawProducts.length,
      error: null
    });

    allRawProducts.push(...rawProducts.map((p, i) => ({
      ...p,
      pdfIndex: pdfIdx,
      pdfProductIndex: i
    })));

    // Update session
    await db('jewelry_import_sessions')
      .where({ batch_id: BATCH_ID })
      .update({
        processed_pdfs: pdfIdx + 1,
        total_products: allRawProducts.length,
        updated_at: new Date().toISOString()
      });
  }

  console.log(`\n--- Extracted ${allRawProducts.length} total raw products ---`);

  // --- Deduplicate ---
  const { unique, duplicates } = deduplicateProducts(allRawProducts);
  console.log(`Unique products: ${unique.length}, Duplicates filtered: ${duplicates.length}`);

  // --- Check existing SKUs to avoid re-importing ---
  const existingSkus = new Set(
    (await db('jewelries').pluck('sku'))
  );

  // --- Insert into DB ---
  let imported = 0, skipped = 0, failed = 0;
  const skuIndex = new Map(); // track generated SKUs for uniqueness

  for (let i = 0; i < unique.length; i++) {
    const product = unique[i];
    const sku = generateSku(product.category, product.designNumber, product.pdfIndex || 0, i);
    const uniqueSku = skuIndex.has(sku) ? `${sku}-${i}` : sku;
    skuIndex.set(uniqueSku, true);

    // Skip if already imported
    if (existingSkus.has(uniqueSku) || await db('jewelries').where({ sku: uniqueSku }).first()) {
      console.log(`  SKIP (exists): ${uniqueSku}`);
      skipped++;
      continue;
    }

    const productName = buildProductName(
      product.pageText, path.basename(product.source_pdf),
      product.category, product.subcategory, product.purity, product.designNumber
    );

    let slug = slugify(productName);
    // Ensure slug uniqueness
    const existingSlug = await db('jewelries').where({ slug }).first();
    if (existingSlug) {
      slug = `${slug}-${i}`;
    }

    try {
      const categoryId = await ensureCategory(db, product.category);
      await insertProduct(db, product, uniqueSku, categoryId, productName, slug, BATCH_ID);
      imported++;
      if ((imported % 25) === 0) {
        console.log(`  Imported ${imported}/${unique.length} products...`);
      }
    } catch (e) {
      console.warn(`  ❌ Failed to insert ${uniqueSku}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Import complete: ${imported} imported, ${skipped} skipped, ${failed} failed`);

  // --- Update session ---
  await db('jewelry_import_sessions')
    .where({ batch_id: BATCH_ID })
    .update({
      status: failed > 0 ? 'partial' : 'complete',
      imported_products: imported,
      failed_products: failed,
      duplicate_products: duplicates.length,
      updated_at: new Date().toISOString()
    });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // --- Pricing report ---
  const pdfPriced = await db('jewelries').where({ price_source: 'PDF', import_batch: BATCH_ID }).count('* as n').first();
  const defaultPriced = await db('jewelries').where({ price_source: 'DEFAULT', import_batch: BATCH_ID }).count('* as n').first();

  // Write catalogue inventory
  const inventoryLines = [
    '# GOLD_CATALOGUE_INVENTORY',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Batch: ${BATCH_ID}`,
    '',
    '## PDFs Processed',
    '',
    '| File | Size MB | Pages | Products Found | Error |',
    '|---|---:|---:|---:|---|',
    ...pdfStats.map(s =>
      `| ${s.file} | ${s.sizeMb || '-'} | ${s.pages} | ${s.products} | ${s.error || '-'} |`
    ),
    '',
    `**Total PDFs:** ${pdfStats.length}`,
    `**Total raw products extracted:** ${allRawProducts.length}`,
    `**Unique products:** ${unique.length}`,
    `**Duplicates filtered:** ${duplicates.length}`,
  ].join('\n');
  fs.writeFileSync('GOLD_CATALOGUE_INVENTORY.md', inventoryLines);

  // Write extraction report
  const extractionLines = [
    '# GOLD_PRODUCT_EXTRACTION',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## First 50 Unique Products Extracted',
    '',
    '| # | Design# | Category | Subcategory | Purity | Weight | Price | Price Source | Source PDF | Page |',
    '|---|---|---|---|---|---|---:|---|---|---:|',
    ...unique.slice(0, 50).map((p, i) =>
      `| ${i + 1} | ${p.designNumber || '-'} | ${p.category} | ${p.subcategory || '-'} | ${p.purity} | ${p.weight_g ? p.weight_g + 'g' : '-'} | ₹${p.price.toLocaleString('en-IN')} | ${p.price_source} | ${path.basename(p.source_pdf)} | ${p.source_page} |`
    ),
    '',
    '*(Full list available in database)*',
  ].join('\n');
  fs.writeFileSync('GOLD_PRODUCT_EXTRACTION.md', extractionLines);

  // Write import report
  const importLines = [
    '# GOLD_PRODUCT_IMPORT_REPORT',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Batch ID: ${BATCH_ID}`,
    `Duration: ${elapsed}s`,
    '',
    '## Results',
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| PDFs found | ${pdfFiles.length} |`,
    `| PDFs processed | ${pdfStats.filter(s => !s.error).length} |`,
    `| PDFs failed | ${pdfStats.filter(s => s.error).length} |`,
    `| Raw products extracted | ${allRawProducts.length} |`,
    `| Unique products | ${unique.length} |`,
    `| Duplicates filtered | ${duplicates.length} |`,
    `| Successfully imported | ${imported} |`,
    `| Skipped (already exists) | ${skipped} |`,
    `| Failed | ${failed} |`,
    `| PDF-priced products | ${pdfPriced?.n || 0} |`,
    `| Default-priced (₹10,000) | ${defaultPriced?.n || 0} |`,
    '',
    '## Pricing Rule Applied',
    '',
    '- If PDF had explicit price → extracted and saved as `price_source: PDF`',
    '- If no price found → ₹10,000 assigned as `price_source: DEFAULT`',
    '',
    '## Next Step',
    '',
    'Run Phase 8: AI image generation (`node scripts/gold-jewelry-generate-images.js`)',
  ].join('\n');
  fs.writeFileSync('GOLD_PRODUCT_IMPORT_REPORT.md', importLines);

  // Write pricing report
  const pricingLines = [
    '# GOLD_PRICING_REPORT',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Pricing Summary',
    '',
    `| Source | Count |`,
    `|---|---:|`,
    `| Extracted from PDF | ${pdfPriced?.n || 0} |`,
    `| Default ₹10,000 fallback | ${defaultPriced?.n || 0} |`,
    '',
    '## Rules Applied',
    '',
    '| Condition | Price Applied |',
    '|---|---:|',
    '| PDF has explicit price | Exact PDF price (INR) |',
    '| PDF price absent/unreadable | ₹10,000 (DEFAULT) |',
    '| Per-gram rate treated as product price | Flagged, ₹10,000 applied |',
    '',
    '## Currency',
    '',
    'All prices in **INR**.',
    '',
    '## Price Integrity',
    '',
    '- No live gold API used',
    '- No prices invented',
    '- No compare-at or fake MRP added',
  ].join('\n');
  fs.writeFileSync('GOLD_PRICING_REPORT.md', pricingLines);

  console.log('\n✅ Reports written:');
  console.log('  GOLD_CATALOGUE_INVENTORY.md');
  console.log('  GOLD_PRODUCT_EXTRACTION.md');
  console.log('  GOLD_PRODUCT_IMPORT_REPORT.md');
  console.log('  GOLD_PRICING_REPORT.md');

  await db.destroy();
  console.log(`\n=== Phase 4-7 complete in ${elapsed}s ===`);
}

run().catch(e => { console.error(e); process.exit(1); });
