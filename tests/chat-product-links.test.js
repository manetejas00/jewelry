import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chatProductLinks} from '../src/chat-product-links.js';
const ring={name:'Aurelia Sunburst Pearl Ring',sku:'VEY-RG-101',slug:'aurelia-sunburst-pearl-ring'};
const coin={name:'Gold Coin',sku:'AU 1G'};
test('chat recommendations resolve names and SKUs in reply order to storefront routes',()=>{
 assert.deepEqual(chatProductLinks('Gold Coin, then **Aurelia Sunburst Pearl Ring** (SKU VEY-RG-101)',[ring],[coin]),[
  {name:coin.name,href:'/coins/product/AU%201G'}, {name:ring.name,href:'/products/aurelia-sunburst-pearl-ring'}
 ]);
});
test('variant mentions link once and partial SKUs or unknown items do not create links',()=>{
 assert.equal(chatProductLinks('VEY-RG-101 and VEY-RG-102',[ring,{...ring,sku:'VEY-RG-102'}]).length,1);
 assert.deepEqual(chatProductLinks('VEY-RG-1010 and unknown jewellery',[ring]),[]);
 assert.deepEqual(chatProductLinks(null,[ring]),[]);
 assert.deepEqual(chatProductLinks(ring.name,[{...ring,slug:null}]),[]);
});
