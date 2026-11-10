import React,{useLayoutEffect,useRef} from 'react';
import {listingThumbnail,imageFallback} from './listing-media.js';
export default function ListingImage({product,alt,...props}){
 const ref=useRef(null),src=listingThumbnail(product);
 useLayoutEffect(()=>{
  const image=ref.current;
  // Measure the real viewport so the existing responsive grids need no changes.
  image.loading='lazy';image.fetchPriority='auto';
  const rect=image.getBoundingClientRect();
  if(rect.top<window.innerHeight&&rect.bottom>0){image.loading='eager';image.fetchPriority='high';}
  image.src=src;
 },[src]);
 return <img {...props} ref={ref} loading="lazy" decoding="async" width="600" height="800" alt={alt||product.name} onError={e=>{if(e.currentTarget.getAttribute('src')!==imageFallback)e.currentTarget.src=imageFallback;}}/>;
}
