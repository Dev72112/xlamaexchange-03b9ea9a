import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cache, cacheKeys } from '@/lib/cache';
import type { DCAOrder } from './useDCAOrders';

interface TokenPriceMap {
  [key: string]: number; // key: `${chainIndex}-${tokenAddress}`
}

export function useDCATokenPrices(orders: DCAOrder[]) {
  const [prices, setPrices] = useState<TokenPriceMap>({});
  const [isLoading, setIsLoading] = useState(false);

  // Get unique token pairs to fetch prices for
  const tokenPairs = useMemo(() => {
    const pairs = new Set<string>();
    orders.forEach(order => {
      pairs.add(`${order.chain_index}-${order.to_token_address}`);
    });
    return Array.from(pairs);
  }, [orders]);

  const fetchPrices = useCallback(async () => {
    if (tokenPairs.length === 0) return;

    setIsLoading(true);
    const newPrices: TokenPriceMap = {};

    try {
      // Fetch prices in parallel with caching
      await Promise.all(
        tokenPairs.map(async (pair) => {
          const [chainIndex, tokenAddress] = pair.split('-');
          const cacheKey = cacheKeys.tokenPrice(chainIndex, tokenAddress);
          const cached = cache.get<number>(cacheKey);
          
          if (cached.data !== null && !cached.isStale) {
            newPrices[pair] = cached.data;
            return;
          }
          
          try {
            const { data, error } = await supabase.functions.invoke('okx-dex', {
              body: {
                action: 'token-price-info',
                chainIndex,
                tokenContractAddress: tokenAddress
              }
            });

            if (!error && data?.data?.[0]?.price) {
              const price = parseFloat(data.data[0].price);
              cache.set(cacheKey, price, { staleTime: 30000, maxAge: 120000 });
              newPrices[pair] = price;
            }
          } catch (err) {
            console.error(`Failed to fetch price for ${pair}:`, err);
          }
        })
      );

      setPrices(prev => ({ ...prev, ...newPrices }));
    } catch (error) {
      console.error('Error fetching token prices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tokenPairs]);

  useEffect(() => {
    fetchPrices();
    // Refresh prices every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const getPrice = useCallback((chainIndex: string, tokenAddress: string): number | null => {
    const key = `${chainIndex}-${tokenAddress}`;
    return prices[key] ?? null;
  }, [prices]);

  const calculateOrderValue = useCallback((order: DCAOrder): number | null => {
    const price = getPrice(order.chain_index, order.to_token_address);
    if (price === null || !order.total_received) return null;
    return parseFloat(order.total_received) * price;
  }, [getPrice]);

  const calculateROI = useCallback((order: DCAOrder): number | null => {
    const currentValue = calculateOrderValue(order);
    const totalSpent = parseFloat(order.total_spent || '0');
    
    if (currentValue === null || totalSpent === 0) return null;
    return ((currentValue - totalSpent) / totalSpent) * 100;
  }, [calculateOrderValue]);

  return {
    prices,
    isLoading,
    getPrice,
    calculateOrderValue,
    calculateROI,
    refetch: fetchPrices
  };
}
