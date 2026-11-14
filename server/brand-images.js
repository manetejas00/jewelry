import {publicImageBuffer} from './public-image.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {listingThumbnailFile} from './listing-thumbnails.js';
import {ensureThumbnail} from './thumbnails.js';
const pending=new Map();let queue=Promise.resolve();
export async function brandedImageFile(source,{publicDir,uploadsDir,cacheDir,publicMediaDir=process.env.PUBLIC_MEDIA_DIR||path.resolve('../public_html'),fetchImpl=fetch}){
 if(typeof source!=='string'||source.length>2000||source.includes('..'))throw Error('Invalid image');
 const logo=path.join(publicDir,'assets/brand/logo.webp');
 let local,remote;
 if(source.startsWith('/api/thumbnail?')){
  local=await listingThumbnailFile(new URL(source,'https://local.invalid').searchParams.get('source'),{publicDir,uploadsDir,cacheDir:path.join(cacheDir,'thumbs')});
 }else if(source.startsWith('/uploads/thumbs/')){
  const filename=decodeURIComponent(source.slice('/uploads/thumbs/'.length)).replace(/\.webp$/,'');
  for(const directory of [uploadsDir,path.join(publicMediaDir,'uploads')]){
   try{local=await ensureThumbnail(directory,filename);break}catch{}
  }
 }else if(source.startsWith('/assets/')||source.startsWith('/uploads/')){
  const upload=source.startsWith('/uploads/');
  if(!/\.(png|jpe?g|webp|gif|svg)$/i.test(source))throw Error('Invalid image');
  for(const directory of upload?[uploadsDir,path.join(publicMediaDir,'uploads')]:[publicDir,publicMediaDir]){
   const root=await fs.realpath(directory).catch(()=>null);if(!root)continue;
   const file=await fs.realpath(path.join(root,upload?source.slice(9):source)).catch(()=>null);
   if(!file)continue;
   if(!file.startsWith(root+path.sep))throw Error('Invalid image');
   local=file;break;
  }
 }else{
  const url=new URL(source);
  if(url.origin===new URL(process.env.APP_URL||'http://localhost:3000').origin)return brandedImageFile(url.pathname,{publicDir,uploadsDir,cacheDir,publicMediaDir,fetchImpl});
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Unsupported image source');
  remote=url.href;
 }
 // Older installations serve their uploads directly through LiteSpeed, outside the app tree.
 // Read that public static URL when neither configured storage location contains the image.
 if(!local&&!remote&&/^\/(assets|uploads)\//.test(source)){
  const origin=new URL(process.env.APP_URL||'http://localhost:3000');
  if(origin.protocol!=='https:')throw Error('Image unavailable');
  remote=new URL(source,origin.origin).href;
 }
 if(local===await fs.realpath(logo))return logo;
 const version=local?(await fs.stat(local)).mtimeMs:'remote';
 const key=crypto.createHash('sha256').update(`${source}:${version}:${(await fs.stat(logo)).mtimeMs}`).digest('hex'),target=path.join(cacheDir,key+'.webp');
 const cached=await fs.stat(target).catch(()=>null);if(cached&&(!remote||Date.now()-cached.mtimeMs<86400000))return target;
 if(pending.has(key))return pending.get(key);if(pending.size>=256)throw Error('Images are busy');
 const job=queue.then(async()=>{
  let buffer;
  if(local){if((await fs.stat(local)).size>8*1024*1024)throw Error('Image too large');buffer=await fs.readFile(local)}
  else if(!remote.startsWith('https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/'))buffer=await publicImageBuffer(remote);
  else{
   const response=await fetchImpl(remote,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Image unavailable');
   const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>8*1024*1024)throw Error('Image too large');chunks.push(chunk)}buffer=Buffer.concat(chunks);
  }
  const base=await sharp(buffer,{limitInputPixels:40000000,pages:1}).rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).toBuffer();
  const output=await sharp(base).webp({quality:86}).toBuffer();
  await fs.mkdir(cacheDir,{recursive:true});const temp=target+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(temp,output);await fs.rename(temp,target)}finally{await fs.unlink(temp).catch(()=>{})}return target;
 });
 queue=job.catch(()=>{});pending.set(key,job);try{return await job}finally{pending.delete(key)}
}
export function registerBrandImages(app,{publicDir,uploadsDir,cacheDir}){
 app.get('/api/brand-image',async(req,res)=>{try{const file=await brandedImageFile(req.query.source,{publicDir,uploadsDir,cacheDir});res.set('Cache-Control','public, max-age=86400').type('webp').sendFile(file)}catch{res.set('Cache-Control','no-store').type('webp').sendFile(path.join(publicDir,'assets/brand/fallback.webp'))}});
}
