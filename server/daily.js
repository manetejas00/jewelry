import fs from 'node:fs/promises';
import {loadFeedSettings} from './settings.js';
import {previewImport,publishImport} from './importer.js';
import {now,json} from './db.js';

async function readFeed(kind){
  if(kind==='gold'){
    const url=process.env.GOLD_FEED_URL;
    if(!url)throw Error('Supplier source is not configured');
    if(url==='auto'||url.includes('api.gold-api.com')){
      throw Error('External live gold pricing APIs have been removed. Metal rates are managed exclusively in Admin Panel.');
    }
    if(!url.startsWith('https://'))throw Error('Supplier feed requires HTTPS');
    const token=process.env.GOLD_FEED_TOKEN;
    const res=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(30000),redirect:'error'});
    if(!res.ok)throw Error(`Supplier returned HTTP ${res.status}`);
    const chunks=[];let size=0;for await(const chunk of res.body){size+=chunk.length;if(size>5*1024*1024)throw Error('Supplier file exceeds 5 MB');chunks.push(chunk)}
    return Buffer.concat(chunks).toString('utf8');
  }
  if(!['products','coins'].includes(kind))throw Error('Unknown feed kind');
  const prefix=kind==='coins'?'COIN':'PRODUCT';
  const url=process.env[prefix+'_FEED_URL'];
  if(kind==='coins'&&process.env.COIN_FEED_FILE)return fs.readFile(process.env.COIN_FEED_FILE,'utf8');
  if(kind==='products'&&process.env.PRODUCT_FEED_FILE)return fs.readFile(process.env.PRODUCT_FEED_FILE,'utf8');
  if(!url)throw Error('Supplier source is not configured');
  if(!url.startsWith('https://'))throw Error('Supplier feed requires HTTPS');
  const token=process.env[prefix+'_FEED_TOKEN'];
  const res=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(30000),redirect:'error'});
  if(!res.ok)throw Error(`Supplier returned HTTP ${res.status}`);
  const chunks=[];let size=0;for await(const chunk of res.body){size+=chunk.length;if(size>5*1024*1024)throw Error('Supplier file exceeds 5 MB');chunks.push(chunk)}
  return Buffer.concat(chunks).toString('utf8');
}
export async function daily(k,trigger='manual',only=null,staff=null){
 await loadFeedSettings(k);
 if(process.env.FEED_STATUS==='stopped'){
   if(trigger==='scheduled'){
     const started_at=now();
     const [id]=await k('daily_runs').insert({started_at,trigger,result:json({message:'Daily feed skipped because feed automation is stopped in Settings'}),finished_at:now()});
     return {id,started_at,result:{message:'Feed automation is stopped'}};
   }
   throw Error('Feed automation is currently STOPPED in Admin Settings. Please start the feed in Settings before running.');
 }
 const targets=(only?[only]:['gold','products',...(process.env.COIN_FEED_URL||process.env.COIN_FEED_FILE?['coins']:[])]).filter(kind=>{
   if(kind==='coins'&&process.env.COIN_FEED_ENABLED==='false')return false;
   if(kind==='gold'&&process.env.GOLD_FEED_ENABLED==='false')return false;
   if(kind==='products'&&process.env.PRODUCT_FEED_ENABLED==='false')return false;
   return true;
 });
 if(!targets.length){
   throw Error('All selected feeds are currently disabled in Settings.');
 }
 try{await k('import_locks').insert({name:'daily',acquired_at:now()});}catch{throw Error('A daily workflow is already running');}
 const started_at=now();const [id]=await k('daily_runs').insert({started_at,trigger,result:'{}'});const result={};
 try{for(const kind of targets){try{const b=await previewImport(k,kind,await readFeed(kind),staff);if(b.errors.length){const error=Error(`Validation failed in batch ${b.id}`);error.summary=b.summary;error.batch=b.id;throw error;}result[kind]={ok:true,batch:b.id,source_date:b.source_timestamp,...await publishImport(k,b.id,staff)};}catch(e){result[kind]={ok:false,created:0,updated:0,unchanged:0,rejected:e.summary?.rejected||0,batch:e.batch||null,message:e.message.replace(/https?:\/\/\S+/g,'[redacted]')};}}
 await k('daily_runs').where({id}).update({finished_at:now(),result:json(result)});return {id,started_at,result};}finally{await k('import_locks').where({name:'daily'}).del();}
}
