// ResQGrid AI — Progressive Web App (PWA) Offline Service Worker
// Enables 100% Zero-Network operation with Background Sync, Push Notifications, and Map Tile Caching

const CACHE_VERSION = 'resqgrid-offline-v5';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const TILE_CACHE = `${CACHE_VERSION}-tiles`;
const API_CACHE = `${CACHE_VERSION}-api`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/icon.svg',
  '/radio-sos',
  '/profile',
  '/map',
  '/comms',
  '/hazards',
  '/incidents',
  '/dispatch',
  '/fleet',
  '/hospitals',
  '/resources',
  '/evacuation',
  '/simulation',
  '/analytics',
  '/alerts',
  '/settings',
  '/audit-logs',
  '/login',
  '/login/citizen',
  '/login/doctor',
  '/login/admin'
];

// Install: Cache critical App Shell
self.addEventListener('install', (event) => {
  console.log('[ResQGrid SW] Installing offline PWA cache version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[ResQGrid SW] Pre-cache partial notice:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Delete old caches
self.addEventListener('activate', (event) => {
  console.log('[ResQGrid SW] Activated. Cleaning old caches...');
  const currentCaches = [APP_SHELL_CACHE, TILE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !currentCaches.includes(key))
          .map((key) => {
            console.log('[ResQGrid SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Smart Strategy per request type
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests for fetch caching (sync handles outbox)
  if (request.method !== 'GET') {
    return;
  }

  // Bypass Vite dev server internal assets, HMR, and source modules to prevent blank screen errors
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('.vite') ||
    url.searchParams.has('t') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts')
  ) {
    return; // Pass through directly to network
  }

  // 1. Navigation requests (HTML SPA Routing) — Network first, fallback to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const appShell = await caches.match('/index.html');
          if (appShell) return appShell;
          return caches.match('/');
        })
    );
    return;
  }

  // 2. Map tiles caching — Cache First, Network fallback
  if (
    url.hostname.includes('tile') || 
    url.hostname.includes('basemaps') || 
    url.hostname.includes('openstreetmap') ||
    url.hostname.includes('cartocdn') ||
    url.pathname.includes('/tiles/')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          // Transparent 1x1 fallback or empty tile
          return new Response('', { status: 200, headers: { 'Content-Type': 'image/png' } });
        }
      })
    );
    return;
  }

  // 3. API endpoints — Network First with Stale-While-Revalidate and JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({
              offline: true,
              status: 'OFFLINE_MESH_ACTIVE',
              timestamp: new Date().toISOString(),
              message: 'Device operating in 100% Zero-Network BLE/Radio Beacon Mode.'
            }),
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // 4. Static assets (JS, CSS, Fonts, Images) — Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Background Sync: Trigger outbox synchronization when device reconnects to network
self.addEventListener('sync', (event) => {
  console.log('[ResQGrid SW] Background sync event triggered tag:', event.tag);
  if (event.tag === 'sync-emergency-outbox' || event.tag === 'resqgrid-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'TRIGGER_BACKGROUND_SYNC',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

// Push Notifications: Display native system alerts
self.addEventListener('push', (event) => {
  console.log('[ResQGrid SW] Push event received');
  let data = {
    title: 'ResQGrid Emergency Notification',
    body: 'Urgent humanitarian dispatch or hazard alert received.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'resqgrid-alert',
    data: { url: '/alerts' }
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    vibrate: [200, 100, 200, 300, 400],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open_map', title: '📍 View on Map' },
      { action: 'ack', title: '✓ Acknowledge' }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click: Focus existing client or open new window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Message Listener: Support instant update & custom actions
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      if (event.source) {
        event.source.postMessage({ type: 'CACHE_CLEARED' });
      }
    });
  }
});
