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
  getAsset: (coin: string) => HyperliquidAsset | undefined;
  getMarket: (coin: string) => HyperliquidMarketData | undefined;
  getPrice: (coin: string) => number;
}

export function useHyperliquidMarkets(): UseHyperliquidMarketsResult {
  const {
    data: assets = [],
    isLoading: assetsLoading,
    error: assetsError,
    refetch: refetchAssets,
  } = useQuery({
    queryKey: ['hyperliquid', 'assets'],
    queryFn: () => hyperliquidService.getAssets(),
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const {
    data: markets = [],
    isLoading: marketsLoading,
    refetch: refetchMarkets,
  } = useQuery({
    queryKey: ['hyperliquid', 'markets'],
    queryFn: () => hyperliquidService.getAllMarkets(),
    staleTime: 5000,
    refetchInterval: 10000,
  });

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

export function useHyperliquidOrderbook(coin: string): {
  orderbook: HyperliquidOrderbook | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['hyperliquid', 'orderbook', coin],
    queryFn: () => hyperliquidService.getOrderbook(coin, 10),
    enabled: !!coin,
    staleTime: 1000,
    refetchInterval: 2000,
  });

  return {
    orderbook: data || null,
    isLoading,
    error: error as Error | null,
  };
}
