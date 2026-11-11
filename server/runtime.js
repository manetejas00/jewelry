// Validate before opening the database or serving public traffic.
export function validateRuntime(env=process.env) {
 if(env.NODE_ENV!=='production')return;
 if(env.ALLOW_PREVIEW==='true')return;
 if(env.PREVIEW_MODE!=='false')throw Error('Production requires PREVIEW_MODE=false');
 if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32||/replace|preview/i.test(env.SESSION_SECRET))throw Error('Production requires a strong SESSION_SECRET');
 let url;try{url=new URL(env.APP_URL)}catch{throw Error('Production requires an HTTPS APP_URL')}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||['localhost','127.0.0.1'].includes(url.hostname))throw Error('Production requires an HTTPS APP_URL origin');
 if(env.COOKIE_SECURE==='false')throw Error('Production requires secure cookies');
 if(env.DB_CLIENT!=='mysql2')throw Error('Production requires DB_CLIENT=mysql2');
 for(const key of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD'])if(!env[key]||env[key].startsWith('replace_'))throw Error(`Production requires ${key}`);
 if(!['disabled','cod'].includes(env.PAYMENT_MODE||'disabled'))throw Error('Unsupported production PAYMENT_MODE: configure disabled or cod; no online gateway is installed');
 for(const key of ['SHIPPING_INR','FREE_SHIPPING_INR'])if(env[key]!==undefined&&(!Number.isFinite(Number(env[key]))||Number(env[key])<0))throw Error(`Invalid ${key}`);
 if(env.TRUST_PROXY!==undefined&&!/^[0-5]$/.test(env.TRUST_PROXY))throw Error('TRUST_PROXY must be the verified proxy hop count, 0 to 5');
}
export function commerceConfig(env=process.env,preview=false) {
 const merchantReady=env.MERCHANT_READY==='true'&&(/^\S+@\S+\.\S+$/.test(env.MERCHANT_EMAIL||'')&&!/\.(local|invalid|example)$/i.test(env.MERCHANT_EMAIL||''))&&Boolean(env.SHIPPING_POLICY?.trim()&&env.RETURNS_POLICY?.trim());
 const paymentMode=preview?'cod':(env.PAYMENT_MODE||'disabled');
 return {merchantReady,paymentMode,checkoutEnabled:preview||(merchantReady&&paymentMode==='cod')};
}
