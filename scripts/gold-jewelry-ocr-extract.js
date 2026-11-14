#!/usr/bin/env node
/**
 * Resumable, non-destructive OCR extraction for the Gold catalogue.
 * It deliberately does not touch the database: import is allowed only after
 * the resulting extraction has passed a human/data-quality review.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = process.cwd();
const inputRoot = path.join(root, 'catalogue/Jewelry/Gold catelogue');
const outputRoot = path.join(root, 'private/gold-ocr');
const pageRoot = path.join(outputRoot, 'pages');
const statePath = path.join(outputRoot, 'state.json');
const recordsPath = path.join(outputRoot, 'records.jsonl');
const maxPages = Number(process.env.GOLD_OCR_MAX_PAGES || 0);
const shardCount = Math.max(1, Number(process.env.GOLD_OCR_SHARD_COUNT || 1));
const shardIndex = Math.max(0, Number(process.env.GOLD_OCR_SHARD_INDEX || 0));

function files(dir, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.')) return [];
    const full = path.join(dir, entry.name);
    const relative = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? files(full, relative) : (entry.name.toLowerCase().endsWith('.pdf') ? [{ full, relative }] : []);
  }).sort((a, b) => a.relative.localeCompare(b.relative));
}

function key(value) { return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16); }
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2)); }
function category(pdf) {
  const name = pdf.toLowerCase();
  if (name.includes('mangalsutra') || name.includes('tanmaniya')) return 'Mangalsutra';
  if (name.includes('pendant')) return 'Pendants';
  if (name.includes('mala') || name.includes('lariat') || name.includes('chain set')) return 'Necklaces';
  if (name.includes('bracelet') || name.includes('kadli')) return 'Bracelets';
  if (name.includes('kada')) return 'Bangles & Kadas';
  if (name.includes('tops')) return 'Earrings';
  return 'Rings';
}
function purity(pdf, text) {
  const source = `${pdf}\n${text}`;
  const match = source.match(/\b(9|14|18|22|24)\s*(?:kt|k)\b/i);
  return match ? `${match[1]}K` : null;
}
function values(text, regex) { return [...text.matchAll(regex)].map(m => m[1].replace(/\s+/g, ' ').trim()); }
function extract(record) {
  const text = record.ocr_text;
  const sku = [...new Set(values(text, /(?:design|dsgn?|sku|code|item)\s*(?:no\.?|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,20})/gi))];
  const priceMatches = values(text, /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi)
    .map(x => Number(x.replace(/,/g, ''))).filter(x => x >= 2000 && x <= 50000000);
  const weights = values(text, /(?:gross|net|wt\.?|weight)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams?)/gi)
    .map(Number).filter(x => x > 0 && x < 1000);
  const finalPrice = priceMatches.length ? priceMatches[0] : 10000;
  return {
    ...record,
    category: category(record.source_pdf),
    design_numbers: sku,
    purity: purity(record.source_pdf, text),
    weights_g: weights,
    pdf_prices: priceMatches,
    final_price_inr: finalPrice,
    price_source: priceMatches.length ? 'PDF' : 'DEFAULT',
    review_required: sku.length === 0 || record.ocr_confidence === 'low',
  };
}
async function pageCount(pdf) {
  const { stdout } = await exec('pdfinfo', [pdf]);
  return Number((stdout.match(/^Pages:\s+(\d+)/m) || [])[1] || 0);
}
async function ocrPage(pdf, page, dest) {
  const image = `${dest}.png`;
  if (!fs.existsSync(image)) {
    await exec('pdftoppm', ['-f', String(page), '-l', String(page), '-r', '240', '-png', '-singlefile', pdf, dest], { maxBuffer: 8 * 1024 * 1024 });
  }
  const { stdout } = await exec('tesseract', [image, 'stdout', '--oem', '1', '--psm', '11'], { maxBuffer: 8 * 1024 * 1024 });
  return { image, text: stdout.trim() };
}

fs.mkdirSync(pageRoot, { recursive: true, mode: 0o700 });
if (shardIndex >= shardCount) throw new Error('GOLD_OCR_SHARD_INDEX must be lower than GOLD_OCR_SHARD_COUNT');
const shardStatePath = shardCount === 1 ? statePath : path.join(outputRoot, `state-${shardIndex}.json`);
const shardRecordsPath = shardCount === 1 ? recordsPath : path.join(outputRoot, `records-${shardIndex}.jsonl`);
const state = readJson(shardStatePath, { completed: {}, errors: {}, started_at: new Date().toISOString() });
const done = new Set(Object.keys(state.completed));
const pdfs = files(inputRoot);
let processed = 0;
let ordinal = 0;
for (const pdf of pdfs) {
  const count = await pageCount(pdf.full);
  const dir = path.join(pageRoot, key(pdf.relative));
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (let page = 1; page <= count; page++) {
    const thisOrdinal = ordinal++;
    if (thisOrdinal % shardCount !== shardIndex) continue;
    if (maxPages && processed >= maxPages) break;
    const id = `${pdf.relative}#${page}`;
    if (done.has(id)) continue;
    const destination = path.join(dir, `page-${String(page).padStart(4, '0')}`);
    try {
      const result = await ocrPage(pdf.full, page, destination);
      const record = extract({ id, source_pdf: pdf.relative, source_page: page, reference_image: path.relative(root, result.image), ocr_text: result.text, ocr_confidence: result.text.length < 24 ? 'low' : 'unscored' });
      fs.appendFileSync(shardRecordsPath, `${JSON.stringify(record)}\n`);
      state.completed[id] = { source_pdf: pdf.relative, source_page: page, reference_image: record.reference_image, text_chars: result.text.length, completed_at: new Date().toISOString() };
      delete state.errors[id];
      writeJson(shardStatePath, state);
      processed++;
      process.stdout.write(`OCR ${processed}: ${id}\n`);
    } catch (error) {
      state.errors[id] = String(error.message || error);
      writeJson(shardStatePath, state);
      console.error(`OCR failed: ${id}: ${error.message}`);
    }
  }
  if (maxPages && processed >= maxPages) break;
}
const rows = fs.existsSync(shardRecordsPath) ? fs.readFileSync(shardRecordsPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const report = [
  '# GOLD_CATALOGUE_OCR_EXTRACTION_STATUS', '',
  `Generated: ${new Date().toISOString()}`, '',
  `- PDFs discovered: ${pdfs.length}`,
  `- Pages extracted this run: ${processed}`,
  `- Pages completed cumulatively: ${Object.keys(state.completed).length}`,
  `- Pages with errors: ${Object.keys(state.errors).length}`,
  `- OCR records: ${rows.length}`,
  `- Pages with explicit PDF prices: ${rows.filter(r => r.price_source === 'PDF').length}`,
  `- Pages using ₹10,000 fallback: ${rows.filter(r => r.price_source === 'DEFAULT').length}`,
  `- Pages requiring manual product segmentation/review: ${rows.filter(r => r.review_required).length}`,
  '',
  'Every completed row preserves its original PDF filename, page number, OCR text, and a rendered source-page reference. No database or product-image records were changed by this job.'
].join('\n');
fs.writeFileSync(path.join(root, 'GOLD_CATALOGUE_INVENTORY.md'), report);
