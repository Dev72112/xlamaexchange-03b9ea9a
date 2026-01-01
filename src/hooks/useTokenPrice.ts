import { useState, useEffect, useCallback, useMemo } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';

interface TokenPriceResult {
  price: number | null;
  isLoading: boolean;
  error: string | null;
}

interface UseTokenPricesResult {
  fromTokenPrice: number | null;
  toTokenPrice: number | null;
  isLoading: boolean;
  fromUsdValue: string | null;
  toUsdValue: string | null;
}

// Cache prices to avoid repeated calls
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export function useTokenPrices(
  chainIndex: string | null,
  fromToken: OkxToken | null,
  toToken: OkxToken | null,
  fromAmount: string,
  toAmount: string
): UseTokenPricesResult {
  const [fromTokenPrice, setFromTokenPrice] = useState<number | null>(null);
  const [toTokenPrice, setToTokenPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrice = useCallback(async (tokenAddress: string, chain: string): Promise<number | null> => {
    const cacheKey = `${chain}:${tokenAddress.toLowerCase()}`;
    const cached = priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.price;
    }

    try {
      const result = await okxDexService.getTokenPrice(chain, tokenAddress);
      if (result?.price) {
        const price = parseFloat(result.price);
        priceCache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
      }
    } catch (err) {
      console.error('Failed to fetch token price:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    if (!chainIndex) return;

    const fetchPrices = async () => {
      setIsLoading(true);
      
      const [fromPrice, toPrice] = await Promise.all([
        fromToken ? fetchPrice(fromToken.tokenContractAddress, chainIndex) : null,
        toToken ? fetchPrice(toToken.tokenContractAddress, chainIndex) : null,
      ]);
      
      setFromTokenPrice(fromPrice);
      setToTokenPrice(toPrice);
      setIsLoading(false);
    };

    fetchPrices();
  }, [chainIndex, fromToken?.tokenContractAddress, toToken?.tokenContractAddress, fetchPrice]);

  const fromUsdValue = useMemo(() => {
    if (!fromTokenPrice || !fromAmount || parseFloat(fromAmount) <= 0) return null;
    const value = parseFloat(fromAmount) * fromTokenPrice;
    if (value < 0.01) return '< $0.01';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [fromTokenPrice, fromAmount]);

  const toUsdValue = useMemo(() => {
    if (!toTokenPrice || !toAmount || parseFloat(toAmount) <= 0) return null;
    const value = parseFloat(toAmount) * toTokenPrice;
    if (value < 0.01) return '< $0.01';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [toTokenPrice, toAmount]);

  return {
    fromTokenPrice,
    toTokenPrice,
    isLoading,
    fromUsdValue,
    toUsdValue,
  };
}
