export async function api(url, body, method) {
  const res = await fetch('/api' + url, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {'Content-Type': 'application/json', 'x-csrf-token': sessionStorage.getItem('csrf') || '', 'x-customer-csrf': sessionStorage.getItem('customer-csrf') || ''},
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  const data = await res.json();
  if (!res.ok) { const error = Error(data.error || 'Something went wrong'); error.quote = data.quote; error.status = res.status; throw error; }
  return data;
}
