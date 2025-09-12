/**
 * Service Worker for Pactwise
 * Provides offline support and intelligent caching
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `pactwise-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pactwise-runtime-${CACHE_VERSION}`;

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/contracts',
  '/api/vendors',
  '/api/users',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('pactwise-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // Default to network-first strategy
  event.respondWith(networkFirstStrategy(request));
});

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request, cache);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Network-first strategy (for API and dynamic content)
async function networkFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Background fetch and cache update
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response);
    }
  } catch (error) {
    // Silently fail - we already returned from cache
  }
}

// Check if pathname is a static asset
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/images/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg')
  );
}

// Handle background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('sync-contract-')) {
    event.waitUntil(syncContract(event.tag));
  }
});

// Sync offline contract submissions
async function syncContract(tag) {
  const contractId = tag.replace('sync-contract-', '');
  
  try {
    // Get saved contract data from IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending-contracts', 'readonly');
    const store = tx.objectStore('pending-contracts');
    const contractData = await store.get(contractId);
    
    if (contractData) {
      // Attempt to submit the contract
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      });
      
      if (response.ok) {
        // Remove from pending if successful
        const deleteTx = db.transaction('pending-contracts', 'readwrite');
        await deleteTx.objectStore('pending-contracts').delete(contractId);
        
        // Notify the client
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            contractId,
            success: true,
          });
        });
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Simple IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pactwise-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-contracts')) {
        db.createObjectStore('pending-contracts', { keyPath: 'id' });
      }
    };
  });
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there's already a window/tab open
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});