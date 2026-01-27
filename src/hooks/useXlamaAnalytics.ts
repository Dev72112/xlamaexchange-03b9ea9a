/**
 * React Query hook for xLama Trading Analytics
 * Falls back to computing analytics from OKX transaction history when xLama returns empty
 */

import { useQuery } from '@tanstack/react-query';
import { xlamaApi, XlamaAnalytics, TradedPair } from '@/services/xlamaApi';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';
import { okxDexService, TransactionHistoryItem } from '@/services/okxdex';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

// Default chains to query for analytics
const DEFAULT_CHAINS = '1,196,8453,42161,137,56';

interface UseXlamaAnalyticsOptions {
  period?: AnalyticsPeriod;
  enabled?: boolean;
  chains?: string;
}

function getChainName(chainIndex: string): string {
  const names: Record<string, string> = {
    '1': 'Ethereum',
    '196': 'X Layer',
    '8453': 'Base',
    '42161': 'Arbitrum',
    '137': 'Polygon',
    '56': 'BNB Chain',
    '43114': 'Avalanche',
    '10': 'Optimism',
    '324': 'zkSync',
    '501': 'Solana',
  };
  return names[chainIndex] || `Chain ${chainIndex}`;
}

// Compute analytics from raw OKX transactions
function computeAnalyticsFromOkx(
  transactions: TransactionHistoryItem[],
  wallet: string,
  period: AnalyticsPeriod
): XlamaAnalytics['analytics'] {
  // Filter by period
  const now = Date.now();
  const periodMs: Record<AnalyticsPeriod, number> = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    'all': Infinity,
  };
  const cutoff = now - periodMs[period];
  
  const filteredTxs = transactions.filter(tx => {
    const txTime = parseInt(tx.txTime);
    return txTime >= cutoff;
  });
  
  // Count transactions by type
  let swaps = 0;
  let transfers = 0;
  let totalFees = 0;
  const chainCounts = new Map<string, number>();
  const pairCounts = new Map<string, { count: number; volume: number }>();
  
  for (const tx of filteredTxs) {
    // Count by chain
    const chainName = getChainName(tx.chainIndex);
    chainCounts.set(chainName, (chainCounts.get(chainName) || 0) + 1);
    
    // Determine type
    if (tx.methodId && tx.methodId !== '0x' && tx.methodId !== '0xa9059cbb') {
      swaps++;
      // Track pairs
      const pair = tx.symbol;
      const existing = pairCounts.get(pair) || { count: 0, volume: 0 };
      pairCounts.set(pair, { count: existing.count + 1, volume: existing.volume });
    } else {
      transfers++;
    }
    
    // Sum fees
    if (tx.txFee) {
      totalFees += parseFloat(tx.txFee) || 0;
    }
  }
  
  // Build most used chains
  const mostUsedChains = Array.from(chainCounts.entries())
    .map(([chain, count]) => ({ chain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Build most traded pairs
  const mostTradedPairs: TradedPair[] = Array.from(pairCounts.entries())
    .map(([pair, data]) => ({
      pair,
      from_symbol: pair,
      to_symbol: '',
      trade_count: data.count,
      volume_usd: data.volume,
    }))
    .sort((a, b) => b.trade_count - a.trade_count)
    .slice(0, 5);
  
  // Calculate success rate
  const successfulTxs = filteredTxs.filter(tx => tx.txStatus === 'success').length;
  const successRate = filteredTxs.length > 0 ? (successfulTxs / filteredTxs.length) * 100 : 0;
  
  // Calculate trade frequency
  const days = period === 'all' ? 90 : parseInt(period);
  const dailyAvg = swaps / days;
  
  return {
    total_trades: filteredTxs.length,
    total_swaps: swaps,
    total_bridges: 0, // Can't determine bridges from basic tx history
    total_volume_usd: 0, // Would need price data
    total_fees_usd: totalFees,
    realized_pnl_usd: 0, // Would need buy/sell price history
    unrealized_pnl_usd: 0,
    total_pnl_usd: 0,
    success_rate: successRate,
    most_traded_pairs: mostTradedPairs,
    most_used_chains: mostUsedChains,
    holdings: [],
    trade_frequency: {
      daily_avg: dailyAvg,
      weekly_avg: dailyAvg * 7,
      monthly_avg: dailyAvg * 30,
    },
    period,
  };
}

export function useXlamaAnalytics(options: UseXlamaAnalyticsOptions = {}) {
  const { activeAddress } = useMultiWallet();
  const { dataSource } = useDataSource();
  
  const period = options.period ?? '30d';
  const isXlamaEnabled = dataSource === 'xlama';
  const shouldFetch = !!activeAddress && isXlamaEnabled && options.enabled !== false;
  const chains = options.chains ?? DEFAULT_CHAINS;

  const query = useQuery({
    queryKey: ['xlama-analytics', activeAddress, period, chains],
    queryFn: async (): Promise<XlamaAnalytics> => {
      if (!activeAddress) {
        throw new Error('No wallet connected');
      }
      
      // Try xLama API first
      try {
        const result = await xlamaApi.getAnalytics(activeAddress, period);
        if (result.analytics && result.analytics.total_trades > 0) {
          return result;
        }
      } catch (err) {
        console.log('[useXlamaAnalytics] xLama API failed, falling back to OKX:', err);
      }
      
      // Fallback to computing from OKX transactions
      console.log('[useXlamaAnalytics] Computing analytics from OKX transactions');
      const { transactions } = await okxDexService.getTransactionHistory(
        activeAddress,
        chains,
        { limit: 50 }
      );
      
      const analytics = computeAnalyticsFromOkx(transactions, activeAddress, period);
      
      return {
        success: true,
        wallet: activeAddress,
        cached: false,
        calculated_at: new Date().toISOString(),
        analytics,
      };
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
