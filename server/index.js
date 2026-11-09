import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import {db,migrate,preview,now,json,parse} from './db.js';
import {catalogue,activeRates,calculatePrice,isFresh,quote,todayIndia} from './pricing.js';
import {previewImport,publishImport,errorCsv,exportCsv,ordersCsv,schemas} from './importer.js';
import {checkout} from './orders.js';
import {registerCustomer,loginCustomer,customerState,saveCustomerState,mergeGuestState,claimSessionOrders,customerOrders,mayReadOrder,validateState} from './customers.js';
import {daily} from './daily.js';
import {loadFeedSettings as readFeedSettings} from './settings.js';
import {seed} from '../scripts/seed.js';
const app=express();const production=process.env.NODE_ENV==='production';
if(production&&(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32))throw Error('Production requires a strong SESSION_SECRET');
if(preview){await migrate();await seed();}else if(await db('products').where({supplier:'Fictional Preview'}).first())throw Error('Production cannot use the fictional preview database. Configure a clean production database.');
const loadFeedSettings=()=>readFeedSettings(db);
await loadFeedSettings();
app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'6mb'}));
class DbStore extends session.Store {get(sid,cb){db('sessions').where({sid}).first().then(r=>cb(null,r&&Number(r.expires)>Date.now()?parse(r.data):null)).catch(cb)}set(sid,data,cb){db('sessions').insert({sid,data:json(data),expires:Date.now()+8*3600000}).onConflict('sid').merge().then(()=>cb?.()).catch(cb)}destroy(sid,cb){db('sessions').where({sid}).del().then(()=>cb?.()).catch(cb)}}
app.use(session({secret:process.env.SESSION_SECRET||crypto.randomBytes(32).toString('hex'),resave:false,saveUninitialized:false,store:new DbStore(),cookie:{httpOnly:true,sameSite:'strict',secure:production,maxAge:8*3600000}}));
app.use('/api',routeSettings);
function routeSettings(req,res,next){loadFeedSettings().then(()=>next()).catch(next)}
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(['POST','PUT','DELETE','PATCH'].includes(req.method)){const origin=req.get('origin');if(origin && origin!==(process.env.APP_URL||'http://localhost:3000'))return res.status(403).json({error:'Origin not allowed'});if(req.path!=='/admin/login'&&req.path.startsWith('/admin')&&req.get('x-csrf-token')!==req.session.csrf)return res.status(403).json({error:'Please reload the admin panel'});}next();});
const route=f=>(req,res,next)=>Promise.resolve(f(req,res,next)).catch(next);
const auth=(roles=['owner','manager','viewer'])=>(req,res,next)=>req.session.staff&&roles.includes(req.session.staff.role)?next():res.status(403).json({error:'Staff access required'});
const audit=async(req,action,details)=>db('audit').insert({staff_id:req.session.staff.id,action,details:json(details),created_at:now()});
app.get('/api/config',(req,res)=>res.json({brand:process.env.BRAND_NAME||'Veyora Jewels',preview,paymentMode:'test',merchantReady:process.env.MERCHANT_READY==='true',contact:process.env.MERCHANT_EMAIL||'',shippingPolicy:process.env.SHIPPING_POLICY||'',returnsPolicy:process.env.RETURNS_POLICY||''}));
app.get('/api/products',route(async(req,res)=>res.json(await catalogue(db))));
app.post('/api/quote',route(async(req,res)=>res.json(await quote(db,req.body.items))));
app.post('/api/checkout',rateLimit({windowMs:60000,limit:20}),route(async(req,res)=>{if(!preview&&(process.env.MERCHANT_READY!=='true'||process.env.PAYMENT_MODE!=='test'))throw Error('Live checkout is awaiting merchant and payment configuration');const result=await checkout(db,req.body,true,req.session.customer?.id||null);req.session.orderIds=[...(req.session.orderIds||[]),result.id];res.json(result);}));
app.get('/api/orders/:id',route(async(req,res)=>{const order=await db('orders').where({id:req.params.id}).first();if(!mayReadOrder(req.session,order))return res.status(404).json({error:'Order not found'});res.json({...order,customer:parse(order.customer),items:(await db('order_items').where({order_id:order.id})).map(i=>parse(i.snapshot))});}));
const customerAuth=(req,res,next)=>req.session.customer?next():res.status(401).json({error:'Please sign in to your customer account.'});
const customerCsrf=(req,res,next)=>req.session.customerCsrf&&req.get('x-customer-csrf')===req.session.customerCsrf?next():res.status(403).json({error:'Please reload and try again.'});
app.get('/api/account/session',route(async(req,res)=>{req.session.customerCsrf ||= crypto.randomBytes(24).toString('hex');res.json({customer:req.session.customer||null,csrf:req.session.customerCsrf,state:req.session.customer?await customerState(db,req.session.customer.id):null});}));
const customerLoginLimit=rateLimit({windowMs:15*60000,limit:20});
async function establishCustomer(req,customer,guest){
 const oldStaff=req.session.staff,adminCsrf=req.session.csrf,guestOrders=req.session.customer?[]:req.session.orderIds||[];
 await mergeGuestState(db,customer.id,guest);await claimSessionOrders(db,customer,guestOrders);
 await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
 if(oldStaff){req.session.staff=oldStaff;req.session.csrf=adminCsrf;}
 req.session.customer=customer;req.session.customerCsrf=crypto.randomBytes(24).toString('hex');
 return {customer,csrf:req.session.customerCsrf,state:await customerState(db,customer.id)};
}
for(const mode of ['register','login'])app.post('/api/account/'+mode,customerLoginLimit,customerCsrf,route(async(req,res)=>{
 if(req.session.customer)return res.status(409).json({error:'Sign out before switching customer accounts.'});
 const guest=validateState(req.body.guestState||{bag:[],saved:[]});
 const customer=await (mode==='register'?registerCustomer:loginCustomer)(db,req.body);
 res.json(await establishCustomer(req,customer,guest));
}));
app.get('/api/account/orders',customerAuth,route(async(req,res)=>{const page=Number(req.query.page||1);if(!Number.isInteger(page)||page<1||page>10000)throw Error('Invalid order page');res.json(await customerOrders(db,req.session.customer.id,page));}));
app.put('/api/account/state',customerAuth,customerCsrf,route(async(req,res)=>res.json(await saveCustomerState(db,req.session.customer.id,req.body))));
app.post('/api/account/logout',customerAuth,customerCsrf,route(async(req,res)=>{
 const staff=req.session.staff,csrf=req.session.csrf;
 await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
 if(staff){req.session.staff=staff;req.session.csrf=csrf;}
 req.session.customerCsrf=crypto.randomBytes(24).toString('hex');res.json({csrf:req.session.customerCsrf});
}));
app.post('/api/admin/login',rateLimit({windowMs:15*60000,limit:10}),route(async(req,res)=>{const staff=await db('staff').where({email:String(req.body.email).toLowerCase()}).first();if(!staff||!await bcrypt.compare(String(req.body.password),staff.password_hash))return res.status(401).json({error:'Email or password is incorrect'});const customer=req.session.customer,customerCsrf=req.session.customerCsrf,orderIds=req.session.orderIds;await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));if(customer){req.session.customer=customer;req.session.customerCsrf=customerCsrf;}req.session.orderIds=orderIds;req.session.staff={id:staff.id,email:staff.email,role:staff.role};req.session.csrf=crypto.randomBytes(24).toString('hex');res.json({staff:req.session.staff,csrf:req.session.csrf});}));
app.get('/api/admin/session',auth(),(req,res)=>res.json({staff:req.session.staff,csrf:req.session.csrf}));
app.post('/api/admin/logout',auth(),route(async(req,res)=>{const customer=req.session.customer,customerCsrf=req.session.customerCsrf,orderIds=req.session.orderIds;await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));if(customer){req.session.customer=customer;req.session.customerCsrf=customerCsrf;}req.session.orderIds=orderIds;res.json({ok:true});}));
app.get('/api/admin/dashboard',auth(),route(async(req,res)=>{const [rates,batches,runs,orders,rule,audits,suppliers,rateHistory]=await Promise.all([activeRates(db),db('import_batches').select('id','kind','supplier','source_timestamp','status','summary','created_at').orderBy('id','desc').limit(30),db('daily_runs').orderBy('id','desc').limit(10),db('orders').orderBy('created_at','desc').limit(100),db('pricing_rules').orderBy('id','desc').first(),db('audit').orderBy('id','desc').limit(20),db('import_batches').where({status:'published'}).select('supplier','kind').max('source_timestamp as last_update').groupBy('supplier','kind'),db('rates').orderBy('id','desc').limit(100)]);const scheduled=runs.find(r=>r.trigger==='scheduled');const scheduleMissed=!scheduled||Date.now()-Date.parse(scheduled.started_at)>27*3600000;const todayBatches=batches.filter(b=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(b.created_at))===todayIndia());res.json({rateHistory,scheduleMissed,todayImports:{total:todayBatches.length,failed:todayBatches.filter(b=>b.status==='failed').length,published:todayBatches.filter(b=>b.status==='published').length},rates:Object.values(rates).map(r=>({...r,fresh:isFresh(r)})),batches:batches.map(b=>({...b,summary:parse(b.summary)})),runs:runs.map(r=>({...r,result:parse(r.result)})),orders:orders.map(o=>({...o,customer:parse(o.customer)})),rule,audits,suppliers,maxAgeHours:Number(process.env.GOLD_MAX_AGE_HOURS||48),feedSettings:{goldConfigured:!!process.env.GOLD_FEED_URL,productsConfigured:!!(process.env.PRODUCT_FEED_URL||process.env.PRODUCT_FEED_FILE),inventoryMode:process.env.INVENTORY_MODE||'incremental',overwriteFields:process.env.SUPPLIER_OVERWRITE_FIELDS||'stock,fixed_price,net_weight_g,making_flat,stone_charge,other_charge'},preview});}));
app.get('/api/admin/products',auth(),route(async(req,res)=>res.json(await db('products').orderBy('product_code'))));
app.patch('/api/admin/products/:sku',auth(['owner','manager']),route(async(req,res)=>{const {name,description,status}=req.body;if(!name||!['published','draft'].includes(status))throw Error('Name and valid publication status required');await db('products').where({sku:req.params.sku}).update({name:String(name).slice(0,200),description:String(description||'').slice(0,5000),status,updated_at:now()});await audit(req,'edit_product',{sku:req.params.sku});res.json({ok:true});}));
app.get('/api/admin/samples/:file',auth(),(req,res)=>{const allowed=['gold-rates-template.csv','gold-rates-example.csv','products-template.csv','products-example.csv','import-errors-example.csv'];if(!allowed.includes(req.params.file))return res.sendStatus(404);res.download(path.resolve('samples',req.params.file));});
app.get('/api/admin/export/:kind',auth(),route(async(req,res)=>{const k=req.params.kind,d=new Date().toISOString().slice(0,10);if(k==='products'){const rows=await db('products').orderBy('product_code');return res.type('text/csv').attachment(`products-${d}.csv`).send(exportCsv('products',rows));}if(k==='gold'){const rows=await db('rates').orderBy('id','desc');return res.type('text/csv').attachment(`gold-rates-${d}.csv`).send(exportCsv('gold',rows));}if(k==='orders'){const rows=await db('orders').orderBy('created_at','desc');return res.type('text/csv').attachment(`orders-${d}.csv`).send(ordersCsv(rows));}res.sendStatus(404);}));
app.post('/api/admin/import/preview',auth(['owner','manager']),route(async(req,res)=>{if(typeof req.body.csv!=='string')throw Error('Upload a UTF-8 CSV file');res.json(await previewImport(db,req.body.kind,req.body.csv,req.session.staff.id));}));
app.post('/api/admin/import/:id/publish',auth(['owner','manager']),route(async(req,res)=>res.json(await publishImport(db,Number(req.params.id),req.session.staff.id))));
app.get('/api/admin/import/:id/errors',auth(),route(async(req,res)=>{res.type('text/csv').attachment(`batch-${req.params.id}-errors.csv`).send(errorCsv(await db('import_errors').where({batch_id:req.params.id})));}));
app.post('/api/admin/run',auth(['owner','manager']),route(async(req,res)=>{if(req.body.kind&&!schemas[req.body.kind])throw Error('Unknown feed');await audit(req,'run_feed',{kind:req.body.kind||'daily'});res.json(await daily(db,'manual',req.body.kind,req.session.staff.id));}));
app.post('/api/admin/feed-settings',auth(['owner']),route(async(req,res)=>{
 const r=req.body,age=Number(r.maxAgeHours);if(!Number.isFinite(age)||age<1||age>168||!['incremental','full'].includes(r.inventoryMode))throw Error('Choose a rate age between 1 and 168 hours and a supported inventory mode');
 const changes={GOLD_MAX_AGE_HOURS:String(age),INVENTORY_MODE:r.inventoryMode};
 if(typeof r.overwriteFields==='string'){const fields=r.overwriteFields.split(',').map(f=>f.trim());if(fields.some(f=>!schemas.products.includes(f)||['sku','supplier','product_code','source_timestamp'].includes(f)))throw Error('Invalid supplier overwrite field');changes.SUPPLIER_OVERWRITE_FIELDS=fields.join(',');}
 for(const [field,key] of [['goldUrl','GOLD_FEED_URL'],['productUrl','PRODUCT_FEED_URL']])if(r[field]){let u;try{u=new URL(r[field])}catch{throw Error('Enter a valid HTTPS feed URL')}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Feed URLs must be HTTPS without embedded credentials or query secrets; use server-side Bearer tokens');changes[key]=u.href;}
 await db.transaction(async t=>{for(const [key,value] of Object.entries(changes))await t('settings').insert({key,value}).onConflict('key').merge();await t('audit').insert({staff_id:req.session.staff.id,action:'feed_settings',details:json({maxAgeHours:age,inventoryMode:r.inventoryMode,fields:changes.SUPPLIER_OVERWRITE_FIELDS,sourceKeysChanged:Object.keys(changes).filter(k=>k.endsWith('_URL'))}),created_at:now()});});await loadFeedSettings();res.json({ok:true});
}));
app.post('/api/admin/rules/preview',auth(['owner']),route(async(req,res)=>{const rule=validateRule(req.body);const rates=await activeRates(db);const products=await db('products');res.json(products.map(p=>{let before=null,after=null;try{before=calculatePrice(p,rates[p.purity],req.body.current||{}).total;after=calculatePrice(p,rates[p.purity],rule).total}catch{}return {sku:p.sku,before,after}}));}));
function validateRule(r){if(!Number.isFinite(Number(r.tax_percent))||r.tax_percent<0||r.tax_percent>100||![1,0.01,10,100].includes(Number(r.rounding))||!['exclusive','inclusive'].includes(r.tax_treatment))throw Error('Invalid tax or rounding rule');return {tax_percent:Number(r.tax_percent),rounding:Number(r.rounding),tax_treatment:r.tax_treatment};}
app.post('/api/admin/rules',auth(['owner']),route(async(req,res)=>{const rule=validateRule(req.body);await db.transaction(async t=>{await t('pricing_rules').insert({...rule,changed_at:now(),changed_by:req.session.staff.id});await t('audit').insert({staff_id:req.session.staff.id,action:'pricing_rule',details:json(rule),created_at:now()});});res.json({ok:true});}));
if(!production){const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}else{app.use(express.static('dist'));app.get('*',(req,res)=>res.sendFile(path.resolve('dist/index.html')));}
app.use((err,req,res,next)=>{res.status(err.status||(err.quote?409:400)).json({error:err.message,quote:err.quote});});
const port=Number(process.env.PORT||3000);app.listen(port,production?'0.0.0.0':'127.0.0.1',()=>console.log(`Veyora Jewels: http://localhost:${port} (${preview?'fictional preview':'production'})`));
