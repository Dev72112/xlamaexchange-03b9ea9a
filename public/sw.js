// xlama Service Worker v5 - Enhanced Caching & Route Precaching
const CACHE_VERSION = 'v5';
const STATIC_CACHE = `xlama-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `xlama-runtime-${CACHE_VERSION}`;
const FONT_CACHE = `xlama-fonts-${CACHE_VERSION}`;
const IMAGE_CACHE = `xlama-images-${CACHE_VERSION}`;
const ROUTE_CACHE = `xlama-routes-${CACHE_VERSION}`;
const API_CACHE = `xlama-api-${CACHE_VERSION}`;

// Critical static assets to precache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/xlama-mascot.png',
  '/placeholder.svg',
  '/favicon.ico',
];

// Critical routes to precache for instant navigation
const CRITICAL_ROUTES = [
  '/',
  '/bridge',
  '/portfolio',
  '/orders',
  '/analytics',
  '/history',
];

// Font URLs to cache aggressively (1 year TTL)
const FONT_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Token/chain logo CDNs to cache
const IMAGE_HOSTS = [
  'raw.githubusercontent.com',
  'assets.coingecko.com',
  'cryptologos.cc',
  'tokens.1inch.io',
  's2.coinmarketcap.com',
  'static.okx.com',
  'ui-avatars.com',
];

// API domains to cache with stale-while-revalidate
const CACHEABLE_API_HOSTS = [
  'api.coingecko.com',
  'min-api.cryptocompare.com',
  'api.llama.fi',
  'coins.llama.fi',
];

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  fonts: 365 * 24 * 60 * 60 * 1000,      // 1 year
  images: 7 * 24 * 60 * 60 * 1000,       // 1 week for token images
  staticAssets: 30 * 24 * 60 * 60 * 1000, // 30 days for versioned assets
  routes: 24 * 60 * 60 * 1000,            // 24 hours for route shells
  api: 5 * 60 * 1000,                     // 5 minutes for API data
  apiPrices: 30 * 1000,                   // 30 seconds for price data
};

// Max cache sizes (number of entries)
const MAX_CACHE_SIZE = {
  images: 500,
  api: 100,
  routes: 20,
};

// Install event - cache static assets and critical routes
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v5...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Failed to cache some static assets:', err);
        });
      }),
      // Precache critical routes for instant navigation
      caches.open(ROUTE_CACHE).then((cache) => {
        return Promise.allSettled(
          CRITICAL_ROUTES.map(route => 
            fetch(route, { credentials: 'same-origin' })
              .then(response => {
                if (response.ok) {
                  return cache.put(route, response);
                }
              })
              .catch(() => {/* Silent fail for routes */})
          )
        );
      }),
    ])
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and trim oversized caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v5...');
  event.waitUntil(
    Promise.all([
      // Delete old versioned caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('xlama-') && 
                     !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Trim image cache if too large
      trimCache(IMAGE_CACHE, MAX_CACHE_SIZE.images),
      trimCache(API_CACHE, MAX_CACHE_SIZE.api),
    ]).then(() => clients.claim())
  );
});

// Trim cache to max size (LRU-style, removes oldest entries)
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    const deleteCount = keys.length - maxSize;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${deleteCount} entries from ${cacheName}`);
  }
}

// Fetch event - smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests to our edge functions (always fresh)
  if (url.pathname.startsWith('/functions/')) return;

  // Cache fonts aggressively (1 year TTL)
  if (isFont(request, url)) {
    event.respondWith(cacheFirst(request, FONT_CACHE, CACHE_TTL.fonts));
    return;
  }

  // Cache token/chain logos (1 week TTL)
  if (isTokenImage(url)) {
    event.respondWith(cacheFirstWithExpiry(request, IMAGE_CACHE, CACHE_TTL.images));
    return;
  }

  // Cache-first for versioned static assets (JS/CSS with hashes)
  if (isVersionedAsset(request, url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, CACHE_TTL.staticAssets));
    return;
  }

  // Cache-first for static assets
  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, CACHE_TTL.staticAssets));
    return;
  }

  // Stale-while-revalidate for cacheable external APIs
  if (isCacheableApi(url)) {
    const ttl = isPriceApi(url) ? CACHE_TTL.apiPrices : CACHE_TTL.api;
    event.respondWith(staleWhileRevalidateWithTTL(request, API_CACHE, ttl));
    return;
  }

  // Network-first for HTML pages with route cache fallback
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithRouteCache(request));
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
    FONT_HOSTS.some(host => url.host === host) ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  );
}

// Check if request is for token/chain images
function isTokenImage(url) {
  return IMAGE_HOSTS.some(host => url.host.includes(host));
}

// Check if request is for a versioned asset (contains hash in filename)
function isVersionedAsset(request, url) {
  // Match files like main.abc123.js or styles.def456.css
  return /\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname);
}

// Check if request is for a static asset
function isStaticAsset(request, url) {
  return (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  );
}

// Check if URL is a cacheable external API
function isCacheableApi(url) {
  return CACHEABLE_API_HOSTS.some(host => url.host === host);
}

// Check if URL is for price data (needs shorter TTL)
function isPriceApi(url) {
  return url.pathname.includes('price') || 
         url.pathname.includes('ticker') ||
         url.host.includes('coingecko');
}

// Cache-first strategy with optional TTL
async function cacheFirst(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    // If TTL is set, check expiry
    if (ttl) {
      const cachedTime = cached.headers.get('sw-cached-time');
      if (cachedTime && (Date.now() - parseInt(cachedTime)) < ttl) {
        return cached;
      }
    } else {
      return cached;
    }
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Add cache timestamp for TTL checking
      const headers = new Headers(response.headers);
      headers.set('sw-cached-time', Date.now().toString());
      headers.set('Cache-Control', `public, max-age=${Math.floor((ttl || CACHE_TTL.staticAssets) / 1000)}`);
      
      const timedResponse = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      cache.put(request, timedResponse);
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    console.warn('[SW] Cache-first fetch failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

// Cache-first with expiry for images
async function cacheFirstWithExpiry(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    // Check if cache entry is still fresh
    const cachedTime = cached.headers.get('sw-cached-time');
    if (cachedTime && (Date.now() - parseInt(cachedTime)) < maxAge) {
      return cached;
    }
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone response and add timestamp header
      const headers = new Headers(response.headers);
      headers.set('sw-cached-time', Date.now().toString());
      const timedResponse = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      cache.put(request, timedResponse);
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    console.warn('[SW] Image fetch failed:', error);
    return new Response('', { status: 404 });
  }
}

// Network-first strategy with route cache fallback
async function networkFirstWithRouteCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache the response for offline support
      const cache = await caches.open(ROUTE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Try route cache first
    const routeCached = await caches.match(request, { cacheName: ROUTE_CACHE });
    if (routeCached) return routeCached;
    
    // Try static cache
    const staticCached = await caches.match(request, { cacheName: STATIC_CACHE });
    if (staticCached) return staticCached;
    
    // Return offline page or error
    const offlinePage = await caches.match('/');
    if (offlinePage) return offlinePage;
    
    return new Response('Offline', { status: 503 });
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

// Stale-while-revalidate with TTL for API caching
async function staleWhileRevalidateWithTTL(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Check if cached response is still fresh
  let isFresh = false;
  if (cached) {
    const cachedTime = cached.headers.get('sw-cached-time');
    isFresh = cachedTime && (Date.now() - parseInt(cachedTime)) < ttl;
  }
  
  // If fresh, return cached immediately
  if (cached && isFresh) {
    return cached;
  }
  
  // Fetch fresh version
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cached-time', Date.now().toString());
      const timedResponse = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      cache.put(request, timedResponse);
    }
    return response;
  }).catch(() => cached);
  
  // If stale but available, return cached and revalidate in background
  if (cached) {
    // Fire off revalidation but don't wait for it
    fetchPromise.catch(() => {});
    return cached;
  }
  
  // No cache, wait for network
  return fetchPromise;
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
