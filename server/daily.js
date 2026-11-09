import fs from 'node:fs/promises';
import {loadFeedSettings} from './settings.js';
import {previewImport,publishImport} from './importer.js';
import {now,json} from './db.js';
export async function fetchLiveGoldRates(customUrl='https://api.gold-api.com/price/XAU/INR'){
  const target=(customUrl&&customUrl.startsWith('https://'))?customUrl:'https://api.gold-api.com/price/XAU/INR';
  const res=await fetch(target,{headers:{'Accept':'application/json'},signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error(`Live Gold API returned HTTP ${res.status}`);
  const data=await res.json();
  const price=Number(data.price);
  if(!Number.isFinite(price)||price<=0)throw Error('Invalid gold price received from provider');
  const gram24k=price/31.1034768;
  const rate24k_10g=(gram24k*10).toFixed(2);
  const rate22k_g=(gram24k*(22/24)).toFixed(2);
  const rate18k_g=(gram24k*(18/24)).toFixed(2);
  const rate14k_g=(gram24k*(14/24)).toFixed(2);
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const ts=new Date().toISOString();
  return [
    'supplier,purity,currency,unit,rate,effective_date,source_timestamp',
    `Live Market Rate,24K,INR,10g,${rate24k_10g},${date},${ts}`,
    `Live Market Rate,22K,INR,g,${rate22k_g},${date},${ts}`,
    `Live Market Rate,18K,INR,g,${rate18k_g},${date},${ts}`,
    `Live Market Rate,14K,INR,g,${rate14k_g},${date},${ts}`
  ].join('\n');
}

async function readFeed(kind){
  if(!['gold','products','coins'].includes(kind))throw Error('Unknown feed kind');
  const prefix=kind==='gold'?'GOLD':kind==='coins'?'COIN':'PRODUCT';
  const url=process.env[prefix+'_FEED_URL'];
  if(kind==='coins'&&process.env.COIN_FEED_FILE)return fs.readFile(process.env.COIN_FEED_FILE,'utf8');
  if(kind==='products'&&process.env.PRODUCT_FEED_FILE)return fs.readFile(process.env.PRODUCT_FEED_FILE,'utf8');
  if(!url)throw Error('Supplier source is not configured');
  if(kind==='gold'&&(url==='auto'||url.includes('gold-api.com'))){
    return fetchLiveGoldRates(url);
  }
  if(!url.startsWith('https://'))throw Error('Supplier feed requires HTTPS');
  const token=process.env[prefix+'_FEED_TOKEN'];
  const res=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(30000),redirect:'error'});
  if(!res.ok)throw Error(`Supplier returned HTTP ${res.status}`);
  const text=await res.text();
  if(Buffer.byteLength(text)>5*1024*1024)throw Error('Supplier file exceeds 5 MB');
  return text;
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
