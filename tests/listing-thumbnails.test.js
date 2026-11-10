import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {listingThumbnail,imageFallback} from '../src/listing-media.js';
import {listingThumbnailFile} from '../server/listing-thumbnails.js';

test('listing sources preserve product identity and never return full-size URLs',()=>{
 assert.equal(listingThumbnail({image:'/uploads/ring.jpg'}),'/uploads/thumbs/ring.jpg.webp');
 assert.equal(listingThumbnail({image:'/assets/products-100/ring.webp'}),'/assets/products-100/ring-thumb.webp');
 assert.equal(listingThumbnail({image:'/assets/coin-art/floral-silver-10g-v1.png'}),'/assets/coin-art/floral-silver-10g-v1-thumb.webp');
 assert.equal(listingThumbnail({image:'https://example.com/full.jpg'}),'/api/thumbnail?source=https%3A%2F%2Fexample.com%2Ffull.jpg');
 assert.equal(listingThumbnail({}),imageFallback);
 assert.equal(listingThumbnail({thumbnail:'/dedicated-thumb.webp',image:'/full.jpg'}),'/dedicated-thumb.webp');
});
test('local derivatives are bounded, cached, smaller, and reject path escape and arbitrary remote hosts',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'listing-'));try{
 const publicDir=path.join(root,'public'),assets=path.join(publicDir,'assets');await fs.mkdir(assets,{recursive:true});
 const original=await sharp({create:{width:1800,height:2400,channels:3,background:'#ddd'}}).png().toBuffer();await fs.writeFile(path.join(assets,'sample.png'),original);
 const options={publicDir,uploadsDir:root,cacheDir:path.join(root,'cache')};
 const file=await listingThumbnailFile('/assets/sample.png',options);const result=await fs.readFile(file),meta=await sharp(result).metadata();
 assert.equal(meta.width,600);assert.equal(meta.height,800);assert.ok(result.length<original.length);assert.equal(await listingThumbnailFile('/assets/sample.png',options),file);
 await fs.writeFile(path.join(root,'secret.png'),original);await fs.symlink(path.join(root,'secret.png'),path.join(assets,'escape.png'));
 await assert.rejects(listingThumbnailFile('/assets/escape.png',options));
 await assert.rejects(listingThumbnailFile('http://127.0.0.1/secret.png',options));
 await assert.rejects(listingThumbnailFile('https://cdnstatic.tencentcs.com/other.png',options));
 }finally{await fs.rm(root,{recursive:true,force:true})}
});

test('a grid of uncached images queues successfully instead of substituting placeholders',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'listing-grid-'));try{
 const publicDir=path.join(root,'public'),assets=path.join(publicDir,'assets');await fs.mkdir(assets,{recursive:true});
 const original=await sharp({create:{width:900,height:1200,channels:3,background:'#ddd'}}).png().toBuffer();
 const sources=Array.from({length:24},(_,i)=>`/assets/product-${i}.png`);
 await Promise.all(sources.map(source=>fs.writeFile(path.join(publicDir,source),original)));
 const options={publicDir,uploadsDir:root,cacheDir:path.join(root,'cache')};
 const files=await Promise.all(sources.map(source=>listingThumbnailFile(source,options)));
 assert.equal(new Set(files).size,24);
 for(const file of files){const meta=await sharp(file).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,600);assert.equal(meta.height,800)}
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
