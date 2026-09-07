import Redis from 'ioredis';
import { config } from '../config/env';

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

let redisClient: Redis | null = null;
let isRedisConnected = false;

// In-Memory Fallback Cache for local preview/development
const memoryStore = new Map<string, CacheEntry>();

// Clean expired entries periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 30000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export async function initRedis(): Promise<void> {
  if (config.redisUrl) {
    try {
      console.log('[Redis] Attempting connection via REDIS_URL...');
      const client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
      });

      client.on('error', (err) => {
        console.warn('[Redis] Connection notice:', err.message);
        isRedisConnected = false;
      });

      await client.connect();
      redisClient = client;
      isRedisConnected = true;
      console.log('[Redis] Connected to Redis server successfully.');
      return;
    } catch (err: any) {
      console.warn(`[Redis] Redis unavailable (${err.message}). Using in-memory temporary cache engine.`);
      isRedisConnected = false;
    }
  } else {
    console.log('[Redis] No REDIS_URL configured. Running with in-memory temporary cache engine.');
  }
}

export const cache = {
  isAvailable(): boolean {
    return isRedisConnected;
  },

  /**
   * Set string value with optional TTL (seconds)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (isRedisConnected && redisClient) {
      if (ttlSeconds && ttlSeconds > 0) {
        await redisClient.set(key, value, 'EX', ttlSeconds);
      } else {
        await redisClient.set(key, value);
      }
      return;
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    memoryStore.set(key, { value, expiresAt });
  },

  /**
   * Get string value by key
   */
  async get(key: string): Promise<string | null> {
    if (isRedisConnected && redisClient) {
      return redisClient.get(key);
    }

    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  /**
   * Delete key
   */
  async del(key: string): Promise<void> {
    if (isRedisConnected && redisClient) {
      await redisClient.del(key);
      return;
    }
    memoryStore.delete(key);
  },

  /**
   * Increment counter with optional TTL
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (isRedisConnected && redisClient) {
      const count = await redisClient.incr(key);
      if (count === 1 && ttlSeconds && ttlSeconds > 0) {
        await redisClient.expire(key, ttlSeconds);
      }
      return count;
    }

    const entry = memoryStore.get(key);
    let val = 0;
    if (entry && (!entry.expiresAt || entry.expiresAt > Date.now())) {
      val = parseInt(entry.value, 10) || 0;
    }
    val += 1;
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    memoryStore.set(key, { value: val.toString(), expiresAt });
    return val;
  },

  /**
   * Set JSON object
   */
  async setJson(key: string, obj: any, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(obj), ttlSeconds);
  },

  /**
   * Get JSON object
   */
  async getJson<T = any>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
};
