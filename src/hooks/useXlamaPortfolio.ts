/**
 * React Query hook for xLama Portfolio data
 */

import { useQuery } from '@tanstack/react-query';
import { xlamaApi, XlamaPortfolio } from '@/services/xlamaApi';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';

interface UseXlamaPortfolioOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useXlamaPortfolio(options: UseXlamaPortfolioOptions = {}) {
  const { activeAddress } = useMultiWallet();
  const { dataSource } = useDataSource();
  
  const isXlamaEnabled = dataSource === 'xlama';
  const shouldFetch = !!activeAddress && isXlamaEnabled && options.enabled !== false;

  const query = useQuery({
    queryKey: ['xlama-portfolio', activeAddress],
    queryFn: async (): Promise<XlamaPortfolio> => {
      if (!activeAddress) {
        throw new Error('No wallet connected');
      }
      return xlamaApi.getPortfolio(activeAddress);
    },
    enabled: shouldFetch,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: options.refetchInterval ?? 60 * 1000, // 1 minute default
    retry: 2,
  });

  return {
    portfolio: query.data,
    holdings: query.data?.holdings ?? [],
    totalValue: query.data?.total_value_usd ?? 0,
    chainBreakdown: query.data?.chain_breakdown ?? {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useXlamaPortfolio;
