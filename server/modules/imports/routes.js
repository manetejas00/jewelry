import path from 'node:path';
import {validationError} from '../../errors.js';
import {now, json} from '../../db.js';
import {previewImport, publishImport, errorCsv, exportCsv, ordersCsv, schemas} from '../../importer.js';
import {daily} from '../../daily.js';
import {invalidateSearchCache} from '../../search.js';

export function registerSampleRoutes(app, { auth }) {
  app.get('/api/admin/samples/:file',auth(),(req,res)=>{const allowed=['jewelry-template.csv','jewelry-example.csv','coin-template.csv','coin-example.csv','kurta-template.csv','kurta-example.csv','gold-rates-template.csv','gold-rates-example.csv','metal-rates-template.csv','metal-rates-example.csv','metal-rates-template.xlsx','metal-rates-example.xlsx','gold-rates-template.xlsx','gold-rates-example.xlsx','products-template.csv','products-example.csv','coins-template.csv','coins-example.csv','kurtas-template.csv','kurtas-example.csv','import-errors-example.csv','jewellery-template.csv','jewellery-example.csv','gold-jewellery-template.csv','gold-jewellery-example.csv','silver-jewellery-template.csv','silver-jewellery-example.csv','kurta-designs-template.csv','kurta-designs-example.csv','kurta-variants-template.csv','kurta-variants-example.csv','materials-template.csv','materials-example.csv','craftsmanship-template.csv','craftsmanship-example.csv','collections-template.csv','collections-example.csv'];if(!allowed.includes(req.params.file))return res.sendStatus(404);res.download(path.resolve('samples',req.params.file));});
}

export function registerImportRoutes(app, { db, route, auth, audit, loadFeedSettings }) {
  app.get('/api/admin/export/:kind',auth(),route(async(req,res)=>{const k=req.params.kind,d=new Date().toISOString().slice(0,10);if(k==='orders'&&req.session.staff.role==='viewer')return res.status(403).json({error:'Order export requires a manager'});if(k==='products'||k==='jewellery'||k==='jewelry'){const rows=await db('products').where(k==='jewellery'||k==='jewelry'?{is_kurta:0}:{}).orderBy('product_code');return res.type('text/csv').attachment(`${k}-${d}.csv`).send(exportCsv('products',rows));}if(k==='coins'||k==='coin'){const rows=await db('coins').orderBy('id','desc');return res.type('text/csv').attachment(`coins-${d}.csv`).send(exportCsv('coins',rows));}if(k==='kurtas'||k==='kurta'){const rows=await db('products').where(function(){this.where({is_kurta:true}).orWhere({category:'Kurtas'}).orWhere({category:'Kurta'}).orWhere({category:'Chicken Curry Kurtas'}).orWhere('category','like','%Kurta%');}).orderBy('product_code').orderBy('sku');return res.type('text/csv').attachment(`kurtas-${d}.csv`).send(exportCsv('kurtas',rows));}if(k==='gold'){const rows=await db('rates').orderBy('id','desc');return res.type('text/csv').attachment(`gold-rates-${d}.csv`).send(exportCsv('gold',rows));}if(k==='orders'){const rows=await db('orders').orderBy('created_at','desc');return res.type('text/csv').attachment(`orders-${d}.csv`).send(ordersCsv(rows));}res.sendStatus(404);}));
  app.post('/api/admin/import/preview',auth(['owner','manager']),route(async(req,res)=>{if(typeof req.body.csv!=='string')throw validationError('Upload a UTF-8 CSV file');res.json(await previewImport(db,req.body.kind,req.body.csv,req.session.staff.id));}));
  app.post('/api/admin/import/:id/publish',auth(['owner','manager']),route(async(req,res)=>{const out=await publishImport(db,Number(req.params.id),req.session.staff.id);invalidateSearchCache();return res.json(out);}));
  app.get('/api/admin/import/:id/errors',auth(),route(async(req,res)=>{res.type('text/csv').attachment(`batch-${req.params.id}-errors.csv`).send(errorCsv(await db('import_errors').where({batch_id:req.params.id})));}));
  app.post('/api/admin/run',auth(['owner','manager']),route(async(req,res)=>{if(req.body.kind&&!schemas[req.body.kind])throw validationError('Unknown feed');await audit(req,'run_feed',{kind:req.body.kind||'daily'});res.json(await daily(db,'manual',req.body.kind,req.session.staff.id));}));
  app.post('/api/admin/feed-toggle',auth(['owner','manager']),route(async(req,res)=>{
   const {status,kind,enabled}=req.body;
   const changes={};
   if(status){
    if(!['active','stopped'].includes(status))throw validationError('Status must be active or stopped');
    changes.FEED_STATUS=status;
   }
   if(kind==='gold'&&enabled!==undefined){
    changes.GOLD_FEED_ENABLED=String(Boolean(enabled));
   }
   if(kind==='products'&&enabled!==undefined){
    changes.PRODUCT_FEED_ENABLED=String(Boolean(enabled));
   }
   await db.transaction(async t=>{
    for(const [key,value] of Object.entries(changes))await t('settings').insert({key,value}).onConflict('key').merge();
    await t('audit').insert({staff_id:req.session.staff.id,action:'feed_toggle',details:json(changes),created_at:now()});
   });
   await loadFeedSettings();
   res.json({ok:true,changes,feedStatus:process.env.FEED_STATUS||'active',goldFeedEnabled:process.env.GOLD_FEED_ENABLED!=='false',productFeedEnabled:process.env.PRODUCT_FEED_ENABLED!=='false'});
  }));
  app.post('/api/admin/feed-settings',auth(['owner']),route(async(req,res)=>{
   const r=req.body;
   const changes={};
   if(r.maxAgeHours!==undefined&&r.maxAgeHours!==''){
    const age=Number(r.maxAgeHours);
    if(!Number.isFinite(age)||age<1||age>168)throw validationError('Choose a rate age between 1 and 168 hours');
    changes.GOLD_MAX_AGE_HOURS=String(age);
   }
   if(r.inventoryMode){
    if(!['incremental','full'].includes(r.inventoryMode))throw validationError('Choose a supported inventory mode');
    changes.INVENTORY_MODE=r.inventoryMode;
   }
   if(r.feedStatus){
    if(!['active','stopped'].includes(r.feedStatus))throw validationError('Status must be active or stopped');
    changes.FEED_STATUS=r.feedStatus;
   }
   if(r.goldFeedEnabled!==undefined){
    changes.GOLD_FEED_ENABLED=String(r.goldFeedEnabled==='true'||r.goldFeedEnabled===true);
   }
   if(r.productFeedEnabled!==undefined){
    changes.PRODUCT_FEED_ENABLED=String(r.productFeedEnabled==='true'||r.productFeedEnabled===true);
   }
   if(typeof r.overwriteFields==='string'){
    const fields=r.overwriteFields.split(',').map(f=>f.trim()).filter(Boolean);
    if(fields.some(f=>!schemas.products.includes(f)||['sku','supplier','product_code','source_timestamp'].includes(f)))throw validationError('Invalid supplier overwrite field');
    changes.SUPPLIER_OVERWRITE_FIELDS=fields.join(',');
   }
   for(const [field,key] of [['goldUrl','GOLD_FEED_URL'],['productUrl','PRODUCT_FEED_URL']])if(r[field]!==undefined){
    if(r[field]===''||r[field]===null){
     changes[key]='';
    }else if(field==='goldUrl'&&r[field]==='auto'){
     changes[key]=r[field];
    }else{
     let u;try{u=new URL(r[field])}catch{throw validationError('Enter a valid HTTPS feed URL')}
     if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw validationError('Feed URLs must be HTTPS without embedded credentials or query secrets; use server-side Bearer tokens');
     changes[key]=u.href;
    }
   }
   await db.transaction(async t=>{
    for(const [key,value] of Object.entries(changes))await t('settings').insert({key,value}).onConflict('key').merge();
    await t('audit').insert({staff_id:req.session.staff.id,action:'feed_settings',details:json({maxAgeHours:r.maxAgeHours,inventoryMode:r.inventoryMode,changes}),created_at:now()});
   });
   await loadFeedSettings();
   res.json({ok:true,changes});
  }));
}
