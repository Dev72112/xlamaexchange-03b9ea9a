/**
 * Token prefetching service for faster DEX loading
 * Prefetches token lists for common chains on app initialization
 */

import { cache, cacheKeys } from './cache';
import { okxDexService } from '@/services/okxdex';

// Priority chains to prefetch (most commonly used)
const PRIORITY_CHAINS = [
  '1',     // Ethereum
  '196',   // X Layer (primary)
  '56',    // BSC
  '8453',  // Base
  '42161', // Arbitrum
  '137',   // Polygon
];

// Secondary chains to prefetch after priority
const SECONDARY_CHAINS = [
  '10',    // Optimism
  '43114', // Avalanche
  '501',   // Solana
];

let prefetchStarted = false;
let prefetchComplete = false;

/**
 * Start prefetching token lists for common chains
 * Called once on app initialization
 */
export async function startTokenPrefetch(): Promise<void> {
  if (prefetchStarted) return;
  prefetchStarted = true;

  // Defer prefetch to not block initial render (P1 optimization)
  // Priority chains after 500ms to ensure FCP/LCP are not impacted
  setTimeout(async () => {
    await prefetchChains(PRIORITY_CHAINS);
    
    // Prefetch secondary chains with additional delay
    setTimeout(() => {
      prefetchChains(SECONDARY_CHAINS).then(() => {
        prefetchComplete = true;
        console.debug('[TokenPrefetch] All chains prefetched');
      });
    }, 3000);
  }, 500);
}

/**
 * Prefetch token lists for specified chains
 */
async function prefetchChains(chainIndexes: string[]): Promise<void> {
  const promises = chainIndexes.map(async (chainIndex) => {
    const cacheKey = cacheKeys.dexTokens(chainIndex);
    const { data } = cache.get(cacheKey);
    
    // Skip if already cached
    if (data) {
      console.debug(`[TokenPrefetch] Chain ${chainIndex} already cached`);
      return;
    }

    try {
      await cache.fetchAndCache(
        cacheKey,
        () => okxDexService.getTokens(chainIndex),
        { staleTime: 60000, maxAge: 5 * 60000 }
      );
      console.debug(`[TokenPrefetch] Prefetched chain ${chainIndex}`);
    } catch (err) {
      console.debug(`[TokenPrefetch] Failed to prefetch chain ${chainIndex}:`, err);
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Check if prefetch has completed
 */
export function isPrefetchComplete(): boolean {
  return prefetchComplete;
}

/**
 * Prefetch a specific chain (useful when user hovers over chain selector)
 */
export function prefetchChain(chainIndex: string): void {
  const cacheKey = cacheKeys.dexTokens(chainIndex);
  const { data } = cache.get(cacheKey);
  
  if (!data) {
    cache.fetchAndCache(
      cacheKey,
      () => okxDexService.getTokens(chainIndex),
      { staleTime: 60000, maxAge: 5 * 60000 }
    ).catch(() => {
      // Silent failure for prefetch
    });
  }
}
