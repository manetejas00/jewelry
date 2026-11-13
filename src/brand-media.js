export const brandLogo='/assets/brand/logo.webp';
export function brandedImageSource(source) {
 if(typeof source!=='string'||!source.trim())return brandLogo;
 if(source===brandLogo||source.startsWith('/assets/brand/')||source.startsWith('/api/brand-image?')||source==='/assets/product-placeholder.svg')return source;
 return '/api/brand-image?source='+encodeURIComponent(source);
}
