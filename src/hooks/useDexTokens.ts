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

  // Deduplicate tokens - keep ones with valid logos
  const tokens = useMemo(() => {
    const seen = new Map<string, OkxToken>();
    
    for (const token of rawTokens) {
      if (!token.tokenSymbol || !token.tokenContractAddress) continue;
      
      // Skip native token (handled separately)
      if (token.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()) continue;
      
      const key = token.tokenContractAddress.toLowerCase();
      const symbolKey = token.tokenSymbol.toUpperCase();
      
      // Check if we already have this exact contract address
      if (seen.has(key)) continue;
      
      // Check for duplicate symbols with different addresses
      const existingWithSymbol = Array.from(seen.values()).find(
        t => t.tokenSymbol.toUpperCase() === symbolKey
      );
      
      if (existingWithSymbol) {
        // Keep the one with a valid logo
        const hasValidLogo = token.tokenLogoUrl && 
          !token.tokenLogoUrl.includes('undefined') && 
          token.tokenLogoUrl.startsWith('http');
        const existingHasValidLogo = existingWithSymbol.tokenLogoUrl && 
          !existingWithSymbol.tokenLogoUrl.includes('undefined') && 
          existingWithSymbol.tokenLogoUrl.startsWith('http');
        
        if (hasValidLogo && !existingHasValidLogo) {
          // Remove old one and add new one
          seen.delete(existingWithSymbol.tokenContractAddress.toLowerCase());
          seen.set(key, token);
        }
        // Otherwise keep existing
      } else {
        seen.set(key, token);
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
