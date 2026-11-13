import React,{forwardRef,useState} from 'react';
import {brandLogo,brandedImageSource} from './brand-media.js';
const BrandedImage=forwardRef(function BrandedImage({src,onError,className='',...props},ref){
 const [failed,setFailed]=useState(null);
 const fallback=typeof src!=='string'||!src.trim()||src===brandLogo||src==='/assets/product-placeholder.svg'||failed===src;
 return <img {...props} ref={ref} className={`${className}${fallback?' is-brand-fallback':''}`} src={fallback?brandLogo:brandedImageSource(src)} onError={event=>{if(event.currentTarget.getAttribute('src')!==brandLogo)setFailed(src);else onError?.(event)}}/>;
});
export default BrandedImage;
