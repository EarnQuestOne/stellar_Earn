const SW_VERSION = 'v1.0.1';
const CACHE_PREFIX = 'stellar-earn';

// Cache names
const STATIC_CACHE = `${CACHE_PREFIX}-static-${SW_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-${SW_VERSION}`;

// Essential static assets to cache on install
const STATIC_ASSETS = ['/', '/manifest.json', '/favicon.ico'];

// Install Event - Cache initial static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log(
        `[Service Worker] Caching Static Assets (Version: ${SW_VERSION})`
      );
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event - Clean up old caches (Versioning Strategy)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Only delete caches that belong to this app but don't match the current version
            if (
              cacheName.startsWith(CACHE_PREFIX) &&
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE
            ) {
              console.log(`[Service Worker] Clearing old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Cache Strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and unsupported protocols (like chrome-extension://)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          return new Response(
            JSON.stringify({
              message:
                'Unable to connect to the server. The API may be unreachable.',
              code: 'ERR_NETWORK',
              error: 'Service Unavailable',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
      );
    })
  );
});
