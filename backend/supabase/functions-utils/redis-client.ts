/**
 * Real Redis client implementation using ioredis
 * Provides connection pooling, automatic reconnection, and error handling
 */

import Redis from 'ioredis';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  maxRetries?: number;
  retryDelay?: number;
  connectionTimeout?: number;
  commandTimeout?: number;
  enableCompression?: boolean;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export interface RedisClientInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<'OK' | null>;
  setex(key: string, ttl: number, value: string): Promise<'OK' | null>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string, pattern?: string, count?: number): Promise<[string, string[]]>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(keysAndValues: [string, string][]): Promise<'OK' | null>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  decrby(key: string, decrement: number): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
  zadd(key: string, ...scoreMembers: (string | number)[]): Promise<number>;
  zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>;
  zrem(key: string, ...members: string[]): Promise<number>;
  flushdb(): Promise<'OK'>;
  flushall(): Promise<'OK'>;
  ping(): Promise<'PONG'>;
  pipeline(): RedisPipeline;
  multi(): RedisTransaction;
  isConnected(): boolean;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
}

export class RedisPipeline {
  private redis: Redis;
  private pipeline: any;

  constructor(redis: Redis) {
    this.redis = redis;
    this.pipeline = redis.pipeline();
  }

  get(key: string): this {
    this.pipeline.get(key);
    return this;
  }

  set(key: string, value: string): this {
    this.pipeline.set(key, value);
    return this;
  }

  setex(key: string, ttl: number, value: string): this {
    this.pipeline.setex(key, ttl, value);
    return this;
  }

  del(key: string | string[]): this {
    if (Array.isArray(key)) {
      this.pipeline.del(...key);
    } else {
      this.pipeline.del(key);
    }
    return this;
  }

  expire(key: string, ttl: number): this {
    this.pipeline.expire(key, ttl);
    return this;
  }

  incr(key: string): this {
    this.pipeline.incr(key);
    return this;
  }

  hset(key: string, field: string, value: string): this {
    this.pipeline.hset(key, field, value);
    return this;
  }

  sadd(key: string, ...members: string[]): this {
    this.pipeline.sadd(key, ...members);
    return this;
  }

  zadd(key: string, ...scoreMembers: (string | number)[]): this {
    this.pipeline.zadd(key, ...scoreMembers);
    return this;
  }

  async exec(): Promise<any[]> {
    return await this.pipeline.exec();
  }
}

export class RedisTransaction {
  private redis: Redis;
  private multi: any;

  constructor(redis: Redis) {
    this.redis = redis;
    this.multi = redis.multi();
  }

  watch(...keys: string[]): this {
    this.multi.watch(...keys);
    return this;
  }

  get(key: string): this {
    this.multi.get(key);
    return this;
  }

  set(key: string, value: string): this {
    this.multi.set(key, value);
    return this;
  }

  setex(key: string, ttl: number, value: string): this {
    this.multi.setex(key, ttl, value);
    return this;
  }

  del(key: string | string[]): this {
    if (Array.isArray(key)) {
      this.multi.del(...key);
    } else {
      this.multi.del(key);
    }
    return this;
  }

  incr(key: string): this {
    this.multi.incr(key);
    return this;
  }

  async exec(): Promise<any[] | null> {
    return await this.multi.exec();
  }

  discard(): void {
    this.multi.discard();
  }
}

export class RedisClientImpl implements RedisClientInterface {
  private redis: Redis | null = null;
  private config: RedisConfig;
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: RedisConfig) {
    this.config = {
      maxRetries: 10,
      retryDelay: 1000,
      connectionTimeout: 10000,
      commandTimeout: 5000,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...config
    };
  }

  async connect(): Promise<void> {
    if (this.connected && this.redis) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    await this.connectionPromise;
    this.connectionPromise = null;
  }

  private async _connect(): Promise<void> {
    try {
      const options: any = {
        retryStrategy: (times: number) => {
          if (times > (this.config.maxRetries || 10)) {
            return null; // Stop retrying
          }
          return Math.min(times * (this.config.retryDelay || 1000), 5000);
        },
        connectTimeout: this.config.connectionTimeout,
        commandTimeout: this.config.commandTimeout,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        lazyConnect: this.config.lazyConnect,
      };

      if (this.config.url) {
        // Parse Redis URL (redis://[password@]host:port[/db])
        this.redis = new Redis(this.config.url, options);
      } else {
        this.redis = new Redis({
          host: this.config.host || 'localhost',
          port: this.config.port || 6379,
          password: this.config.password,
          db: this.config.db || 0,
          ...options
        });
      }

      // Set up event listeners
      this.redis.on('connect', () => {
        this.connected = true;
        console.log('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        console.error('Redis error:', error);
      });

      this.redis.on('close', () => {
        this.connected = false;
        console.log('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      // If not lazy connecting, wait for connection
      if (!this.config.lazyConnect) {
        await this.redis.connect();
      }

      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && this.redis !== null && this.redis.status === 'ready';
  }

  private ensureConnected(): void {
    if (!this.redis) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
  }

  async get(key: string): Promise<string | null> {
    this.ensureConnected();
    return await this.redis!.get(key);
  }

  async set(key: string, value: string): Promise<'OK' | null> {
    this.ensureConnected();
    return await this.redis!.set(key, value) as 'OK' | null;
  }

  async setex(key: string, ttl: number, value: string): Promise<'OK' | null> {
    this.ensureConnected();
    return await this.redis!.setex(key, ttl, value) as 'OK' | null;
  }

  async del(key: string | string[]): Promise<number> {
    this.ensureConnected();
    if (Array.isArray(key)) {
      return await this.redis!.del(...key);
    }
    return await this.redis!.del(key);
  }

  async exists(key: string): Promise<number> {
    this.ensureConnected();
    return await this.redis!.exists(key);
  }

  async expire(key: string, ttl: number): Promise<number> {
    this.ensureConnected();
    return await this.redis!.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    this.ensureConnected();
    return await this.redis!.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    this.ensureConnected();
    return await this.redis!.keys(pattern);
  }

  async scan(cursor: string, pattern?: string, count?: number): Promise<[string, string[]]> {
    this.ensureConnected();
    const args: any[] = [cursor];
    if (pattern) {
      args.push('MATCH', pattern);
    }
    if (count) {
      args.push('COUNT', count);
    }
    return await this.redis!.scan(...args);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    this.ensureConnected();
    if (keys.length === 0) return [];
    return await this.redis!.mget(...keys);
  }

  async mset(keysAndValues: [string, string][]): Promise<'OK' | null> {
    this.ensureConnected();
    if (keysAndValues.length === 0) return 'OK';
    const flat = keysAndValues.flat();
    return await this.redis!.mset(...flat) as 'OK' | null;
  }

  async incr(key: string): Promise<number> {
    this.ensureConnected();
    return await this.redis!.incr(key);
  }

  async decr(key: string): Promise<number> {
    this.ensureConnected();
    return await this.redis!.decr(key);
  }

  async incrby(key: string, increment: number): Promise<number> {
    this.ensureConnected();
    return await this.redis!.incrby(key, increment);
  }

  async decrby(key: string, decrement: number): Promise<number> {
    this.ensureConnected();
    return await this.redis!.decrby(key, decrement);
  }

  async hget(key: string, field: string): Promise<string | null> {
    this.ensureConnected();
    return await this.redis!.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    this.ensureConnected();
    return await this.redis!.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    this.ensureConnected();
    return await this.redis!.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    this.ensureConnected();
    return await this.redis!.hdel(key, ...fields);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    this.ensureConnected();
    return await this.redis!.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    this.ensureConnected();
    return await this.redis!.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    this.ensureConnected();
    return await this.redis!.srem(key, ...members);
  }

  async zadd(key: string, ...scoreMembers: (string | number)[]): Promise<number> {
    this.ensureConnected();
    return await this.redis!.zadd(key, ...scoreMembers);
  }

  async zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    this.ensureConnected();
    if (withScores) {
      return await this.redis!.zrange(key, start, stop, 'WITHSCORES');
    }
    return await this.redis!.zrange(key, start, stop);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    this.ensureConnected();
    return await this.redis!.zrem(key, ...members);
  }

  async flushdb(): Promise<'OK'> {
    this.ensureConnected();
    return await this.redis!.flushdb();
  }

  async flushall(): Promise<'OK'> {
    this.ensureConnected();
    return await this.redis!.flushall();
  }

  async ping(): Promise<'PONG'> {
    this.ensureConnected();
    return await this.redis!.ping() as 'PONG';
  }

  pipeline(): RedisPipeline {
    this.ensureConnected();
    return new RedisPipeline(this.redis!);
  }

  multi(): RedisTransaction {
    this.ensureConnected();
    return new RedisTransaction(this.redis!);
  }

  on(event: string, listener: (...args: any[]) => void): void {
    if (this.redis) {
      this.redis.on(event, listener);
    }
  }

  off(event: string, listener: (...args: any[]) => void): void {
    if (this.redis) {
      this.redis.off(event, listener);
    }
  }
}

// Create a singleton instance
let redisClient: RedisClientImpl | null = null;

export function getRedisClient(config?: RedisConfig): RedisClientImpl {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new RedisClientImpl(config || { url: redisUrl });
  }
  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
  }
}