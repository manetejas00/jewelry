import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
const blocked=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(address,prefix,'ipv4');
const globalV6=new BlockList();globalV6.addSubnet('2000::',3,'ipv6');
blocked.addSubnet('2001::',23,'ipv6');blocked.addSubnet('2001:db8::',32,'ipv6');blocked.addSubnet('2002::',16,'ipv6');
export function isPublicImageAddress(address){const family=isIP(address);return family===4?!blocked.check(address,'ipv4'):family===6&&globalV6.check(address,'ipv6')&&!blocked.check(address,'ipv6');}
export async function publicImageBuffer(value){
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw Error('Unsupported image URL');
 const hostname=url.hostname.replace(/^\[|\]$/g,'');
 const addresses=isIP(hostname)?[{address:hostname,family:isIP(hostname)}]:await lookup(hostname,{all:true});
 if(!addresses.length||addresses.some(row=>!isPublicImageAddress(row.address)))throw Error('Unsupported image address');
 const pinned=addresses[0];
 return new Promise((resolve,reject)=>{
  // Pin the validated address so DNS cannot change between validation and connection.
  const request=https.get(url,{agent:false,signal:AbortSignal.timeout(10000),lookup:(_host,options,callback)=>options?.all?callback(null,[pinned]):callback(null,pinned.address,pinned.family)},response=>{
   if(response.statusCode!==200){response.resume();reject(Error('Image unavailable'));return;}
   const chunks=[];let size=0;
   response.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024){response.destroy(Error('Image too large'));return;}chunks.push(chunk)});
   response.on('end',()=>resolve(Buffer.concat(chunks)));response.on('error',reject);
  });
  request.on('error',reject);
 });
}
