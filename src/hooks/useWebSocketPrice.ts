import { useState, useEffect, useRef, useCallback } from 'react';

interface PriceUpdate {
  price: string;
  change24H: string;
  timestamp: number;
}

interface UseWebSocketPriceOptions {
  chainIndex: string;
  tokenContractAddress: string;
  enabled?: boolean;
}

// Polling-based "real-time" price updates (OKX doesn't have public WebSocket for DEX)
// This simulates real-time by polling every 5 seconds when enabled
export function useWebSocketPrice({
  chainIndex,
  tokenContractAddress,
  enabled = true,
}: UseWebSocketPriceOptions) {
  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPriceRef = useRef<string | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!chainIndex || !tokenContractAddress || !enabled) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error: apiError } = await supabase.functions.invoke('okx-dex', {
        body: {
          action: 'token-price-info',
          params: { chainIndex, tokenContractAddress },
        },
      });

      if (apiError) throw apiError;

      if (data && !data.error && Array.isArray(data) && data[0]) {
        const priceInfo = data[0];
        const newPrice = priceInfo.price;
        
        // Only update if price changed
        if (newPrice !== lastPriceRef.current) {
          lastPriceRef.current = newPrice;
          setPrice({
            price: newPrice,
            change24H: priceInfo.priceChange24H || '0',
            timestamp: Date.now(),
          });
        }
        setIsConnected(true);
        setError(null);
      }
    } catch (err) {
      console.error('Price fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
      setIsConnected(false);
    }
  }, [chainIndex, tokenContractAddress, enabled]);

  useEffect(() => {
    if (!enabled || !chainIndex || !tokenContractAddress) {
      setIsConnected(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchPrice();

    // Poll every 5 seconds for "real-time" updates
    intervalRef.current = setInterval(fetchPrice, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchPrice, enabled, chainIndex, tokenContractAddress]);

  const disconnect = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    price,
    isConnected,
    error,
    disconnect,
    refetch: fetchPrice,
  };
}

// Hook for multiple tokens at once
export function useWebSocketPrices(
  tokens: Array<{ chainIndex: string; tokenContractAddress: string }>,
  enabled = true
) {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!enabled || tokens.length === 0) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const results = await Promise.allSettled(
        tokens.map(async (token) => {
          const { data } = await supabase.functions.invoke('okx-dex', {
            body: {
              action: 'token-price-info',
              params: { 
                chainIndex: token.chainIndex, 
                tokenContractAddress: token.tokenContractAddress 
              },
            },
          });
          return { token, data };
        })
      );

      const newPrices: Record<string, PriceUpdate> = {};
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.data && !result.value.data.error) {
          const { token, data } = result.value;
          const priceInfo = Array.isArray(data) ? data[0] : data;
          if (priceInfo?.price) {
            const key = `${token.chainIndex}-${token.tokenContractAddress.toLowerCase()}`;
            newPrices[key] = {
              price: priceInfo.price,
              change24H: priceInfo.priceChange24H || '0',
              timestamp: Date.now(),
            };
          }
        }
      });

      setPrices(prev => ({ ...prev, ...newPrices }));
      setIsConnected(true);
    } catch (err) {
      console.error('Batch price fetch error:', err);
      setIsConnected(false);
    }
  }, [tokens, enabled]);

  useEffect(() => {
    if (!enabled || tokens.length === 0) {
      setIsConnected(false);
      return;
    }

    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices, enabled, tokens.length]);

  const getPrice = useCallback((chainIndex: string, tokenContractAddress: string) => {
    const key = `${chainIndex}-${tokenContractAddress.toLowerCase()}`;
    return prices[key] || null;
  }, [prices]);

  return {
    prices,
    getPrice,
    isConnected,
    refetch: fetchPrices,
  };
}
