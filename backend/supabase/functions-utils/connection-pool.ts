/**
 * Database Connection Pooling and Query Optimization
 * Provides connection pooling, query batching, and performance monitoring
 */

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  maxQueueSize: number;
  enableQueryBatching: boolean;
  batchWindowMs: number;
  enableMetrics: boolean;
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  avgWaitTime: number;
}

interface QueryMetrics {
  query: string;
  executionTime: number;
  rowCount: number;
  timestamp: Date;
}

interface BatchedQuery {
  id: string;
  query: string;
  params?: unknown[];
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timestamp: number;
}

/**
 * Connection wrapper with lifecycle management
 */
class PooledConnection {
  private client: SupabaseClient<Database>;
  private inUse: boolean = false;
  private lastUsed: Date;
  private queryCount: number = 0;
  private createdAt: Date;

  constructor(url: string, key: string) {
    this.client = createClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Connection-Pool': 'true',
        },
      },
    });
    this.lastUsed = new Date();
    this.createdAt = new Date();
  }

  acquire(): void {
    if (this.inUse) {
      throw new Error('Connection already in use');
    }
    this.inUse = true;
    this.lastUsed = new Date();
  }

  release(): void {
    this.inUse = false;
    this.lastUsed = new Date();
    this.queryCount++;
  }

  isAvailable(): boolean {
    return !this.inUse;
  }

  isExpired(idleTimeoutMs: number): boolean {
    return Date.now() - this.lastUsed.getTime() > idleTimeoutMs;
  }

  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  getStats() {
    return {
      inUse: this.inUse,
      queryCount: this.queryCount,
      lastUsed: this.lastUsed,
      createdAt: this.createdAt,
      age: Date.now() - this.createdAt.getTime(),
    };
  }
}

/**
 * Connection Pool Manager
 * Manages a pool of database connections with automatic scaling
 */
export class ConnectionPool {
  private config: PoolConfig;
  private connections: PooledConnection[] = [];
  private waitQueue: Array<{
    resolve: (conn: PooledConnection) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private batchQueue: Map<string, BatchedQuery[]> = new Map();
  private stats: ConnectionStats;
  private metrics: QueryMetrics[] = [];
  private cleanupInterval?: number;
  private batchInterval?: number;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<PoolConfig> = {}
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    
    this.config = {
      minConnections: config.minConnections || 2,
      maxConnections: config.maxConnections || 10,
      idleTimeoutMs: config.idleTimeoutMs || 30000, // 30 seconds
      connectionTimeoutMs: config.connectionTimeoutMs || 5000, // 5 seconds
      maxQueueSize: config.maxQueueSize || 100,
      enableQueryBatching: config.enableQueryBatching ?? true,
      batchWindowMs: config.batchWindowMs || 10, // 10ms batching window
      enableMetrics: config.enableMetrics ?? true,
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      avgWaitTime: 0,
    };

    this.initialize();
  }

  /**
   * Initialize the connection pool
   */
  private async initialize(): Promise<void> {
    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection();
    }

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 10000); // Check every 10 seconds

    // Start batch processing interval if enabled
    if (this.config.enableQueryBatching) {
      this.batchInterval = setInterval(() => {
        this.processBatchQueue();
      }, this.config.batchWindowMs);
    }
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PooledConnection> {
    if (this.connections.length >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const connection = new PooledConnection(this.supabaseUrl, this.supabaseKey);
    this.connections.push(connection);
    this.stats.totalConnections++;
    this.updateConnectionStats();
    
    return connection;
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<PooledConnection> {
    const startTime = Date.now();

    // Try to find an available connection
    let connection = this.connections.find(conn => conn.isAvailable());

    // If no connection available, try to create a new one
    if (!connection && this.connections.length < this.config.maxConnections) {
      try {
        connection = await this.createConnection();
      } catch (error) {
        // Max connections reached, add to wait queue
      }
    }

    // If still no connection, add to wait queue
    if (!connection) {
      if (this.waitQueue.length >= this.config.maxQueueSize) {
        throw new Error('Connection pool queue is full');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = this.waitQueue.findIndex(item => 
            item.resolve === resolve
          );
          if (index > -1) {
            this.waitQueue.splice(index, 1);
          }
          reject(new Error('Connection acquisition timeout'));
        }, this.config.connectionTimeoutMs);

        this.waitQueue.push({
          resolve: (conn) => {
            clearTimeout(timeout);
            const waitTime = Date.now() - startTime;
            this.updateWaitTimeStats(waitTime);
            resolve(conn);
          },
          reject,
          timestamp: startTime,
        });
        
        this.stats.waitingRequests++;
      });
    }

    connection.acquire();
    this.stats.activeConnections++;
    this.stats.totalRequests++;
    this.updateConnectionStats();
    
    return connection;
  }

  /**
   * Release a connection back to the pool
   */
  release(connection: PooledConnection): void {
    connection.release();
    this.stats.activeConnections--;
    this.updateConnectionStats();

    // Process wait queue if there are waiting requests
    if (this.waitQueue.length > 0) {
      const waiting = this.waitQueue.shift();
      if (waiting) {
        this.stats.waitingRequests--;
        connection.acquire();
        this.stats.activeConnections++;
        waiting.resolve(connection);
      }
    }
  }

  /**
   * Execute a query with automatic connection management
   */
  async query<T>(
    queryFn: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const connection = await this.acquire();
    
    try {
      const result = await queryFn(connection.getClient());
      
      if (this.config.enableMetrics) {
        const executionTime = Date.now() - startTime;
        this.updateResponseTimeStats(executionTime);
        this.recordQueryMetric({
          query: 'custom_query',
          executionTime,
          rowCount: Array.isArray(result) ? result.length : 1,
          timestamp: new Date(),
        });
      }
      
      return result;
    } catch (error) {
      this.stats.failedRequests++;
      throw error;
    } finally {
      this.release(connection);
    }
  }

  /**
   * Execute multiple queries in a transaction-like manner
   */
  async transaction<T>(
    queries: Array<(client: SupabaseClient<Database>) => Promise<unknown>>
  ): Promise<T[]> {
    const connection = await this.acquire();
    const client = connection.getClient();
    const results: T[] = [];
    
    try {
      for (const queryFn of queries) {
        const result = await queryFn(client);
        results.push(result as T);
      }
      return results;
    } catch (error) {
      // In a real database, we would rollback here
      // Supabase doesn't support transactions in edge functions yet
      throw error;
    } finally {
      this.release(connection);
    }
  }

  /**
   * Batch similar queries together for efficiency
   */
  async batchQuery<T>(
    key: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enableQueryBatching) {
      return queryFn();
    }

    return new Promise((resolve, reject) => {
      const batchedQuery: BatchedQuery = {
        id: `${key}-${Date.now()}-${Math.random()}`,
        query: key,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
      };

      const batch = this.batchQueue.get(key) || [];
      batch.push(batchedQuery);
      this.batchQueue.set(key, batch);
    });
  }

  /**
   * Process batched queries
   */
  private async processBatchQueue(): Promise<void> {
    for (const [key, batch] of this.batchQueue.entries()) {
      if (batch.length === 0) continue;

      // Process batch
      this.batchQueue.set(key, []);
      
      try {
        // Execute the query once for the entire batch
        const connection = await this.acquire();
        const client = connection.getClient();
        
        // This is simplified - in reality, you'd combine the queries
        const results = await Promise.all(
          batch.map(() => client.from(key).select('*'))
        );
        
        batch.forEach((query, index) => {
          query.resolve(results[index]);
        });
        
        this.release(connection);
      } catch (error) {
        batch.forEach(query => query.reject(error));
      }
    }
  }

  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    
    // Keep minimum connections
    if (this.connections.length <= this.config.minConnections) {
      return;
    }

    // Remove expired idle connections
    this.connections = this.connections.filter(conn => {
      if (conn.isAvailable() && conn.isExpired(this.config.idleTimeoutMs)) {
        this.stats.totalConnections--;
        return false;
      }
      return true;
    });

    this.updateConnectionStats();
  }

  /**
   * Get pool statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get query metrics
   */
  getMetrics(): QueryMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Shutdown the pool
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }

    // Reject all waiting requests
    this.waitQueue.forEach(item => {
      item.reject(new Error('Connection pool shutting down'));
    });
    this.waitQueue = [];

    // Clear connections
    this.connections = [];
    this.stats.totalConnections = 0;
    this.updateConnectionStats();
  }

  // Private helper methods

  private updateConnectionStats(): void {
    this.stats.idleConnections = this.connections.filter(
      conn => conn.isAvailable()
    ).length;
  }

  private updateResponseTimeStats(responseTime: number): void {
    const total = this.stats.totalRequests;
    this.stats.avgResponseTime = 
      (this.stats.avgResponseTime * (total - 1) + responseTime) / total;
  }

  private updateWaitTimeStats(waitTime: number): void {
    const total = this.stats.totalRequests;
    this.stats.avgWaitTime = 
      (this.stats.avgWaitTime * (total - 1) + waitTime) / total;
  }

  private recordQueryMetric(metric: QueryMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }
}

// Create singleton pool instance
let poolInstance: ConnectionPool | null = null;

/**
 * Get or create the connection pool instance
 */
export function getConnectionPool(
  config?: Partial<PoolConfig>
): ConnectionPool {
  if (!poolInstance) {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    
    poolInstance = new ConnectionPool(url, key, config);
  }
  
  return poolInstance;
}

/**
 * Query builder with connection pooling
 */
export class PooledQueryBuilder {
  private pool: ConnectionPool;

  constructor(pool?: ConnectionPool) {
    this.pool = pool || getConnectionPool();
  }

  /**
   * Select query with automatic pooling
   */
  async select<T>(
    table: string,
    options?: {
      columns?: string;
      filters?: Record<string, unknown>;
      orderBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    return this.pool.query(async (client) => {
      let query = client.from(table).select(options?.columns || '*');
      
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      if (options?.orderBy) {
        query = query.order(options.orderBy);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    });
  }

  /**
   * Insert with automatic pooling
   */
  async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<T[]> {
    return this.pool.query(async (client) => {
      const { data: result, error } = await client
        .from(table)
        .insert(data)
        .select();
      
      if (error) throw error;
      return result as T[];
    });
  }

  /**
   * Update with automatic pooling
   */
  async update<T>(
    table: string,
    data: Partial<T>,
    filters: Record<string, unknown>
  ): Promise<T[]> {
    return this.pool.query(async (client) => {
      let query = client.from(table).update(data);
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data: result, error } = await query.select();
      if (error) throw error;
      return result as T[];
    });
  }

  /**
   * Delete with automatic pooling
   */
  async delete(
    table: string,
    filters: Record<string, unknown>
  ): Promise<void> {
    return this.pool.query(async (client) => {
      let query = client.from(table).delete();
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { error } = await query;
      if (error) throw error;
    });
  }

  /**
   * Execute RPC with automatic pooling
   */
  async rpc<T>(
    functionName: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    return this.pool.query(async (client) => {
      const { data, error } = await client.rpc(functionName, params);
      if (error) throw error;
      return data as T;
    });
  }
}

// Export default query builder instance
export const db = new PooledQueryBuilder();