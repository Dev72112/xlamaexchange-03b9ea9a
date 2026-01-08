/**
 * Lightweight client-side cache with stale-while-revalidate behavior.
 * Reduces network spam and improves perceived performance.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
  expiresAt: number;
}

interface CacheOptions {
  /** Time in ms before data is considered stale (default: 30s) */
  staleTime?: number;
  /** Time in ms before cache entry expires completely (default: 5min) */
  maxAge?: number;
}

const DEFAULT_STALE_TIME = 30 * 1000; // 30 seconds
const DEFAULT_MAX_AGE = 5 * 60 * 1000; // 5 minutes

class Cache {
  private store = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Get cached data with stale-while-revalidate behavior
   */
  get<T>(key: string): { data: T | null; isStale: boolean; isExpired: boolean } {
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry) {
      return { data: null, isStale: true, isExpired: true };
    }

    const isExpired = now > entry.expiresAt;
    const isStale = now > entry.staleAt;

    if (isExpired) {
      this.store.delete(key);
      return { data: null, isStale: true, isExpired: true };
    }

    return { data: entry.data as T, isStale, isExpired: false };
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { staleTime = DEFAULT_STALE_TIME, maxAge = DEFAULT_MAX_AGE } = options;
    const now = Date.now();

    this.store.set(key, {
      data,
      timestamp: now,
      staleAt: now + staleTime,
      expiresAt: now + maxAge,
    });
  }

  /**
   * Fetch with stale-while-revalidate behavior
   * Returns cached data immediately if available, then revalidates in background if stale
   */
  async swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = this.get<T>(key);

    // If we have fresh data, return it
    if (cached.data && !cached.isStale) {
      return { data: cached.data, fromCache: true };
    }

    // If we have stale data, return it and revalidate in background
    if (cached.data && cached.isStale) {
      // Don't await - fire and forget revalidation
      this.revalidate(key, fetcher, options);
      return { data: cached.data, fromCache: true };
    }

    // No cached data - fetch fresh
    const data = await this.fetchAndCache(key, fetcher, options);
    return { data, fromCache: false };
  }

  /**
   * Fetch fresh data without checking cache first
   */
  async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Deduplicate concurrent requests for the same key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const request = fetcher()
      .then((data) => {
        this.set(key, data, options);
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Revalidate cache entry in background
   */
  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      await this.fetchAndCache(key, fetcher, options);
    } catch (error) {
      // Silent failure for background revalidation - stale data is still available
      console.debug(`Cache revalidation failed for key: ${key}`, error);
    }
  }

  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.store.clear();
    this.pendingRequests.clear();
  }
}

// Singleton instance
export const cache = new Cache();

// Cache key generators for common use cases
export const cacheKeys = {
  dexTokens: (chainIndex: string) => `dex-tokens:${chainIndex}`,
  dexQuote: (chainIndex: string, from: string, to: string, amount: string) =>
    `dex-quote:${chainIndex}:${from}:${to}:${amount}`,
  tokenPrice: (chainIndex: string, address: string) => `token-price:${chainIndex}:${address}`,
  tokenInfo: (chainIndex: string, address: string) => `token-info:${chainIndex}:${address}`,
};
