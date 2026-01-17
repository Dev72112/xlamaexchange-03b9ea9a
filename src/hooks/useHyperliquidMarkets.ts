/**
 * useHyperliquidMarkets Hook
 * 
 * Provides market data, assets, and orderbooks for Hyperliquid.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  hyperliquidService, 
  HyperliquidAsset, 
  HyperliquidMarketData,
  HyperliquidOrderbook,
} from '@/services/hyperliquid';

export interface UseHyperliquidMarketsResult {
  assets: HyperliquidAsset[];
  markets: HyperliquidMarketData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  
  // Helper functions
  getAsset: (coin: string) => HyperliquidAsset | undefined;
  getMarket: (coin: string) => HyperliquidMarketData | undefined;
  getPrice: (coin: string) => number;
}

export function useHyperliquidMarkets(): UseHyperliquidMarketsResult {
  // Fetch assets
  const {
    data: assets = [],
    isLoading: assetsLoading,
    error: assetsError,
    refetch: refetchAssets,
  } = useQuery({
    queryKey: ['hyperliquid', 'assets'],
    queryFn: () => hyperliquidService.getAssets(),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
  });

  // Fetch market data
  const {
    data: markets = [],
    isLoading: marketsLoading,
    refetch: refetchMarkets,
  } = useQuery({
    queryKey: ['hyperliquid', 'markets'],
    queryFn: () => hyperliquidService.getAllMarkets(),
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // 10 seconds
  });

  // Create lookup maps
  const assetMap = useMemo(() => {
    const map = new Map<string, HyperliquidAsset>();
    assets.forEach(asset => map.set(asset.coin, asset));
    return map;
  }, [assets]);

  const marketMap = useMemo(() => {
    const map = new Map<string, HyperliquidMarketData>();
    markets.forEach(market => map.set(market.coin, market));
    return map;
  }, [markets]);

  // Helper functions
  const getAsset = (coin: string) => assetMap.get(coin);
  const getMarket = (coin: string) => marketMap.get(coin);
  
  const getPrice = (coin: string): number => {
    const market = marketMap.get(coin);
    return market ? parseFloat(market.midPx) : 0;
  };

  const refetch = () => {
    refetchAssets();
    refetchMarkets();
  };

  return {
    assets,
    markets,
    isLoading: assetsLoading || marketsLoading,
    error: assetsError as Error | null,
    refetch,
    getAsset,
    getMarket,
    getPrice,
  };
}

/**
 * useHyperliquidOrderbook Hook
 * 
 * Provides real-time orderbook for a specific asset.
 */
export function useHyperliquidOrderbook(coin: string): {
  orderbook: HyperliquidOrderbook | null;
  isLoading: boolean;
  error: Error | null;
} {
  const {
    data: orderbook,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['hyperliquid', 'orderbook', coin],
    queryFn: () => hyperliquidService.getOrderbook(coin),
    enabled: !!coin,
    staleTime: 1000, // 1 second
    refetchInterval: 2000, // 2 seconds
  });

  return {
    orderbook: orderbook || null,
    isLoading,
    error: error as Error | null,
  };
}
