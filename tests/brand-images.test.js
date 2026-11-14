import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {brandedImageFile} from '../server/brand-images.js';
import {brandedImageSource,brandLogo} from '../src/brand-media.js';
let root,options;
before(async()=>{root=await fs.mkdtemp(path.join(os.tmpdir(),'veyora-brand-'));const publicDir=path.join(root,'public'),uploadsDir=path.join(root,'uploads');await fs.mkdir(path.join(publicDir,'assets/brand'),{recursive:true});await fs.mkdir(uploadsDir);await fs.copyFile('public/assets/brand/logo.webp',path.join(publicDir,'assets/brand/logo.webp'));await sharp({create:{width:600,height:800,channels:3,background:'#eeeeee'}}).webp().toFile(path.join(publicDir,'assets/photo.webp'));options={publicDir,uploadsDir,cacheDir:path.join(root,'cache'),publicMediaDir:path.join(root,'legacy')};});
after(async()=>{await fs.rm(root,{recursive:true,force:true})});
test('image URLs are branded once while logos and missing images use the approved logo',()=>{assert.equal(brandedImageSource(null),brandLogo);assert.equal(brandedImageSource(brandLogo),brandLogo);const url=brandedImageSource('/assets/photo.webp');assert.equal(brandedImageSource(url),url);assert.equal(new URL(url,'https://local.invalid').searchParams.get('source'),'/assets/photo.webp')});
test('clean branded image derivatives preserve originals and dimensions and reuse the same cached file',async()=>{const original=await fs.readFile(path.join(options.publicDir,'assets/photo.webp'));const [a,b]=await Promise.all([brandedImageFile('/assets/photo.webp',options),brandedImageFile('/assets/photo.webp',options)]);assert.equal(a,b);const output=await fs.readFile(a);assert.notDeepEqual(output,original);assert.deepEqual(await fs.readFile(path.join(options.publicDir,'assets/photo.webp')),original);const meta=await sharp(output).metadata();assert.equal(meta.width,600);assert.equal(meta.height,800);assert.equal(await brandedImageFile('/assets/photo.webp',options),a)});
test('path traversal, symlink escape and private URL fetching are rejected',async()=>{await assert.rejects(brandedImageFile('/assets/../secret.png',options));let fetched=false;await assert.rejects(brandedImageFile('https://127.0.0.1/private.png',{...options,fetchImpl:async()=>{fetched=true}}));assert.equal(fetched,false);await fs.copyFile(path.join(options.publicDir,'assets/photo.webp'),path.join(options.uploadsDir,'outside.webp'));await fs.symlink(path.join(root,'uploads'),path.join(options.publicDir,'assets/escape'));await assert.rejects(brandedImageFile('/assets/escape/outside.webp',options))});
test('hosting static media and uploads resolve outside the app tree, including thumbnail derivatives',async()=>{
 await fs.mkdir(path.join(options.publicMediaDir,'assets'),{recursive:true});
 await sharp({create:{width:40,height:10,channels:3,background:'#eeeeee'}}).png().toFile(path.join(options.publicMediaDir,'assets/tiny.png'));
 const output=await brandedImageFile('/assets/tiny.png',options);assert.equal((await sharp(output).metadata()).height,10);
 const legacyUploads=path.join(options.publicMediaDir,'uploads');await fs.mkdir(legacyUploads,{recursive:true});
 await fs.copyFile(path.join(options.publicDir,'assets/photo.webp'),path.join(legacyUploads,'hosted.webp'));
 for(const source of ['/uploads/hosted.webp','/uploads/thumbs/hosted.webp.webp']){
  const file=await brandedImageFile(source,options);assert.ok(file.startsWith(options.cacheDir));
  const meta=await sharp(file).metadata();assert.equal(meta.width,600);assert.equal(meta.height,800);
 }
});
test('external image address validation excludes loopback, private, link-local, mapped and transition addresses',async()=>{const {isPublicImageAddress}=await import('../server/public-image.js');for(const address of ['127.0.0.1','10.0.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2002:7f00:1::'])assert.equal(isPublicImageAddress(address),false,address);assert.equal(isPublicImageAddress('8.8.8.8'),true);assert.equal(isPublicImageAddress('2606:4700:4700::1111'),true)});
