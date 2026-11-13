import {validationError} from './errors.js';
const fields = ['id','name','email','phone','email_verified_at','phone_verified_at','created_at','deleted_at'];
function customerId(value) {const id=Number(value);if(!Number.isSafeInteger(id)||id<1)throw validationError('Invalid customer ID.');return id;}
export async function listCustomers(db, query={}) {
 const page=Math.max(1,Math.min(10000,parseInt(query.page,10)||1));
 const search=String(query.search||'').trim().slice(0,100);
 const base=db('customers');
 if(query.deleted==='true')base.whereNotNull('deleted_at');else base.whereNull('deleted_at');
 if(search)base.where(function(){this.where('name','like',`%${search}%`).orWhere('email','like',`%${search}%`).orWhere('phone','like',`%${search}%`)});
 const count=await base.clone().count({total:'id'}).first();
 const pageCount=Math.max(1,Math.ceil(Number(count.total)/25)), current=Math.min(page,pageCount);
 const customers=await base.clone().select(fields).select(db.raw('(select count(*) from orders where customer_id = customers.id) as orders')).orderBy('created_at','desc').orderBy('id','desc').limit(25).offset((current-1)*25);
 return {customers,total:Number(count.total),page:current,pageCount};
}
export async function updateCustomer(db, id, input, staffId=null) {
 id=customerId(id);
 const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase(),phone=String(input.phone||'').trim();
 if(!name||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>254)throw validationError('Enter a full name and valid email address.');
 if(phone&&!/^\+?[0-9]{7,15}$/.test(phone))throw validationError('Enter a valid phone number using 7–15 digits.');
 return db.transaction(async t=>{
  const old=await t('customers').where({id}).forUpdate().first();if(!old)throw validationError('Customer not found.',404);
  if(old.deleted_at)throw validationError('Restore this customer before editing their details.',409);
  if(await t('customers').where({email}).whereNot({id}).first())throw validationError('Another customer already uses this email.',409);
  await t('customers').where({id}).update({name,email,phone:phone||null,email_verified_at:email===old.email?old.email_verified_at:null,phone_verified_at:phone===(old.phone||'')?old.phone_verified_at:null,session_version:(old.session_version||0)+1});
  // Remove pending recovery and verification credentials after an identity change.
  if(email!==old.email||phone!==(old.phone||'')){
   await t('password_resets').where({customer_id:id}).del();
   await t('otp_challenges').where({customer_id:id}).del();
  }
  await t('audit').insert({staff_id:staffId,action:'customer_updated',details:JSON.stringify({customerId:id}),created_at:new Date().toISOString()});
  return t('customers').where({id}).select(fields).first();
 });
}
export async function deleteCustomer(db, id, staffId=null) {
 id=customerId(id);
 return db.transaction(async t=>{
  const customer=await t('customers').where({id}).forUpdate().first();
  if(!customer)throw validationError('Customer not found.',404);
  if(customer.deleted_at)return {ok:true};
  await t('customers').where({id}).update({deleted_at:new Date().toISOString(),session_version:(customer.session_version||0)+1});
  await t('password_resets').where({customer_id:id}).del();
  await t('otp_challenges').where({customer_id:id}).del();
  await t('audit').insert({staff_id:staffId,action:'customer_soft_deleted',details:JSON.stringify({customerId:id}),created_at:new Date().toISOString()});
  return {ok:true};
 });
}
export async function restoreCustomer(db,id,staffId=null) {
 id=customerId(id);
 return db.transaction(async t=>{
  const customer=await t('customers').where({id}).forUpdate().first();
  if(!customer)throw validationError('Customer not found.',404);
  if(customer.deleted_at){
   await t('customers').where({id}).update({deleted_at:null,session_version:(customer.session_version||0)+1});
   await t('audit').insert({staff_id:staffId,action:'customer_restored',details:JSON.stringify({customerId:id}),created_at:new Date().toISOString()});
  }
  return {ok:true};
 });
}
export function registerCustomerAdminRoutes(app,{db,auth,route}) {
 app.get('/api/admin/customers',auth(),route(async(req,res)=>res.json(await listCustomers(db,req.query))));
 app.put('/api/admin/customers/:id',auth(['owner','manager']),route(async(req,res)=>res.json(await updateCustomer(db,req.params.id,req.body||{},req.session.staff.id))));
 app.post('/api/admin/customers/:id/restore',auth(['owner']),route(async(req,res)=>res.json(await restoreCustomer(db,req.params.id,req.session.staff.id))));
 app.delete('/api/admin/customers/:id',auth(['owner']),route(async(req,res)=>res.json(await deleteCustomer(db,req.params.id,req.session.staff.id))));
}
