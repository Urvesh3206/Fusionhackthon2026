// ResQGrid AI — Progressive Web App (PWA) Offline Service Worker
// Enables 100% Zero-Network operation when Wi-Fi and Cellular towers shut down

const CACHE_NAME = 'resqgrid-offline-v3';
const TILE_CACHE = 'resqgrid-map-tiles-v2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/radio-sos',
  '/profile',
  '/login/citizen',
  '/login/doctor'
];

self.addEventListener('install', (event) => {
  console.log('[ResQGrid SW] Installing offline PWA cache...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[ResQGrid SW] Pre-cache initial notice:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ResQGrid SW] Service worker activated for offline operation');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== TILE_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Navigation requests (HTML SPA Routing) — return cached app shell if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          if (cachedPage) return cachedPage;
          const appShell = await caches.match('/index.html');
          if (appShell) return appShell;
          return caches.match('/');
        })
    );
    return;
  }

  // 2. Map tiles caching
  if (url.hostname.includes('tile') || url.hostname.includes('basemaps') || url.hostname.includes('openstreetmap')) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => new Response('', { status: 200, headers: { 'Content-Type': 'image/png' } }));
        });
      })
    );
    return;
  }

  // 3. API endpoints — cache with offline JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ 
            offline: true, 
            status: 'OFFLINE_MESH_ACTIVE',
            message: 'Operating in 100% Zero-Network BIN Beacon mode.' 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 4. Static assets (JS, CSS, fonts, images) — Cache First, then Network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || new Response('', { status: 404 }));
    })
  );
});
