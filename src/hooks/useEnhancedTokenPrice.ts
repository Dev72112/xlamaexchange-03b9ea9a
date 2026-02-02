import { useState, useEffect, useCallback, useMemo } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { dexScreenerService } from '@/services/dexscreener';
import { defiLlamaService } from '@/services/defillama';
import { cache, cacheKeys } from '@/lib/cache';
import {
  getStablecoinFallbackPrice,
  getXLayerWrappedTokenPrice,
} from '@/lib/tokenPricing';
import {
  isXLayerChain,
  isXLayerStablecoin,
  isXLayerWrappedToken,
} from '@/lib/xlayerTokens';

interface UseEnhancedTokenPriceResult {
  price: number | null;
  isLoading: boolean;
  error: string | null;
  source: 'okx' | 'dexscreener' | 'defillama' | 'xlayer-mapping' | 'stablecoin' | null;
}

/**
 * Enhanced token price hook with multi-source fallback
 * 
 * Resolution order:
 * 1. OKX Market API (primary)
 * 2. DexScreener (for supported chains)
 * 3. DefiLlama/CoinGecko (major tokens by symbol)
 * 4. X Layer wrapped token mapping
 * 5. Stablecoin fallback
 */
export function useEnhancedTokenPrice(
  chainIndex: string | null,
  token: OkxToken | null
): UseEnhancedTokenPriceResult {
  const [price, setPrice] = useState<number | null>(null);
  const [source, setSource] = useState<UseEnhancedTokenPriceResult['source']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!chainIndex || !token) {
      setPrice(null);
      setSource(null);
      return;
    }

    const tokenAddress = token.tokenContractAddress;
    const tokenSymbol = token.tokenSymbol;
    const cacheKey = `enhanced-price-${chainIndex}-${tokenAddress.toLowerCase()}`;

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = cache.get<{ price: number; source: string }>(cacheKey);
      if (cached.data && !cached.isExpired) {
        setPrice(cached.data.price);
        setSource(cached.data.source as UseEnhancedTokenPriceResult['source']);
        setIsLoading(false);
        return;
      }

      // 1. Check X Layer stablecoins first (instant)
      if (isXLayerChain(chainIndex) && isXLayerStablecoin(tokenAddress)) {
        setPrice(1.0);
        setSource('stablecoin');
        cache.set(cacheKey, { price: 1.0, source: 'stablecoin' }, { staleTime: 300000, maxAge: 600000 });
        setIsLoading(false);
        return;
      }

      // 2. Check general stablecoins by symbol
      const stablePrice = getStablecoinFallbackPrice(tokenSymbol);
      if (stablePrice !== null) {
        setPrice(stablePrice);
        setSource('stablecoin');
        cache.set(cacheKey, { price: stablePrice, source: 'stablecoin' }, { staleTime: 300000, maxAge: 600000 });
        setIsLoading(false);
        return;
      }

      // 3. Try OKX Market API
      try {
        const okxResult = await okxDexService.getTokenPrice(chainIndex, tokenAddress);
        if (okxResult?.price) {
          const okxPrice = parseFloat(okxResult.price);
          if (okxPrice > 0) {
            setPrice(okxPrice);
            setSource('okx');
            cache.set(cacheKey, { price: okxPrice, source: 'okx' }, { staleTime: 30000, maxAge: 120000 });
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('OKX price fetch failed:', e);
      }

      // 4. Try DexScreener (for supported chains)
      if (dexScreenerService.isChainSupported(chainIndex)) {
        try {
          const dexPrice = await dexScreenerService.getPrice(chainIndex, tokenAddress);
          if (dexPrice && dexPrice > 0) {
            setPrice(dexPrice);
            setSource('dexscreener');
            cache.set(cacheKey, { price: dexPrice, source: 'dexscreener' }, { staleTime: 30000, maxAge: 120000 });
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('DexScreener price fetch failed:', e);
        }
      }

      // 5. Try DefiLlama by symbol
      try {
        const defiPrice = await defiLlamaService.getPrice(tokenSymbol);
        if (defiPrice && defiPrice > 0) {
          setPrice(defiPrice);
          setSource('defillama');
          cache.set(cacheKey, { price: defiPrice, source: 'defillama' }, { staleTime: 30000, maxAge: 120000 });
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('DefiLlama price fetch failed:', e);
      }

      // 6. For X Layer wrapped tokens, get underlying asset price
      if (isXLayerChain(chainIndex) && isXLayerWrappedToken(tokenAddress)) {
        try {
          const wrappedPrice = await getXLayerWrappedTokenPrice(tokenAddress);
          if (wrappedPrice && wrappedPrice > 0) {
            setPrice(wrappedPrice);
            setSource('xlayer-mapping');
            cache.set(cacheKey, { price: wrappedPrice, source: 'xlayer-mapping' }, { staleTime: 30000, maxAge: 120000 });
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('X Layer wrapped price fetch failed:', e);
        }
      }

      // No price found
      setPrice(null);
      setSource(null);
    } catch (err) {
      console.error('Enhanced price fetch error:', err);
      setError('Failed to fetch price');
      setPrice(null);
      setSource(null);
    } finally {
      setIsLoading(false);
    }
  }, [chainIndex, token?.tokenContractAddress, token?.tokenSymbol]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  return { price, isLoading, error, source };
}

/**
 * Hook for fetching prices for both tokens in a swap pair
 */
export function useEnhancedTokenPrices(
  chainIndex: string | null,
  fromToken: OkxToken | null,
  toToken: OkxToken | null,
  fromAmount: string,
  toAmount: string
) {
  const fromResult = useEnhancedTokenPrice(chainIndex, fromToken);
  const toResult = useEnhancedTokenPrice(chainIndex, toToken);

  const fromUsdValue = useMemo(() => {
    if (!fromResult.price || !fromAmount || parseFloat(fromAmount) <= 0) return null;
    const value = parseFloat(fromAmount) * fromResult.price;
    if (value < 0.01) return '< $0.01';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [fromResult.price, fromAmount]);

  const toUsdValue = useMemo(() => {
    if (!toResult.price || !toAmount || parseFloat(toAmount) <= 0) return null;
    const value = parseFloat(toAmount) * toResult.price;
    if (value < 0.01) return '< $0.01';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [toResult.price, toAmount]);

  return {
    fromTokenPrice: fromResult.price,
    toTokenPrice: toResult.price,
    fromSource: fromResult.source,
    toSource: toResult.source,
    isLoading: fromResult.isLoading || toResult.isLoading,
    fromUsdValue,
    toUsdValue,
  };
}
