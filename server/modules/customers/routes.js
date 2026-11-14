import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import {validationError} from '../../errors.js';
import {resetConfigured, requestReset, completeReset, replacePassword} from '../../password-reset.js';
import {registerCustomer, loginCustomer, customerState, saveCustomerState, mergeGuestState, claimSessionOrders, customerOrders, validateState} from '../../customers.js';
import {otpAvailability, sendOtp, sendPasswordResetOtp, verifyOtp, confirmOtp, resendOtp, otpStatus, spendVerified, releaseVerified, normalizeEmail, normalizeIndianMobile, SENT_MESSAGE} from '../../otp.js';
import {customerAuth, customerCsrf} from './policies.js';

export function registerCustomerRoutes(app, { db, route, otpGateway }) {
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
   const active=await db('customers').where({id:customer.id}).whereNull('deleted_at').first();
   if(!active||(active.session_version||0)!==(customer.session_version||0))throw validationError('Please sign in again.',401);

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
   const customer=email?await db('customers').where({email}).whereNull('deleted_at').first():null;
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
}
