import {resetConfigured,requestReset,completeReset,replacePassword} from './password-reset.js';
import {createOtpGateway} from './otp-gateway.js';
import {otpAvailability,sendOtp,sendPasswordResetOtp,verifyOtp,confirmOtp,resendOtp,otpStatus,spendVerified,releaseVerified,prepareCheckoutOtp,normalizeEmail,normalizeIndianMobile,SENT_MESSAGE} from './otp.js';
import {registerSeo,pageMetadata,renderMetadata} from './seo.js';
import {validateOffer} from './offers.js';
import {commerceConfig} from './runtime.js';
import {errorResponse} from './errors.js';
import {validationError} from './errors.js';
import {listingThumbnailFile} from './listing-thumbnails.js';
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
import {previewImport,publishImport,errorCsv,exportCsv,ordersCsv,schemas,validate} from './importer.js';
import {checkout} from './orders.js';
import {validatePricingRule} from './pricing-rules.js';
import {registerCustomer,loginCustomer,customerState,saveCustomerState,mergeGuestState,claimSessionOrders,customerOrders,mayReadOrder,validateState} from './customers.js';
import {daily} from './daily.js';
import {loadFeedSettings as readFeedSettings} from './settings.js';
import {coinArtwork} from './coin-artwork.js';
import {seed} from '../scripts/seed.js';
import {saveUploadedImage,ensureThumbnail,thumbnailUrl} from './thumbnails.js';
import {searchCatalogue,invalidateSearchCache} from './search.js';
import {listCopySkills, createCatalogueDraft, approveCatalogueDraft, rejectCatalogueDraft, listCatalogueDrafts} from './ai-copy.js';
import {registerPwa} from './pwa.js';
import {
  getProductReviews,
  submitReview,
  updateCustomerReview,
  getAdminReviews,
  getAdminReviewById,
  adminUpdateReviewStatus,
  adminBulkReviewStatus,
  adminEditReview,
  adminDeleteReview
} from './reviews.js';
const route=f=>(req,res,next)=>Promise.resolve(f(req,res,next)).catch(next);
const app=express();const production=process.env.NODE_ENV==='production';
if(production&&(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32))throw validationError('Production requires a strong SESSION_SECRET');
if(preview){await migrate();await seed();}else if(await db('products').whereIn('supplier',['Fictional Preview','Veyora Preview Collection 100']).first()||await db('staff').where({email:'preview@veyora.local'}).first())throw validationError('Production cannot use the fictional preview database. Configure a clean production database.');
const loadFeedSettings=()=>readFeedSettings(db);
await loadFeedSettings();
app.disable('x-powered-by');
app.set('trust proxy',Number(process.env.TRUST_PROXY||0));
app.use(helmet({contentSecurityPolicy:production?{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],scriptSrcAttr:["'none'"],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com'],imgSrc:["'self'",'data:','blob:','https:'],connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"]}}:false}));
app.use((req,res,next)=>{req.requestId=crypto.randomUUID();res.set('X-Request-ID',req.requestId);next();});
app.get('/health/live',(req,res)=>res.json({status:'ok'}));
app.get('/health/ready',async(req,res)=>{try{await db.raw('SELECT 1');res.set('Cache-Control','no-store').json({status:'ok'});}catch{res.status(503).json({status:'unavailable'});}});
app.use('/api',rateLimit({windowMs:60000,limit:300,standardHeaders:'draft-7',legacyHeaders:false}));
app.use('/api',(req,res,next)=>express.json({limit:(req.path.startsWith('/admin/upload-')||req.path==='/reviews/upload-image')?'50mb':req.path==='/admin/import/preview'?'8mb':'256kb'})(req,res,next));
const uploadsDir=path.resolve(process.env.UPLOADS_DIR||'public/uploads');
fs.mkdirSync(uploadsDir,{recursive:true});
app.get('/uploads/thumbs/:filename.webp',async(req,res)=>{try{const file=await ensureThumbnail(uploadsDir,req.params.filename);res.set('Cache-Control','public, max-age=86400');res.sendFile(file)}catch(e){res.status(e.status||422).json({error:e.status===404?'Image not found':e.expose?e.message:'Image unavailable'})}});
app.use('/uploads',(req,res,next)=>{res.set('Content-Security-Policy',"default-src 'none'; sandbox");next();},express.static(uploadsDir));
class DbStore extends session.Store {get(sid,cb){db('sessions').where({sid}).first().then(r=>cb(null,r&&Number(r.expires)>Date.now()?parse(r.data):null)).catch(cb)}set(sid,data,cb){db('sessions').insert({sid,data:json(data),expires:Date.now()+8*3600000}).onConflict('sid').merge().then(()=>cb?.()).catch(cb)}destroy(sid,cb){db('sessions').where({sid}).del().then(()=>cb?.()).catch(cb)}}
const cookieSecure = process.env.COOKIE_SECURE === 'true' || (production && Boolean(process.env.APP_URL?.startsWith('https:')));
app.use(session({secret:process.env.SESSION_SECRET||crypto.randomBytes(32).toString('hex'),resave:false,saveUninitialized:false,store:new DbStore(),cookie:{httpOnly:true,sameSite:'strict',secure:cookieSecure,maxAge:8*3600000}}));
app.use('/api',route(async(req,res,next)=>{if(req.session.customer){const row=await db('customers').where({id:req.session.customer.id}).select('session_version').first();if(!row||(row.session_version||0)!==(req.session.customer.session_version||0)){delete req.session.customer;delete req.session.customerCsrf;}}next();}));
app.use('/api',routeSettings);
function routeSettings(req,res,next){loadFeedSettings().then(()=>next()).catch(next)}
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(['POST','PUT','DELETE','PATCH'].includes(req.method)){const origin=req.get('origin');const allowedOrigins=[process.env.APP_URL?new URL(process.env.APP_URL).origin:null,...(!production?['http://localhost:3000','http://127.0.0.1:3000']:[])].filter(Boolean);if(origin && !allowedOrigins.includes(origin))return res.status(403).json({error:'Origin not allowed'});if(req.get('sec-fetch-site')==='cross-site')return res.status(403).json({error:'Origin not allowed'});if(req.path!=='/admin/login'&&req.path.startsWith('/admin')&&req.get('x-csrf-token')!==req.session.csrf)return res.status(403).json({error:'Please reload the admin panel'});}next();});

const otpGateway=createOtpGateway(process.env);
const auth=(roles=['owner','manager','viewer'])=>(req,res,next)=>req.session.staff&&roles.includes(req.session.staff.role)?next():res.status(403).json({error:'Staff access required'});
const audit=async(req,action,details)=>db('audit').insert({staff_id:req.session.staff.id,action,details:json(details),created_at:now()});
app.get('/api/config',(req,res)=>res.json({brand:process.env.BRAND_NAME||'Veyora Jewels',preview,passwordResetEnabled:resetConfigured(),otp:otpAvailability(process.env,otpGateway),...commerceConfig(process.env,preview),contact:process.env.MERCHANT_EMAIL||'',shippingPolicy:process.env.SHIPPING_POLICY||'',returnsPolicy:process.env.RETURNS_POLICY||''}));
app.get('/api/thumbnail',async(req,res)=>{
 try{
  const file=await listingThumbnailFile(req.query.source,{publicDir:path.resolve('public'),uploadsDir,cacheDir:path.resolve('private/thumbnail-cache')});
  res.set('Cache-Control','public, max-age=86400').sendFile(file);
 }catch{res.set('Cache-Control','no-store').sendFile(path.resolve('public/assets/product-placeholder.svg'));}
});
app.get('/api/products',route(async(req,res)=>res.json(await catalogue(db))));
app.get('/api/coins',route(async(req,res)=>res.json(await coinCatalogue(db))));
app.get('/api/search',route(async(req,res)=>{const q=String(req.query.q||'').slice(0,100);res.json(await searchCatalogue(db,q));}));
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
  validateOffer({discount_type:'making_percent',discount_value:0,applies_to:'all',status:'active',priority:0,show_in_banner:true,show_in_grid:true,...req.body});
  if(!name||!badge_text)throw validationError('Offer name and badge text are required');
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
    show_in_banner:show_in_banner!==undefined?show_in_banner:true,
    show_in_grid:show_in_grid!==undefined?show_in_grid:true,
    created_at:nowStr,
    updated_at:nowStr
  };
  validateOffer(offerData);
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
      else if(f==='show_in_banner'||f==='show_in_grid')patch[f]=req.body[f];
      else if(f==='code')patch[f]=req.body[f]?String(req.body[f]).trim().toUpperCase():null;
      else patch[f]=req.body[f]===null?null:String(req.body[f]).trim();
    }
  }
  validateOffer({...offer,...patch});
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
app.post('/api/checkout',rateLimit({windowMs:60000,limit:20}),route(async(req,res)=>{if(commerceConfig(process.env,preview).checkoutEnabled===false)return res.status(503).json({error:'Checkout is awaiting merchant configuration.'});req.session.checkoutScope ||= crypto.randomUUID();const held=await prepareCheckoutOtp(db,req.session,req.body,process.env,otpGateway);try{const result=await checkout(db,req.body,preview,req.session.customer?.id||null,req.session.checkoutScope);req.session.orderIds=[...new Set([...(req.session.orderIds||[]),result.id])].slice(-100);res.json(result);}catch(error){if(held)await releaseVerified(db,held);throw error;}}));
app.get('/api/orders/:id',route(async(req,res)=>{const order=await db('orders').where({id:req.params.id}).first();if(!mayReadOrder(req.session,order))return res.status(404).json({error:'Order not found'});res.json({...order,customer:parse(order.customer),items:(await db('order_items').where({order_id:order.id})).map(i=>parse(i.snapshot))});}));
const customerAuth=(req,res,next)=>req.session.customer?next():res.status(401).json({error:'Please sign in to your customer account.'});
const customerCsrf=(req,res,next)=>req.session.customerCsrf&&req.get('x-customer-csrf')===req.session.customerCsrf?next():res.status(403).json({error:'Please reload and try again.'});
async function presentCustomer(customer){const row=await db('customers').where({id:customer.id}).select('phone','email_verified_at','phone_verified_at').first();return {...customer,phone:row?.phone||null,emailVerified:Boolean(row?.email_verified_at),phoneVerified:Boolean(row?.phone_verified_at)};}
app.get('/api/account/session',route(async(req,res)=>{req.session.customerCsrf ||= crypto.randomBytes(24).toString('hex');if(req.session.customer)req.session.customer=await presentCustomer(req.session.customer);res.json({customer:req.session.customer||null,csrf:req.session.customerCsrf,state:req.session.customer?await customerState(db,req.session.customer.id):null});}));
const resetLimit=rateLimit({windowMs:15*60000,limit:5});
app.post('/api/account/forgot-password',resetLimit,customerCsrf,route(async(req,res)=>{
 if(!resetConfigured())throw validationError('Password recovery is not configured. Contact the merchant.',503);
 await requestReset(db,req.body.email);res.status(202).json({message:'If this email belongs to an account, a recovery link will be sent.'});
}));
app.post('/api/account/reset-password',resetLimit,customerCsrf,route(async(req,res)=>{await completeReset(db,req.body);res.json({ok:true});}));
const customerLoginLimit=rateLimit({windowMs:15*60000,limit:20});
async function establishCustomer(req,customer,guest){
 const presented=await presentCustomer(customer);
 const oldStaff=req.session.staff,adminCsrf=req.session.csrf,guestOrders=req.session.customer?[]:req.session.orderIds||[];
 await mergeGuestState(db,customer.id,guest);await claimSessionOrders(db,customer,guestOrders);
 await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
 if(oldStaff){req.session.staff=oldStaff;req.session.csrf=adminCsrf;}
 req.session.customer=presented;req.session.customerCsrf=crypto.randomBytes(24).toString('hex');
 return {customer:presented,csrf:req.session.customerCsrf,state:await customerState(db,customer.id)};
}
app.post('/api/account/register',customerLoginLimit,customerCsrf,route(async(req,res)=>{
 if(req.session.customer)return res.status(409).json({error:'Sign out before switching customer accounts.'});
 const guest=validateState(req.body.guestState||{bag:[],saved:[]});
 let held=null;
 if(otpAvailability(process.env,otpGateway).requireRegister){
  await confirmOtp(db,req.session,{purpose:'register',otp:req.body?.otp},process.env,otpGateway);
  if(normalizeEmail(req.body?.email)!==req.session.otpFlows?.register?.destination)throw validationError('Verify the code sent to this email before creating an account.');
  held=await spendVerified(db,req.session,'register',req.body.email);
 }
 try{
  const customer=await registerCustomer(db,req.body);
  if(held)await db('customers').where({id:customer.id}).update({email_verified_at:new Date().toISOString()});
  res.json(await establishCustomer(req,customer,guest));
 }catch(error){if(held)await releaseVerified(db,held);throw error;}
}));
app.post('/api/account/login',customerLoginLimit,customerCsrf,route(async(req,res)=>{
 if(req.session.customer)return res.status(409).json({error:'Sign out before switching customer accounts.'});
 const guest=validateState(req.body.guestState||{bag:[],saved:[]});
 const customer=await loginCustomer(db,req.body);
 if(otpAvailability(process.env,otpGateway).requireLogin){
  await sendOtp(db,req.session,{purpose:'login',channel:'email',destination:customer.email,customerId:customer.id},process.env,otpGateway);
  req.session.pendingCustomer=customer;
  return res.json({otpRequired:true});
 }
 res.json(await establishCustomer(req,customer,guest));
}));
app.post('/api/account/login/otp',customerLoginLimit,customerCsrf,route(async(req,res)=>{
 const pending=req.session.pendingCustomer;
 if(!pending)throw validationError('That code is incorrect.');
 const guest=validateState(req.body.guestState||{bag:[],saved:[]});
 await confirmOtp(db,req.session,{purpose:'login',otp:req.body?.otp},process.env,otpGateway);
 const held=await spendVerified(db,req.session,'login',pending.email);
 try{res.json(await establishCustomer(req,pending,guest));}catch(error){await releaseVerified(db,held);throw error;}
}));
app.get('/api/account/orders',customerAuth,route(async(req,res)=>{const page=Number(req.query.page||1);if(!Number.isInteger(page)||page<1||page>10000)throw validationError('Invalid order page');res.json(await customerOrders(db,req.session.customer.id,page));}));
app.put('/api/account/state',customerAuth,customerCsrf,route(async(req,res)=>res.json(await saveCustomerState(db,req.session.customer.id,req.body))));
const otpIpLimit=rateLimit({windowMs:10*60000,limit:10,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many verification requests. Try again later.'}});
app.post('/api/otp/send',otpIpLimit,customerCsrf,route(async(req,res)=>{
 const purpose=req.body?.purpose,channel=req.body?.channel;
 if(!['register','checkout'].includes(purpose))throw validationError('Verification is not available.');
 await sendOtp(db,req.session,{purpose,channel,destination:req.body?.destination},process.env,otpGateway);
 res.status(202).json({message:SENT_MESSAGE});
}));
app.post('/api/otp/verify',otpIpLimit,customerCsrf,route(async(req,res)=>{
 if(!['register','checkout'].includes(req.body?.purpose))throw validationError('That code is incorrect.');
 await verifyOtp(db,req.session,{purpose:req.body.purpose,otp:req.body?.otp},process.env,otpGateway);
 res.json({verified:true});
}));
app.post('/api/otp/resend',otpIpLimit,customerCsrf,route(async(req,res)=>{
 if(!['register','checkout','verify_email','verify_phone','password_reset','login'].includes(req.body?.purpose))throw validationError('That code has expired. Request a new one.');
 res.status(202).json(await resendOtp(db,req.session,req.body.purpose,process.env,otpGateway));
}));
app.get('/api/otp/status',otpIpLimit,route(async(req,res)=>{
 const purpose=String(req.query.purpose||'');
 if(!['register','login','checkout','verify_email','verify_phone','password_reset'].includes(purpose))return res.json({state:'none'});
 res.json(await otpStatus(db,req.session,purpose));
}));
app.post('/api/account/verify-email/send',otpIpLimit,customerAuth,customerCsrf,route(async(req,res)=>{
 await sendOtp(db,req.session,{purpose:'verify_email',channel:'email',destination:req.session.customer.email,customerId:req.session.customer.id},process.env,otpGateway);
 res.status(202).json({message:SENT_MESSAGE});
}));
app.post('/api/account/verify-email',otpIpLimit,customerAuth,customerCsrf,route(async(req,res)=>{
 await confirmOtp(db,req.session,{purpose:'verify_email',otp:req.body?.otp},process.env,otpGateway);
 const held=await spendVerified(db,req.session,'verify_email',req.session.customer.email);
 try{await db('customers').where({id:req.session.customer.id}).update({email_verified_at:new Date().toISOString()});}catch(error){await releaseVerified(db,held);throw error;}
 req.session.customer=await presentCustomer(req.session.customer);
 res.json({customer:req.session.customer});
}));
app.post('/api/account/verify-phone/send',otpIpLimit,customerAuth,customerCsrf,route(async(req,res)=>{
 const phone=normalizeIndianMobile(req.body?.phone);
 if(!['sms','whatsapp'].includes(req.body?.channel))throw validationError('Verification is not available.');
 await sendOtp(db,req.session,{purpose:'verify_phone',channel:req.body.channel,destination:phone.e164,customerId:req.session.customer.id},process.env,otpGateway);
 res.status(202).json({message:SENT_MESSAGE});
}));
app.post('/api/account/verify-phone',otpIpLimit,customerAuth,customerCsrf,route(async(req,res)=>{
 await confirmOtp(db,req.session,{purpose:'verify_phone',otp:req.body?.otp},process.env,otpGateway);
 const phone=normalizeIndianMobile(req.session.otpFlows.verify_phone.destination);
 const held=await spendVerified(db,req.session,'verify_phone',phone.e164);
 try{await db('customers').where({id:req.session.customer.id}).update({phone:phone.national,phone_verified_at:new Date().toISOString()});}catch(error){await releaseVerified(db,held);throw error;}
 req.session.customer=await presentCustomer(req.session.customer);
 res.json({customer:req.session.customer});
}));
app.post('/api/account/forgot-password/otp',otpIpLimit,customerCsrf,route(async(req,res)=>{
 if(!otpAvailability(process.env,otpGateway).passwordReset)throw validationError('Password recovery is not configured. Contact the merchant.',503);
 await sendPasswordResetOtp(db,req.session,req.body?.email,process.env,otpGateway);
 res.status(202).json({message:SENT_MESSAGE});
}));
app.post('/api/account/reset-password/otp',otpIpLimit,customerCsrf,route(async(req,res)=>{
 if(!otpAvailability(process.env,otpGateway).passwordReset)throw validationError('Password recovery is not configured. Contact the merchant.',503);
 await confirmOtp(db,req.session,{purpose:'password_reset',otp:req.body?.otp},process.env,otpGateway);
 const email=req.session.otpFlows?.password_reset?.destination;
 const customer=email?await db('customers').where({email}).first():null;
 if(!customer)throw validationError('That code is incorrect.');
 const held=await spendVerified(db,req.session,'password_reset',email);
 try{await replacePassword(db,customer.id,req.body?.password);}catch(error){await releaseVerified(db,held);throw error;}
 delete req.session.otpFlows.password_reset;
 res.json({ok:true});
}));
app.post('/api/account/logout',customerAuth,customerCsrf,route(async(req,res)=>{
 const staff=req.session.staff,csrf=req.session.csrf;
 await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
 if(staff){req.session.staff=staff;req.session.csrf=csrf;}
 req.session.customerCsrf=crypto.randomBytes(24).toString('hex');res.json({csrf:req.session.customerCsrf});
}));

const reviewSubmissionLimit = rateLimit({windowMs:15*60000,limit:25,message:{error:'Too many reviews submitted. Please try again later.'}});
const reviewUploadLimit = rateLimit({windowMs:15*60000,limit:30,message:{error:'Too many image uploads. Please try again later.'}});

app.get('/api/products/:productId/reviews', route(async (req, res) => {
  const currentCustomerId = req.session.customer?.id || null;
  const includePending = req.query.includePending !== 'false';
  const result = await getProductReviews(db, req.params.productId, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
    ratingFilter: req.query.rating,
    currentCustomerId,
    includePending
  });
  res.json(result);
}));

app.get('/api/products/:productId/ratings', route(async (req, res) => {
  const result = await getProductReviews(db, req.params.productId, { limit: 1 });
  res.json(result.summary);
}));

app.post('/api/products/:productId/reviews', reviewSubmissionLimit, customerAuth, customerCsrf, route(async (req, res) => {
  const result = await submitReview(db, req.session.customer.id, req.params.productId, req.body);
  invalidateSearchCache();
  res.status(201).json(result);
}));

app.put('/api/reviews/:id', reviewSubmissionLimit, customerAuth, customerCsrf, route(async (req, res) => {
  const result = await updateCustomerReview(db, req.session.customer.id, req.params.id, req.body);
  invalidateSearchCache();
  res.json(result);
}));

app.post('/api/reviews/upload-image', reviewUploadLimit, customerAuth, customerCsrf, route(async (req, res) => {
  const { name, data } = req.body;
  if (!data || typeof data !== 'string') throw validationError('Image data is required');
  const match = data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!match) throw validationError('Invalid image data format. Please upload a PNG, JPG, or WEBP image.');
  const ext = match[1].toLowerCase().replace('jpeg', 'jpg');
  if (!['jpg', 'png', 'webp'].includes(ext)) throw validationError('Supported review image formats: JPG, PNG, WEBP');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) throw validationError('Maximum review image size is 5 MB');
  const cleanName = String(name || 'customer-photo').toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/g, '-').slice(0, 30) || 'review';
  const filename = `review-${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${cleanName}.${ext}`;
  const saved = await saveUploadedImage(uploadsDir, filename, buffer);
  res.json({ ok: true, url: saved.url, thumbnail: saved.thumbnail });
}));
app.post('/api/admin/login',rateLimit({windowMs:15*60000,limit:10}),route(async(req,res)=>{const staff=await db('staff').where({email:String(req.body.email).toLowerCase()}).first();if(!staff||!await bcrypt.compare(String(req.body.password),staff.password_hash))return res.status(401).json({error:'Email or password is incorrect'});const customer=req.session.customer,customerCsrf=req.session.customerCsrf,orderIds=req.session.orderIds;await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));if(customer){req.session.customer=customer;req.session.customerCsrf=customerCsrf;}req.session.orderIds=orderIds;req.session.staff={id:staff.id,email:staff.email,role:staff.role};req.session.csrf=crypto.randomBytes(24).toString('hex');res.json({staff:req.session.staff,csrf:req.session.csrf});}));
app.get('/api/admin/session',auth(),(req,res)=>res.json({staff:req.session.staff,csrf:req.session.csrf}));
app.post('/api/admin/logout',auth(),route(async(req,res)=>{const customer=req.session.customer,customerCsrf=req.session.customerCsrf,orderIds=req.session.orderIds;await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));if(customer){req.session.customer=customer;req.session.customerCsrf=customerCsrf;}req.session.orderIds=orderIds;res.json({ok:true});}));
app.get('/api/admin/dashboard',auth(),route(async(req,res)=>{const [rates,batches,runs,orders,rule,audits,suppliers,rateHistory]=await Promise.all([activeRates(db),db('import_batches').select('id','kind','supplier','source_timestamp','status','summary','created_at').orderBy('id','desc').limit(30),db('daily_runs').orderBy('id','desc').limit(10),db('orders').orderBy('created_at','desc').limit(100),db('pricing_rules').orderBy('id','desc').first(),db('audit').orderBy('id','desc').limit(20),db('import_batches').where({status:'published'}).select('supplier','kind').max('source_timestamp as last_update').groupBy('supplier','kind'),db('rates').orderBy('id','desc').limit(100)]);const scheduleMissed=!runs.some(r=>r.trigger==='scheduled'&&r.finished_at&&Date.now()-Date.parse(r.finished_at)<36*3600000);const todayBatches=batches.filter(b=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(b.created_at))===todayIndia());res.json({rateHistory,scheduleMissed,todayImports:{total:todayBatches.length,failed:todayBatches.filter(b=>b.status==='failed').length,published:todayBatches.filter(b=>b.status==='published').length},rates:Object.values(rates).map(r=>({...r,fresh:isFresh(r)})),batches:batches.map(b=>({...b,summary:parse(b.summary)})),runs:runs.map(r=>({...r,result:parse(r.result)})),orders:orders.map(o=>({...o,customer:parse(o.customer)})),rule,audits,suppliers,maxAgeHours:Number(process.env.GOLD_MAX_AGE_HOURS||48),feedSettings:{goldConfigured:!!process.env.GOLD_FEED_URL,productsConfigured:!!(process.env.PRODUCT_FEED_URL||process.env.PRODUCT_FEED_FILE),inventoryMode:process.env.INVENTORY_MODE||'incremental',overwriteFields:process.env.SUPPLIER_OVERWRITE_FIELDS||'stock,fixed_price,net_weight_g,making_flat,stone_charge,other_charge',feedStatus:process.env.FEED_STATUS||'active',goldFeedEnabled:process.env.GOLD_FEED_ENABLED!=='false',productFeedEnabled:process.env.PRODUCT_FEED_ENABLED!=='false',goldUrl:process.env.GOLD_FEED_URL||'',productUrl:process.env.PRODUCT_FEED_URL||''},preview});}));
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
 res.json(products.map(p=>({...p,images:[...(imagesByProduct[p.sku]||[]),...(imagesByProduct[p.product_code]||[])].filter((img,i,all)=>all.findIndex(other=>other.url===img.url)===i)})));
}));
app.patch('/api/admin/products/:sku',auth(['owner','manager']),route(async(req,res)=>{const {name,description,status,image,stock,category,net_weight_g,fixed_price}=req.body;if(typeof name!=='string'||!name.trim()||!['published','draft'].includes(status))throw validationError('Name and valid publication status required');const patch={name:String(name).slice(0,200),description:String(description||'').slice(0,5000),status,updated_at:now()};if(typeof image==='string'&&image.trim())patch.image=String(image).trim().slice(0,2000);if(stock!==undefined)patch.stock=Math.max(0,parseInt(stock||0,10));if(category)patch.category=String(category).slice(0,100);if(net_weight_g)patch.net_weight_g=Number(net_weight_g);if(fixed_price)patch.fixed_price=Number(fixed_price);await db.transaction(async t=>{const count=await t('products').where({sku:req.params.sku}).update(patch);if(!count)throw validationError('Product not found',404);if(patch.image){const hero=await t('product_images').where({sku:req.params.sku,role:'hero'}).whereNull('product_code').first();const photo={url:patch.image,alt_text:patch.name,updated_at:now()};if(hero)await t('product_images').where({id:hero.id}).update(photo);else await t('product_images').insert({...photo,sku:req.params.sku,product_code:null,role:'hero',sort_order:-1,created_at:now()});}});await audit(req,'edit_product',{sku:req.params.sku,hasImage:!!image});res.json({ok:true});}));
app.post('/api/admin/products',auth(['owner','manager']),route(async(req,res)=>{
 const {sku,product_code,name,category,metal,purity,net_weight_g,size,finish,pricing_mode,fixed_price,making_flat,making_percent,stone_charge,other_charge,stock,description,image,status}=req.body;
 if(!sku||!name)throw validationError('SKU and Name are required');
 const cleanSku=String(sku).trim().toUpperCase();
 const existing=await db('products').where({sku:cleanSku}).first();
 if(existing)throw validationError(`A product with SKU "${cleanSku}" already exists`);
 if(await db('coins').where({sku:cleanSku}).first())throw validationError('This SKU already belongs to bullion coins. Choose a unique jewellery SKU.');
 const cleanCode=String(product_code||cleanSku.toLowerCase()).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
 const slug=cleanCode.replace(/[^a-z0-9]+/g,'-');
 const mode=pricing_mode==='FIXED'?'FIXED':'GOLD_LINKED';
 const nNow=now();
 const prodData={
  supplier:'Merchant',
  product_code:cleanCode,
  slug,
  sku:cleanSku,
  name:String(name).trim().slice(0,200),
  category:String(category||'Rings').trim().slice(0,100),
  description:description?String(description).trim().slice(0,5000):null,
  metal:String(metal||'Gold').trim().slice(0,50),
  purity:String(purity||'18K').trim().slice(0,50),
  net_weight_g:net_weight_g!==undefined&&net_weight_g!==''&&net_weight_g!==null?String(net_weight_g):(mode==='GOLD_LINKED'?'1.0':''),
  size:size?String(size).trim().slice(0,50):null,
  finish:finish?String(finish).trim().slice(0,50):null,
  image:image?String(image).trim().slice(0,2000):'',
  pricing_mode:mode,
  fixed_price:mode==='FIXED'&&fixed_price?String(fixed_price):'',
  making_flat:making_flat!==undefined&&making_flat!==''&&making_flat!==null?String(making_flat):'0',
  making_percent:making_percent!==undefined&&making_percent!==''&&making_percent!==null?String(making_percent):'0',
  stone_charge:stone_charge!==undefined&&stone_charge!==''&&stone_charge!==null?String(stone_charge):'0',
  other_charge:other_charge!==undefined&&other_charge!==''&&other_charge!==null?String(other_charge):'0',
  stock:Math.max(0,parseInt(stock||0,10)),
  status:['published','draft'].includes(status)?status:'published',
  source_timestamp:nNow
 };
 const invalid=validate('products',exportCsv('products',[{...prodData,stock:String(prodData.stock)}])).errors[0];
 if(invalid)throw validationError(`${invalid.field}: ${invalid.correction}`);
 const dbRow={
  ...prodData,
  image:prodData.image||null,
  net_weight_g:prodData.net_weight_g?Number(prodData.net_weight_g):null,
  fixed_price:prodData.fixed_price?Number(prodData.fixed_price):null,
  making_flat:Number(prodData.making_flat||0),
  making_percent:Number(prodData.making_percent||0),
  stone_charge:Number(prodData.stone_charge||0),
  other_charge:Number(prodData.other_charge||0),
  updated_at:nNow
 };
 await db('products').insert(dbRow);
 if(dbRow.image){
  const photo={url:dbRow.image,alt_text:dbRow.name,updated_at:nNow};
  await db('product_images').insert({...photo,sku:cleanSku,product_code:cleanCode,role:'hero',sort_order:-1,created_at:nNow});
 }
 await audit(req,'create_product',{sku:cleanSku,name:dbRow.name});
 res.json({ok:true,product:dbRow});
}));
app.delete('/api/admin/products/:sku',auth(['owner','manager']),route(async(req,res)=>{
 const prod=await db('products').where({sku:req.params.sku}).first();
 if(!prod)return res.status(404).json({error:'Product not found'});
 await db('products').where({sku:req.params.sku}).del();
 await db('product_images').where(function(){this.where({sku:req.params.sku}).orWhere({product_code:req.params.sku});}).del();
 await audit(req,'delete_product',{sku:req.params.sku});
 res.json({ok:true});
}));
app.get('/api/admin/coins',auth(),route(async(req,res)=>{
 const coins=await db('coins').orderBy('id','desc');
 const [rates,silverRate,rules]=await Promise.all([activeRates(db),getSilverRate(db),db('pricing_rules').orderBy('id','desc').first()]);
 const hasImages=await db.schema.hasTable('product_images').catch(()=>false);
 const coinSkus=coins.map(c=>c.sku);
 const coinImages=hasImages&&coinSkus.length?await db('product_images').where(function(){
  this.whereIn('sku',coinSkus).orWhereIn('product_code',coinSkus);
 }).orderBy('sort_order','asc').orderBy('id','asc'):[];
 const imagesByCoin={};
 for(const img of coinImages){
  for(const k of [img.sku,img.product_code]){
   if(!k)continue;
   if(!imagesByCoin[k])imagesByCoin[k]=[];
   imagesByCoin[k].push(img);
  }
 }
 res.json({
  coins:coins.map(c=>{
   let p=null;
   try{p=calculateCoinPrice(c,rates,silverRate,rules);}catch{}
   const cImgs=(imagesByCoin[c.sku]||[]).filter((img,i,all)=>all.findIndex(other=>other.id===img.id)===i);
   return {...c,calculated_price:p?.total??null,breakdown:p,images:cImgs};
  }),
  silverRate,
  goldRate24k:rates['24K']?.inr_per_gram||null
 });
}));
app.post('/api/admin/coins',auth(['owner','manager']),route(async(req,res)=>{
 const {sku,name,metal,coin_type,purity,weight_g,dimension,making_charge,pricing_mode,fixed_price,stock,description,image,status}=req.body;
 if(!sku||!name||!metal||!weight_g)throw validationError('SKU, Name, Metal, and Weight in grams are required');
 const cleanSku=String(sku).trim().toUpperCase();
 const existing=await db('coins').where({sku:cleanSku}).first();
 if(existing)throw validationError(`A coin with SKU "${cleanSku}" already exists`);
 if(await db('products').where({sku:cleanSku}).first())throw validationError('This SKU already belongs to jewellery. Choose a unique coin SKU.');
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
  supplier:'Merchant',source_timestamp:nNow,image_kind:req.body.image_kind==='illustration'?'illustration':'photo',
  created_at:nNow,
  updated_at:nNow
 };
 const invalid=validate('coins',exportCsv('coins',[{...coinData,stock:String(stock??0)}])).errors[0];if(invalid)throw validationError(`${invalid.field}: ${invalid.correction}`);
 await db('coins').insert(coinData);
 await audit(req,'create_coin',{sku:cleanSku,name:coinData.name});
 res.json({ok:true,coin:coinData});
}));
app.patch('/api/admin/coins/:sku',auth(['owner','manager']),route(async(req,res)=>{
 const coin=await db('coins').where({sku:req.params.sku}).first();
 if(!coin)return res.status(404).json({error:'Coin not found'});
 const invalid=validate('coins',exportCsv('coins',[{...coin,...req.body,sku:coin.sku,supplier:coin.supplier}])).errors[0];if(invalid)throw validationError(`${invalid.field}: ${invalid.correction}`);
 const patch={updated_at:now(),source_timestamp:now()};
 const fields=['name','metal','coin_type','purity','weight_g','dimension','making_charge','pricing_mode','fixed_price','stock','description','image','status','image_kind'];
 for(const f of fields){
  if(req.body[f]!==undefined){
   if(f==='weight_g'||f==='making_charge'||f==='fixed_price')patch[f]=req.body[f]===''||req.body[f]===null?null:Number(req.body[f]);
   else if(f==='stock')patch[f]=Math.max(0,parseInt(req.body[f]||0,10));
   else patch[f]=req.body[f]===null?null:String(req.body[f]).trim();
  }
 }
 await db('coins').where({sku:req.params.sku}).update(patch);
 if(patch.image){
  const hero=await db('product_images').where(function(){this.where({product_code:req.params.sku,role:'hero'}).orWhere({sku:req.params.sku,role:'hero'});}).first();
  const photo={url:patch.image,alt_text:patch.name||coin.name,updated_at:now()};
  if(hero)await db('product_images').where({id:hero.id}).update(photo);
  else await db('product_images').insert({...photo,sku:req.params.sku,product_code:req.params.sku,role:'hero',sort_order:1,created_at:now()});
 }
 await audit(req,'edit_coin',{sku:req.params.sku,patch});
 res.json({ok:true});
}));
app.delete('/api/admin/coins/:sku',auth(['owner','manager']),route(async(req,res)=>{
 const coin=await db('coins').where({sku:req.params.sku}).first();
 if(!coin)return res.status(404).json({error:'Coin not found'});
 await db('coins').where({sku:req.params.sku}).del();
 await db('product_images').where(function(){this.where({sku:req.params.sku}).orWhere({product_code:req.params.sku});}).del();
 await audit(req,'delete_coin',{sku:req.params.sku});
 res.json({ok:true});
}));
app.post('/api/admin/coins/silver-rate',auth(['owner','manager']),route(async(req,res)=>{
 const rate=Number(req.body.rate);
 if(!Number.isFinite(rate)||rate<=0)throw validationError('Enter a valid positive silver rate per gram');
 await db.transaction(async t=>{for(const [key,value] of [['SILVER_RATE_PER_GRAM',String(rate)],['SILVER_RATE_UPDATED_AT',now()]])await t('settings').insert({key,value}).onConflict('key').merge();});
 await audit(req,'update_silver_rate',{rate});
 res.json({ok:true,rate});
}));
app.post('/api/admin/upload-image',auth(['owner','manager']),route(async(req,res)=>{
 const {name,data,role,product_code}=req.body;
 if(!data||typeof data!=='string')throw validationError('Image data is required');
 const match=data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
 if(!match)throw validationError('Invalid image data format. Please upload a PNG, JPG, or WEBP image.');
 const ext=match[1].toLowerCase().replace('jpeg','jpg').replace('svg+xml','svg');
 if(!['jpg','png','webp','gif','svg'].includes(ext))throw validationError('Supported image formats: JPG, PNG, WEBP, GIF, SVG');
 const buffer=Buffer.from(match[2],'base64');
 if(buffer.length>8*1024*1024)throw validationError('Maximum image size is 8 MB');
 const cleanName=String(name||'product').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/g,'-').slice(0,40)||'photo';
 const filename=`${Date.now()}-${crypto.randomUUID().slice(0,8)}-${cleanName}.${ext}`;
 await saveUploadedImage(uploadsDir,filename,buffer);
 const host=process.env.APP_URL||'http://localhost:3000';
 const url=`/uploads/${filename}`;
 let imageRecord=null;
 const targetCode=product_code||req.body.sku;
 if(targetCode&&role){
  const nowStr=now();
  const validRole=['hero','front','left','right','model','modal','detail'].includes(role)?role:'front';
  const hasImages=await db.schema.hasTable('product_images').catch(()=>false);
  if(hasImages){
   const existing=await db('product_images').where(function(){this.where({product_code:targetCode,role:validRole}).orWhere({sku:targetCode,role:validRole});}).first();
   if(existing){
    await db('product_images').where({id:existing.id}).update({url,updated_at:nowStr});
    imageRecord={...existing,url,updated_at:nowStr};
   }else{
    const sortOrder={'hero':1,'front':2,'left':3,'right':4,'model':5,'modal':5,'detail':6}[validRole]||10;
    const [id]=await db('product_images').insert({product_code:targetCode,sku:req.body.sku||targetCode,role:validRole,url,sort_order:sortOrder,created_at:nowStr,updated_at:nowStr});
    imageRecord={id,product_code:targetCode,sku:req.body.sku||targetCode,role:validRole,url,sort_order:sortOrder};
   }
  }
  if(validRole==='hero'||validRole==='front'){
   await db('products').where({product_code:targetCode}).orWhere({sku:targetCode}).update({image:url,updated_at:nowStr});
   await db('coins').where({sku:targetCode}).update({image:url,updated_at:nowStr});
  }
 }
 await audit(req,'upload_image',{filename,size:buffer.length,product_code:targetCode,role});
 res.json({ok:true,filename,url,thumbnail:thumbnailUrl(url),fullUrl:`${host}${url}`,image:imageRecord});
}));

app.post('/api/admin/upload-images',auth(['owner','manager']),route(async(req,res)=>{
 const files=req.body.files||req.body.images;
 if(!Array.isArray(files)||!files.length)throw validationError('At least one image file is required');
 if(files.length>30)throw validationError('Maximum 30 images can be bulk uploaded at once');
 const host=process.env.APP_URL||'http://localhost:3000';
 const uploaded=[];
 const nowStr=now();
 const hasImages=await db.schema.hasTable('product_images').catch(()=>false);
 for(let i=0;i<files.length;i++){
  const file=files[i];if(!file||typeof file!=='object')continue;
  const {name,data,role,product_code}=file;
  if(!data||typeof data!=='string')continue;
  const match=data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if(!match)continue;
  const ext=match[1].toLowerCase().replace('jpeg','jpg').replace('svg+xml','svg');
  if(!['jpg','png','webp','gif','svg'].includes(ext))continue;
  const buffer=Buffer.from(match[2],'base64');
  if(buffer.length>8*1024*1024)continue;
  const cleanName=String(name||`upload-${i+1}`).toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/g,'-').slice(0,40)||'photo';
  const filename=`${Date.now()}-${i}-${cleanName}.${ext}`;
  try{await saveUploadedImage(uploadsDir,filename,buffer)}catch{continue;}
  const url=`/uploads/${filename}`;
  let imageRecord=null;
  const targetCode=product_code||file.sku;
  if(targetCode&&role&&hasImages){
   const validRole=['hero','front','left','right','model','modal','detail'].includes(role)?role:'front';
   const existing=await db('product_images').where(function(){this.where({product_code:targetCode,role:validRole}).orWhere({sku:targetCode,role:validRole});}).first();
   if(existing){
    await db('product_images').where({id:existing.id}).update({url,updated_at:nowStr});
    imageRecord={...existing,url,updated_at:nowStr};
   }else{
    const sortOrder={'hero':1,'front':2,'left':3,'right':4,'model':5,'modal':5,'detail':6}[validRole]||10;
    const [id]=await db('product_images').insert({product_code:targetCode,sku:file.sku||targetCode,role:validRole,url,sort_order:sortOrder,created_at:nowStr,updated_at:nowStr});
    imageRecord={id,product_code:targetCode,sku:file.sku||targetCode,role:validRole,url,sort_order:sortOrder};
   }
   if(validRole==='hero'||validRole==='front'){
    await db('products').where({product_code:targetCode}).orWhere({sku:targetCode}).update({image:url,updated_at:nowStr});
    await db('coins').where({sku:targetCode}).update({image:url,updated_at:nowStr});
   }
  }
  uploaded.push({filename,url,thumbnail:thumbnailUrl(url),fullUrl:`${host}${url}`,role:role||null,product_code:targetCode||null,image:imageRecord});
 }
 if(!uploaded.length)throw validationError('No images could be processed. Choose valid image files no larger than 8 MB each.');
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
 if(!url||typeof url!=='string'||!url.trim())throw validationError('Image URL is required');
 const validRole=['hero','front','left','right','model','modal','detail'].includes(role)?role:'front';
 const targetCode=product_code||sku;
 if(!targetCode)throw validationError('Product code or SKU is required');
 const nowStr=now();
 const sortMap={'hero':1,'front':2,'left':3,'right':4,'model':5,'modal':5,'detail':6};
 const order=sort_order!==undefined?Number(sort_order):sortMap[validRole]||10;

 const existing=await db('product_images').where(function(){this.where({product_code:targetCode,role:validRole}).orWhere({sku:targetCode,role:validRole});}).first();
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
   sku:sku||targetCode,
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
  await db('products').where({product_code:targetCode}).orWhere({sku:targetCode}).update({image:String(url).trim(),updated_at:nowStr});
  await db('coins').where({sku:targetCode}).update({image:String(url).trim(),updated_at:nowStr});
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

 const files=fs.readdirSync(uploadsDir).filter(f=>!f.startsWith('.')&&/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f));
 const host=process.env.APP_URL||'http://localhost:3000';
 const list=files.map(f=>{
  const stat=fs.statSync(path.join(uploadsDir,f));
  return {
   filename:f,
   url:`/uploads/${f}`,
   thumbnail:thumbnailUrl(`/uploads/${f}`),
   fullUrl:`${host}/uploads/${f}`,
   size:stat.size,
   mtime:stat.mtime
  };
 }).sort((a,b)=>new Date(b.mtime)-new Date(a.mtime));
 res.json([...coinArtwork.map(a=>({name:a.name,filename:a.image.split('/').pop(),url:a.image,image_kind:'illustration'})),...list]);
}));

app.get('/api/admin/reviews', auth(), route(async (req, res) => {
  const result = await getAdminReviews(db, {
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    rating: req.query.rating,
    productId: req.query.productId,
    search: req.query.search,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    sort: req.query.sort,
    order: req.query.order
  });
  res.json(result);
}));

app.get('/api/admin/reviews/:id', auth(), route(async (req, res) => {
  const review = await getAdminReviewById(db, req.params.id);
  res.json(review);
}));

app.patch('/api/admin/reviews/:id/status', auth(['owner', 'manager']), route(async (req, res) => {
  const result = await adminUpdateReviewStatus(db, req.params.id, req.body.status);
  await audit(req, 'update_review_status', { reviewId: req.params.id, status: req.body.status });
  invalidateSearchCache();
  res.json(result);
}));

app.post('/api/admin/reviews/bulk-status', auth(['owner', 'manager']), route(async (req, res) => {
  const result = await adminBulkReviewStatus(db, req.body.reviewIds, req.body.status);
  await audit(req, 'bulk_update_review_status', { reviewIds: req.body.reviewIds, status: req.body.status, count: result.updatedCount });
  invalidateSearchCache();
  res.json(result);
}));

app.put('/api/admin/reviews/:id', auth(['owner', 'manager']), route(async (req, res) => {
  const result = await adminEditReview(db, req.params.id, req.body);
  await audit(req, 'edit_review', { reviewId: req.params.id, patch: req.body });
  invalidateSearchCache();
  res.json(result);
}));

app.delete('/api/admin/reviews/:id', auth(['owner', 'manager']), route(async (req, res) => {
  const soft = req.query.soft === 'true' || req.body?.soft === true;
  const result = await adminDeleteReview(db, req.params.id, { soft });
  await audit(req, 'delete_review', { reviewId: req.params.id, soft });
  invalidateSearchCache();
  res.json(result);
}));

app.get('/api/admin/samples/:file',auth(),(req,res)=>{const allowed=['gold-rates-template.csv','gold-rates-example.csv','products-template.csv','products-example.csv','coins-template.csv','coins-example.csv','import-errors-example.csv'];if(!allowed.includes(req.params.file))return res.sendStatus(404);res.download(path.resolve('samples',req.params.file));});
app.get('/api/admin/export/:kind',auth(),route(async(req,res)=>{const k=req.params.kind,d=new Date().toISOString().slice(0,10);if(k==='products'){const rows=await db('products').orderBy('product_code');return res.type('text/csv').attachment(`products-${d}.csv`).send(exportCsv('products',rows));}if(k==='coins'){const rows=await db('coins').orderBy('id','desc');return res.type('text/csv').attachment(`coins-${d}.csv`).send(exportCsv('coins',rows));}if(k==='gold'){const rows=await db('rates').orderBy('id','desc');return res.type('text/csv').attachment(`gold-rates-${d}.csv`).send(exportCsv('gold',rows));}if(k==='orders'){const rows=await db('orders').orderBy('created_at','desc');return res.type('text/csv').attachment(`orders-${d}.csv`).send(ordersCsv(rows));}res.sendStatus(404);}));
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
app.post('/api/admin/rules',auth(['owner']),route(async(req,res)=>{const rule=validateRule(req.body);await db.transaction(async t=>{await t('pricing_rules').insert({...rule,changed_at:now(),changed_by:req.session.staff.id});await t('audit').insert({staff_id:req.session.staff.id,action:'pricing_rule',details:json(rule),created_at:now()});});invalidateSearchCache();res.json({ok:true});}));
const aiCopyLimit=rateLimit({windowMs:60000,limit:8,message:{error:'Too many catalogue copy requests. Wait a minute and try again.'}});
app.get('/api/admin/ai/skills',auth(),route(async(req,res)=>res.json(listCopySkills())));
app.get('/api/admin/ai/drafts',auth(),route(async(req,res)=>res.json(await listCatalogueDrafts(db,{sku:req.query.sku,status:req.query.status}))));
app.post('/api/admin/ai/drafts',aiCopyLimit,auth(['owner','manager']),route(async(req,res)=>{
  const draft=await createCatalogueDraft(db,{sku:req.body.sku,skill:req.body.skill,tone:req.body.tone,staffId:req.session.staff.id});
  res.status(201).json(draft);
}));
app.post('/api/admin/ai/drafts/:id/approve',auth(['owner','manager']),route(async(req,res)=>{
  const draft=await approveCatalogueDraft(db,Number(req.params.id),{applyName:req.body.apply_name===true,applyDescription:req.body.apply_description===true,acknowledgeWarnings:req.body.acknowledge_warnings===true,staffId:req.session.staff.id});
  invalidateSearchCache();
  res.json(draft);
}));
app.post('/api/admin/ai/drafts/:id/reject',auth(['owner','manager']),route(async(req,res)=>res.json(await rejectCatalogueDraft(db,Number(req.params.id),req.session.staff.id))));
registerSeo(app,db,{preview,route});
app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found'}));
registerPwa(app,{production});
if(!production){const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}else{app.use(express.static('dist',{index:false,maxAge:'1h'}));app.use(express.static('public',{maxAge:'1h'}));app.get('*',route(async(req,res)=>{if(path.extname(req.path))return res.status(404).send('Not found');const meta=await pageMetadata(db,req.path);res.set('Cache-Control','no-cache');if(!meta.indexable)res.set('X-Robots-Tag','noindex, nofollow');res.status(meta.status).type('html').send(renderMetadata(fs.readFileSync('dist/index.html','utf8'),meta));}));}
app.use((err,req,res,next)=>{if(res.headersSent)return next(err);const out=errorResponse(err);if(out.status>=500)console.error(JSON.stringify({event:'request_failed',requestId:req.requestId,method:req.method,status:out.status}));res.status(out.status).json(out.body);});
const port=Number(process.env.PORT||3000);const httpServer=app.listen(port,production?'0.0.0.0':'127.0.0.1',()=>console.log(`Veyora Jewels: http://localhost:${port} (${preview?'fictional preview':'production'})`));

const cleanup=setInterval(()=>Promise.all([db('sessions').where('expires','<',Date.now()).del(),db('password_resets').where('expires','<',Date.now()).del()]).catch(()=>console.error(JSON.stringify({event:'session_cleanup_failed'}))),3600000);cleanup.unref();
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{clearInterval(cleanup);httpServer.close(async()=>{await db.destroy();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref();});
