#!/usr/bin/env node
/*
 * Conservative catalogue extraction. It never supplies a value that is not
 * present in the source page. Values recovered from selectable text are kept
 * verbatim; every record still requires a human source check before import.
 */
import fs from 'node:fs';
import path from 'node:path';
import {PDFParse} from 'pdf-parse';
import {stringify} from 'csv-stringify/sync';

const root = process.cwd();
const catalogue = path.join(root, 'catalogue');
const output = path.join(catalogue, 'output');
fs.mkdirSync(output, {recursive: true});

const columns = [
  'product_name','sku','product_code','category','subcategory','product_type','brand','product_description',
  'material','purity','gross_weight','net_weight','weight','unit_of_measurement','dimensions','size','colour','design','finish',
  'making_charges','tax_gst','original_printed_rate','printed_selling_price','price','currency','availability','additional_specifications',
  'source_pdf','source_pdf_path','source_page_number','source_page_reference','source_printed_page_number','source_category','source_product_code',
  'source_extraction_method','source_verification_status','source_original_text','source_notes','extraction_confidence'
];
const pageAuditColumns = ['source_pdf','source_pdf_path','source_category','total_pages','page_number','has_selectable_text','extraction_method','status','notes'];
const verificationColumns = ['product_name','sku','category','source_pdf','source_page_number','source_printed_page_number','original_printed_rate','verification_status','discrepancy_details'];
const files = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, {withFileTypes:true})) { const full=path.join(dir,entry.name); if (entry.isDirectory() && entry.name !== 'output') walk(full); else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) files.push(full); } }
walk(catalogue); files.sort();
const categoryFor = file => file.includes(`${path.sep}Kurta${path.sep}`) ? 'Kurta' : file.includes(`${path.sep}Coin${path.sep}`) ? 'Coin' : 'Jewellery';
const clean = s => String(s || '').replace(/\s+/g,' ').trim();
const titleCategory = file => clean(path.basename(file, '.pdf').replace(/^\d+\)\s*/, '').replace(/\(Gold\)/ig,'').replace(/\.catlog$/i,''));
const add = (rows, data, file, page, pageText, notes = '') => {
  const defaults = {
  product_name:'',sku:'',product_code:'',category:titleCategory(file),subcategory:'',product_type:'',brand:'',product_description:'',material:'Gold',purity:'',gross_weight:'',net_weight:'',weight:'',unit_of_measurement:'grams',dimensions:'',size:'',colour:'',design:'',finish:'',making_charges:'',tax_gst:'',original_printed_rate:'',printed_selling_price:'',price:'',currency:'INR',availability:'',additional_specifications:'',
  source_pdf:path.basename(file),source_pdf_path:path.relative(root,file),source_page_number:String(page),source_page_reference:`${path.basename(file)} - Page ${page}`,source_printed_page_number:'',source_category:categoryFor(file),source_product_code:'',source_extraction_method:'Text extraction',source_verification_status:'Needs Review',source_original_text:pageText,source_notes:notes || 'Automatically extracted selectable PDF text. Verify against source page before import.',extraction_confidence:'Unverified'
  };
  rows.push({...Object.fromEntries(columns.map(column => [column, defaults[column] ?? ''])), ...Object.fromEntries(Object.entries(data).map(([k,v]) => [k, v ?? '']))});
};

function explicitProducts(rows, file, page, text) {
  const pageText = clean(text);
  const lower = file.toLowerCase();
  const defaultCategory = titleCategory(file);
  const seenCodes = new Set();
  // Catalogues that provide item code and weight in repeated, selectable cells.
  const itemPattern = /([A-Z][A-Z ]{2,50})\s*-\s*Item\s*(\d{1,4})/gi;
  let found = false, match;
  while ((match = itemPattern.exec(pageText))) {
    const before = pageText.slice(Math.max(0, match.index - 180), match.index + match[0].length + 40);
    const w = [...before.matchAll(/Wt\s*:\s*([\d.]+)\s*(gram|grams|g)\b/gi)].pop();
    const nameMatch = before.match(/(Paper Casting Pro Max[^|]*?)(?=\s+Wt\s*:|\s+[A-Z][A-Z ]{2,50}\s*-\s*Item)/i);
    const code = `${clean(match[1])} - Item ${match[2]}`;
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    add(rows,{product_name:clean(nameMatch?.[1]) || clean(match[1]),sku:code,product_code:code,category:defaultCategory,purity:/\b9\s*KT\b/i.test(pageText)?'9KT':'',weight:w?.[1]||'',unit_of_measurement:w?.[2]||'',source_product_code:code,additional_specifications:clean(match[0])},file,page,pageText);
    found = true;
  }
  // Bulk pages use Style N and state the name, purity, weight, and price label in source text.
  const stylePattern = /Style\s*(\d{1,4})\s+(?:9KT\s+Gold\s+)?([\d.]+)\s*gram\s+(Price:\s*On Request)/gi;
  const collection = clean((pageText.match(/([A-Z][A-Z ]+COLLECTION)\s*[—-]\s*BULK CATALOGUE/i)||[])[1]);
  while ((match = stylePattern.exec(pageText))) {
    const code = `Style ${match[1]}`;
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    add(rows,{product_name:collection || defaultCategory,sku:code,product_code:code,category:defaultCategory,purity:'9KT Gold',weight:match[2],unit_of_measurement:'gram',original_printed_rate:match[3],source_product_code:code,additional_specifications:collection},file,page,pageText);
    found = true;
  }
  // Standard catalogues expose a SKU, product name, melting and product weight.
  const skuPattern = /SKU\s*:-?\s*(\d{1,8})\s+([A-Z][A-Z &-]{2,80}?)(?=\s+(?:MELTING|PRODUCT WEIGHT|SKU\s*:|$))/gi;
  while ((match = skuPattern.exec(pageText))) {
    const segment = pageText.slice(match.index, match.index + 350);
    const purity = clean((segment.match(/MELTING\s*:\s*([0-9/]+)/i)||[])[1]);
    const weight = clean((segment.match(/PRODUCT WEIGHT\s*:\s*([\d.]+)\s*(GRAMS?|G)\b/i)||[])[1]);
    const unit = clean((segment.match(/PRODUCT WEIGHT\s*:\s*[\d.]+\s*(GRAMS?|G)\b/i)||[])[1]);
    if (seenCodes.has(match[1])) continue;
    seenCodes.add(match[1]);
    add(rows,{product_name:clean(match[2]),sku:match[1],product_code:match[1],category:defaultCategory,purity,weight,unit_of_measurement:unit,source_product_code:match[1]},file,page,pageText);
    found = true;
  }
  return found;
}

const jewellery=[], coins=[], kurtas=[], audit=[], errors=[];
for (const file of files) {
  const category = categoryFor(file); const relative = path.relative(root,file);
  let parser;
  try {
    parser = new PDFParse({data:fs.readFileSync(file)});
    const result = await parser.getText({pageJoiner:''});
    for (const pg of result.pages) {
      const text = pg.text || ''; const hasText = clean(text).length > 0;
      audit.push({source_pdf:path.basename(file),source_pdf_path:relative,source_category:category,total_pages:result.total,page_number:pg.num,has_selectable_text:hasText?'Yes':'No',extraction_method:hasText?'Text extraction':'OCR required',status:hasText?'Processed':'Needs OCR',notes:hasText?'Selectable text extracted.':'No selectable text; manual/OCR review required.'});
      if (!hasText || category !== 'Jewellery') continue;
      explicitProducts(jewellery,file,pg.num,text);
    }
  } catch (error) { errors.push({source_pdf:path.basename(file),source_pdf_path:relative,source_page_number:'',error_type:'PDF extraction failure',error_message:String(error.message||error),action_required:'Manual extraction required'}); }
  finally { if (parser) await parser.destroy().catch(()=>{}); }
}
// The Kurta PDF has no selectable text. Its 118 pages are audited, not guessed.
for (const row of audit.filter(r=>r.source_category==='Kurta')) errors.push({source_pdf:row.source_pdf,source_pdf_path:row.source_pdf_path,source_page_number:row.page_number,error_type:'Image-only page',error_message:'No selectable text; OCR/manual transcription needed.',action_required:'Manual verification required'});
const all=[...jewellery,...coins,...kurtas];
const duplicateMap=new Map(); for (const row of all) { const key=`${row.source_category}|${row.sku}|${row.product_name}|${row.weight}`; if (row.sku && duplicateMap.has(key)) duplicateMap.get(key).push(row); else duplicateMap.set(key,[row]); }
const duplicates=[...duplicateMap.values()].filter(x=>x.length>1).flat().map(r=>({...r,duplicate_reason:'Same extracted SKU, name and weight; retain pending source review.'}));
const verification=all.map(r=>({product_name:r.product_name,sku:r.sku,category:r.source_category,source_pdf:r.source_pdf,source_page_number:r.source_page_number,source_printed_page_number:r.source_printed_page_number,original_printed_rate:r.original_printed_rate,verification_status:r.source_verification_status,discrepancy_details:r.source_notes}));
const write=(name, rows, headers=columns)=>fs.writeFileSync(path.join(output,name),stringify(rows,{header:true,columns:headers,bom:true,escape_formulas:true}),'utf8');
write('jewellery_products.csv',jewellery); write('coin_products.csv',coins); write('kurta_products.csv',kurtas); write('all_products_master.csv',all); write('product_source_references.csv',all); write('product_variants.csv',[]); write('extraction_errors.csv',errors,Object.keys(errors[0]||{source_pdf:'',source_pdf_path:'',source_page_number:'',error_type:'',error_message:'',action_required:''})); write('manual_verification_required.csv',verification,verificationColumns); write('duplicate_products.csv',duplicates,[...columns,'duplicate_reason']); write('pdf_extraction_summary.csv',audit,pageAuditColumns);
const report = {pdfs_discovered:files.length,pages_processed:audit.length,jewellery_products:jewellery.length,coin_products:coins.length,kurta_products:kurtas.length,total_products:all.length,products_with_verified_prices:0,products_requiring_manual_verification:verification.length,duplicate_products_identified:duplicates.length,extraction_errors:errors.length,verification_percentage:0,notes:['No coin PDFs were found.','The Kurta PDF is image-only and has no products in this extraction; its 118 pages require OCR/manual transcription.','No price, SKU, or other missing value was invented. All extracted products remain Needs Review.']};
fs.writeFileSync(path.join(output,'extraction_report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(output,'import_compatibility_report.md'),`# Import compatibility report\n\nThe existing importer requires complete operational fields (for example SKU, price, stock and source timestamp). This output preserves only source evidence and deliberately leaves unprinted values blank, so it must not be imported until review completes.\n\nThe reversible migration \`030_product_source_references.js\` adds a source-reference table with foreign keys and indexes for product, coin, jewellery and kurta records.\n\n- PDFs discovered: ${report.pdfs_discovered}\n- Pages processed: ${report.pages_processed}\n- Extracted product candidates: ${report.total_products}\n- Verified products: 0\n- Verification percentage: 0%\n`);
console.log(JSON.stringify(report));
