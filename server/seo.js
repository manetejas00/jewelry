import {catalogue,coinCatalogue} from './pricing.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const origin=()=>new URL(process.env.APP_URL||'http://localhost:3000').origin;
export async function pageMetadata(k,pathname){
 const brand=process.env.BRAND_NAME||'Veyora Jewels';
 let title=brand+' — Objects of quiet beauty',description='Discover jewellery and gold and silver coins from '+brand+'.',status=200,indexable=true,image,product;
 if(pathname.startsWith('/products/'))product=(await catalogue(k)).find(p=>p.slug===decodeURIComponent(pathname.slice(10)));
 else if(pathname.startsWith('/coins/product/'))product=(await coinCatalogue(k)).find(p=>p.sku===decodeURIComponent(pathname.slice(15)));
 const labels={'/':'','/collections/all':'All jewellery','/collections/pearls':'The Pearl Edit','/collections/rings':'Rings','/collections/earrings':'Earrings','/collections/necklaces':'Necklaces','/collections/bracelets':'Bracelets','/coins':'Gold & silver coins','/coins/gold':'Gold coins','/coins/silver':'Silver coins','/information/shipping':'Shipping information','/information/care':'Jewellery care','/information/returns':'Returns information','/information/contact':'Contact','/information/about':'About Veyora','/information/privacy':'Privacy policy','/information/terms':'Terms and conditions'};
 if(product){title=product.name+' | '+brand;description=String(product.description||product.name).slice(0,160);image=product.image;}
 else if(pathname==='/collections/saved'){title='Your saved pieces | '+brand;indexable=false;}
 else if(pathname in labels){if(labels[pathname])title=labels[pathname]+' | '+brand;}
 else if(/^\/(account|admin|bag|checkout|order)(\/|$)/.test(pathname)){title='Your account and orders | '+brand;indexable=false;}
 else{title='Page not found | '+brand;indexable=false;status=404;}
 return {title,description,status,indexable:indexable&&process.env.NODE_ENV==='production'&&process.env.MERCHANT_READY==='true',url:origin()+pathname,image,product};
}
export function renderMetadata(html,meta){
 const tags=[`<link rel="canonical" href="${escape(meta.url)}">`,`<meta name="robots" content="${meta.indexable?'index,follow':'noindex,nofollow'}">`,`<meta property="og:type" content="${meta.product?'product':'website'}">`,...['title','description','url','image'].filter(key=>meta[key]).map(key=>`<meta property="og:${key}" content="${escape(key==='image'?new URL(meta[key],origin()).href:meta[key])}">`),'<meta name="twitter:card" content="summary_large_image">'];
 if(meta.product){const p=meta.product;const schema={'@context':'https://schema.org','@type':'Product',name:p.name,description:meta.description,sku:p.sku,image:meta.image?new URL(meta.image,origin()).href:undefined,url:meta.url};if(Number.isFinite(p.price))schema.offers={'@type':'Offer',priceCurrency:'INR',price:p.price,url:meta.url,availability:'https://schema.org/'+(p.checkout_available?'InStock':'OutOfStock')};tags.push(`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`);}
 return html.replace(/<title>.*?<\/title>/s,`<title>${escape(meta.title)}</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(meta.description)}">`).replace('</head>',tags.join('')+'</head>');
}
export function registerSeo(app,k,{preview,route}){
 app.get('/robots.txt',(req,res)=>res.type('text/plain').send(preview||process.env.MERCHANT_READY!=='true'?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /bag\nDisallow: /order/\nSitemap: ${origin()}/sitemap.xml\n`));
 app.get('/sitemap.xml',route(async(req,res)=>{const products=await catalogue(k),coins=await coinCatalogue(k);const paths=['/','/collections/all','/collections/rings','/collections/earrings','/collections/necklaces','/collections/bracelets','/coins',...products.map(p=>'/products/'+encodeURIComponent(p.slug)),...coins.map(c=>'/coins/product/'+encodeURIComponent(c.sku))];res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(p=>'<url><loc>'+escape(origin()+p)+'</loc></url>').join('')}</urlset>`);}));
}
