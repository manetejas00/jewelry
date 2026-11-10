import {validationError} from './errors.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

sharp.concurrency(1);
sharp.cache({memory:20,files:0,items:30});
const validName=name=>typeof name==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}\.(jpe?g|png|webp|gif|svg)$/i.test(name)&&!name.includes('..');
const pending=new Map();let queue=Promise.resolve();
const enqueue=job=>{const result=queue.then(job);queue=result.catch(()=>{});return result};
export const thumbnailUrl=url=>typeof url==='string'&&/^\/uploads\/[^/?#]+\.(jpe?g|png|webp|gif|svg)$/i.test(url)?'/uploads/thumbs/'+encodeURIComponent(url.slice('/uploads/'.length))+'.webp':null;
export async function thumbnailBuffer(buffer){
 if(!Buffer.isBuffer(buffer)||!buffer.length||buffer.length>8*1024*1024)throw validationError('Choose an image no larger than 8 MB.');
 try{return await sharp(buffer,{limitInputPixels:40000000,failOn:'error',pages:1}).rotate().resize({width:600,height:800,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toBuffer()}
 catch{throw validationError('This image could not be processed. Choose a valid JPG, PNG, WebP, GIF or SVG image.');}
}
async function writeThumbnail(directory,filename,buffer){
 const thumbs=path.join(directory,'thumbs');await fs.mkdir(thumbs,{recursive:true,mode:0o755});await fs.chmod(thumbs,0o755);
 const target=path.join(thumbs,filename+'.webp'),temp=target+'.'+crypto.randomUUID()+'.tmp';
 try{await fs.writeFile(temp,buffer,{mode:0o644,flag:'wx'});await fs.chmod(temp,0o644);await fs.rename(temp,target)}finally{await fs.unlink(temp).catch(()=>{})}
 return target;
}
export async function saveUploadedImage(directory,filename,buffer){
 if(!validName(filename)||/\.svg$/i.test(filename))throw validationError('Upload a raster image: JPG, PNG, WebP or GIF.');
 const metadata=await sharp(buffer,{limitInputPixels:40000000}).metadata().catch(()=>null);
 if(!metadata||!['jpeg','png','webp','gif'].includes(metadata.format))throw validationError('This image could not be processed. Choose a valid JPG, PNG, WebP or GIF image.');
 const small=await enqueue(()=>thumbnailBuffer(buffer));
 await fs.mkdir(directory,{recursive:true,mode:0o755});
 const original=path.join(directory,filename);await fs.writeFile(original,buffer,{mode:0o644,flag:'wx'});
 try{await fs.chmod(original,0o644);await writeThumbnail(directory,filename,small)}catch(e){await fs.unlink(original).catch(()=>{});throw e}
 return {url:'/uploads/'+filename,thumbnail:thumbnailUrl('/uploads/'+filename)};
}
export async function ensureThumbnail(directory,filename){
 if(!validName(filename))throw Object.assign(Error('Image not found'),{status:404});
 const root=await fs.realpath(directory),source=await fs.realpath(path.join(root,filename)).catch(()=>null);
 if(!source||path.dirname(source)!==root)throw Object.assign(Error('Image not found'),{status:404});
 const original=await fs.stat(source);if(original.size>8*1024*1024)throw Object.assign(Error('Image exceeds the thumbnail size limit.'),{status:422});
 const target=path.join(root,'thumbs',filename+'.webp');
 const cached=await fs.stat(target).catch(()=>null);if(cached&&cached.mtimeMs>=original.mtimeMs)return target;
 if(pending.has(source))return pending.get(source);
 if(pending.size>=256)throw Object.assign(Error('Images are busy. Please retry shortly.'),{status:503});
 const job=enqueue(async()=>{const buffer=await fs.readFile(source);const small=await thumbnailBuffer(buffer);return writeThumbnail(root,filename,small)});
 pending.set(source,job);try{return await job}finally{pending.delete(source)}
}
