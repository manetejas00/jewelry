import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../src/api.js';
test('overlapping catalogue reads share a request but subsequent reads get fresh prices',async()=>{
 const originalFetch=globalThis.fetch,originalStorage=globalThis.sessionStorage;
 let calls=0,finish;
 globalThis.sessionStorage={getItem:()=>''};
 globalThis.fetch=()=>{calls++;return new Promise(resolve=>{finish=()=>resolve({ok:true,json:async()=>[{price:calls}]})})};
 try{
  const first=api('/coins'),second=api('/coins');assert.equal(calls,1);finish();
  assert.deepEqual(await first,await second);
  const fresh=api('/coins');assert.equal(calls,2);finish();assert.equal((await fresh)[0].price,2);
 }finally{globalThis.fetch=originalFetch;globalThis.sessionStorage=originalStorage;}
});
