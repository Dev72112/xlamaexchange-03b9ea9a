/**
 * API Request Coordinator
 * Prevents rate limiting through request deduplication, caching, and queuing
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// TTL in milliseconds for different data types
const CACHE_TTL = {
  price: 30000,        // 30s for prices (increased from 15s)
  quote: 20000,        // 20s for quotes (increased from 10s)
  tokens: 300000,      // 5min for token lists
  ranking: 60000,      // 1min for rankings
  balance: 45000,      // 45s for balances (increased from 30s)
} as const;

class ApiCoordinator {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private lastRequestTime = new Map<string, number>();
  private requestCounts = new Map<string, number>();
  
  // Global rate limiting
  private globalRequestCount = 0;
  private globalResetTime = Date.now();
  private readonly GLOBAL_RATE_LIMIT = 40; // requests per minute window
  private readonly GLOBAL_WINDOW_MS = 60000;
  
  // Minimum delay between requests to same action (ms)
  private readonly MIN_REQUEST_INTERVAL = 500;
  
  // Reset request counts every minute
  constructor() {
    setInterval(() => {
      this.requestCounts.clear();
      this.globalRequestCount = 0;
      this.globalResetTime = Date.now();
    }, 60000);
  }
  
  /**
   * Check if we're approaching global rate limit
   */
  isNearRateLimit(): boolean {
    this.resetGlobalIfNeeded();
    return this.globalRequestCount > this.GLOBAL_RATE_LIMIT * 0.8;
  }
  
  /**
   * Reset global counter if window has passed
   */
  private resetGlobalIfNeeded(): void {
    const now = Date.now();
    if (now - this.globalResetTime >= this.GLOBAL_WINDOW_MS) {
      this.globalRequestCount = 0;
      this.globalResetTime = now;
    }
  }
  
  /**
   * Wait for a slot if approaching rate limit
   */
  async waitForSlot(): Promise<void> {
    while (this.isNearRateLimit()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.resetGlobalIfNeeded();
    }
  }
  
  /**
   * Increment global request counter
   */
  private incrementGlobalCount(): void {
    this.resetGlobalIfNeeded();
    this.globalRequestCount++;
  }

  /**
   * Get cached data if valid
   */
  getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  setCache<T>(key: string, data: T, ttl: number = CACHE_TTL.price): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Execute request with deduplication
   * If the same request is already in-flight, returns the pending promise
   */
  async dedupe<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // Check cache first
    const cached = this.getFromCache<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending && Date.now() - pending.timestamp < 30000) {
      return pending.promise as Promise<T>;
    }
    
    // Increment global counter for rate awareness
    this.incrementGlobalCount();
    
    // Create new request
    const promise = fetcher()
      .then(data => {
        this.setCache(key, data, ttl);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch(err => {
        this.pendingRequests.delete(key);
        throw err;
      });
    
    this.pendingRequests.set(key, { promise, timestamp: Date.now() });
    return promise;
  }

  /**
   * Check if we should throttle a request
   */
  shouldThrottle(action: string): boolean {
    const lastTime = this.lastRequestTime.get(action) || 0;
    return Date.now() - lastTime < this.MIN_REQUEST_INTERVAL;
  }

  /**
   * Record that a request was made
   */
  recordRequest(action: string): void {
    this.lastRequestTime.set(action, Date.now());
    const count = this.requestCounts.get(action) || 0;
    this.requestCounts.set(action, count + 1);
  }

  /**
   * Get request count for an action in the current window
   */
  getRequestCount(action: string): number {
    return this.requestCounts.get(action) || 0;
  }

  /**
   * Invalidate cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const apiCoordinator = new ApiCoordinator();
export { CACHE_TTL };
