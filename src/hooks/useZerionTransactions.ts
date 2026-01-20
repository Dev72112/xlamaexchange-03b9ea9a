/**
 * Hook for fetching Zerion transaction history
 * Respects DataSource context for enabling/disabling
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { zerionService, ZerionTransaction } from '@/services/zerion';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';

export interface UseZerionTransactionsResult {
  transactions: ZerionTransaction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  refetch: () => void;
}

export function useZerionTransactions(options?: {
  operationTypes?: string[];
  chainIds?: string[];
  pageSize?: number;
}): UseZerionTransactionsResult {
  const { isConnected, activeAddress, activeChainType } = useMultiWallet();
  const { isZerionEnabled } = useDataSource();
  
  // Only enable for EVM chains when Zerion is enabled in DataSource
  const isEvm = activeChainType === 'evm';
  const shouldFetch = isConnected && !!activeAddress && isZerionEnabled && isEvm;
  
  const address = activeAddress || '';
  const pageSize = options?.pageSize || 20;

  const query = useInfiniteQuery({
    queryKey: ['zerion', 'transactions', address, options?.operationTypes, options?.chainIds],
    queryFn: ({ pageParam }) => 
      zerionService.getTransactions(address, {
        pageSize,
        pageAfter: pageParam as string | undefined,
        operationTypes: options?.operationTypes,
        chainIds: options?.chainIds,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPageCursor,
    initialPageParam: undefined as string | undefined,
    enabled: shouldFetch,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Flatten all pages into a single array
  const transactions = query.data?.pages.flatMap(page => page.transactions) || [];

  return {
    transactions,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error || null,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  };
}
