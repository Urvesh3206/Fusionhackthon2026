// ResQGrid AI — Service Worker for full PWA Offline Support
// This file caches the entire app shell so it runs without any network.

const CACHE_NAME = 'resqgrid-offline-v2';
const TILE_CACHE = 'resqgrid-map-tiles-v1';

// Core app shell files to pre-cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  console.log('[ResQGrid SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ResQGrid SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[ResQGrid SW] Some shell files failed to cache (normal in dev):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ResQGrid SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== TILE_CACHE)
          .map((name) => {
            console.log('[ResQGrid SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first with cache fallback strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Strategy 1: Cache map tiles aggressively (they rarely change)
  if (url.hostname.includes('tile') || 
      url.hostname.includes('basemaps') ||
      url.hostname.includes('openstreetmap') ||
      url.pathname.includes('/tile/')) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => {
            // Return a simple gray tile placeholder when fully offline
            return new Response('', { status: 200, headers: { 'Content-Type': 'image/png' } });
          });
        });
      })
    );
    return;
  }

  // Strategy 2: For API calls, try network first then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Return empty JSON when completely offline and no cache
            return new Response(JSON.stringify({ 
              offline: true, 
              message: 'Operating in offline mode. Using cached/local data.' 
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Strategy 3: App shell — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      }).catch(() => {
        // Network completely down — return cached or nothing
        return cached || new Response('Offline', { status: 503 });
      });

      return cached || networkFetch;
    })
  );
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_FACILITIES') {
    // Cache facility data sent from the app
    const facilityData = event.data.payload;
    caches.open(CACHE_NAME).then((cache) => {
      const response = new Response(JSON.stringify(facilityData), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put('/api/offline-facilities', response);
      console.log('[ResQGrid SW] Cached facility data for offline use');
    });
  }
});
