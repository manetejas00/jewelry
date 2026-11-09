import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDb,migrate} from '../server/db.js';
import {validate,schemas,previewImport,publishImport,exportCsv} from '../server/importer.js';
import {stringify} from 'csv-stringify/sync';
import {coinArtwork} from '../server/coin-artwork.js';
const stamp=new Date(Date.now()-1000).toISOString();
const coin={supplier:'Test Mint',sku:'MINT-AU-1',name:'Lakshmi Gold 1g',metal:'Gold',coin_type:'Gold Coin',purity:'24K',weight_g:'1.000',dimension:'12 mm',making_charge:'350',pricing_mode:'FIXED',fixed_price:'10000',stock:'10',description:'Test coin',image:coinArtwork[0].image,status:'published',image_kind:'illustration',source_timestamp:stamp};
const csv=rows=>stringify(rows,{header:true,columns:schemas.coins});
test('coin validation accepts export format and rejects malformed stock, purity, price, duplicates and headers',()=>{
 assert.deepEqual(validate('coins',csv([coin])).errors,[]);
 for(const patch of [{stock:'-1'},{purity:'18'},{weight_g:'1g'},{fixed_price:'0'},{image:'javascript:alert(1)'},{source_timestamp:'yesterday'}])assert.ok(validate('coins',csv([{...coin,...patch}])).errors.length);
 assert.ok(validate('coins',csv([coin,coin])).errors.some(e=>e.field==='sku'));
 assert.ok(validate('coins','sku,name\nX,Y').errors.length);
 for(const a of coinArtwork)assert.ok(fs.statSync('public'+a.image).size>10000);
});
test('coin preview is separate, publication is atomic and repeat-safe, export round trips, older snapshots fail',async()=>{
 const k=createDb(':memory:');try{await migrate(k);
 const staged=await previewImport(k,'coins',csv([coin]));assert.equal(staged.status,'staged');assert.equal(await k('coins').first(),undefined);
 await publishImport(k,staged.id);assert.equal((await k('coins').first()).stock,10);assert.equal((await k('products')).length,0);
 assert.equal((await publishImport(k,staged.id)).duplicate,true);
 assert.equal((await previewImport(k,'coins',csv([coin]))).duplicate,true);
 const exported=exportCsv('coins',await k('coins'));assert.deepEqual(validate('coins',exported).errors,[]);
 const roundtrip=await previewImport(k,'coins',exported);await publishImport(k,roundtrip.id);assert.equal((await k('coins').first()).stock,10);
 const bad=await previewImport(k,'coins',csv([{...coin,stock:'-5'}]));assert.equal(bad.status,'failed');await assert.rejects(publishImport(k,bad.id));assert.equal((await k('coins').first()).stock,10);
 const older=await previewImport(k,'coins',csv([{...coin,source_timestamp:'2020-01-01T00:00:00.000Z'}]));assert.ok(older.errors.some(e=>e.field==='source_timestamp'));
 const wrong=await previewImport(k,'coins',csv([{...coin,supplier:'Other Mint',source_timestamp:new Date().toISOString()}]));assert.ok(wrong.errors.length);
 const pending=await previewImport(k,'coins',csv([{...coin,stock:'15',source_timestamp:new Date().toISOString()}]));await k('coins').where({sku:coin.sku}).update({source_timestamp:new Date(Date.now()+1000).toISOString()});await assert.rejects(publishImport(k,pending.id));assert.equal((await k('coins').first()).stock,10);assert.equal((await k('import_locks')).length,0);
 }finally{await k.destroy()}
});
test('coin stock snapshots deduct later paid sales without changing historical orders',async()=>{
 const k=createDb(':memory:');try{await migrate(k);const first=await previewImport(k,'coins',csv([coin]));await publishImport(k,first.id);
 await k('orders').insert({id:'existing-paid',status:'paid',total:20000,created_at:new Date().toISOString()});await k('order_items').insert({order_id:'existing-paid',sku:coin.sku,quantity:2,snapshot:'original snapshot'});
 const next=await previewImport(k,'coins',csv([{...coin,stock:'12'}]));await publishImport(k,next.id);assert.equal((await k('coins').first()).stock,10);assert.equal((await k('orders').first()).total,20000);assert.equal((await k('order_items').first()).snapshot,'original snapshot');
 const again=await previewImport(k,'coins',exportCsv('coins',await k('coins')));await publishImport(k,again.id);assert.equal((await k('coins').first()).stock,10);
 }finally{await k.destroy()}
});
