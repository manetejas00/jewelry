import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createDb,migrate,db} from '../server/db.js';
import {listCustomers,updateCustomer,deleteCustomer} from '../server/customer-admin.js';
let k,id;
before(async()=>{k=createDb(':memory:');await migrate(k);[id]=await k('customers').insert({name:'Registered User',email:'registered@example.invalid',phone:'9999999999',password_hash:'private-hash',email_verified_at:'2026-11-14',phone_verified_at:'2026-11-14',created_at:'2026-11-14'});await k('customers').insert({name:'Other User',email:'other@example.invalid',password_hash:'private-hash',created_at:'2026-11-14'});});
after(async()=>{await k.destroy();await db.destroy()});
test('lists customers without chat history, filters and clamps pages, never exposes password hashes',async()=>{
 const result=await listCustomers(k,{search:'registered@',page:500});assert.equal(result.total,1);assert.equal(result.page,1);assert.equal(result.customers[0].id,id);assert.equal(result.customers[0].orders,0);assert.equal(result.customers[0].password_hash,undefined);
});
test('profile edits enforce unique identities, reset changed verification and revoke existing sessions',async()=>{
 await assert.rejects(updateCustomer(k,id,{name:'User',email:'other@example.invalid'}),e=>e.status===409);
 await assert.rejects(updateCustomer(k,id,{name:'User',email:'invalid'}),e=>e.status===400);
 const changed=await updateCustomer(k,id,{name:'Updated Name',email:'updated@example.invalid',phone:'8888888888'});assert.equal(changed.email_verified_at,null);assert.equal(changed.phone_verified_at,null);assert.equal(changed.password_hash,undefined);assert.equal((await k('customers').where({id}).first()).session_version,1);
});
test('account deletion retains order snapshots and removes account state atomically',async()=>{
 await k('orders').insert({id:'CUSTOMER-ADMIN-ORDER',customer_id:id,customer:JSON.stringify({name:'Original Name'}),total:100});
 await k('customer_state').insert({customer_id:id,bag:'[]',saved:'[]',updated_at:'2026-11-14'});
 await deleteCustomer(k,id);assert.equal(await k('customers').where({id}).first(),undefined);assert.equal(await k('customer_state').where({customer_id:id}).first(),undefined);const order=await k('orders').where({id:'CUSTOMER-ADMIN-ORDER'}).first();assert.equal(order.customer_id,null);assert.equal(JSON.parse(order.customer).name,'Original Name');assert.equal((await k('audit').where({action:'customer_deleted'})).length,1);
});
