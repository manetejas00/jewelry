const SHELL = 'veyora-shell-v2-vj';
const THUMBS = 'veyora-thumbs-v2-vj';
const THUMB_TTL = 24 * 60 * 60 * 1000;
const THUMB_LIMIT = 80;
const PRECACHE = ['/assets/brand/logo.webp', '/favicon.png', '/offline.html', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL && key !== THUMBS).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
    return;
  }

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname, {ignoreSearch: true}).then((cached) => cached || fetch(request)));
    return;
  }

  if (isHashedAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  if (isPublicThumb(url.pathname)) {
    event.respondWith(thumb(request));
  }
});

function isHashedAsset(pathname) {
  return /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(pathname);
}

function isPublicThumb(pathname) {
  return pathname.startsWith('/uploads/thumbs/') && /\.(webp|png|jpe?g|avif)$/i.test(pathname);
}

async function navigation(request) {
  try {
    const response = await fetch(request);
    if (response) return response;
  } catch { /* offline or failed navigation */ }
  return (await caches.match('/offline.html')) || new Response('Offline', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic' && !response.headers.get('set-cookie')) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response('', {status: 504});
  }
}

async function thumb(request) {
  const cache = await caches.open(THUMBS);
  const cached = await cache.match(request);
  if (cached && !expired(cached)) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic' && !response.headers.get('set-cookie') && /^image\//.test(response.headers.get('content-type') || '')) {
      const headers = new Headers(response.headers);
      headers.set('x-cached-at', String(Date.now()));
      headers.delete('content-encoding');
      headers.delete('content-length');
      await cache.put(request, new Response(await response.clone().blob(), {status: response.status, headers}));
      await trim(cache, THUMB_LIMIT);
    }
    return response;
  } catch {
    return cached || new Response('', {status: 504});
  }
}

function expired(response) {
  const stamped = Number(response.headers.get('x-cached-at'));
  const date = Number.isFinite(stamped) ? stamped : Date.parse(response.headers.get('date') || '');
  return !Number.isFinite(date) || Date.now() - date > THUMB_TTL;
}

async function trim(cache, limit) {
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}
