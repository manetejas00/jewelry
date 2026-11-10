import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paginate,pageNumbers} from '../src/pagination.js';
const items=Array.from({length:107},(_,index)=>index+1);

test('107 product variants span five non-overlapping pages without missing rows',()=>{
 const pages=Array.from({length:5},(_,index)=>paginate(items,index+1,25));
 assert.deepEqual(pages.flatMap(page=>page.items),items);
 assert.deepEqual(pages.map(page=>[page.start,page.end]),[[1,25],[26,50],[51,75],[76,100],[101,107]]);
 assert.equal(pages[4].pageCount,5);
});

test('a smaller filtered or refreshed list clamps an out-of-range page',()=>{
 const result=paginate(items.slice(0,6),5,25);
 assert.equal(result.page,1);
 assert.deepEqual(result.items,[1,2,3,4,5,6]);
 assert.equal(paginate(items.slice(0,26),5,25).page,2);
});

test('empty lists and invalid page values have a valid empty first page',()=>{
 const empty=paginate([],99,25);
 assert.deepEqual([empty.page,empty.pageCount,empty.start,empty.end],[1,1,0,0]);
 assert.deepEqual(empty.items,[]);
 assert.equal(paginate(items,-1,25).page,1);
 assert.equal(paginate(items,NaN,0).pageSize,25);
});

test('page navigation stays bounded while including the first, last, and current pages',()=>{
 assert.deepEqual(pageNumbers(1,1),[1]);
 assert.deepEqual(pageNumbers(1,5),[1,2,3,4,5]);
 assert.deepEqual(pageNumbers(1,20),[1,2,20]);
 assert.deepEqual(pageNumbers(10,20),[1,9,10,11,20]);
 assert.deepEqual(pageNumbers(20,20),[1,19,20]);
});
