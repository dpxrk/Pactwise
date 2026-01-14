/**
 * IndexedDB caching layer for large datasets
 * Provides persistent client-side storage with TTL support
 */

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  version?: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string; // Version identifier for cache busting
}

export class IndexedDBCache {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private defaultTTL: number;

  constructor(
    dbName: string = 'pactwise-cache',
    storeName: string = 'cached-data',
    defaultTTL: number = 5 * 60 * 1000 // 5 minutes default
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Initialize the database connection
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('expiresAt', 'expiresAt');
        }
      };
    });
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        
        request.onsuccess = () => {
          const entry: CacheEntry<T> | undefined = request.result;
          
          if (!entry) {
            resolve(null);
            return;
          }
          
          // Check if expired
          if (Date.now() > entry.expiresAt) {
            // Delete expired entry
            this.delete(key);
            resolve(null);
            return;
          }
          
          resolve(entry.data);
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      
      const ttl = options?.ttl || this.defaultTTL;
      const now = Date.now();
      
      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: now,
        expiresAt: now + ttl,
        version: options?.version,
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB set error:', error);
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB delete error:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const index = store.index('expiresAt');
      
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      
      return new Promise((resolve, reject) => {
        let deletedCount = 0;
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    count: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    sizeEstimate: number;
  }> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const countRequest = store.count();
        const stats = {
          count: 0,
          oldestEntry: null as number | null,
          newestEntry: null as number | null,
          sizeEstimate: 0,
        };
        
        countRequest.onsuccess = () => {
          stats.count = countRequest.result;
          
          if (stats.count === 0) {
            resolve(stats);
            return;
          }
          
          // Get oldest and newest entries
          const index = store.index('timestamp');
          
          // Get oldest
          const oldestRequest = index.openCursor(null, 'next');
          oldestRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              stats.oldestEntry = cursor.value.timestamp;
            }
            
            // Get newest
            const newestRequest = index.openCursor(null, 'prev');
            newestRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result;
              if (cursor) {
                stats.newestEntry = cursor.value.timestamp;
              }
              
              // Estimate size (rough approximation)
              const allRequest = store.getAll();
              allRequest.onsuccess = () => {
                const entries = allRequest.result;
                stats.sizeEstimate = new Blob([JSON.stringify(entries)]).size;
                resolve(stats);
              };
            };
          };
        };
        
        countRequest.onerror = () => reject(countRequest.error);
      });
    } catch (error) {
      console.error('IndexedDB getStats error:', error);
      return {
        count: 0,
        oldestEntry: null,
        newestEntry: null,
        sizeEstimate: 0,
      };
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Create cache instances for different data types
 */
export const contractCache = new IndexedDBCache('pactwise-cache', 'contracts', 10 * 60 * 1000); // 10 minutes
export const vendorCache = new IndexedDBCache('pactwise-cache', 'vendors', 10 * 60 * 1000); // 10 minutes
export const analyticsCache = new IndexedDBCache('pactwise-cache', 'analytics', 5 * 60 * 1000); // 5 minutes
export const searchCache = new IndexedDBCache('pactwise-cache', 'search', 30 * 60 * 1000); // 30 minutes

/**
 * Periodic cleanup of expired cache entries
 */
if (typeof window !== 'undefined') {
  // Run cleanup every 5 minutes
  setInterval(async () => {
    const caches = [contractCache, vendorCache, analyticsCache, searchCache];
    
    for (const cache of caches) {
      try {
        await cache.cleanup();
      } catch (error) {
        console.error('[IndexedDB] Cleanup error:', error);
      }
    }
  }, 5 * 60 * 1000);
}