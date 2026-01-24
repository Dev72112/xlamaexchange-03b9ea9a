/**
 * Hook for fetching Zerion portfolio data including positions and PnL
 * Respects DataSource context for enabling/disabling
 */

import { useQuery } from '@tanstack/react-query';
import { zerionService, ZerionPortfolio, ZerionPosition, ZerionPnL, ZerionChartPoint } from '@/services/zerion';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';
import { queryKeys } from '@/lib/queryClient';

export interface UseZerionPortfolioResult {
  portfolio: ZerionPortfolio | null;
  positions: ZerionPosition[];
  defiPositions: ZerionPosition[];
  walletPositions: ZerionPosition[];
  pnl: ZerionPnL | null;
  chartData: ZerionChartPoint[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useZerionPortfolio(): UseZerionPortfolioResult {
  const { isConnected, activeAddress, activeChainType } = useMultiWallet();
  const { isZerionEnabled, dataSource } = useDataSource();
  
  // Only enable for EVM chains when Zerion is enabled in DataSource
  const isEvm = activeChainType === 'evm';
  const shouldFetch = isConnected && !!activeAddress && isZerionEnabled && isEvm;
  
  const address = activeAddress || '';

  // Portfolio overview - Include dataSource in key for proper cache invalidation on mode change
  const portfolioQuery = useQuery({
    queryKey: ['zerion', 'portfolio', address, dataSource],
    queryFn: () => zerionService.getPortfolio(address),
    enabled: shouldFetch,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // All positions - Include dataSource in key
  const positionsQuery = useQuery({
    queryKey: ['zerion', 'positions', address, dataSource],
    queryFn: () => zerionService.getPositions(address),
    enabled: shouldFetch,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // PnL data - Include dataSource in key
  const pnlQuery = useQuery({
    queryKey: ['zerion', 'pnl', address, dataSource],
    queryFn: () => zerionService.getPnL(address),
    enabled: shouldFetch,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Chart data - Include dataSource in key
  const chartQuery = useQuery({
    queryKey: ['zerion', 'chart', address, 'month', dataSource],
    queryFn: () => zerionService.getPortfolioChart(address, 'month'),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const positions = positionsQuery.data || [];
  const defiPositions = positions.filter(p => p.positionType !== 'wallet');
  const walletPositions = positions.filter(p => p.positionType === 'wallet');

  const refetch = () => {
    portfolioQuery.refetch();
    positionsQuery.refetch();
    pnlQuery.refetch();
    chartQuery.refetch();
  };

  return {
    portfolio: portfolioQuery.data || null,
    positions,
    defiPositions,
    walletPositions,
    pnl: pnlQuery.data || null,
    chartData: chartQuery.data || [],
    isLoading: portfolioQuery.isLoading || positionsQuery.isLoading,
    isError: portfolioQuery.isError || positionsQuery.isError,
    error: portfolioQuery.error || positionsQuery.error || null,
    refetch,
  };
}
