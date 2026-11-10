const coinFiles=new Set(['lakshmi-gold-1g-v1','lakshmi-ganesh-gold-5g-v1','royal-emblem-gold-10g-v1','floral-silver-10g-v1','lakshmi-ganesh-silver-50g-v1','cast-bar-silver-100g-v1']);
// Existing CSV/image references stay valid; cards download the smaller catalogue copy.
export function coinImage(url,thumbnail=false){
 if(thumbnail&&typeof url==='string'&&/^\/assets\/(products|coins)\/[^/]+\/[a-z0-9-]+\.webp$/.test(url)&&!url.endsWith('-thumb.webp'))return url.replace('.webp','-thumb.webp');
 if(thumbnail&&typeof url==='string'&&/^\/assets\/products-100\/[a-z0-9-]+\.webp$/.test(url)&&!url.endsWith('-thumb.webp'))return url.replace('.webp','-thumb.webp');
 if(thumbnail){const uploaded=uploadThumbnail(url);if(uploaded)return uploaded;}
 const match=typeof url==='string'&&url.match(/^\/assets\/coin-art\/([^/]+)\.png$/);
 return match&&coinFiles.has(match[1])?`/assets/coin-art/${match[1]}${thumbnail?'-thumb':''}.webp`:url;
}

export function uploadThumbnail(url,origin=typeof window==='undefined'?null:window.location.origin){
 if(typeof url!=='string')return null;let local=url;
 if(/^https?:\/\//i.test(url)){try{const parsed=new URL(url);if(!origin||parsed.origin!==origin)return null;local=parsed.pathname}catch{return null}}
 return /^\/uploads\/[^/?#]+\.(jpe?g|png|webp|gif|svg)$/i.test(local)?'/uploads/thumbs/'+encodeURIComponent(local.slice('/uploads/'.length))+'.webp':null;
}
