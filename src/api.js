export async function request(url, body, method, timeoutMs=30000) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
  const res = await fetch('/api' + url, {
    signal:controller.signal,
    method: method || (body ? 'POST' : 'GET'),
    headers: {'Content-Type': 'application/json', 'x-csrf-token': sessionStorage.getItem('csrf') || '', 'x-customer-csrf': sessionStorage.getItem('customer-csrf') || ''},
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  let data;try{data=await res.json()}catch{throw Error('The server returned an unexpected response. Please try again.')}
  if (!res.ok) { const error = Error(data.error || 'Something went wrong'); error.quote = data.quote; error.status = res.status; throw error; }
  return data;
  }catch(e){if(e.name==='AbortError')throw Error('The request timed out. Please try again.');throw e;}finally{clearTimeout(timer)}
}

// Share overlapping catalogue reads from the same epoch. Completed requests are never cached.
// bumpCatalogueReads() starts a new epoch so a refresh after checkout cannot reuse a response that began before stock changed.
let catalogueEpoch = 0;
const pendingCatalogue = new Map();
export function bumpCatalogueReads() {catalogueEpoch += 1;}
export function api(url, body, method) {
  if (body || (method && method !== 'GET') || !['/coins','/products','/offers'].includes(url)) return request(url,body,method);
  const epoch = catalogueEpoch;
  const current = pendingCatalogue.get(url);
  if (current?.epoch === epoch) return current.promise;
  const promise = request(url,body,method).finally(()=>{const latest=pendingCatalogue.get(url);if(latest?.promise===promise)pendingCatalogue.delete(url);});
  pendingCatalogue.set(url,{epoch,promise});
  return promise;
}
