import { useState, useEffect, useCallback, useRef } from 'react';
import { okxDexService, TokenPriceInfo } from '@/services/okxdex';
import { apiCoordinator, CACHE_TTL } from '@/lib/apiCoordinator';

const WATCHLIST_KEY = 'xlama_token_watchlist';
const WATCHLIST_PRICES_KEY = 'xlama_token_watchlist_prices';

export interface WatchlistToken {
  chainIndex: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenLogoUrl: string;
  decimals: string;
}

export interface WatchlistTokenWithPrice extends WatchlistToken {
  price?: string;
  change24H?: string;
  marketCap?: string;
  volume24H?: string;
  isLoading?: boolean;
}

interface CachedPrices {
  [key: string]: {
    price?: string;
    change24H?: string;
    marketCap?: string;
    volume24H?: string;
    timestamp: number;
  };
}

export function useTokenWatchlist() {
  const [tokens, setTokens] = useState<WatchlistToken[]>(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [tokensWithPrices, setTokensWithPrices] = useState<WatchlistTokenWithPrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load cached prices on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(WATCHLIST_PRICES_KEY);
      if (cached) {
        const prices: CachedPrices = JSON.parse(cached);
        const now = Date.now();
        
        // Initialize with cached prices if not too stale (5 min)
        const initialTokens = tokens.map(token => {
          const key = `${token.chainIndex}:${token.tokenContractAddress.toLowerCase()}`;
          const cachedPrice = prices[key];
          if (cachedPrice && now - cachedPrice.timestamp < 300000) {
            return {
              ...token,
              price: cachedPrice.price,
              change24H: cachedPrice.change24H,
              marketCap: cachedPrice.marketCap,
              volume24H: cachedPrice.volume24H,
              isLoading: false,
            };
          }
          return { ...token, isLoading: true };
        });
        
        setTokensWithPrices(initialTokens);
      }
    } catch {
      // Ignore cache errors
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(tokens));
  }, [tokens]);

  // Fetch prices for all tokens - optimistic updates
  const fetchPrices = useCallback(async () => {
    if (tokens.length === 0 || !mountedRef.current) {
      setTokensWithPrices([]);
      return;
    }

    setIsLoadingPrices(true);
    
    // Set loading state for tokens without prices
    setTokensWithPrices(prev => 
      prev.length === tokens.length 
        ? prev.map(t => ({ ...t, isLoading: !t.price }))
        : tokens.map(t => ({ ...t, isLoading: true }))
    );
    
    const pricesCache: CachedPrices = {};

    // Fetch prices individually to update UI progressively
    for (const token of tokens) {
      if (!mountedRef.current) break;
      
      const cacheKey = `token-price:${token.chainIndex}:${token.tokenContractAddress}`;
      
      try {
        const priceInfo = await apiCoordinator.dedupe(
          cacheKey,
          async () => {
            apiCoordinator.recordRequest('token-price-info');
            return okxDexService.getTokenPriceInfo(
              token.chainIndex,
              token.tokenContractAddress
            );
          },
          CACHE_TTL.price
        );
        
        if (!mountedRef.current) break;
        
        const key = `${token.chainIndex}:${token.tokenContractAddress.toLowerCase()}`;
        pricesCache[key] = {
          price: priceInfo?.price,
          change24H: priceInfo?.priceChange24H,
          marketCap: priceInfo?.marketCap,
          volume24H: priceInfo?.volume24H,
          timestamp: Date.now(),
        };
        
        // Update this token immediately
        setTokensWithPrices(prev => 
          prev.map(t => 
            t.chainIndex === token.chainIndex && 
            t.tokenContractAddress.toLowerCase() === token.tokenContractAddress.toLowerCase()
              ? {
                  ...t,
                  price: priceInfo?.price,
                  change24H: priceInfo?.priceChange24H,
                  marketCap: priceInfo?.marketCap,
                  volume24H: priceInfo?.volume24H,
                  isLoading: false,
                }
              : t
          )
        );
      } catch {
        // Mark as not loading even on error
        setTokensWithPrices(prev => 
          prev.map(t => 
            t.chainIndex === token.chainIndex && 
            t.tokenContractAddress.toLowerCase() === token.tokenContractAddress.toLowerCase()
              ? { ...t, isLoading: false }
              : t
          )
        );
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Cache prices
    try {
      localStorage.setItem(WATCHLIST_PRICES_KEY, JSON.stringify(pricesCache));
    } catch {
      // Ignore storage errors
    }

    if (mountedRef.current) {
      setIsLoadingPrices(false);
    }
  }, [tokens]);

  // Initialize tokensWithPrices when tokens change
  useEffect(() => {
    if (tokens.length === 0) {
      setTokensWithPrices([]);
      return;
    }
    
    // Preserve existing prices for tokens that haven't changed
    setTokensWithPrices(prev => {
      const prevMap = new Map(
        prev.map(t => [`${t.chainIndex}:${t.tokenContractAddress.toLowerCase()}`, t])
      );
      
      return tokens.map(token => {
        const key = `${token.chainIndex}:${token.tokenContractAddress.toLowerCase()}`;
        const existing = prevMap.get(key);
        if (existing) {
          return { ...existing, ...token };
        }
        return { ...token, isLoading: true };
      });
    });
  }, [tokens]);

  // Fetch prices on mount and when tokens change
  useEffect(() => {
    fetchPrices();
    
    // Auto-refresh every 45 seconds (increased from 30s)
    intervalRef.current = setInterval(fetchPrices, 45000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices]);

  const addToken = useCallback((token: WatchlistToken) => {
    setTokens(prev => {
      const exists = prev.some(
        t => t.chainIndex === token.chainIndex && 
             t.tokenContractAddress.toLowerCase() === token.tokenContractAddress.toLowerCase()
      );
      if (exists) return prev;
      return [...prev, token];
    });
  }, []);

  const removeToken = useCallback((chainIndex: string, tokenContractAddress: string) => {
    setTokens(prev => 
      prev.filter(
        t => !(t.chainIndex === chainIndex && 
               t.tokenContractAddress.toLowerCase() === tokenContractAddress.toLowerCase())
      )
    );
  }, []);

  const isInWatchlist = useCallback((chainIndex: string, tokenContractAddress: string) => {
    return tokens.some(
      t => t.chainIndex === chainIndex && 
           t.tokenContractAddress.toLowerCase() === tokenContractAddress.toLowerCase()
    );
  }, [tokens]);

  const toggleToken = useCallback((token: WatchlistToken) => {
    if (isInWatchlist(token.chainIndex, token.tokenContractAddress)) {
      removeToken(token.chainIndex, token.tokenContractAddress);
    } else {
      addToken(token);
    }
  }, [isInWatchlist, addToken, removeToken]);

  return {
    tokens: tokensWithPrices,
    rawTokens: tokens,
    isLoadingPrices,
    addToken,
    removeToken,
    toggleToken,
    isInWatchlist,
    refreshPrices: fetchPrices,
  };
}
