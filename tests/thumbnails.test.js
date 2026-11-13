import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {thumbnailBuffer,saveUploadedImage,ensureThumbnail,thumbnailUrl} from '../server/thumbnails.js';
import {coinImage,uploadThumbnail} from '../src/media.js';

test('uploaded hero retains its original bytes and gets a smaller uncropped WebP thumbnail',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'veyora-thumb-'));try{
 const original=await sharp({create:{width:1200,height:1800,channels:4,background:{r:222,g:211,b:194,alpha:.5}}}).png().toBuffer();
 const result=await saveUploadedImage(dir,'hero.png',original);assert.equal(result.url,'/uploads/hero.png');assert.equal(result.thumbnail,'/uploads/thumbs/hero.png.webp');assert.deepEqual(await fs.readFile(path.join(dir,'hero.png')),original);
 const thumbnail=await sharp(await fs.readFile(path.join(dir,'thumbs/hero.png.webp'))).metadata();assert.equal(thumbnail.format,'webp');assert.equal(thumbnail.width,533);assert.equal(thumbnail.height,800);assert.ok(thumbnail.hasAlpha);
 assert.equal(coinImage(result.url,true),result.thumbnail);assert.equal(coinImage(result.url),result.url);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('landscape thumbnails preserve ratio and small images are never enlarged',async()=>{
 for(const [width,height,expectedWidth,expectedHeight]of [[1600,800,600,300],[80,40,80,40]]){
 const original=await sharp({create:{width,height,channels:3,background:'#ded3c2'}}).jpeg().toBuffer();const meta=await sharp(await thumbnailBuffer(original)).metadata();assert.equal(meta.width,expectedWidth);assert.equal(meta.height,expectedHeight);
 }
});
test('existing hero thumbnails are generated lazily once, and invalid names or data are rejected',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'veyora-thumb-'));try{
 const original=await sharp({create:{width:900,height:1200,channels:3,background:'#ded3c2'}}).png().toBuffer();await fs.writeFile(path.join(dir,'old.png'),original);
 const [one,two]=await Promise.all([ensureThumbnail(dir,'old.png'),ensureThumbnail(dir,'old.png')]);assert.equal(one,two);const before=(await fs.stat(one)).mtimeMs;await ensureThumbnail(dir,'old.png');assert.equal((await fs.stat(one)).mtimeMs,before);
 await assert.rejects(ensureThumbnail(dir,'../old.png'),e=>e.status===404);await assert.rejects(ensureThumbnail(dir,'missing.png'),e=>e.status===404);
 await assert.rejects(saveUploadedImage(dir,'bad.png',Buffer.from('not an image')),/could not be processed/);assert.equal(await fs.stat(path.join(dir,'bad.png')).catch(()=>null),null);
 assert.equal(thumbnailUrl('https://external.test/image.jpg'),null);
 assert.equal(uploadThumbnail('https://test3.avinyacarefoundation.org/uploads/hero.jpg','https://test3.avinyacarefoundation.org'),'/uploads/thumbs/hero.jpg.webp');
 assert.equal(uploadThumbnail('https://external.test/uploads/hero.jpg','https://test3.avinyacarefoundation.org'),null);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('a webp upload can be thumbnailed from the short route name',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'veyora-thumb-'));try{
 const original=await sharp({create:{width:40,height:40,channels:3,background:'red'}}).webp().toBuffer();
 await fs.writeFile(path.join(dir,'hero.webp'),original);
 const file=await ensureThumbnail(dir,'hero');
 assert.equal(path.basename(file),'hero.webp.webp');
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('phone photo orientation is applied to the thumbnail while the original remains untouched',async()=>{
 const original=await sharp({create:{width:1400,height:900,channels:3,background:'#ded3c2'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const meta=await sharp(await thumbnailBuffer(original)).metadata();assert.equal(meta.height,800);assert.equal(meta.width,514);assert.equal(meta.orientation,undefined);
});
