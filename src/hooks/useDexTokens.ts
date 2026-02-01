import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { cache, cacheKeys } from '@/lib/cache';

// Solana native token address (Wrapped SOL mint)
const SOLANA_NATIVE_SOL = 'So11111111111111111111111111111111111111112';

// Non-EVM native token addresses to filter from API responses
const NON_EVM_NATIVE_TOKENS: Record<string, { symbols: string[]; addresses: string[] }> = {
  // Solana (501)
  '501': {
    symbols: ['SOL', 'WSOL'],
    addresses: ['11111111111111111111111111111111', SOLANA_NATIVE_SOL],
  },
  // Tron (195)
  '195': {
    symbols: ['TRX', 'WTRX'],
    addresses: ['T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR'],
  },
  // Sui (784)
  '784': {
    symbols: ['SUI', 'WSUI'],
    addresses: ['0x2::sui::SUI', '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'],
  },
  // TON (607)
  '607': {
    symbols: ['TON', 'WTON'],
    addresses: ['EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA'],
  },
};

export function useDexTokens(chain: Chain | null) {
  const [rawTokens, setRawTokens] = useState<OkxToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevChainRef = useRef<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Defer initial fetch until after first paint (P1 optimization)
  useEffect(() => {
    // Use requestIdleCallback for better FCP/LCP
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => setHasMounted(true), { timeout: 1000 });
    } else {
      // Fallback for Safari
      setTimeout(() => setHasMounted(true), 100);
    }
  }, []);

  const fetchTokens = useCallback(async () => {
    if (!chain || !hasMounted) {
      if (!chain) setRawTokens([]);
      return;
    }

    const cacheKey = cacheKeys.dexTokens(chain.chainIndex);

    // Try to get cached data first (stale-while-revalidate)
    const { data: cachedData, isStale } = cache.get<OkxToken[]>(cacheKey);
    
    if (cachedData && !isStale) {
      // Fresh cached data - use it directly
      setRawTokens(cachedData);
      return;
    }

    if (cachedData) {
      // Stale cached data - show it immediately while fetching fresh
      setRawTokens(cachedData);
    }

    setIsLoading(!cachedData);
    setError(null);

    try {
      const { data } = await cache.swr(
        cacheKey,
        () => okxDexService.getTokens(chain.chainIndex),
        { staleTime: 60000, maxAge: 5 * 60000 } // 1 min stale, 5 min max
      );
      setRawTokens(data || []);
    } catch (err) {
      console.error('Failed to fetch DEX tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
      if (!cachedData) setRawTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [chain?.chainIndex, hasMounted]);

  // Clear tokens immediately when chain changes to prevent stale data
  useEffect(() => {
    const currentChain = chain?.chainIndex ?? null;
    if (prevChainRef.current !== null && prevChainRef.current !== currentChain) {
      // Chain changed - clear tokens immediately to prevent showing stale data
      setRawTokens([]);
      setError(null);
    }
    prevChainRef.current = currentChain;
    if (hasMounted) {
      fetchTokens();
    }
  }, [chain?.chainIndex, fetchTokens, hasMounted]);

  // Deduplicate tokens - keep ones with valid logos and proper names
  const tokens = useMemo(() => {
    const seen = new Map<string, OkxToken>();
    const symbolMap = new Map<string, OkxToken>(); // Track best token per symbol
    
    for (const token of rawTokens) {
      if (!token.tokenSymbol || !token.tokenContractAddress) continue;
      
      // Skip native token (handled separately)
      if (token.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()) continue;
      
      // CRITICAL: Skip native token variants for non-EVM chains
      // This prevents "fake" native tokens from appearing in the list
      const chainIndex = chain?.chainIndex;
      if (chainIndex && NON_EVM_NATIVE_TOKENS[chainIndex]) {
        const nativeConfig = NON_EVM_NATIVE_TOKENS[chainIndex];
        const symbol = token.tokenSymbol?.toUpperCase();
        const addr = token.tokenContractAddress;
        
        // Skip any native token variants from API response
        if (nativeConfig.symbols.includes(symbol) || 
            nativeConfig.addresses.includes(addr)) {
          continue;
        }
      }
      
      const key = token.tokenContractAddress.toLowerCase();
      const symbolKey = token.tokenSymbol.toUpperCase();
      
      // Check if we already have this exact contract address
      if (seen.has(key)) continue;
      
      // Check for valid logo
      const hasValidLogo = token.tokenLogoUrl && 
        !token.tokenLogoUrl.includes('undefined') && 
        !token.tokenLogoUrl.includes('null') &&
        token.tokenLogoUrl.startsWith('http');
      
      // Check for duplicate symbols with different addresses - keep best one
      const existingWithSymbol = symbolMap.get(symbolKey);
      
      if (existingWithSymbol) {
        const existingHasValidLogo = existingWithSymbol.tokenLogoUrl && 
          !existingWithSymbol.tokenLogoUrl.includes('undefined') && 
          !existingWithSymbol.tokenLogoUrl.includes('null') &&
          existingWithSymbol.tokenLogoUrl.startsWith('http');
        
        // Prefer token with valid logo and proper name (not just symbol)
        const hasBetterName = token.tokenName && 
          token.tokenName.length > symbolKey.length &&
          token.tokenName.toLowerCase() !== symbolKey.toLowerCase();
        const existingHasBetterName = existingWithSymbol.tokenName && 
          existingWithSymbol.tokenName.length > symbolKey.length &&
          existingWithSymbol.tokenName.toLowerCase() !== symbolKey.toLowerCase();
        
        // Score tokens: logo worth 2 points, good name worth 1 point
        const score = (hasValidLogo ? 2 : 0) + (hasBetterName ? 1 : 0);
        const existingScore = (existingHasValidLogo ? 2 : 0) + (existingHasBetterName ? 1 : 0);
        
        if (score > existingScore) {
          // Remove old one and add new one
          seen.delete(existingWithSymbol.tokenContractAddress.toLowerCase());
          seen.set(key, token);
          symbolMap.set(symbolKey, token);
        }
        // Otherwise keep existing
      } else {
        seen.set(key, token);
        symbolMap.set(symbolKey, token);
      }
    }
    
    return Array.from(seen.values());
  }, [rawTokens]);

  // Get native token for the chain - use proper native addresses per chain
  const nativeToken: OkxToken | null = useMemo(() => {
    if (!chain) return null;
    
    // Determine native token address based on chain
    let nativeAddress = NATIVE_TOKEN_ADDRESS;
    if (chain.chainIndex === '501') {
      nativeAddress = SOLANA_NATIVE_SOL; // Wrapped SOL for Solana
    } else if (chain.chainIndex === '195') {
      nativeAddress = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'; // TRX for Tron
    } else if (chain.chainIndex === '784') {
      nativeAddress = '0x2::sui::SUI'; // SUI for Sui
    } else if (chain.chainIndex === '607') {
      nativeAddress = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'; // TON
    }
    
    return {
      tokenContractAddress: nativeAddress,
      tokenSymbol: chain.nativeCurrency.symbol,
      tokenName: chain.nativeCurrency.name,
      decimals: chain.nativeCurrency.decimals.toString(),
      tokenLogoUrl: chain.icon,
    };
  }, [chain]);

  return {
    tokens,
    nativeToken,
    isLoading,
    error,
    refetch: fetchTokens,
  };
}
