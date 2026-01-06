import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { okxDexService } from '@/services/okxdex';

const STORAGE_KEY = 'xlama_price_oracle';
const PRICE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_REFRESH_INTERVAL = 60 * 1000; // 60 seconds

export interface PriceEntry {
  chainIndex: string;
  tokenAddress: string;
  symbol: string;
  price: number;
  change24h?: number;
  volume24h?: number;
  marketCap?: number;
  updatedAt: number;
}

interface PriceOracleContextType {
  // Store a price
  setPrice: (
    chainIndex: string, 
    tokenAddress: string, 
    symbol: string, 
    price: number, 
    change24h?: number,
    extra?: { volume24h?: number; marketCap?: number }
  ) => void;
  
  // Batch update prices
  setPrices: (prices: Omit<PriceEntry, 'updatedAt'>[]) => void;
  
  // Get a single price (returns null if not found or expired)
  getPrice: (chainIndex: string, tokenAddress: string) => number | null;
  
  // Get full entry
  getPriceEntry: (chainIndex: string, tokenAddress: string) => PriceEntry | null;
  
  // Calculate USD value from cached price
  getUsdValue: (chainIndex: string, tokenAddress: string, amount: string | number) => number;
  
  // Get all cached prices (for display in Live Prices widget)
  getAllPrices: () => PriceEntry[];
  
  // Manually refresh prices for a list of tokens
  refreshPrices: (tokens: { chainIndex: string; tokenAddress: string }[]) => Promise<void>;
  
  // Check if a price exists and is fresh
  hasFreshPrice: (chainIndex: string, tokenAddress: string) => boolean;
}

const PriceOracleContext = createContext<PriceOracleContextType | null>(null);

function makeKey(chainIndex: string, tokenAddress: string): string {
  return `${chainIndex}-${tokenAddress.toLowerCase()}`;
}

interface PriceOracleProviderProps {
  children: ReactNode;
}

export function PriceOracleProvider({ children }: PriceOracleProviderProps) {
  const [priceMap, setPriceMap] = useState<Map<string, PriceEntry>>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PriceEntry[];
        const now = Date.now();
        // Filter out expired entries
        const fresh = parsed.filter(e => now - e.updatedAt < PRICE_TTL_MS);
        return new Map(fresh.map(e => [makeKey(e.chainIndex, e.tokenAddress), e]));
      }
    } catch (e) {
      console.warn('Failed to load price oracle from storage:', e);
    }
    return new Map();
  });

  // Track last refresh to prevent hammering
  const lastRefreshRef = useRef<number>(0);

  // Persist to localStorage whenever priceMap changes
  useEffect(() => {
    const entries = Array.from(priceMap.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [priceMap]);

  // Background refresh for cached tokens
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Get tokens that are > 30 seconds old (stale but not expired)
      const staleTokens = Array.from(priceMap.values())
        .filter(e => now - e.updatedAt > 30000)
        .slice(0, 10) // Limit batch size
        .map(e => ({ chainIndex: e.chainIndex, tokenAddress: e.tokenAddress }));
      
      if (staleTokens.length > 0 && now - lastRefreshRef.current > 30000) {
        lastRefreshRef.current = now;
        refreshPrices(staleTokens).catch(console.error);
      }
    }, BATCH_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [priceMap]);

  const setPrice = useCallback((
    chainIndex: string,
    tokenAddress: string,
    symbol: string,
    price: number,
    change24h?: number,
    extra?: { volume24h?: number; marketCap?: number }
  ) => {
    const key = makeKey(chainIndex, tokenAddress);
    setPriceMap(prev => {
      const newMap = new Map(prev);
      newMap.set(key, {
        chainIndex,
        tokenAddress: tokenAddress.toLowerCase(),
        symbol,
        price,
        change24h,
        volume24h: extra?.volume24h,
        marketCap: extra?.marketCap,
        updatedAt: Date.now(),
      });
      return newMap;
    });
  }, []);

  const setPrices = useCallback((prices: Omit<PriceEntry, 'updatedAt'>[]) => {
    setPriceMap(prev => {
      const newMap = new Map(prev);
      const now = Date.now();
      prices.forEach(p => {
        const key = makeKey(p.chainIndex, p.tokenAddress);
        newMap.set(key, { ...p, tokenAddress: p.tokenAddress.toLowerCase(), updatedAt: now });
      });
      return newMap;
    });
  }, []);

  const getPrice = useCallback((chainIndex: string, tokenAddress: string): number | null => {
    const key = makeKey(chainIndex, tokenAddress);
    const entry = priceMap.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.updatedAt > PRICE_TTL_MS) {
      return null;
    }
    return entry.price;
  }, [priceMap]);

  const getPriceEntry = useCallback((chainIndex: string, tokenAddress: string): PriceEntry | null => {
    const key = makeKey(chainIndex, tokenAddress);
    const entry = priceMap.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.updatedAt > PRICE_TTL_MS) {
      return null;
    }
    return entry;
  }, [priceMap]);

  const getUsdValue = useCallback((chainIndex: string, tokenAddress: string, amount: string | number): number => {
    const price = getPrice(chainIndex, tokenAddress);
    if (price === null) return 0;
    
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(amountNum)) return 0;
    
    return amountNum * price;
  }, [getPrice]);

  const getAllPrices = useCallback((): PriceEntry[] => {
    const now = Date.now();
    return Array.from(priceMap.values())
      .filter(e => now - e.updatedAt < PRICE_TTL_MS)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [priceMap]);

  const hasFreshPrice = useCallback((chainIndex: string, tokenAddress: string): boolean => {
    const key = makeKey(chainIndex, tokenAddress);
    const entry = priceMap.get(key);
    if (!entry) return false;
    return Date.now() - entry.updatedAt < PRICE_TTL_MS;
  }, [priceMap]);

  const refreshPrices = useCallback(async (tokens: { chainIndex: string; tokenAddress: string }[]) => {
    // Batch fetch prices
    for (const token of tokens) {
      try {
        const priceInfo = await okxDexService.getTokenPriceInfo(token.chainIndex, token.tokenAddress);
        if (priceInfo?.price) {
          const key = makeKey(token.chainIndex, token.tokenAddress);
          const existing = priceMap.get(key);
          
          setPrice(
            token.chainIndex,
            token.tokenAddress,
            existing?.symbol || 'Unknown',
            parseFloat(priceInfo.price),
            parseFloat(priceInfo.priceChange24H || '0'),
            {
              volume24h: parseFloat(priceInfo.volume24H || '0'),
              marketCap: parseFloat(priceInfo.marketCap || '0'),
            }
          );
        }
      } catch (err) {
        console.warn(`Failed to refresh price for ${token.chainIndex}-${token.tokenAddress}:`, err);
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }
  }, [priceMap, setPrice]);

  const value: PriceOracleContextType = {
    setPrice,
    setPrices,
    getPrice,
    getPriceEntry,
    getUsdValue,
    getAllPrices,
    refreshPrices,
    hasFreshPrice,
  };

  return (
    <PriceOracleContext.Provider value={value}>
      {children}
    </PriceOracleContext.Provider>
  );
}

export function usePriceOracle(): PriceOracleContextType {
  const context = useContext(PriceOracleContext);
  if (!context) {
    throw new Error('usePriceOracle must be used within a PriceOracleProvider');
  }
  return context;
}

// Optional hook for components that may not have the provider
export function usePriceOracleOptional(): PriceOracleContextType | null {
  return useContext(PriceOracleContext);
}
