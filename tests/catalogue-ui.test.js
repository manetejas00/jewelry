import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {grouped} from '../src/catalogue.js';
import {coinImage} from '../src/media.js';
import {coinArtwork} from '../server/coin-artwork.js';
test('grouped cards keep prices and savings from their actual displayed variant',()=>{
 const variants=[{product_code:'ring',sku:'12',price:100,original_price:110,discount_amount:10,stock:4},{product_code:'ring',sku:'14',price:120,original_price:130,discount_amount:10,stock:4}];
 for(const list of [variants,[...variants].reverse()]){const [card]=grouped(list);assert.equal(card.sku,'12');assert.equal(card.price,100);assert.equal(card.original_price,110);assert.equal(card.original_price-card.price,card.discount_amount);assert.equal(card.maxPrice,120)}
});
test('optimized coin images exist and materially reduce catalogue download size',()=>{
 let original=0,thumbs=0;for(const a of coinArtwork){original+=fs.statSync('public'+a.image).size;thumbs+=fs.statSync('public'+coinImage(a.image,true)).size;assert.ok(fs.statSync('public'+coinImage(a.image)).size>0)}assert.ok(thumbs<original/10);assert.equal(coinImage('/uploads/custom.png',true),'/uploads/custom.png');
});
