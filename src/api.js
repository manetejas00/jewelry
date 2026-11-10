async function request(url, body, method) {
  const res = await fetch('/api' + url, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {'Content-Type': 'application/json', 'x-csrf-token': sessionStorage.getItem('csrf') || '', 'x-customer-csrf': sessionStorage.getItem('customer-csrf') || ''},
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  const data = await res.json();
  if (!res.ok) { const error = Error(data.error || 'Something went wrong'); error.quote = data.quote; error.status = res.status; throw error; }
  return data;
}

// Share overlapping catalogue reads; completed requests are never cached, so prices stay fresh.
const pendingCatalogue = new Map();
export function api(url, body, method) {
  if (body || (method && method !== 'GET') || !['/coins','/products','/offers'].includes(url)) return request(url,body,method);
  if (pendingCatalogue.has(url)) return pendingCatalogue.get(url);
  const pending = request(url,body,method).finally(()=>pendingCatalogue.delete(url));
  pendingCatalogue.set(url,pending);
  return pending;
}
