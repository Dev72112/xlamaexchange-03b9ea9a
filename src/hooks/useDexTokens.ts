import { useState, useEffect, useCallback } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';

export function useDexTokens(chain: Chain | null) {
  const [tokens, setTokens] = useState<OkxToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!chain) {
      setTokens([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await okxDexService.getTokens(chain.chainIndex);
      setTokens(data || []);
    } catch (err) {
      console.error('Failed to fetch DEX tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [chain?.chainIndex]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

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
