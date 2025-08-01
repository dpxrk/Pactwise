// DataLoader implementation to prevent N+1 queries

type BatchLoadFn<K, V> = (keys: K[]) => Promise<(V | Error)[]>;

interface DataLoaderOptions<K, V> {
  batch?: boolean;
  maxBatchSize?: number;
  batchScheduleFn?: (callback: () => void) => void;
  cache?: boolean;
  cacheKeyFn?: (key: K) => string;
  cacheMap?: Map<string, Promise<V>>;
}

export class DataLoader<K, V> {
  private batchLoadFn: BatchLoadFn<K, V>;
  private options: Required<DataLoaderOptions<K, V>>;
  private batchQueue: Array<{ key: K; resolve: (value: V) => void; reject: (error: Error) => void }> = [];
  private cacheMap: Map<string, Promise<V>>;

  constructor(batchLoadFn: BatchLoadFn<K, V>, options: DataLoaderOptions<K, V> = {}) {
    this.batchLoadFn = batchLoadFn;
    this.options = {
      batch: options.batch ?? true,
      maxBatchSize: options.maxBatchSize ?? 1000,
      batchScheduleFn: options.batchScheduleFn ?? ((callback) => process.nextTick(callback)),
      cache: options.cache ?? true,
      cacheKeyFn: options.cacheKeyFn ?? ((key) => String(key)),
      cacheMap: options.cacheMap ?? new Map(),
    };
    this.cacheMap = this.options.cacheMap;
  }

  async load(key: K): Promise<V> {
    const cacheKey = this.options.cacheKeyFn(key);

    // Check cache
    if (this.options.cache && this.cacheMap.has(cacheKey)) {
      return this.cacheMap.get(cacheKey)!;
    }

    // Create promise for this key
    const promise = new Promise<V>((resolve, reject) => {
      this.batchQueue.push({ key, resolve, reject });

      // Schedule batch execution
      if (this.batchQueue.length === 1) {
        this.options.batchScheduleFn(() => this.executeBatch());
      }
    });

    // Cache the promise
    if (this.options.cache) {
      this.cacheMap.set(cacheKey, promise);
    }

    return promise;
  }

  async loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map((key) => this.load(key)));
  }

  private async executeBatch(): Promise<void> {
    // Take current batch
    const batch = this.batchQueue.splice(0, this.options.maxBatchSize);
    if (batch.length === 0) {return;}

    const keys = batch.map((item) => item.key);

    try {
      const values = await this.batchLoadFn(keys);

      // Resolve each promise
      batch.forEach((item, index) => {
        const value = values[index];
        if (value instanceof Error) {
          item.reject(value);
        } else {
          item.resolve(value);
        }
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach((item) => {
        item.reject(error as Error);
      });
    }

    // Execute remaining items if any
    if (this.batchQueue.length > 0) {
      this.options.batchScheduleFn(() => this.executeBatch());
    }
  }

  clear(key: K): this {
    const cacheKey = this.options.cacheKeyFn(key);
    this.cacheMap.delete(cacheKey);
    return this;
  }

  clearAll(): this {
    this.cacheMap.clear();
    return this;
  }

  prime(key: K, value: V): this {
    const cacheKey = this.options.cacheKeyFn(key);
    this.cacheMap.set(cacheKey, Promise.resolve(value));
    return this;
  }
}

// Factory functions for common use cases

export function createContractLoader(supabase: any) {
  return new DataLoader<string, any>(async (contractIds) => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .in('id', contractIds);

    if (error) {
      return contractIds.map(() => error);
    }

    // Map results back in order
    const contractMap = new Map(data.map((c: any) => [c.id, c]));
    return contractIds.map((id) => contractMap.get(id) || new Error('Not found'));
  });
}

export function createVendorLoader(supabase: any) {
  return new DataLoader<string, any>(async (vendorIds) => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .in('id', vendorIds);

    if (error) {
      return vendorIds.map(() => error);
    }

    const vendorMap = new Map(data.map((v: any) => [v.id, v]));
    return vendorIds.map((id) => vendorMap.get(id) || new Error('Not found'));
  });
}

export function createUserLoader(supabase: any) {
  return new DataLoader<string, any>(async (userIds) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (error) {
      return userIds.map(() => error);
    }

    const userMap = new Map(data.map((u: any) => [u.id, u]));
    return userIds.map((id) => userMap.get(id) || new Error('Not found'));
  });
}