// FibreField Service Worker
// Enhanced service worker with advanced caching strategies

const CACHE_NAME = 'fibrefield-v2';
const STATIC_CACHE = 'fibrefield-static-v2';
const IMAGE_CACHE = 'fibrefield-images-v2';
const API_CACHE = 'fibrefield-api-v2';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for dynamic content
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for frequently updated content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Cache only for offline resources
  CACHE_ONLY: 'cache-only',
  // Network only for real-time data
  NETWORK_ONLY: 'network-only'
};

self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  self.skipWaiting();

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      // Cache critical images
      caches.open(IMAGE_CACHE)
    ]).then(() => {
      console.log('Service Worker installed and assets cached');
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
  self.clients.claim();

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete old caches
          if (cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE &&
              cacheName !== IMAGE_CACHE &&
              cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Enhanced fetch handler with different strategies
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Determine cache strategy based on resource type
  let strategy = CACHE_STRATEGIES.NETWORK_FIRST;

  if (pathname.match(/\.(css|js|woff|woff2|ttf|eot)$/)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  } else if (pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  } else if (pathname.match(/^\/api\//)) {
    strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  } else if (pathname === '/' || pathname.match(/\/(login|dashboard|assignments)/)) {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  event.respondWith(
    handleRequest(event.request, strategy)
  );
});

// Handle requests based on strategy
async function handleRequest(request, strategy) {
  const url = new URL(request.url);

  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);

    case CACHE_STRATEGIES.CACHE_ONLY:
      return cacheOnly(request);

    case CACHE_STRATEGIES.NETWORK_ONLY:
    default:
      return fetch(request);
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Cache-only strategy
async function cacheOnly(request) {
  const cachedResponse = await caches.match(request);
  return cachedResponse || new Response('Not found', { status: 404 });
}

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Get pending sync items from IndexedDB or similar
    const pendingItems = await getPendingSyncItems();

    for (const item of pendingItems) {
      try {
        await syncItem(item);
        await markItemAsSynced(item.id);
      } catch (error) {
        console.error('Failed to sync item:', item.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'view') {
    event.waitUntil(
      clients.openWindow(data.url || '/')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic cleanup
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    event.waitUntil(cleanupCache());
  }
});

async function cleanupCache() {
  try {
    const cacheNames = await caches.keys();
    const validCaches = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE, API_CACHE];

    for (const cacheName of cacheNames) {
      if (!validCaches.includes(cacheName)) {
        await caches.delete(cacheName);
      }
    }

    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}

// Placeholder functions for background sync
async function getPendingSyncItems() {
  // Implement based on your offline storage strategy
  return [];
}

async function syncItem(item) {
  // Implement sync logic
  console.log('Syncing item:', item);
}

async function markItemAsSynced(id) {
  // Mark item as synced
  console.log('Marked as synced:', id);
}