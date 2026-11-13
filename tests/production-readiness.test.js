import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {validateRuntime,commerceConfig} from '../server/runtime.js';
import {errorResponse,validationError} from '../server/errors.js';
import {validateOffer} from '../server/offers.js';
import {calculateCoinPrice,isFresh,quote,getSilverRate} from '../server/pricing.js';
import {createDb,migrate} from '../server/db.js';
import {checkout} from '../server/orders.js';
import {pageMetadata,renderMetadata} from '../server/seo.js';
import {saveUploadedImage} from '../server/thumbnails.js';
import {fetchLiveGoldRates} from '../server/daily.js';
const originalAppUrl=process.env.APP_URL;process.env.APP_URL ||= 'http://localhost:3318';
const env={NODE_ENV:'production',PREVIEW_MODE:'false',SESSION_SECRET:'x'.repeat(48),APP_URL:'https://store.example.com',DB_CLIENT:'mysql2',DB_HOST:'db',DB_NAME:'shop',DB_USER:'shop',DB_PASSWORD:'test-only',PAYMENT_MODE:'disabled'};
test('production rejects preview, insecure origin, missing database, weak sessions and unsupported gateways',()=>{
 assert.doesNotThrow(()=>validateRuntime(env));
 for(const patch of [{PREVIEW_MODE:'true'},{PREVIEW_MODE:undefined},{APP_URL:'http://store.example.com'},{APP_URL:'https://store.example.com/path'},{SESSION_SECRET:'replace_with_at_least_32_random_characters'},{DB_CLIENT:'sqlite'},{DB_PASSWORD:''},{PAYMENT_MODE:'live'},{SHIPPING_INR:'-1'},{TRUST_PROXY:'true'}])assert.throws(()=>validateRuntime({...env,...patch}));
});
test('checkout requires actual merchant contact, policies and explicit COD configuration',()=>{
 assert.equal(commerceConfig(env).checkoutEnabled,false);
 const ready={...env,MERCHANT_READY:'true',MERCHANT_EMAIL:'shop@example.com',SHIPPING_POLICY:'Shipping terms',RETURNS_POLICY:'Returns terms',PAYMENT_MODE:'cod'};
 assert.equal(commerceConfig(ready).checkoutEnabled,true);
 assert.equal(commerceConfig({...ready,MERCHANT_EMAIL:''}).checkoutEnabled,false);
 assert.equal(commerceConfig(env,true).checkoutEnabled,false);
 assert.equal(commerceConfig({...env,NODE_ENV:'development'},true).checkoutEnabled,true);
});
test('unexpected errors never disclose database queries or credentials',()=>{
 const secret=Error('select password_hash from staff; token=secret');
 assert.equal(errorResponse(secret).status,500);assert.doesNotMatch(JSON.stringify(errorResponse(secret)),/password_hash|token|select/);
 assert.equal(errorResponse(validationError('Invalid quantity')).status,400);
 assert.equal(errorResponse({type:'entity.too.large'}).status,413);
});
test('offer percentages and invalid inputs cannot inflate or invalidate prices',()=>{
 const offer={name:'Sale',badge_text:'Sale',discount_type:'total_percent',discount_value:10,applies_to:'all',status:'active',priority:0,show_in_banner:true,show_in_grid:false};
 assert.doesNotThrow(()=>validateOffer(offer));
 for(const patch of [{discount_value:-5},{discount_value:101},{discount_value:'NaN'},{status:'anything'},{show_in_grid:'false'},{name:' '},{applies_to:'sku'}])assert.throws(()=>validateOffer({...offer,...patch}));
});
test('gold coins require the exact purity and silver cannot silently use a fallback',()=>{
 assert.throws(()=>calculateCoinPrice({metal:'Gold',purity:'22K',weight_g:1,pricing_mode:'METAL_LINKED'},{'24K':{inr_per_gram:10000}}),/unavailable/);
 assert.throws(()=>calculateCoinPrice({metal:'Silver',weight_g:1,pricing_mode:'METAL_LINKED'},{},null),/unavailable/);
 assert.equal(isFresh({source_timestamp:'2099-01-01T00:00:00Z',effective_date:'2026-11-10'}),false);
});
test('automatic feed refuses unapproved purity conversion',async()=>{const previous=process.env.GOLD_AUTO_CONVERSION_APPROVED;delete process.env.GOLD_AUTO_CONVERSION_APPROVED;try{await assert.rejects(fetchLiveGoldRates(),/approval|APPROVED/)}finally{if(previous!==undefined)process.env.GOLD_AUTO_CONVERSION_APPROVED=previous;}});
let k,folder;
const fixtureReady=(async()=>{folder=await fs.mkdtemp(path.join(os.tmpdir(),'veyora-readiness-'));k=createDb(':memory:');await migrate(k);await k('products').insert({sku:'AUDIT-1',product_code:'audit-ring',slug:'audit-ring',name:'Audit ring',description:'Test <script> text',pricing_mode:'FIXED',fixed_price:199.99,stock:10,status:'published'});})();
before(async()=>{await fixtureReady;});

const customer={name:'Test Customer',email:'test@example.invalid',phone:'9999999999',address:'Test address only',city:'Mumbai',pincode:'400001'};
test('guest idempotency retry cannot grant another session access to an order',async()=>{
 const items=[{sku:'AUDIT-1',quantity:1}],q=await quote(k,items),payload={items,token:q.token,customer,idempotencyKey:'audit-order-00000001'};
 const first=await checkout(k,payload,true,null,'session-a');assert.equal((await checkout(k,payload,true,null,'session-a')).id,first.id);
 await assert.rejects(checkout(k,payload,true,null,'session-b'),/different customer/);
 await assert.rejects(checkout(k,{...payload,customer:{...customer,name:'Another'}},true,null,'session-a'),/different customer/);
 assert.equal((await k('products').where({sku:'AUDIT-1'}).first()).stock,9);
 await assert.rejects(checkout(k,{...payload,paymentMode:'card'}),/Only Cash/);
});
test('malformed bag items fail validation and decimal totals stay exact',async()=>{
 await assert.rejects(quote(k,[null]),/Invalid bag/);
 const q=await quote(k,[{sku:'AUDIT-1',quantity:3}]);assert.equal(q.subtotal,599.97);
});
test('production silver rates require a recent explicit timestamp',async()=>{
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{assert.equal(await getSilverRate(k),null);await k('settings').insert({key:'SILVER_RATE_PER_GRAM',value:'100'});assert.equal(await getSilverRate(k),null);await k('settings').insert({key:'SILVER_RATE_UPDATED_AT',value:new Date().toISOString()});assert.equal(await getSilverRate(k),100);}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
test('metadata is page-specific, private routes are noindex, missing products return 404, script data is escaped',async()=>{
 const meta=await pageMetadata(k,'/products/audit-ring');assert.match(meta.title,/Audit ring/);
 const html=renderMetadata('<head><title>old</title><meta name="description" content="old"></head>',meta);
 assert.match(html,/rel="canonical"/);assert.match(html,/application\/ld\+json/);assert.doesNotMatch(html,/<script> text/);
 assert.equal((await pageMetadata(k,'/account')).indexable,false);
 assert.equal((await pageMetadata(k,'/products/missing')).status,404);
});
test('active SVG uploads are rejected before writing public files',async()=>{
 await assert.rejects(saveUploadedImage(folder,'evil.svg',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')),/raster/);
 assert.equal((await fs.readdir(folder)).includes('evil.svg'),false);
});
let child,base;
before(async()=>{
 await fixtureReady;
 child=spawn(process.execPath,['server/index.js'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'development',PREVIEW_MODE:'true',DB_FILENAME:path.join(folder,'http.sqlite'),PORT:'3318',APP_URL:'http://localhost:3318',TRUST_PROXY:'0'},stdio:['ignore','pipe','pipe']});
 base='http://127.0.0.1:3318';let stderr='';child.stderr.on('data',d=>{stderr+=d});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('HTTP fixture startup timed out: '+stderr)),20000);child.once('exit',code=>{clearTimeout(timer);reject(Error('HTTP fixture exited '+code+': '+stderr))});child.stdout.on('data',d=>{if(d.toString().includes('Veyora Jewels:')){clearTimeout(timer);resolve();}});});
});
after(async()=>{if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}await k.destroy();await fs.rm(folder,{recursive:true,force:true});if(originalAppUrl===undefined)delete process.env.APP_URL;else process.env.APP_URL=originalAppUrl;});
test('real HTTP middleware enforces admin authorization, origin checks, JSON errors and health probes',async()=>{
 assert.equal((await fetch(base+'/health/ready')).status,200);
 assert.equal((await fetch(base+'/api/admin/products')).status,403);
 const missing=await fetch(base+'/api/nonexistent');assert.equal(missing.status,404);assert.match(missing.headers.get('content-type'),/json/);
 const bad=await fetch(base+'/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'});assert.equal(bad.status,400);assert.match((await bad.json()).error,/valid JSON/);
 const cross=await fetch(base+'/api/checkout',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:'{}'});assert.equal(cross.status,403);
 const oversized=await fetch(base+'/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({extra:'x'.repeat(300000)})});assert.equal(oversized.status,413);
 assert.match(await (await fetch(base+'/robots.txt')).text(),/Disallow: \//);
 assert.match(await (await fetch(base+'/sitemap.xml')).text(),/<urlset/);
});
function browserSession(){let cookie='';return async function call(url,body,method='GET',headers={}){const res=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});const set=res.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:res.status,data:await res.json()};};}
test('HTTP staff login, CSRF and offer CRUD preserve role boundaries',async()=>{
 const staff=browserSession();const login=await staff('/api/admin/login',{email:'preview@veyora.local',password:'preview-veyora-2026'},'POST');assert.equal(login.status,200);
 assert.equal((await staff('/api/admin/offers',{},'POST')).status,403);
 const token={'x-csrf-token':login.data.csrf};const offer={name:'HTTP audit offer',badge_text:'Test',discount_type:'total_percent',discount_value:10,applies_to:'all',status:'paused',priority:0,show_in_banner:false,show_in_grid:false};
 assert.equal((await staff('/api/admin/offers',{...offer,discount_value:-10},'POST',token)).status,400);
 assert.equal((await staff('/api/admin/offers',{...offer,discount_type:'unknown'},'POST',token)).status,400);
 const created=await staff('/api/admin/offers',offer,'POST',token);assert.equal(created.status,200);
 assert.equal((await staff('/api/admin/offers/'+created.data.id,{discount_value:200},'PATCH',token)).status,400);
 assert.equal((await staff('/api/admin/offers/'+created.data.id,{discount_value:20},'PATCH',token)).status,200);
 assert.equal((await staff('/api/admin/offers/'+created.data.id,{},'DELETE',token)).status,200);
 const testProd={sku:'VEY-TEST-AUDIT-01',name:'HTTP Audit Ring',category:'Rings',metal:'Gold',purity:'18K',pricing_mode:'FIXED',fixed_price:15000,stock:5,status:'published'};
 const prodCreated=await staff('/api/admin/products',testProd,'POST',token);
 assert.equal(prodCreated.status,200);
 assert.equal(prodCreated.data.ok,true);
 assert.equal((await staff('/api/admin/products',testProd,'POST',token)).status,400);
 assert.equal((await staff('/api/admin/products/'+testProd.sku,{},'DELETE',token)).status,200);
 assert.equal((await staff('/api/admin/logout',{},'POST',token)).status,200);
 assert.equal((await staff('/api/admin/products')).status,403);
});
test('HTTP customer registration, state revision, order ownership and logout',async()=>{
 const customerSession=browserSession(),stranger=browserSession();let session=await customerSession('/api/account/session');
 const registered=await customerSession('/api/account/register',{email:'http-audit@example.invalid',name:'HTTP Customer',password:'test-only-password-long',guestState:{bag:[],saved:[]}},'POST',{'x-customer-csrf':session.data.csrf});assert.equal(registered.status,200);
 const csrf={'x-customer-csrf':registered.data.csrf};
 assert.equal((await customerSession('/api/account/state',{bag:[],saved:[],revision:registered.data.state.revision},'PUT',csrf)).status,200);
 assert.equal((await customerSession('/api/account/state',{bag:[],saved:[],revision:registered.data.state.revision},'PUT',csrf)).status,409);
 assert.equal((await stranger('/api/account/orders')).status,401);
 assert.equal((await stranger('/api/orders/VEY-UNKNOWN')).status,404);
 assert.equal((await customerSession('/api/account/orders')).status,200);
 assert.equal((await customerSession('/api/account/logout',{},'POST',csrf)).status,200);
 assert.equal((await customerSession('/api/account/orders')).status,401);
});
test('password reset tokens are hashed, expire, change passwords once and invalidate sessions',async()=>{
 const {registerCustomer,loginCustomer}=await import('../server/customers.js');const {requestReset,completeReset}=await import('../server/password-reset.js');
 const account=await registerCustomer(k,{name:'Reset Customer',email:'reset@example.invalid',password:'original-test-password'});let link;
 await requestReset(k,account.email,async mail=>{link=mail.url});const token=new URL(link).searchParams.get('reset');
 const row=await k('password_resets').first();assert.notEqual(row.token_hash,token);
 await completeReset(k,{token,password:'updated-test-password'});
 assert.equal((await loginCustomer(k,{email:account.email,password:'updated-test-password'})).session_version,1);
 await assert.rejects(loginCustomer(k,{email:account.email,password:'original-test-password'}));
 await assert.rejects(completeReset(k,{token,password:'another-test-password'}),/invalid or expired/);
 await requestReset(k,account.email,async mail=>{link=mail.url});await k('password_resets').update({expires:Date.now()-1});
 await assert.rejects(completeReset(k,{token:new URL(link).searchParams.get('reset'),password:'another-test-password'}),/invalid or expired/);
 let sent=false;await requestReset(k,'unknown@example.invalid',async()=>{sent=true});assert.equal(sent,false);
 await assert.rejects(requestReset(k,account.email,async()=>{throw Error('SMTP password=secret')}),/temporarily unavailable/);
 assert.equal((await k('password_resets')).filter(r=>Number(r.expires)>Date.now()).length,0);
});
test('HTTP old customer sessions are rejected after password recovery',async()=>{
 const session=browserSession(),start=await session('/api/account/session');
 const email='session-reset@example.invalid';
 assert.equal((await session('/api/account/register',{email,name:'Session Test',password:'original-test-password',guestState:{bag:[],saved:[]}},'POST',{'x-customer-csrf':start.data.csrf})).status,200);
 assert.equal((await session('/api/account/orders')).status,200);
 const httpDb=createDb(path.join(folder,'http.sqlite'));const {requestReset,completeReset}=await import('../server/password-reset.js');
 try{let link;await requestReset(httpDb,email,async mail=>{link=mail.url});await completeReset(httpDb,{token:new URL(link).searchParams.get('reset'),password:'updated-test-password'});assert.equal((await session('/api/account/orders')).status,401);}finally{await httpDb.destroy();}
});
test('HTTP viewer session cannot mutate merchant records even with a valid CSRF token',async()=>{
 const httpDb=createDb(path.join(folder,'http.sqlite'));
 try{const owner=await httpDb('staff').where({email:'preview@veyora.local'}).first();await httpDb('staff').insert({email:'audit-viewer@example.invalid',password_hash:owner.password_hash,role:'viewer'});}finally{await httpDb.destroy();}
 const viewer=browserSession(),login=await viewer('/api/admin/login',{email:'audit-viewer@example.invalid',password:'preview-veyora-2026'},'POST');assert.equal(login.status,200);
 assert.equal((await viewer('/api/admin/products')).status,200);
 assert.equal((await viewer('/api/admin/offers',{},'POST',{'x-csrf-token':login.data.csrf})).status,403);
 assert.equal((await viewer('/api/admin/products',{},'POST',{'x-csrf-token':login.data.csrf})).status,403);
});
test('HTTP customer management requires staff, CSRF, and appropriate write roles',async()=>{
 assert.equal((await fetch(base+'/api/admin/customers')).status,403);
 const owner=browserSession(),login=await owner('/api/admin/login',{email:'preview@veyora.local',password:'preview-veyora-2026'},'POST');const token={'x-csrf-token':login.data.csrf};
 const httpDb=createDb(path.join(folder,'http.sqlite'));let id;
 try{[id]=await httpDb('customers').insert({name:'Admin customer test',email:'customer-admin-http@example.invalid',password_hash:'test-only',created_at:new Date().toISOString()});}finally{await httpDb.destroy()}
 assert.equal((await owner('/api/admin/customers?search=customer-admin-http')).data.total,1);
 assert.equal((await owner('/api/admin/customers/'+id,{name:'Changed',email:'changed-http@example.invalid'},'PUT')).status,403);
 const viewer=browserSession(),v=await viewer('/api/admin/login',{email:'audit-viewer@example.invalid',password:'preview-veyora-2026'},'POST');
 assert.equal((await viewer('/api/admin/customers/'+id,{},'PUT',{'x-csrf-token':v.data.csrf})).status,403);
 assert.equal((await viewer('/api/admin/customers/'+id,{},'DELETE',{'x-csrf-token':v.data.csrf})).status,403);
 assert.equal((await owner('/api/admin/customers/'+id,{name:'Changed',email:'changed-http@example.invalid',phone:''},'PUT',token)).status,200);
 assert.equal((await owner('/api/admin/customers/'+id,{},'DELETE',token)).status,200);
 assert.equal((await owner('/api/admin/customers?deleted=true&search=changed-http')).data.total,1);
 assert.equal((await viewer('/api/admin/customers/'+id+'/restore',{},'POST',{'x-csrf-token':v.data.csrf})).status,403);
 assert.equal((await owner('/api/admin/customers/'+id+'/restore',{},'POST',token)).status,200);
 assert.equal((await owner('/api/admin/customers?search=changed-http')).data.total,1);
});

test('HTTP soft deletion signs out an existing customer session and restore does not revive it',async()=>{
 const customer=browserSession(),init=await customer('/api/account/session');const registered=await customer('/api/account/register',{name:'Soft delete test',email:'soft-delete-http@example.invalid',password:'a-long-test-password'},'POST',{'x-customer-csrf':init.data.csrf});assert.equal(registered.status,200);
 const owner=browserSession(),login=await owner('/api/admin/login',{email:'preview@veyora.local',password:'preview-veyora-2026'},'POST');const headers={'x-csrf-token':login.data.csrf},id=registered.data.customer.id;
 assert.equal((await owner('/api/admin/customers/'+id,{},'DELETE',headers)).status,200);assert.equal((await customer('/api/account/orders')).status,401);
 assert.equal((await owner('/api/admin/customers/'+id+'/restore',{},'POST',headers)).status,200);assert.equal((await customer('/api/account/orders')).status,401);
});
