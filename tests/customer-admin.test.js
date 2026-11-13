import bcrypt from 'bcryptjs';
import {loginCustomer} from '../server/customers.js';
import {requestReset} from '../server/password-reset.js';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createDb,migrate,db} from '../server/db.js';
import {listCustomers,updateCustomer,deleteCustomer,restoreCustomer} from '../server/customer-admin.js';
let k,id;
before(async()=>{k=createDb(':memory:');await migrate(k);[id]=await k('customers').insert({name:'Registered User',email:'registered@example.invalid',phone:'9999999999',password_hash:await bcrypt.hash('customer-test-password',12),email_verified_at:'2026-11-14',phone_verified_at:'2026-11-14',created_at:'2026-11-14'});await k('customers').insert({name:'Other User',email:'other@example.invalid',password_hash:'private-hash',created_at:'2026-11-14'});});
after(async()=>{await k.destroy();await db.destroy()});
test('lists customers without chat history, filters and clamps pages, never exposes password hashes',async()=>{
 const result=await listCustomers(k,{search:'registered@',page:500});assert.equal(result.total,1);assert.equal(result.page,1);assert.equal(result.customers[0].id,id);assert.equal(result.customers[0].orders,0);assert.equal(result.customers[0].password_hash,undefined);
});
test('profile edits enforce unique identities, reset changed verification and revoke existing sessions',async()=>{
 await assert.rejects(updateCustomer(k,id,{name:'User',email:'other@example.invalid'}),e=>e.status===409);
 await assert.rejects(updateCustomer(k,id,{name:'User',email:'invalid'}),e=>e.status===400);
 const changed=await updateCustomer(k,id,{name:'Updated Name',email:'updated@example.invalid',phone:'8888888888'});assert.equal(changed.email_verified_at,null);assert.equal(changed.phone_verified_at,null);assert.equal(changed.password_hash,undefined);assert.equal((await k('customers').where({id}).first()).session_version,1);
});
test('soft deletion preserves account data and order ownership, hides the account and blocks authentication',async()=>{
 await k('orders').insert({id:'CUSTOMER-ADMIN-ORDER',customer_id:id,customer:JSON.stringify({name:'Original Name'}),total:100});
 await k('customer_state').insert({customer_id:id,bag:'[]',saved:'[]',updated_at:'2026-11-14'});
 await k('password_resets').insert({token_hash:'test-token',customer_id:id,expires:Date.now()+100000});
 await deleteCustomer(k,id);const deleted=await k('customers').where({id}).first();assert.ok(deleted.deleted_at);assert.equal(deleted.session_version,2);assert.ok(await k('customer_state').where({customer_id:id}).first());const order=await k('orders').where({id:'CUSTOMER-ADMIN-ORDER'}).first();assert.equal(order.customer_id,id);assert.equal(JSON.parse(order.customer).name,'Original Name');assert.equal((await listCustomers(k,{search:'updated@'})).total,0);assert.equal((await listCustomers(k,{deleted:'true'})).customers[0].id,id);assert.equal((await k('password_resets').where({customer_id:id})).length,0);
 await assert.rejects(loginCustomer(k,{email:'updated@example.invalid',password:'customer-test-password'}),/incorrect/);
 let sent=false;await requestReset(k,'updated@example.invalid',async()=>{sent=true});assert.equal(sent,false);
 await assert.rejects(updateCustomer(k,id,{name:'Changed',email:'changed@example.invalid'}),e=>e.status===409);
 await deleteCustomer(k,id);assert.equal((await k('customers').where({id}).first()).session_version,2);assert.equal((await k('audit').where({action:'customer_soft_deleted'})).length,1);
});
test('restore returns the same account and history to active customers without reviving old sessions',async()=>{
 await restoreCustomer(k,id);assert.equal((await k('customers').where({id}).first()).deleted_at,null);assert.equal((await k('customers').where({id}).first()).session_version,3);assert.equal((await loginCustomer(k,{email:'updated@example.invalid',password:'customer-test-password'})).id,id);assert.equal((await listCustomers(k,{search:'updated@'})).total,1);assert.equal((await listCustomers(k,{deleted:'true'})).total,0);assert.equal((await k('orders').where({customer_id:id})).length,1);await restoreCustomer(k,id);assert.equal((await k('audit').where({action:'customer_restored'})).length,1);
});
