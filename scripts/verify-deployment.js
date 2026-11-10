// Independent acceptance gate: an HTTP 200 containing fallback HTML is a failure for APIs/assets.
const origin=new URL(process.argv[2]||process.env.APP_URL).origin;
const failures=[];
async function read(route,type){try{const res=await fetch(origin+route,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});const body=await res.text();if(!res.ok||!res.headers.get('content-type')?.includes(type))throw Error(`HTTP ${res.status}, ${res.headers.get('content-type')}`);return body;}catch(e){failures.push(route+': '+e.message);return null;}}
for(const route of ['/','/admin','/collections/all']){
 const html=await read(route,'text/html');if(!html)continue;
 const files=[...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)].map(m=>m[1]);
 if(!files.length||files.some(file=>file.startsWith('/src/')))failures.push(route+': missing production build entry');
 for(const file of files){const result=await read(file,file.endsWith('.css')?'text/css':'javascript');if(result?.startsWith('<'))failures.push(file+': returned HTML');}
}
const configText=await read('/api/config','application/json');
if(configText){try{const config=JSON.parse(configText);if(config.preview&&process.argv[3]!=='--allow-preview')failures.push('Preview mode is active');}catch{failures.push('Config returned invalid JSON');}}
for(const route of ['/api/products','/api/coins']){const text=await read(route,'application/json');if(text){try{if(!Array.isArray(JSON.parse(text)))throw Error();}catch{failures.push(route+': invalid catalogue JSON');}}}
console.log(JSON.stringify({origin,passed:failures.length===0,failures},null,2));if(failures.length)process.exitCode=1;
