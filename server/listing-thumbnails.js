import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {thumbnailBuffer} from './thumbnails.js';

const pending=new Map();
const waiting=[];let active=0;
async function runLimited(job){
 if(active>=4)await new Promise(resolve=>waiting.push(resolve));
 else active++;
 try{return await job()}finally{
  const next=waiting.shift();if(next)next();else active--;
 }
}
export async function listingThumbnailFile(source,{publicDir,uploadsDir,cacheDir}){
 if(typeof source!=='string'||source.length>2000)throw Error('Invalid image source');
 let local,remote;
 if(source.startsWith('/assets/')){
  const root=await fs.realpath(publicDir);
  local=await fs.realpath(path.join(root,source));
  if(!local.startsWith(root+path.sep))throw Error('Invalid image source');
 }else{
  const url=new URL(source);
  // This is the existing catalogue CDN, not an arbitrary image proxy.
  if(url.origin==='https://cdnstatic.tencentcs.com'&&url.pathname.startsWith('/edgeone/pages/product-activities/jewelry/')&&!url.search&&!url.hash&&!url.username&&!url.password)remote=url;
  else if(url.origin===new URL(process.env.APP_URL||'http://localhost:3000').origin&&/^\/uploads\/[^/]+$/.test(url.pathname)){
   const root=await fs.realpath(uploadsDir);local=await fs.realpath(path.join(root,decodeURIComponent(url.pathname.slice(9))));
   if(path.dirname(local)!==root)throw Error('Invalid image source');
  }else throw Error('Unsupported image source');
 }
 const version=local?(await fs.stat(local)).mtimeMs:'remote';
 const key=crypto.createHash('sha256').update(source+':'+version).digest('hex');
 const target=path.join(cacheDir,key+'.webp');
 const cached=await fs.stat(target).catch(()=>null);
 if(cached&&(!remote||Date.now()-cached.mtimeMs<86400000))return target;
 if(pending.has(key))return pending.get(key);
 if(pending.size>=256)throw Error('Images are busy');
 const job=runLimited(async()=>{
  let buffer;
  if(local){if((await fs.stat(local)).size>8*1024*1024)throw Error('Image too large');buffer=await fs.readFile(local);}
  else{
   const response=await fetch(remote,{redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Image unavailable');
   const chunks=[];let size=0;
   for await(const chunk of response.body){size+=chunk.length;if(size>8*1024*1024)throw Error('Image too large');chunks.push(chunk)}
   buffer=Buffer.concat(chunks);
  }
  const small=await thumbnailBuffer(buffer);await fs.mkdir(cacheDir,{recursive:true});
  const temp=target+'.'+crypto.randomUUID()+'.tmp';
  try{await fs.writeFile(temp,small);await fs.rename(temp,target)}finally{await fs.unlink(temp).catch(()=>{})}
  return target;
 });
 pending.set(key,job);try{return await job}finally{pending.delete(key)}
}
