// Read-only public live evidence collection. No credentials, cookies, mutations or private response bodies.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const origin=new URL(process.argv[2]||'https://test3.avinyacarefoundation.org').origin;
const output=process.argv[3]||'artifacts/live-audit';await fs.mkdir(output,{recursive:true});
const observations=[];
async function get(path,{method='GET',range=false}={}){
 const start=performance.now();
 try{const response=await fetch(new URL(path,origin),{method,headers:{'Cache-Control':'no-cache',...(range?{Range:'bytes=0-31'}:{})},signal:AbortSignal.timeout(20000),redirect:'manual'});const body=method==='HEAD'?'':range?await readPrefix(response):await response.text();
 const headers=Object.fromEntries(['content-type','content-length','cache-control','location','strict-transport-security','content-security-policy','x-content-type-options','x-frame-options','referrer-policy','ratelimit-limit','ratelimit-remaining'].map(k=>[k,response.headers.get(k)]));
 const record={path,method,status:response.status,ms:Math.round(performance.now()-start),headers,bytes:Buffer.byteLength(body),sha256:crypto.createHash('sha256').update(body).digest('hex')};observations.push(record);return {record,body};
 }catch(e){const record={path,method,error:e.name,ms:Math.round(performance.now()-start)};observations.push(record);return {record,body:''};}
}
async function readPrefix(response){const reader=response.body.getReader();const first=await reader.read();await reader.cancel();return Buffer.from(first.value||[]).subarray(0,32).toString('utf8')}
async function pool(items,fn,size=4){const queue=[...items];await Promise.all(Array.from({length:size},async()=>{while(queue.length)await fn(queue.shift())}));}
const {body:config}=await get('/api/config');const {body:productsText}=await get('/api/products'),{body:coinsText}=await get('/api/coins');
const products=JSON.parse(productsText),coins=JSON.parse(coinsText);
await fs.writeFile(output+'/public-catalogue.json',JSON.stringify({products,coins}));
const paths=['/','/admin','/account','/bag','/checkout','/coins','/coins/gold','/coins/silver','/collections/all','/collections/pearls','/collections/rings','/collections/earrings','/collections/necklaces','/collections/bracelets','/collections/saved','/information/contact','/information/shipping','/information/care','/not-a-real-page-audit','/products/not-a-real-product-audit','/robots.txt','/sitemap.xml','/health/live','/health/ready','/api/nonexistent-audit','/api/account/orders','/api/admin/session','/api/admin/products','/api/orders/VEY-NONEXISTENT-AUDIT'];
const metadata=[];
await pool(paths,async path=>{const {record,body}=await get(path);if(record.headers?.['content-type']?.includes('html')){
 metadata.push({path,status:record.status,title:body.match(/<title>(.*?)<\/title>/s)?.[1],description:body.match(/<meta name="description" content="([^"]*)"/)?.[1],canonical:body.match(/rel="canonical"[^>]*href="([^"]*)"/)?.[1]||null,og:/property="og:/.test(body),schema:/application\/ld\+json/.test(body),scripts:[...body.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]),styles:[...body.matchAll(/<link[^>]*href="([^"]+\.css)"/g)].map(m=>m[1])});
 if(['/','/admin','/robots.txt','/sitemap.xml'].includes(path))await fs.writeFile(output+'/'+({'/':'home','/admin':'admin','/robots.txt':'robots','/sitemap.xml':'sitemap'}[path])+'.txt',body);
 }});
const productPaths=[...new Set(products.map(p=>'/products/'+encodeURIComponent(p.slug)))];const coinPaths=coins.map(c=>'/coins/product/'+encodeURIComponent(c.sku));
await pool([...productPaths,...coinPaths],async path=>{const {record,body}=await get(path);metadata.push({path,status:record.status,title:body.match(/<title>(.*?)<\/title>/s)?.[1],canonical:/rel="canonical"/.test(body),schema:/application\/ld\+json/.test(body)});});
const assets=[...new Set([...products,...coins].flatMap(p=>[p.image,p.thumbnail,...(p.images||[]).map(i=>i.url)]).filter(u=>u?.startsWith('/')&&!u.startsWith('/api/')).concat(metadata.flatMap(p=>[...(p.scripts||[]),...(p.styles||[])])))];
await pool(assets,async path=>{await get(path,{method:'HEAD'})},6);
// Probe only known sensitive paths. Read at most 32 bytes, never persist or print content.
for(const path of ['/.env','/app/.env','/.git/config','/private/store.sqlite','/app/private/store.sqlite','/server/index.js','/package.json'])await get(path,{range:true});
const report={origin,checkedAt:new Date().toISOString(),config:JSON.parse(config),summary:{products:products.length,styles:productPaths.length,coins:coins.length,pages:metadata.length,assets:assets.length,failedAssets:observations.filter(r=>r.method==='HEAD'&&(r.status!==200||r.headers?.['content-type']?.includes('html'))),errors:observations.filter(r=>r.error)},metadata,observations};
await fs.writeFile(output+'/http-evidence.json',JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,config:report.config},null,2));
