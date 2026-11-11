export async function request(url, body, method, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api' + url, {
      signal: controller.signal,
      method: method || (body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('csrf') : '') || '',
        'x-customer-csrf': (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('customer-csrf') : '') || ''
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw Error('The server returned an unexpected response. Please try again.');
    }
    if (!res.ok) {
      const error = Error(data.error || 'Something went wrong');
      error.quote = data.quote;
      error.status = res.status;
      if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-expired', { detail: { status: res.status, url } }));
      }
      throw error;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw Error('The request timed out. Please try again.');
    if (e instanceof TypeError && (e.message.includes('fetch') || e.message.includes('NetworkError') || e.message.includes('Load failed'))) {
      throw Error('Unable to connect to the server. Please check your internet connection and try again.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Share overlapping catalogue reads; completed requests are never cached, so prices stay fresh.
const pendingCatalogue = new Map();
export function api(url, body, method) {
  if (body || (method && method !== 'GET') || !['/coins', '/products', '/offers'].includes(url)) return request(url, body, method);
  if (pendingCatalogue.has(url)) return pendingCatalogue.get(url);
  const pending = request(url, body, method).finally(() => pendingCatalogue.delete(url));
  pendingCatalogue.set(url, pending);
  return pending;
}
