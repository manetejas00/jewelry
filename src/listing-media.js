import {coinImage} from './media.js';
export const imageFallback='/assets/product-placeholder.svg';
// Only use derivatives in cards. Unsupported sources never fall back to full size.
export function listingThumbnail(product){
 if(product.thumbnail)return product.thumbnail;
 const source=product.image;
 if(!source)return imageFallback;
 const mapped=coinImage(source,true);
 if(mapped!==source||String(source).endsWith('-thumb.webp'))return mapped;
 return '/api/thumbnail?source='+encodeURIComponent(source);
}
