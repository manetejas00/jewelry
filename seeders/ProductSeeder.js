import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {db,now} from '../server/db.js';
import {schemas,validate,exportCsv} from '../server/importer.js';

const root=fileURLToPath(new URL('../',import.meta.url));
export const productData=JSON.parse(fs.readFileSync(new URL('./data/products-100.json',import.meta.url),'utf8'));
export const collectionSupplier='Veyora Preview Collection 100';
export function validateProductData(data=productData){
 if(!Array.isArray(data)||data.length!==100)throw Error('ProductSeeder requires exactly 100 products.');
 for(const key of ['sku','slug','product_code','name','description','image'])if(new Set(data.map(r=>r[key])).size!==100)throw Error(`ProductSeeder has duplicate ${key} values.`);
 const hashes=new Set();
 for(const row of data){
  if(row.supplier!==collectionSupplier||!['Rings','Earrings','Necklaces','Bracelets'].includes(row.category))throw Error(`Invalid collection identity: ${row.sku}`);
  if(!/^\/assets\/products-100\/[a-z0-9-]+\.webp$/.test(row.image)||row.slug!==row.product_code)throw Error(`Invalid image or slug: ${row.sku}`);
  const full=path.join(root,'public',row.image),thumb=full.replace('.webp','-thumb.webp');
  for(const file of [full,thumb]){if(!fs.existsSync(file)||fs.statSync(file).size<1000)throw Error(`Product image missing or empty: ${row.sku}`);const bytes=fs.readFileSync(file);if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error(`Invalid WebP: ${row.sku}`)}
  const hash=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');if(hashes.has(hash))throw Error(`Duplicate product image: ${row.sku}`);hashes.add(hash);
 }
 const rows=data.map(row=>({...row,source_timestamp:now()}));
 const checked=validate('products',exportCsv('products',rows));if(checked.errors.length)throw Error(`Invalid product data: ${checked.errors[0].field}: ${checked.errors[0].correction}`);
 return rows.map(row=>Object.fromEntries([...schemas.products,'slug'].map(key=>[key,row[key]])));
}

export async function ProductSeeder(k=db,{data=productData}={}){
 const rows=validateProductData(data);
 if(!await k.schema.hasTable('products'))throw Error('Run npm run migrate before ProductSeeder.');
 return k.transaction(async t=>{
  // A shared lock and unique SKUs make simultaneous runs safe as well as repeat runs.
  try{await t('import_locks').insert({name:'product-seeder-100',acquired_at:now()});}catch{throw Error('ProductSeeder is already running. Try again when it finishes.');}
  let inserted=0,existing=0;const stamp=now();
  for(const row of rows){
   const old=await t('products').where({sku:row.sku}).forUpdate().first();
   const other=await t('products').where({slug:row.slug}).whereNot({sku:row.sku}).first();
   if(other||(old&&(old.supplier!==collectionSupplier||old.product_code!==row.product_code)))throw Error(`Product identity collision: ${row.sku}. No records were changed.`);
   if(await t('coins').where({sku:row.sku}).first())throw Error(`Coin SKU collision: ${row.sku}`);
   if(old){existing++;continue;} // Keep all merchant edits and sold stock on subsequent runs.
   await t('products').insert({...row,updated_at:stamp});
   await t('supplier_skus').insert({supplier:collectionSupplier,supplier_sku:row.sku,sku:row.sku});
   await t('product_images').insert({sku:row.sku,product_code:row.product_code,role:'hero',url:row.image,alt_text:`${row.name} — illustrative catalogue image`,sort_order:0,created_at:stamp,updated_at:stamp});
   inserted++;
  }
  const count=await t('products').whereIn('sku',rows.map(r=>r.sku)).count('* as total').first();if(Number(count.total)!==100)throw Error('Collection verification failed. Transaction rolled back.');
  await t('import_locks').where({name:'product-seeder-100'}).del();
  return {inserted,existing,collectionTotal:100,categories:Object.fromEntries(['Rings','Earrings','Necklaces','Bracelets'].map(c=>[c,rows.filter(r=>r.category===c).length]))};
 },k.client.config.client==='mysql2'?{isolationLevel:'read committed'}:{});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await ProductSeeder(),null,2))}catch(e){console.error(e.message);process.exitCode=1}finally{await db.destroy()}
}
