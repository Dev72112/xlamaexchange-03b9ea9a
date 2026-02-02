/**
 * DexScreener API service for token price fallback
 * Free tier, no API key required
 * NOTE: X Layer (chainId 196) is NOT fully supported by DexScreener
 * Use CoinGecko/DefiLlama for X Layer tokens instead
 */

const DEXSCREENER_API = 'https://api.dexscreener.com';

// OKX chainIndex to DexScreener chain ID mapping
// DexScreener uses chain slugs, not numeric IDs
const chainIndexToDexScreener: Record<string, string> = {
  '1': 'ethereum',
  '56': 'bsc',
  '137': 'polygon',
  '42161': 'arbitrum',
  '10': 'optimism',
  '8453': 'base',
  '43114': 'avalanche',
  '250': 'fantom',
  '324': 'zksync',
  '59144': 'linea',
  '534352': 'scroll',
  '1101': 'polygon-zkevm',
  '5000': 'mantle',
  '81457': 'blast',
  '7777777': 'zora',
  // X Layer (196) is NOT supported by DexScreener
  // Solana and other non-EVM chains
  '501': 'solana',
};

export interface DexScreenerPrice {
  priceUsd: number;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  pairAddress: string;
  dexId: string;
}

interface DexScreenerPair {
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  pairAddress?: string;
  dexId?: string;
}

interface CacheEntry {
  data: DexScreenerPrice;
  timestamp: number;
}

class DexScreenerService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout = 60000; // 60 second cache

  /**
   * Check if a chain is supported by DexScreener
   */
  isChainSupported(chainIndex: string): boolean {
    return chainIndex in chainIndexToDexScreener;
  }

  /**
   * Get token price from DexScreener API
   * Returns the price from the pair with highest liquidity
   */
  async getPrice(chainIndex: string, tokenAddress: string): Promise<number | null> {
    const chain = chainIndexToDexScreener[chainIndex];
    if (!chain) {
      // Chain not supported by DexScreener (e.g., X Layer)
      return null;
    }

    const cacheKey = `${chainIndex}-${tokenAddress.toLowerCase()}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data.priceUsd;
    }

    try {
      // Use the token endpoint to get all pairs for this token
      const response = await fetch(
        `${DEXSCREENER_API}/tokens/v1/${chain}/${tokenAddress}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.warn(`DexScreener API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const pairs: DexScreenerPair[] = data.pairs || data || [];

      if (!Array.isArray(pairs) || pairs.length === 0) {
        return null;
      }

      // Sort by liquidity and get the best pair
      const sortedPairs = pairs
        .filter(p => p.priceUsd && parseFloat(p.priceUsd) > 0)
        .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

      if (sortedPairs.length === 0) {
        return null;
      }

      const bestPair = sortedPairs[0];
      const priceUsd = parseFloat(bestPair.priceUsd!);

      // Cache the result
      const priceData: DexScreenerPrice = {
        priceUsd,
        priceChange24h: bestPair.priceChange?.h24 ?? null,
        volume24h: bestPair.volume?.h24 ?? null,
        liquidity: bestPair.liquidity?.usd ?? null,
        pairAddress: bestPair.pairAddress || '',
        dexId: bestPair.dexId || '',
      };

      this.cache.set(cacheKey, { data: priceData, timestamp: Date.now() });

      return priceUsd;
    } catch (error) {
      console.warn(`DexScreener price fetch failed for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get full price info including 24h change and liquidity
   */
  async getPriceInfo(chainIndex: string, tokenAddress: string): Promise<DexScreenerPrice | null> {
    const chain = chainIndexToDexScreener[chainIndex];
    if (!chain) return null;

    const cacheKey = `${chainIndex}-${tokenAddress.toLowerCase()}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${DEXSCREENER_API}/tokens/v1/${chain}/${tokenAddress}`,
        {
          headers: { 'Accept': 'application/json' },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const pairs: DexScreenerPair[] = data.pairs || data || [];

      if (!Array.isArray(pairs) || pairs.length === 0) return null;

      const sortedPairs = pairs
        .filter(p => p.priceUsd && parseFloat(p.priceUsd) > 0)
        .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

      if (sortedPairs.length === 0) return null;

      const bestPair = sortedPairs[0];
      const priceData: DexScreenerPrice = {
        priceUsd: parseFloat(bestPair.priceUsd!),
        priceChange24h: bestPair.priceChange?.h24 ?? null,
        volume24h: bestPair.volume?.h24 ?? null,
        liquidity: bestPair.liquidity?.usd ?? null,
        pairAddress: bestPair.pairAddress || '',
        dexId: bestPair.dexId || '',
      };

      this.cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
      return priceData;
    } catch (error) {
      console.warn(`DexScreener info fetch failed:`, error);
      return null;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const dexScreenerService = new DexScreenerService();
