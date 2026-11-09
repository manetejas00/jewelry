import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import {db,migrate,preview,now,json,parse} from './db.js';
import {catalogue,coinCatalogue,calculateCoinPrice,getSilverRate,activeRates,calculatePrice,isFresh,quote,todayIndia,activeOffers,matchOffer} from './pricing.js';
import {previewImport,publishImport,errorCsv,exportCsv,ordersCsv,schemas} from './importer.js';
import {checkout} from './orders.js';
import {validatePricingRule} from './pricing-rules.js';
import {registerCustomer,loginCustomer,customerState,saveCustomerState,mergeGuestState,claimSessionOrders,customerOrders,mayReadOrder,validateState} from './customers.js';
import {daily} from './daily.js';
import {loadFeedSettings as readFeedSettings} from './settings.js';
import {seed} from '../scripts/seed.js';
const app=express();const production=process.env.NODE_ENV==='production';
if(production&&(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32))throw Error('Production requires a strong SESSION_SECRET');
if(preview){await migrate();await seed();}else if(await db('products').where({supplier:'Fictional Preview'}).first())throw Error('Production cannot use the fictional preview database. Configure a clean production database.');
const loadFeedSettings=()=>readFeedSettings(db);
await loadFeedSettings();
app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'50mb'}));
const uploadsDir=fs.existsSync(path.resolve('../public_html/uploads'))?path.resolve('../public_html/uploads'):path.resolve('public/uploads');
fs.mkdirSync(uploadsDir,{recursive:true});
app.use('/uploads',express.static(uploadsDir));
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
app.get('/api/coins',route(async(req,res)=>res.json(await coinCatalogue(db))));
app.get('/api/offers',route(async(req,res)=>{
  const hasOffers=await db.schema.hasTable('offers').catch(()=>false);
  if(!hasOffers)return res.json([]);
  const list=await db('offers').where({status:'active'}).orderBy('priority','desc').orderBy('id','desc');
  res.json(list);
}));
app.get('/api/admin/offers',auth(),route(async(req,res)=>{
  const hasOffers=await db.schema.hasTable('offers').catch(()=>false);
  if(!hasOffers)return res.json([]);
  const list=await db('offers').orderBy('priority','desc').orderBy('id','desc');
  res.json(list);
}));
app.post('/api/admin/offers',auth(['owner','manager']),route(async(req,res)=>{
  const {name,code,badge_text,discount_type,discount_value,applies_to,target_value,banner_headline,banner_subtext,status,priority,show_in_banner,show_in_grid}=req.body;
  if(!name||!badge_text)throw Error('Offer name and badge text are required');
  const nowStr=now();
  const offerData={
    name:String(name).trim().slice(0,200),
    code:code?String(code).trim().toUpperCase().slice(0,50):null,
    badge_text:String(badge_text).trim().slice(0,100),
    discount_type:['making_percent','total_percent','flat_amount','badge_only'].includes(discount_type)?discount_type:'making_percent',
    discount_value:Number(discount_value||0),
    applies_to:['all','products','coins','gold','silver','category','sku'].includes(applies_to)?applies_to:'all',
    target_value:target_value?String(target_value).trim():null,
    banner_headline:banner_headline?String(banner_headline).trim().slice(0,250):null,
    banner_subtext:banner_subtext?String(banner_subtext).trim().slice(0,500):null,
    status:status==='paused'?'paused':'active',
    priority:Number(priority||0),
    show_in_banner:show_in_banner!==undefined?Boolean(show_in_banner):true,
    show_in_grid:show_in_grid!==undefined?Boolean(show_in_grid):true,
    created_at:nowStr,
    updated_at:nowStr
  };
  const [id]=await db('offers').insert(offerData);
  await audit(req,'create_offer',{id,name:offerData.name,badge_text:offerData.badge_text});
  res.json({ok:true,id,offer:offerData});
}));
app.patch('/api/admin/offers/:id',auth(['owner','manager']),route(async(req,res)=>{
  const offer=await db('offers').where({id:req.params.id}).first();
  if(!offer)return res.status(404).json({error:'Offer not found'});
  const patch={updated_at:now()};
  const fields=['name','code','badge_text','discount_type','discount_value','applies_to','target_value','banner_headline','banner_subtext','status','priority','show_in_banner','show_in_grid'];
  for(const f of fields){
    if(req.body[f]!==undefined){
      if(f==='discount_value'||f==='priority')patch[f]=Number(req.body[f]||0);
      else if(f==='show_in_banner'||f==='show_in_grid')patch[f]=Boolean(req.body[f]);
      else if(f==='code')patch[f]=req.body[f]?String(req.body[f]).trim().toUpperCase():null;
      else patch[f]=req.body[f]===null?null:String(req.body[f]).trim();
    }
  }
  await db('offers').where({id:req.params.id}).update(patch);
  await audit(req,'update_offer',{id:req.params.id,patch});
  res.json({ok:true});
}));
app.delete('/api/admin/offers/:id',auth(['owner','manager']),route(async(req,res)=>{
  const offer=await db('offers').where({id:req.params.id}).first();
  if(!offer)return res.status(404).json({error:'Offer not found'});
  await db('offers').where({id:req.params.id}).del();
  await audit(req,'delete_offer',{id:req.params.id,name:offer.name});
  res.json({ok:true});
}));
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
app.get('/api/admin/dashboard',auth(),route(async(req,res)=>{const [rates,batches,runs,orders,rule,audits,suppliers,rateHistory]=await Promise.all([activeRates(db),db('import_batches').select('id','kind','supplier','source_timestamp','status','summary','created_at').orderBy('id','desc').limit(30),db('daily_runs').orderBy('id','desc').limit(10),db('orders').orderBy('created_at','desc').limit(100),db('pricing_rules').orderBy('id','desc').first(),db('audit').orderBy('id','desc').limit(20),db('import_batches').where({status:'published'}).select('supplier','kind').max('source_timestamp as last_update').groupBy('supplier','kind'),db('rates').orderBy('id','desc').limit(100)]);const scheduled=runs.find(r=>r.trigger==='scheduled');const scheduleMissed=!scheduled||Date.now()-Date.parse(scheduled.started_at)>27*3600000;const todayBatches=batches.filter(b=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(b.created_at))===todayIndia());res.json({rateHistory,scheduleMissed,todayImports:{total:todayBatches.length,failed:todayBatches.filter(b=>b.status==='failed').length,published:todayBatches.filter(b=>b.status==='published').length},rates:Object.values(rates).map(r=>({...r,fresh:isFresh(r)})),batches:batches.map(b=>({...b,summary:parse(b.summary)})),runs:runs.map(r=>({...r,result:parse(r.result)})),orders:orders.map(o=>({...o,customer:parse(o.customer)})),rule,audits,suppliers,maxAgeHours:Number(process.env.GOLD_MAX_AGE_HOURS||48),feedSettings:{goldConfigured:!!process.env.GOLD_FEED_URL,productsConfigured:!!(process.env.PRODUCT_FEED_URL||process.env.PRODUCT_FEED_FILE),inventoryMode:process.env.INVENTORY_MODE||'incremental',overwriteFields:process.env.SUPPLIER_OVERWRITE_FIELDS||'stock,fixed_price,net_weight_g,making_flat,stone_charge,other_charge',feedStatus:process.env.FEED_STATUS||'active',goldFeedEnabled:process.env.GOLD_FEED_ENABLED!=='false',productFeedEnabled:process.env.PRODUCT_FEED_ENABLED!=='false',goldUrl:process.env.GOLD_FEED_URL||'',productUrl:process.env.PRODUCT_FEED_URL||''},preview});}));
app.get('/api/admin/products',auth(),route(async(req,res)=>{
 const products=await db('products').orderBy('product_code');
 const hasImages=await db.schema.hasTable('product_images').catch(()=>false);
 const images=hasImages?await db('product_images').orderBy('sort_order','asc').orderBy('id','asc'):[];
 const imagesByProduct={};
 for(const img of images){
  const k=img.product_code||img.sku;
  if(k){
   if(!imagesByProduct[k])imagesByProduct[k]=[];
   imagesByProduct[k].push(img);
  }
 }
 res.json(products.map(p=>({...p,images:imagesByProduct[p.product_code]||imagesByProduct[p.sku]||[]})));
}));
app.patch('/api/admin/products/:sku',auth(['owner','manager']),route(async(req,res)=>{const {name,description,status,image}=req.body;if(!name||!['published','draft'].includes(status))throw Error('Name and valid publication status required');const patch={name:String(name).slice(0,200),description:String(description||'').slice(0,5000),status,updated_at:now()};if(typeof image==='string'&&image.trim())patch.image=String(image).trim().slice(0,2000);await db('products').where({sku:req.params.sku}).update(patch);await audit(req,'edit_product',{sku:req.params.sku,hasImage:!!image});res.json({ok:true});}));
app.get('/api/admin/coins',auth(),route(async(req,res)=>{
 const coins=await db('coins').orderBy('id','desc');
 const [rates,silverRate,rules]=await Promise.all([activeRates(db),getSilverRate(db),db('pricing_rules').orderBy('id','desc').first()]);
 res.json({
  coins:coins.map(c=>{
   let p=null;
   try{p=calculateCoinPrice(c,rates,silverRate,rules);}catch{}
   return {...c,calculated_price:p?.total??null,breakdown:p};
  }),
  silverRate,
  goldRate24k:rates['24K']?.inr_per_gram||null
 });
}));
app.post('/api/admin/coins',auth(['owner','manager']),route(async(req,res)=>{
 const {sku,name,metal,coin_type,purity,weight_g,dimension,making_charge,pricing_mode,fixed_price,stock,description,image,status}=req.body;
 if(!sku||!name||!metal||!weight_g)throw Error('SKU, Name, Metal, and Weight in grams are required');
 const cleanSku=String(sku).trim().toUpperCase();
 const existing=await db('coins').where({sku:cleanSku}).first();
 if(existing)throw Error(`A coin with SKU "${cleanSku}" already exists`);
 const nNow=now();
 const coinData={
  sku:cleanSku,
  name:String(name).trim().slice(0,250),
  metal:metal==='Silver'?'Silver':'Gold',
  coin_type:String(coin_type||(metal==='Silver'?'Silver Coin':'Gold Coin')).trim().slice(0,100),
  purity:String(purity||(metal==='Silver'?'999':'24K')).trim().slice(0,50),
  weight_g:Number(weight_g),
  dimension:dimension?String(dimension).trim().slice(0,100):null,
  making_charge:Number(making_charge||0),
  pricing_mode:pricing_mode==='FIXED'?'FIXED':'METAL_LINKED',
  fixed_price:fixed_price?Number(fixed_price):null,
  stock:Math.max(0,parseInt(stock||0,10)),
  description:description?String(description).trim().slice(0,5000):null,
  image:image?String(image).trim().slice(0,2000):null,
  status:['published','draft'].includes(status)?status:'published',
  created_at:nNow,
  updated_at:nNow
 };
 await db('coins').insert(coinData);
 await audit(req,'create_coin',{sku:cleanSku,name:coinData.name});
 res.json({ok:true,coin:coinData});
}));
app.patch('/api/admin/coins/:sku',auth(['owner','manager']),route(async(req,res)=>{
 const coin=await db('coins').where({sku:req.params.sku}).first();
 if(!coin)return res.status(404).json({error:'Coin not found'});
 const patch={updated_at:now()};
 const fields=['name','metal','coin_type','purity','weight_g','dimension','making_charge','pricing_mode','fixed_price','stock','description','image','status'];
 for(const f of fields){
  if(req.body[f]!==undefined){
   if(f==='weight_g'||f==='making_charge'||f==='fixed_price')patch[f]=req.body[f]===''||req.body[f]===null?null:Number(req.body[f]);
   else if(f==='stock')patch[f]=Math.max(0,parseInt(req.body[f]||0,10));
   else patch[f]=req.body[f]===null?null:String(req.body[f]).trim();
  }
 }
 await db('coins').where({sku:req.params.sku}).update(patch);
 await audit(req,'edit_coin',{sku:req.params.sku,patch});
 res.json({ok:true});
}));
app.delete('/api/admin/coins/:sku',auth(['owner','manager']),route(async(req,res)=>{
 const coin=await db('coins').where({sku:req.params.sku}).first();
 if(!coin)return res.status(404).json({error:'Coin not found'});
 await db('coins').where({sku:req.params.sku}).del();
 await audit(req,'delete_coin',{sku:req.params.sku});
 res.json({ok:true});
}));
app.post('/api/admin/coins/silver-rate',auth(['owner','manager']),route(async(req,res)=>{
 const rate=Number(req.body.rate);
 if(!Number.isFinite(rate)||rate<=0)throw Error('Enter a valid positive silver rate per gram');
 await db('settings').insert({key:'SILVER_RATE_PER_GRAM',value:String(rate)}).onConflict('key').merge();
 await audit(req,'update_silver_rate',{rate});
 res.json({ok:true,rate});
}));
app.post('/api/admin/upload-image',auth(['owner','manager']),route(async(req,res)=>{
 const {name,data,role,product_code}=req.body;
 if(!data||typeof data!=='string')throw Error('Image data is required');
 const match=data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
 if(!match)throw Error('Invalid image data format. Please upload a PNG, JPG, or WEBP image.');
 const ext=match[1].toLowerCase().replace('jpeg','jpg');
 if(!['jpg','png','webp','gif','svg'].includes(ext))throw Error('Supported image formats: JPG, PNG, WEBP, GIF, SVG');
 const buffer=Buffer.from(match[2],'base64');
 if(buffer.length>8*1024*1024)throw Error('Maximum image size is 8 MB');
 const cleanName=String(name||'product').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/g,'-').slice(0,40)||'photo';
 const filename=`${Date.now()}-${cleanName}.${ext}`;
 fs.writeFileSync(path.join(uploadsDir,filename),buffer);
 const host=process.env.APP_URL||'https://test3.avinyacarefoundation.org';
 const url=`/uploads/${filename}`;
 let imageRecord=null;
 if(product_code&&role){
  const nowStr=now();
  const validRole=['hero','front','left','right','model','detail'].includes(role)?role:'front';
  const hasImages=await db.schema.hasTable('product_images').catch(()=>false);
  if(hasImages){
   const existing=await db('product_images').where({product_code,role:validRole}).first();
   if(existing){
    await db('product_images').where({id:existing.id}).update({url,updated_at:nowStr});
    imageRecord={...existing,url,updated_at:nowStr};
   }else{
    const sortOrder={'hero':1,'front':2,'left':3,'right':4,'model':5,'detail':6}[validRole]||10;
    const [id]=await db('product_images').insert({product_code,role:validRole,url,sort_order:sortOrder,created_at:nowStr,updated_at:nowStr});
    imageRecord={id,product_code,role:validRole,url,sort_order:sortOrder};
   }
  }
  if(validRole==='hero'||validRole==='front'){
   await db('products').where({product_code}).update({image:url,updated_at:nowStr});
  }
 }
 await audit(req,'upload_image',{filename,size:buffer.length,product_code,role});
 res.json({ok:true,filename,url,fullUrl:`${host}${url}`,image:imageRecord});
}));

app.post('/api/admin/upload-images',auth(['owner','manager']),route(async(req,res)=>{
 const files=req.body.files||req.body.images;
 if(!Array.isArray(files)||!files.length)throw Error('At least one image file is required');
 if(files.length>30)throw Error('Maximum 30 images can be bulk uploaded at once');
 const host=process.env.APP_URL||'https://test3.avinyacarefoundation.org';
 const uploaded=[];
 const nowStr=now();
 const hasImages=await db.schema.hasTable('product_images').catch(()=>false);
 for(let i=0;i<files.length;i++){
  const file=files[i];
  const {name,data,role,product_code}=file;
  if(!data||typeof data!=='string')continue;
  const match=data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if(!match)continue;
  const ext=match[1].toLowerCase().replace('jpeg','jpg');
  if(!['jpg','png','webp','gif','svg'].includes(ext))continue;
  const buffer=Buffer.from(match[2],'base64');
  if(buffer.length>8*1024*1024)continue;
  const cleanName=String(name||`upload-${i+1}`).toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/g,'-').slice(0,40)||'photo';
  const filename=`${Date.now()}-${i}-${cleanName}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir,filename),buffer);
  const url=`/uploads/${filename}`;
  let imageRecord=null;
  if(product_code&&role&&hasImages){
   const validRole=['hero','front','left','right','model','detail'].includes(role)?role:'front';
   const existing=await db('product_images').where({product_code,role:validRole}).first();
   if(existing){
    await db('product_images').where({id:existing.id}).update({url,updated_at:nowStr});
    imageRecord={...existing,url,updated_at:nowStr};
   }else{
    const sortOrder={'hero':1,'front':2,'left':3,'right':4,'model':5,'detail':6}[validRole]||10;
    const [id]=await db('product_images').insert({product_code,role:validRole,url,sort_order:sortOrder,created_at:nowStr,updated_at:nowStr});
    imageRecord={id,product_code,role:validRole,url,sort_order:sortOrder};
   }
   if(validRole==='hero'||validRole==='front'){
    await db('products').where({product_code}).update({image:url,updated_at:nowStr});
   }
  }
  uploaded.push({filename,url,fullUrl:`${host}${url}`,role:role||null,product_code:product_code||null,image:imageRecord});
 }
 await audit(req,'bulk_upload_images',{count:uploaded.length});
 res.json({ok:true,uploaded,count:uploaded.length});
}));

app.get('/api/admin/product-images/:product_code',auth(),route(async(req,res)=>{
 const code=req.params.product_code;
 const hasImages=await db.schema.hasTable('product_images').catch(()=>false);
 if(!hasImages)return res.json([]);
 const images=await db('product_images').where({product_code:code}).orWhere({sku:code}).orderBy('sort_order','asc').orderBy('id','asc');
 res.json(images);
}));

app.post('/api/admin/product-images',auth(['owner','manager']),route(async(req,res)=>{
 const {product_code,sku,role,url,alt_text,sort_order}=req.body;
 if(!url||typeof url!=='string'||!url.trim())throw Error('Image URL is required');
 const validRole=['hero','front','left','right','model','detail'].includes(role)?role:'front';
 const targetCode=product_code||sku;
 if(!targetCode)throw Error('Product code or SKU is required');
 const nowStr=now();
 const sortMap={'hero':1,'front':2,'left':3,'right':4,'model':5,'detail':6};
 const order=sort_order!==undefined?Number(sort_order):sortMap[validRole]||10;
 
 const existing=await db('product_images').where({product_code:targetCode,role:validRole}).first();
 let id;
 if(existing){
  await db('product_images').where({id:existing.id}).update({
   url:String(url).trim(),
   alt_text:alt_text?String(alt_text).trim().slice(0,250):null,
   sort_order:order,
   updated_at:nowStr
  });
  id=existing.id;
 }else{
  const [insertedId]=await db('product_images').insert({
   product_code:targetCode,
   sku:sku||null,
   role:validRole,
   url:String(url).trim(),
   alt_text:alt_text?String(alt_text).trim().slice(0,250):null,
   sort_order:order,
   created_at:nowStr,
   updated_at:nowStr
  });
  id=insertedId;
 }
 if(validRole==='hero'||validRole==='front'){
  await db('products').where({product_code:targetCode}).update({image:String(url).trim(),updated_at:nowStr});
 }
 await audit(req,'assign_product_image',{product_code:targetCode,role:validRole,url});
 res.json({ok:true,id,product_code:targetCode,role:validRole,url});
}));

app.delete('/api/admin/product-images/:id',auth(['owner','manager']),route(async(req,res)=>{
 const img=await db('product_images').where({id:req.params.id}).first();
 if(!img)return res.status(404).json({error:'Image not found'});
 await db('product_images').where({id:req.params.id}).del();
 await audit(req,'delete_product_image',{id:req.params.id,product_code:img.product_code,role:img.role});
 res.json({ok:true});
}));

app.get('/api/admin/media',auth(),route(async(req,res)=>{
 if(!fs.existsSync(uploadsDir))return res.json([]);
 const files=fs.readdirSync(uploadsDir).filter(f=>!f.startsWith('.')&&/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f));
 const host=process.env.APP_URL||'https://test3.avinyacarefoundation.org';
 const list=files.map(f=>{
  const stat=fs.statSync(path.join(uploadsDir,f));
  return {
   filename:f,
   url:`/uploads/${f}`,
   fullUrl:`${host}/uploads/${f}`,
   size:stat.size,
   mtime:stat.mtime
  };
 }).sort((a,b)=>new Date(b.mtime)-new Date(a.mtime));
 res.json(list);
}));
app.get('/api/admin/samples/:file',auth(),(req,res)=>{const allowed=['gold-rates-template.csv','gold-rates-example.csv','products-template.csv','products-example.csv','import-errors-example.csv'];if(!allowed.includes(req.params.file))return res.sendStatus(404);res.download(path.resolve('samples',req.params.file));});
app.get('/api/admin/export/:kind',auth(),route(async(req,res)=>{const k=req.params.kind,d=new Date().toISOString().slice(0,10);if(k==='products'){const rows=await db('products').orderBy('product_code');return res.type('text/csv').attachment(`products-${d}.csv`).send(exportCsv('products',rows));}if(k==='coins'){const rows=await db('coins').orderBy('id','desc');return res.type('text/csv').attachment(`coins-${d}.csv`).send(exportCsv('coins',rows));}if(k==='gold'){const rows=await db('rates').orderBy('id','desc');return res.type('text/csv').attachment(`gold-rates-${d}.csv`).send(exportCsv('gold',rows));}if(k==='orders'){const rows=await db('orders').orderBy('created_at','desc');return res.type('text/csv').attachment(`orders-${d}.csv`).send(ordersCsv(rows));}res.sendStatus(404);}));
app.post('/api/admin/import/preview',auth(['owner','manager']),route(async(req,res)=>{if(typeof req.body.csv!=='string')throw Error('Upload a UTF-8 CSV file');res.json(await previewImport(db,req.body.kind,req.body.csv,req.session.staff.id));}));
app.post('/api/admin/import/:id/publish',auth(['owner','manager']),route(async(req,res)=>res.json(await publishImport(db,Number(req.params.id),req.session.staff.id))));
app.get('/api/admin/import/:id/errors',auth(),route(async(req,res)=>{res.type('text/csv').attachment(`batch-${req.params.id}-errors.csv`).send(errorCsv(await db('import_errors').where({batch_id:req.params.id})));}));
app.post('/api/admin/run',auth(['owner','manager']),route(async(req,res)=>{if(req.body.kind&&!schemas[req.body.kind])throw Error('Unknown feed');await audit(req,'run_feed',{kind:req.body.kind||'daily'});res.json(await daily(db,'manual',req.body.kind,req.session.staff.id));}));
app.post('/api/admin/feed-toggle',auth(['owner','manager']),route(async(req,res)=>{
 const {status,kind,enabled}=req.body;
 const changes={};
 if(status){
  if(!['active','stopped'].includes(status))throw Error('Status must be active or stopped');
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
  if(!Number.isFinite(age)||age<1||age>168)throw Error('Choose a rate age between 1 and 168 hours');
  changes.GOLD_MAX_AGE_HOURS=String(age);
 }
 if(r.inventoryMode){
  if(!['incremental','full'].includes(r.inventoryMode))throw Error('Choose a supported inventory mode');
  changes.INVENTORY_MODE=r.inventoryMode;
 }
 if(r.feedStatus){
  if(!['active','stopped'].includes(r.feedStatus))throw Error('Status must be active or stopped');
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
  if(fields.some(f=>!schemas.products.includes(f)||['sku','supplier','product_code','source_timestamp'].includes(f)))throw Error('Invalid supplier overwrite field');
  changes.SUPPLIER_OVERWRITE_FIELDS=fields.join(',');
 }
 for(const [field,key] of [['goldUrl','GOLD_FEED_URL'],['productUrl','PRODUCT_FEED_URL']])if(r[field]!==undefined){
  if(r[field]===''||r[field]===null){
   changes[key]='';
  }else if(field==='goldUrl'&&(r[field]==='auto'||r[field].includes('gold-api.com'))){
   changes[key]=r[field];
  }else{
   let u;try{u=new URL(r[field])}catch{throw Error('Enter a valid HTTPS feed URL')}
   if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Feed URLs must be HTTPS without embedded credentials or query secrets; use server-side Bearer tokens');
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
app.post('/api/admin/rules/preview',auth(['owner']),route(async(req,res)=>{
 const rule=validatePricingRule(req.body);
 const [rates,silver,products,coins,current,offers]=await Promise.all([activeRates(db),getSilverRate(db),db('products'),db('coins'),db('pricing_rules').orderBy('id','desc').first(),activeOffers(db)]);
 const changes=[];
 for(const p of [...products,...coins]){
  const coin=Boolean(p.coin_type),offer=matchOffer(p,offers);
  const price=r=>coin?calculateCoinPrice(p,rates,silver,r,offer):calculatePrice(p,rates[p.purity],r,offer);
  let before=null,after=null,margin=null,warning=null;
  try{before=price(current).total;const next=price(rule);after=next.total;margin=next.margin;}catch{warning='Awaiting an approved metal rate';}
  changes.push({sku:p.sku,name:p.name,kind:coin?'Coin':'Jewellery',before,after,margin,warning});
 }
 res.json(changes);
}));
function validateRule(input){return validatePricingRule(input);}
app.post('/api/admin/rules',auth(['owner']),route(async(req,res)=>{const rule=validateRule(req.body);await db.transaction(async t=>{await t('pricing_rules').insert({...rule,changed_at:now(),changed_by:req.session.staff.id});await t('audit').insert({staff_id:req.session.staff.id,action:'pricing_rule',details:json(rule),created_at:now()});});res.json({ok:true});}));
if(!production){const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}else{app.use(express.static('dist'));app.get('*',(req,res)=>res.sendFile(path.resolve('dist/index.html')));}
app.use((err,req,res,next)=>{res.status(err.status||(err.quote?409:400)).json({error:err.message,quote:err.quote});});
const port=Number(process.env.PORT||3000);app.listen(port,production?'0.0.0.0':'127.0.0.1',()=>console.log(`Veyora Jewels: http://localhost:${port} (${preview?'fictional preview':'production'})`));
