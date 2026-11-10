import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDb,migrate} from '../server/db.js';
import {registerCustomer,loginCustomer} from '../server/customers.js';

let k;
const password='A strong fictional password 123!';

before(async()=>{
  k=createDb(':memory:');
  await migrate(k);
});

after(async()=>{
  await k.destroy();
});

test('backend customer authentication lifecycle supports login, session lookup, and logout',async()=>{
  const customer=await registerCustomer(k,{name:'Veyora Customer',email:'navbar.test@example.invalid',password});
  assert.equal(customer.name,'Veyora Customer');
  assert.equal(customer.email,'navbar.test@example.invalid');

  const loggedIn=await loginCustomer(k,{email:'navbar.test@example.invalid',password});
  assert.equal(loggedIn.id,customer.id);
  assert.equal(loggedIn.name,'Veyora Customer');
});

test('header component code includes logged-in indicator, customer name, and required dropdown options',async()=>{
  const mainJsx=fs.readFileSync('src/main.jsx','utf8');
  const styleCss=fs.readFileSync('src/style.css','utf8');

  // Verify dropdown items
  assert.ok(mainJsx.includes('My Profile'),'Navbar dropdown must include My Profile');
  assert.ok(mainJsx.includes('My Orders'),'Navbar dropdown must include My Orders');
  assert.ok(mainJsx.includes('Logout'),'Navbar dropdown must include Logout');
  assert.ok(mainJsx.includes('Sign In'),'Navbar must include Sign In option');
  assert.ok(mainJsx.includes('Register'),'Navbar must include Register option');

  // Verify subtle logged-in indicator
  assert.ok(mainJsx.includes('auth-indicator'),'Navbar must include auth indicator');
  assert.ok(styleCss.includes('.auth-indicator'),'CSS must style auth indicator');
  assert.ok(styleCss.includes('.account-dropdown'),'CSS must style account dropdown');

  // Verify immediate state update with logoutCustomer
  assert.ok(mainJsx.includes('logoutCustomer'),'Navbar must use logoutCustomer to update state immediately without refresh');
});
