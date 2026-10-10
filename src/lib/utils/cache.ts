/**
 * Lightweight, high-performance in-memory cache for serverless Node.js endpoints.
 * Dramatically cuts down database queries and network transfer bandwidth to Neon.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export const cache = {
  /**
   * Retrieve cached value or execute the fetcher and cache the result.
   * @param key Unique cache key
   * @param ttlSeconds Time-to-live in seconds
   * @param fetcher Async function returning the data
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

    if (entry && entry.expiresAt > now) {
      return entry.data;
    }

    const fresh = await fetcher();
    memoryCache.set(key, {
      data: fresh,
      expiresAt: now + ttlSeconds * 1000,
    });

    return fresh;
  },

  /**
   * Invalidate a single key or any key matching a prefix.
   */
  invalidate(keyOrPrefix: string) {
    if (memoryCache.has(keyOrPrefix)) {
      memoryCache.delete(keyOrPrefix);
      return;
    }
    for (const key of memoryCache.keys()) {
      if (key.startsWith(keyOrPrefix)) {
        memoryCache.delete(key);
      }
    }
  },

  /**
   * Clear entire cache.
   */
  clear() {
    memoryCache.clear();
  },
};
