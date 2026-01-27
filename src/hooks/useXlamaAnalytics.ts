/**
 * React Query hook for xLama Trading Analytics
 */

import { useQuery } from '@tanstack/react-query';
import { xlamaApi, XlamaAnalytics } from '@/services/xlamaApi';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

interface UseXlamaAnalyticsOptions {
  period?: AnalyticsPeriod;
  enabled?: boolean;
}

export function useXlamaAnalytics(options: UseXlamaAnalyticsOptions = {}) {
  const { activeAddress } = useMultiWallet();
  const { dataSource } = useDataSource();
  
  const period = options.period ?? '30d';
  const isXlamaEnabled = dataSource === 'xlama';
  const shouldFetch = !!activeAddress && isXlamaEnabled && options.enabled !== false;

  const query = useQuery({
    queryKey: ['xlama-analytics', activeAddress, period],
    queryFn: async (): Promise<XlamaAnalytics> => {
      if (!activeAddress) {
        throw new Error('No wallet connected');
      }
      return xlamaApi.getAnalytics(activeAddress, period);
    },
    enabled: shouldFetch,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });

  const analytics = query.data?.analytics;

  return {
    data: query.data,
    analytics,
    totalTrades: analytics?.total_trades ?? 0,
    totalSwaps: analytics?.total_swaps ?? 0,
    totalBridges: analytics?.total_bridges ?? 0,
    totalVolume: analytics?.total_volume_usd ?? 0,
    totalFees: analytics?.total_fees_usd ?? 0,
    realizedPnl: analytics?.realized_pnl_usd ?? 0,
    unrealizedPnl: analytics?.unrealized_pnl_usd ?? 0,
    totalPnl: analytics?.total_pnl_usd ?? 0,
    successRate: analytics?.success_rate ?? 0,
    mostTradedPairs: analytics?.most_traded_pairs ?? [],
    mostUsedChains: analytics?.most_used_chains ?? [],
    tradeFrequency: analytics?.trade_frequency ?? { daily_avg: 0, weekly_avg: 0, monthly_avg: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useXlamaAnalytics;
