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
  /** Priority level for cache eviction (higher = kept longer) */
  priority?: 'low' | 'medium' | 'high';
}

// Optimized TTLs for different data types
export const CACHE_TTLS = {
  // Token lists change rarely - cache aggressively
  tokenList: { staleTime: 5 * 60 * 1000, maxAge: 30 * 60 * 1000 }, // 5min stale, 30min max
  // Prices are time-sensitive
  price: { staleTime: 10 * 1000, maxAge: 60 * 1000 }, // 10s stale, 1min max
  // Quotes need to be fresh
  quote: { staleTime: 5 * 1000, maxAge: 30 * 1000 }, // 5s stale, 30s max
  // Token info is stable
  tokenInfo: { staleTime: 10 * 60 * 1000, maxAge: 60 * 60 * 1000 }, // 10min stale, 1hr max
  // Balance data
  balance: { staleTime: 15 * 1000, maxAge: 2 * 60 * 1000 }, // 15s stale, 2min max
  // Default fallback
  default: { staleTime: 30 * 1000, maxAge: 5 * 60 * 1000 }, // 30s stale, 5min max
};

const DEFAULT_STALE_TIME = CACHE_TTLS.default.staleTime;
const DEFAULT_MAX_AGE = CACHE_TTLS.default.maxAge;
const MAX_CACHE_SIZE = 500;

class Cache {
  private store = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private accessOrder: string[] = []; // LRU tracking

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
      this.removeFromAccessOrder(key);
      return { data: null, isStale: true, isExpired: true };
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    
    return { data: entry.data as T, isStale, isExpired: false };
  }

  /**
   * Set cache entry with LRU eviction
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { staleTime = DEFAULT_STALE_TIME, maxAge = DEFAULT_MAX_AGE } = options;
    const now = Date.now();

    // Evict oldest entries if at capacity
    this.evictIfNeeded();

    this.store.set(key, {
      data,
      timestamp: now,
      staleAt: now + staleTime,
      expiresAt: now + maxAge,
    });
    
    this.updateAccessOrder(key);
  }
  
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }
  
  private removeFromAccessOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx > -1) {
      this.accessOrder.splice(idx, 1);
    }
  }
  
  private evictIfNeeded(): void {
    while (this.store.size >= MAX_CACHE_SIZE && this.accessOrder.length > 0) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.store.delete(oldest);
      }
    }
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
    this.removeFromAccessOrder(key);
  }

  /**
   * Clear all cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        this.removeFromAccessOrder(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.store.clear();
    this.pendingRequests.clear();
    this.accessOrder = [];
  }
  
  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
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
  tokenBalance: (chainIndex: string, address: string, wallet: string) => 
    `token-balance:${chainIndex}:${address}:${wallet}`,
  gasPrice: (chainIndex: string) => `gas-price:${chainIndex}`,
};
