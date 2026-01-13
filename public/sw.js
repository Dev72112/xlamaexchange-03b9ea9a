// xlama Service Worker v6 - Optimized Caching Strategies + Force Refresh Support
const CACHE_VERSION = 'v6';
const STATIC_CACHE = `xlama-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `xlama-runtime-${CACHE_VERSION}`;
const FONT_CACHE = `xlama-fonts-${CACHE_VERSION}`;
const IMAGE_CACHE = `xlama-images-${CACHE_VERSION}`;

// Static assets to precache (excluding / to ensure fresh HTML)
const STATIC_ASSETS = [
  '/manifest.json',
  '/xlama-mascot.png',
  '/placeholder.svg',
];

// API domains to cache with stale-while-revalidate
const CACHEABLE_API_HOSTS = [
  'api.coingecko.com',
  'min-api.cryptocompare.com',
];

// Token image hosts to cache
const TOKEN_IMAGE_HOSTS = [
  'static.okx.com',
  'assets.coingecko.com',
  'raw.githubusercontent.com',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v5...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches and enable navigation preload
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v5...');
  event.waitUntil(
    Promise.all([
      // Enable navigation preload if supported
      self.registration.navigationPreload?.enable().catch(() => {}),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('xlama-') && !name.includes(CACHE_VERSION))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
    ]).then(() => clients.claim())
  );
});

// Fetch event - smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests to our edge functions (always fresh)
  if (url.pathname.startsWith('/functions/')) return;

  // Cache-first for fonts (long TTL)
  if (isFont(request, url)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // Cache-first for token/chain images from external hosts
  if (isTokenImage(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Cache-first for static assets (images, scripts, styles)
  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Stale-while-revalidate for cacheable external APIs
  if (isCacheableApi(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Network-first with preload for HTML pages
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithPreload(event));
    return;
  }

  // Network-first for same-origin requests
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
});

// Check if request is for a font
function isFont(request, url) {
  return (
    request.destination === 'font' ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf')
  );
}

// Check if URL is for token/chain images from external hosts
function isTokenImage(url) {
  return TOKEN_IMAGE_HOSTS.some(host => url.host.includes(host));
}

// Check if request is for a static asset
function isStaticAsset(request, url) {
  return (
    request.destination === 'image' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp')
  );
}

// Check if URL is a cacheable external API
function isCacheableApi(url) {
  return CACHEABLE_API_HOSTS.some(host => url.host === host);
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn('[SW] Cache-first fetch failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

// Network-first with navigation preload
async function networkFirstWithPreload(event) {
  try {
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) return preloadResponse;
    return await fetch(event.request);
  } catch (error) {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
}

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'xlama',
    body: 'You have a new notification',
    icon: '/xlama-mascot.png',
    badge: '/xlama-mascot.png',
    tag: 'xlama-notification',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open xlama' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If we have an open window, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    // Handle offline transaction sync
  }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Clear runtime cache on request
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(RUNTIME_CACHE);
  }
});
