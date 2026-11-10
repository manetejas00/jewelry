const coinFiles=new Set(['lakshmi-gold-1g-v1','lakshmi-ganesh-gold-5g-v1','royal-emblem-gold-10g-v1','floral-silver-10g-v1','lakshmi-ganesh-silver-50g-v1','cast-bar-silver-100g-v1']);
// Existing CSV/image references stay valid; cards download the smaller catalogue copy.
export function coinImage(url,thumbnail=false){
 if(thumbnail&&typeof url==='string'&&/^\/assets\/products-100\/[a-z0-9-]+\.webp$/.test(url)&&!url.endsWith('-thumb.webp'))return url.replace('.webp','-thumb.webp');
 const match=typeof url==='string'&&url.match(/^\/assets\/coin-art\/([^/]+)\.png$/);
 return match&&coinFiles.has(match[1])?`/assets/coin-art/${match[1]}${thumbnail?'-thumb':''}.webp`:url;
}
