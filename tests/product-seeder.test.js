import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDb,migrate,db} from '../server/db.js';
import {ProductSeeder,productData} from '../seeders/ProductSeeder.js';
import {catalogue} from '../server/pricing.js';
test('ProductSeeder inserts exactly 100 distinct products and is idempotent without resetting stock or merchant edits',async()=>{
 const k=createDb(':memory:');try{await migrate(k);
 await k('products').insert({sku:'KEEP-EXISTING',product_code:'keep-existing',slug:'keep-existing',name:'Existing merchant product',stock:2,supplier:'Merchant',pricing_mode:'FIXED',fixed_price:100,status:'published'});
 const first=await ProductSeeder(k);assert.equal(first.inserted,100);assert.equal((await k('products')).length,101);assert.equal((await k('supplier_skus')).length,100);assert.equal((await k('product_images')).length,100);
 for(const key of ['sku','slug','name','description','image'])assert.equal(new Set((await k('products').where({supplier:productData[0].supplier})).map(p=>p[key])).size,100);
 for(const row of productData){assert.ok(await k('supplier_skus').where({sku:row.sku,supplier_sku:row.sku}).first());assert.equal((await k('product_images').where({sku:row.sku,product_code:row.product_code}).first()).url,row.image);}
 const sku=productData[0].sku;await k('products').where({sku}).update({stock:1,name:'Merchant edited title'});
 const second=await ProductSeeder(k);assert.equal(second.inserted,0);assert.equal(second.existing,100);assert.equal((await k('products').where({sku}).first()).stock,1);assert.equal((await k('products').where({sku}).first()).name,'Merchant edited title');assert.equal((await k('products')).length,101);assert.equal((await k('product_images')).length,100);
 const visible=await catalogue(k);assert.equal(visible.filter(p=>p.supplier===productData[0].supplier).length,100);assert.ok(visible.every(p=>p.price>0));
 for(const cat of ['Rings','Earrings','Necklaces','Bracelets'])assert.equal((await k('products').where({supplier:productData[0].supplier,category:cat})).length,25);
 }finally{await k.destroy()}
});
test('ProductSeeder rolls back on a conflicting identity and rejects invalid input',async()=>{
 const k=createDb(':memory:');try{await migrate(k);await k('products').insert({sku:productData[30].sku,product_code:'merchant-owned',slug:'merchant-owned',name:'Keep this',supplier:'Merchant',stock:3});
 await assert.rejects(ProductSeeder(k),/collision/);assert.equal((await k('products')).length,1);assert.equal((await k('product_images')).length,0);assert.equal((await k('supplier_skus')).length,0);assert.equal((await k('import_locks')).length,0);
 await assert.rejects(ProductSeeder(k,{data:productData.slice(1)}),/exactly 100/);
 const invalid=structuredClone(productData);invalid[10].stock=-1;await assert.rejects(ProductSeeder(k,{data:invalid}),/Invalid product data/);assert.equal((await k('products')).length,1);
 }finally{await k.destroy();await db.destroy()}
});
