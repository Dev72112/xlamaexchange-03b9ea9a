/**
 * React Query hook for xLama Transaction History
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { xlamaApi, XlamaTransaction, TransactionOptions } from '@/services/xlamaApi';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';

interface UseXlamaTransactionsOptions extends Omit<TransactionOptions, 'page'> {
  enabled?: boolean;
}

export function useXlamaTransactions(options: UseXlamaTransactionsOptions = {}) {
  const { activeAddress } = useMultiWallet();
  const { dataSource } = useDataSource();
  
  const isXlamaEnabled = dataSource === 'xlama';
  const shouldFetch = !!activeAddress && isXlamaEnabled && options.enabled !== false;
  const limit = options.limit ?? 20;

  const query = useInfiniteQuery({
    queryKey: ['xlama-transactions', activeAddress, options.source, options.chain, options.type],
    queryFn: async ({ pageParam = 1 }) => {
      if (!activeAddress) {
        throw new Error('No wallet connected');
      }
      return xlamaApi.getTransactions(activeAddress, {
        ...options,
        page: pageParam,
        limit,
      });
    },
    enabled: shouldFetch,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.length * limit;
      if (totalFetched >= lastPage.total) {
        return undefined;
      }
      return allPages.length + 1;
    },
    staleTime: 30 * 1000,
    retry: 2,
  });

  // Flatten all pages into a single transactions array
  const transactions: XlamaTransaction[] = query.data?.pages.flatMap(page => page.transactions) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    transactions,
    total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

/**
 * Simple paginated version (non-infinite)
 */
export function useXlamaTransactionsPaginated(page: number, options: UseXlamaTransactionsOptions = {}) {
  const { activeAddress } = useMultiWallet();
  const { dataSource } = useDataSource();
  
  const isXlamaEnabled = dataSource === 'xlama';
  const shouldFetch = !!activeAddress && isXlamaEnabled && options.enabled !== false;

  const query = useQuery({
    queryKey: ['xlama-transactions-page', activeAddress, page, options],
    queryFn: async () => {
      if (!activeAddress) {
        throw new Error('No wallet connected');
      }
      return xlamaApi.getTransactions(activeAddress, {
        ...options,
        page,
      });
    },
    enabled: shouldFetch,
    staleTime: 30 * 1000,
    retry: 2,
  });

  return {
    transactions: query.data?.transactions ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    limit: query.data?.limit ?? 20,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useXlamaTransactions;
