/**
 * Enhanced Service Worker for Pactwise
 * Implements stale-while-revalidate and advanced caching strategies
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `pactwise-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pactwise-runtime-${CACHE_VERSION}`;
const DATA_CACHE = `pactwise-data-${CACHE_VERSION}`;

// Cache configuration
const CACHE_CONFIG = {
  maxAge: {
    static: 30 * 24 * 60 * 60 * 1000, // 30 days
    api: 5 * 60 * 1000, // 5 minutes
    convex: 2 * 60 * 1000, // 2 minutes
    images: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  maxEntries: {
    api: 50,
    convex: 100,
    images: 100,
  }
};

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Stale-while-revalidate routes
const SWR_ROUTES = [
  /^\/api\/contracts$/,
  /^\/api\/vendors$/,
  /^\/api\/analytics/,
  /^\/api\/dashboard/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing enhanced service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating enhanced service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('pactwise-') && !name.includes(CACHE_VERSION))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Clean up expired entries
      return cleanupExpiredCache();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Enhanced fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Determine caching strategy based on request
  const strategy = getCachingStrategy(url, request);
  
  switch (strategy) {
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    case 'cache-first':
      event.respondWith(cacheFirst(request));
      break;
    case 'network-first':
      event.respondWith(networkFirst(request));
      break;
    case 'network-only':
      // Let the request pass through
      break;
    default:
      event.respondWith(staleWhileRevalidate(request));
  }
});

// Determine caching strategy
function getCachingStrategy(url, request) {
  // Static assets - cache first
  if (isStaticAsset(url.pathname)) {
    return 'cache-first';
  }

  // Convex API - stale-while-revalidate
  if (url.hostname.includes('convex.cloud')) {
    return 'stale-while-revalidate';
  }

  // API routes that benefit from SWR
  if (SWR_ROUTES.some(pattern => pattern.test(url.pathname))) {
    return 'stale-while-revalidate';
  }

  // Navigation requests
  if (request.mode === 'navigate') {
    return 'network-first';
  }

  // Auth-related requests - always fresh
  if (url.pathname.includes('/auth') || url.pathname.includes('/login')) {
    return 'network-only';
  }

  return 'network-first';
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Return cached response immediately if available
  const responsePromise = cachedResponse ? Promise.resolve(cachedResponse) : fetch(request);
  
  // Update cache in background
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-fetched-on', new Date().toUTCString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers,
      });
      
      await cache.put(request, modifiedResponse);
      
      // Notify clients about updated data
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_UPDATED',
          url: request.url,
        });
      });
    }
    return response;
  }).catch(() => {
    // If network fails, we already have the cached response
    return cachedResponse || new Response('Network error', { status: 503 });
  });
  
  // Return cached response immediately, fetch happens in background
  return cachedResponse || fetchPromise;
}

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check if cache is still fresh
    const cachedDate = new Date(cachedResponse.headers.get('sw-fetched-on') || 0);
    const age = Date.now() - cachedDate.getTime();
    const maxAge = getMaxAge(request);
    
    if (age < maxAge) {
      return cachedResponse;
    }
    
    // Cache is stale, update in background
    fetchAndCache(request, cache);
    return cachedResponse;
  }
  
  // No cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cacheWithTimestamp(cache, request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cacheWithTimestamp(cache, request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Helper to cache with timestamp
async function cacheWithTimestamp(cache, request, response) {
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-on', new Date().toUTCString());
  
  const modifiedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
  
  return cache.put(request, modifiedResponse);
}

// Background fetch and cache update
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheWithTimestamp(cache, request, response);
    }
  } catch (error) {
    // Silently fail - we already returned from cache
  }
}

// Get max age for request type
function getMaxAge(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/images/')) {
    return CACHE_CONFIG.maxAge.images;
  }
  if (url.pathname.startsWith('/api/')) {
    return CACHE_CONFIG.maxAge.api;
  }
  if (url.hostname.includes('convex.cloud')) {
    return CACHE_CONFIG.maxAge.convex;
  }
  
  return CACHE_CONFIG.maxAge.static;
}

// Check if pathname is a static asset
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/images/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.woff2')
  );
}

// Clean up expired cache entries
async function cleanupExpiredCache() {
  const cacheNames = [DATA_CACHE, RUNTIME_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const cachedDate = new Date(response.headers.get('sw-fetched-on') || 0);
        const age = Date.now() - cachedDate.getTime();
        const maxAge = getMaxAge(request);
        
        if (age > maxAge * 2) { // Clean up entries older than 2x max age
          await cache.delete(request);
        }
      }
    }
  }
}

// Periodic cache cleanup
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEANUP_CACHE') {
    event.waitUntil(cleanupExpiredCache());
  }
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contracts') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data
async function syncOfflineData() {
  try {
    const db = await openDB();
    const tx = db.transaction(['pending-contracts', 'pending-vendors'], 'readonly');
    
    // Sync contracts
    const contractStore = tx.objectStore('pending-contracts');
    const contracts = await contractStore.getAll();
    
    for (const contract of contracts) {
      try {
        const response = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contract),
        });
        
        if (response.ok) {
          const deleteTx = db.transaction('pending-contracts', 'readwrite');
          await deleteTx.objectStore('pending-contracts').delete(contract.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync contract:', error);
      }
    }
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        synced: contracts.length,
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Enhanced IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pactwise-offline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('pending-contracts')) {
        db.createObjectStore('pending-contracts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-vendors')) {
        db.createObjectStore('pending-vendors', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached-data')) {
        const cacheStore = db.createObjectStore('cached-data', { keyPath: 'key' });
        cacheStore.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

// Prefetch critical resources
self.addEventListener('message', (event) => {
  if (event.data.type === 'PREFETCH') {
    event.waitUntil(
      Promise.all(
        event.data.urls.map(url => 
          fetch(url).then(response => {
            if (response.ok) {
              return caches.open(DATA_CACHE).then(cache => 
                cacheWithTimestamp(cache, new Request(url), response)
              );
            }
          }).catch(() => {})
        )
      )
    );
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCachingStrategy,
    CACHE_CONFIG,
  };
}