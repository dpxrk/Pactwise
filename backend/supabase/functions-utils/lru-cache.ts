/**
 * LRU (Least Recently Used) Cache with size limits and automatic eviction
 * Features:
 * - Maximum entry count limit
 * - Maximum memory size limit  
 * - TTL support per entry
 * - Cache statistics tracking
 * - Automatic cleanup of expired entries
 */

export interface LRUCacheEntry<T> {
  value: T;
  size: number;
  expiresAt?: number;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
}

export interface LRUCacheOptions {
  maxSize?: number;           // Maximum number of entries
  maxMemoryMB?: number;        // Maximum memory in megabytes
  ttlSeconds?: number;         // Default TTL in seconds
  onEvict?: (key: string, value: any) => void;  // Eviction callback
  cleanupIntervalMs?: number;  // Cleanup interval for expired entries
}

export interface LRUCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
  currentMemoryMB: number;
  hitRate: number;
}

export class LRUCache<T = any> {
  private cache: Map<string, LRUCacheEntry<T>>;
  private accessOrder: Map<string, number>;
  private options: Required<LRUCacheOptions>;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };
  private currentMemoryBytes: number;
  private cleanupTimer?: NodeJS.Timer;
  private accessCounter: number;

  constructor(options: LRUCacheOptions = {}) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.currentMemoryBytes = 0;
    this.accessCounter = 0;
    
    this.options = {
      maxSize: options.maxSize || 1000,
      maxMemoryMB: options.maxMemoryMB || 100,
      ttlSeconds: options.ttlSeconds || 300,
      onEvict: options.onEvict || (() => {}),
      cleanupIntervalMs: options.cleanupIntervalMs || 60000, // 1 minute
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };

    // Start cleanup timer
    if (this.options.cleanupIntervalMs > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, ++this.accessCounter);
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    // Calculate size of the value
    const size = this.calculateSize(value);
    
    // Check if single item exceeds memory limit
    const maxMemoryBytes = this.options.maxMemoryMB * 1024 * 1024;
    if (size > maxMemoryBytes) {
      console.warn(`Cache entry for key "${key}" exceeds maximum memory limit`);
      return;
    }

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict entries if necessary
    this.evictIfNeeded(size);

    // Create new entry
    const now = Date.now();
    const ttl = ttlSeconds ?? this.options.ttlSeconds;
    const entry: LRUCacheEntry<T> = {
      value,
      size,
      expiresAt: ttl > 0 ? now + (ttl * 1000) : undefined,
      accessCount: 0,
      lastAccessed: now,
      createdAt: now,
    };

    // Add to cache
    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.currentMemoryBytes += size;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.currentMemoryBytes -= entry.size;
    this.cache.delete(key);
    this.accessOrder.delete(key);
    
    return true;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentMemoryBytes = 0;
    this.accessCounter = 0;
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): LRUCacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      currentSize: this.cache.size,
      currentMemoryMB: this.currentMemoryBytes / (1024 * 1024),
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values in the cache
   */
  values(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Get all entries in the cache
   */
  entries(): Array<[string, T]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * Prune expired entries from the cache
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Dispose of the cache and clean up resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Private: Calculate the approximate size of a value in bytes
   */
  private calculateSize(value: T): number {
    if (value === null || value === undefined) return 0;
    
    // For strings, use length * 2 (UTF-16)
    if (typeof value === 'string') {
      return value.length * 2;
    }
    
    // For numbers, 8 bytes
    if (typeof value === 'number') {
      return 8;
    }
    
    // For booleans, 4 bytes
    if (typeof value === 'boolean') {
      return 4;
    }
    
    // For objects and arrays, stringify and measure
    try {
      const json = JSON.stringify(value);
      return json.length * 2; // UTF-16
    } catch {
      // If stringify fails, estimate 1KB
      return 1024;
    }
  }

  /**
   * Private: Evict entries if needed to make room
   */
  private evictIfNeeded(incomingSize: number): void {
    const maxMemoryBytes = this.options.maxMemoryMB * 1024 * 1024;
    
    // Evict based on memory limit
    while (this.currentMemoryBytes + incomingSize > maxMemoryBytes && this.cache.size > 0) {
      this.evictLRU();
    }
    
    // Evict based on size limit
    while (this.cache.size >= this.options.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Private: Evict the least recently used entry
   */
  private evictLRU(): void {
    // Find the entry with the lowest access order
    let lruKey: string | null = null;
    let minAccessOrder = Infinity;
    
    for (const [key, accessOrder] of this.accessOrder.entries()) {
      if (accessOrder < minAccessOrder) {
        minAccessOrder = accessOrder;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      const entry = this.cache.get(lruKey);
      if (entry) {
        this.options.onEvict(lruKey, entry.value);
        this.delete(lruKey);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Private: Start the cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.prune();
    }, this.options.cleanupIntervalMs);
    
    // Ensure timer doesn't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Iterator support
   */
  [Symbol.iterator](): Iterator<[string, T]> {
    return this.entries()[Symbol.iterator]();
  }

  /**
   * JSON serialization support
   */
  toJSON(): Record<string, T> {
    const obj: Record<string, T> = {};
    for (const [key, entry] of this.cache.entries()) {
      if (!entry.expiresAt || entry.expiresAt > Date.now()) {
        obj[key] = entry.value;
      }
    }
    return obj;
  }
}

/**
 * Create a typed LRU cache for specific use cases
 */
export function createTypedLRUCache<T>(options?: LRUCacheOptions): LRUCache<T> {
  return new LRUCache<T>(options);
}

// Export commonly used cache configurations
export const CachePresets = {
  // Small, fast cache for hot data
  small: {
    maxSize: 100,
    maxMemoryMB: 10,
    ttlSeconds: 60,
  },
  
  // Medium cache for general use
  medium: {
    maxSize: 1000,
    maxMemoryMB: 50,
    ttlSeconds: 300,
  },
  
  // Large cache for less frequently accessed data
  large: {
    maxSize: 10000,
    maxMemoryMB: 200,
    ttlSeconds: 3600,
  },
  
  // Session cache
  session: {
    maxSize: 5000,
    maxMemoryMB: 100,
    ttlSeconds: 1800, // 30 minutes
  },
  
  // API response cache
  apiResponse: {
    maxSize: 500,
    maxMemoryMB: 50,
    ttlSeconds: 60,
  },
};