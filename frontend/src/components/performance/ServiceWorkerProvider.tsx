'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/premium/Toast';

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

/**
 * Service Worker Provider
 * Handles registration and updates of the service worker
 */
export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return;
    }

    // Register service worker
    registerServiceWorker();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast({ type: 'success', title: 'Connection restored' });
      
      // Trigger background sync when back online
      if (registration && 'sync' in registration) {
        registration.sync.register('sync-contracts').catch(console.error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({ type: 'error', title: 'You are offline', description: 'Changes will be synced when you reconnect.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [registration]);

  async function registerServiceWorker() {
    try {
      // Try to register enhanced service worker first
      let reg;
      try {
        reg = await navigator.serviceWorker.register('/service-worker-v2.js', {
          scope: '/',
        });
        console.log('Enhanced Service Worker registered successfully');
      } catch (error) {
        // Fallback to basic service worker
        console.warn('Enhanced service worker failed, falling back to basic:', error);
        reg = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });
      }

      setRegistration(reg);
      console.log('Service Worker registered successfully');

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            setIsUpdateAvailable(true);
            toast({
              type: 'info',
              title: 'New version available!',
              action: {
                label: 'Update',
                onClick: () => updateServiceWorker(),
              },
              duration: Infinity,
            });
          }
        });
      });

      // Handle messages from service worker
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      // Check for updates every hour
      setInterval(() => {
        reg.update();
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  function handleServiceWorkerMessage(event: MessageEvent) {
    const { type, contractId, success } = event.data;

    switch (type) {
      case 'SYNC_COMPLETE':
        if (success) {
          toast({ type: 'success', title: `Contract ${contractId} synced successfully` });
        } else {
          toast({ type: 'error', title: `Failed to sync contract ${contractId}` });
        }
        break;
      
      case 'CACHE_UPDATED':
        console.log('Cache updated in background');
        break;
      
      default:
        console.log('Unknown message from service worker:', event.data);
    }
  }

  function updateServiceWorker() {
    if (!registration?.waiting) return;

    // Tell waiting service worker to take control
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload once the new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // Provide offline status to children via context if needed
  return (
    <>
      {children}
      {!isOnline && <OfflineIndicator />}
      {isUpdateAvailable && (
        <UpdatePrompt onUpdate={updateServiceWorker} />
      )}
    </>
  );
}

/**
 * Offline indicator component
 */
function OfflineIndicator() {
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
      </svg>
      <span className="font-medium">You're offline</span>
    </div>
  );
}

/**
 * Update prompt component
 */
function UpdatePrompt({ onUpdate }: { onUpdate: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="font-semibold mb-2">Update Available</h3>
      <p className="text-sm mb-4">A new version of Pactwise is available. Update now for the latest features and improvements.</p>
      <div className="flex gap-2">
        <button
          onClick={onUpdate}
          className="bg-white text-blue-500 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors"
        >
          Update Now
        </button>
        <button
          onClick={() => {/* Dismiss */}}
          className="text-white/80 hover:text-white transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to access service worker functionality
 */
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(setRegistration);
    }

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const syncData = async (tag: string, data?: any) => {
    if (!registration) return;

    // Store data in IndexedDB if provided
    if (data) {
      const db = await openDB();
      const tx = db.transaction('pending-sync', 'readwrite');
      await tx.objectStore('pending-sync').put({ tag, data, timestamp: Date.now() });
    }

    // Request background sync
    try {
      await registration.sync.register(tag);
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Background sync failed:', error);
      // Fallback to immediate sync if background sync not supported
      if (navigator.onLine && data) {
        // Attempt immediate sync
        return fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag, data }),
        });
      }
    }
  };

  return {
    registration,
    isOnline,
    syncData,
  };
}

// IndexedDB helper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pactwise-sync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pending-sync')) {
        db.createObjectStore('pending-sync', { keyPath: 'tag' });
      }
    };
  });
}