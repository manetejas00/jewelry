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

// Share overlapping reads across the application to prevent duplicate concurrent network calls.
// Completed requests for catalogue items stay bounded by catalogueEpoch.
let catalogueEpoch = 0;
const inFlightRequests = new Map();
export function bumpCatalogueReads() {
  catalogueEpoch += 1;
}

export function api(url, body, method) {
  if (body || (method && method !== 'GET')) {
    return request(url, body, method);
  }

  const isCatalogue = ['/coins', '/products', '/offers', '/categories'].includes(url);
  const cacheKey = isCatalogue ? `${url}?epoch=${catalogueEpoch}` : url;

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = request(url, body, method).finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}
