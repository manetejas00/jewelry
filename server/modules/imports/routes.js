import path from 'node:path';
import * as XLSX from 'xlsx';
import {validationError} from '../../errors.js';
import {now, json} from '../../db.js';
import {previewImport, publishImport, errorCsv, exportCsv, ordersCsv, schemas} from '../../importer.js';
import {rowsWithGallery} from '../../../shared/catalogue-images.js';
import {invalidateSearchCache} from '../../search.js';

export function registerSampleRoutes(app, { auth }) {
  app.get('/api/admin/samples/:file',auth(),(req,res)=>{const allowed=['jewelry-template.csv','jewelry-example.csv','coin-template.csv','coin-example.csv','kurta-template.csv','kurta-example.csv','gold-rates-template.csv','gold-rates-example.csv','metal-rates-template.csv','metal-rates-example.csv','metal-rates-template.xlsx','metal-rates-example.xlsx','gold-rates-template.xlsx','gold-rates-example.xlsx','products-template.csv','products-example.csv','coins-template.csv','coins-example.csv','kurtas-template.csv','kurtas-example.csv','import-errors-example.csv','jewellery-template.csv','jewellery-example.csv','gold-jewellery-template.csv','gold-jewellery-example.csv','silver-jewellery-template.csv','silver-jewellery-example.csv','kurta-designs-template.csv','kurta-designs-example.csv','kurta-variants-template.csv','kurta-variants-example.csv','materials-template.csv','materials-example.csv','craftsmanship-template.csv','craftsmanship-example.csv','collections-template.csv','collections-example.csv'];if(!allowed.includes(req.params.file))return res.sendStatus(404);res.download(path.resolve('samples',req.params.file));});
}

export function registerImportRoutes(app, { db, route, auth, audit }) {
  app.get('/api/admin/export/:kind',auth(),route(async(req,res)=>{const k=req.params.kind,d=new Date().toISOString().slice(0,10);if(k==='orders'&&req.session.staff.role==='viewer')return res.status(403).json({error:'Order export requires a manager'});if(k==='products'||k==='jewellery'||k==='jewelry'){const rows=await rowsWithGallery(db, await db('products').where(k==='jewellery'||k==='jewelry'?{is_kurta:0}:{}).orderBy('product_code'), 'products');return res.type('text/csv').attachment(`${k}-${d}.csv`).send(exportCsv('products',rows));}if(k==='coins'||k==='coin'){const rows=await rowsWithGallery(db, await db('coins').orderBy('id','desc'), 'coins');return res.type('text/csv').attachment(`coins-${d}.csv`).send(exportCsv('coins',rows));}if(k==='kurtas'||k==='kurta'){const rows=await rowsWithGallery(db, await db('products').where(function(){this.where({is_kurta:true}).orWhere({category:'Kurtas'}).orWhere({category:'Kurta'}).orWhere({category:'Chicken Curry Kurtas'}).orWhere('category','like','%Kurta%');}).orderBy('product_code').orderBy('sku'), 'kurtas');return res.type('text/csv').attachment(`kurtas-${d}.csv`).send(exportCsv('kurtas',rows));}if(k==='gold'){const rows=await db('rates').orderBy('id','desc');return res.type('text/csv').attachment(`gold-rates-${d}.csv`).send(exportCsv('gold',rows));}if(k==='orders'){const rows=await db('orders').orderBy('created_at','desc');return res.type('text/csv').attachment(`orders-${d}.csv`).send(ordersCsv(rows));}res.sendStatus(404);}));
  app.post('/api/admin/import/preview',auth(['owner','manager']),route(async(req,res)=>{
   let csv=req.body.csv;
   if(typeof req.body.file==='string'){
    const workbook=XLSX.read(Buffer.from(req.body.file.replace(/^data:[^;]+;base64,/,''),'base64'),{type:'buffer'});
    if(!workbook.SheetNames[0])throw validationError('Excel file contains no worksheets');
    csv=XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
   }
   if(typeof csv!=='string')throw validationError('Upload a CSV, XLS, or XLSX file');
   res.json(await previewImport(db,req.body.kind,csv,req.session.staff.id));
  }));
  app.post('/api/admin/import/:id/publish',auth(['owner','manager']),route(async(req,res)=>{const out=await publishImport(db,Number(req.params.id),req.session.staff.id);invalidateSearchCache();return res.json(out);}));
  app.get('/api/admin/import/:id/errors',auth(),route(async(req,res)=>{res.type('text/csv').attachment(`batch-${req.params.id}-errors.csv`).send(errorCsv(await db('import_errors').where({batch_id:req.params.id})));}));
}
