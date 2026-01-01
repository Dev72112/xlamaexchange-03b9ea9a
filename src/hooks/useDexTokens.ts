import { useState, useEffect, useCallback, useMemo } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';

export function useDexTokens(chain: Chain | null) {
  const [rawTokens, setRawTokens] = useState<OkxToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!chain) {
      setRawTokens([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await okxDexService.getTokens(chain.chainIndex);
      setRawTokens(data || []);
    } catch (err) {
      console.error('Failed to fetch DEX tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
      setRawTokens([]);
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

  // Get native token for the chain
  const nativeToken: OkxToken | null = chain ? {
    tokenContractAddress: NATIVE_TOKEN_ADDRESS,
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
