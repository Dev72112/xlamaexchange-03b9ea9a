import { useState, useEffect, useCallback, useMemo } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { cache, cacheKeys } from '@/lib/cache';

export function useDexTokens(chain: Chain | null) {
  const [rawTokens, setRawTokens] = useState<OkxToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!chain) {
      setRawTokens([]);
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
  }, [chain?.chainIndex]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Deduplicate tokens - keep ones with valid logos and proper names
  const tokens = useMemo(() => {
    const seen = new Map<string, OkxToken>();
    const symbolMap = new Map<string, OkxToken>(); // Track best token per symbol
    
    for (const token of rawTokens) {
      if (!token.tokenSymbol || !token.tokenContractAddress) continue;
      
      // Skip native token (handled separately)
      if (token.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()) continue;
      
      // CRITICAL: Skip SOL/WSOL from API for Solana chain - we use manually created nativeToken instead
      // This prevents "fake SOL" from appearing in the list
      if (chain?.chainIndex === '501') {
        const symbol = token.tokenSymbol?.toUpperCase();
        const addr = token.tokenContractAddress;
        // Skip any native SOL variants from API response
        if (symbol === 'SOL' || symbol === 'WSOL' || 
            addr === '11111111111111111111111111111111' ||
            addr === SOLANA_NATIVE_SOL) {
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

  // Get native token for the chain - use proper Solana native address
  const SOLANA_NATIVE_SOL = 'So11111111111111111111111111111111111111112';
  const nativeToken: OkxToken | null = chain ? {
    tokenContractAddress: chain.chainIndex === '501' 
      ? SOLANA_NATIVE_SOL // Wrapped SOL for Solana 
      : NATIVE_TOKEN_ADDRESS, // EVM native token
    tokenSymbol: chain.nativeCurrency.symbol,
    tokenName: chain.nativeCurrency.name,
    decimals: chain.nativeCurrency.decimals.toString(),
    tokenLogoUrl: chain.icon,
  } : null;

  return {
    tokens,
    nativeToken,
    isLoading,
    error,
    refetch: fetchTokens,
  };
}
