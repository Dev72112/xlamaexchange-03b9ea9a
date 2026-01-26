import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { okxDexService, TransactionHistoryItem } from '@/services/okxdex';
import { useCallback, useMemo } from 'react';

// All supported EVM chains for portfolio
const ALL_EVM_CHAINS = '1,10,56,137,250,42161,43114,324,8453,59144,5000';

interface UseOkxTransactionHistoryOptions {
  chains?: string;
  tokenAddress?: string;
  limit?: number;
  enabled?: boolean;
}

interface TransactionWithDetails extends TransactionHistoryItem {
  chainName?: string;
  chainIcon?: string;
}

export function useOkxTransactionHistory(options: UseOkxTransactionHistoryOptions = {}) {
  const { activeAddress, activeChainType, activeChain } = useMultiWallet();
  const queryClient = useQueryClient();

  const {
    chains = activeChain?.chainIndex || ALL_EVM_CHAINS,
    tokenAddress,
    limit = 50,
    enabled = true,
  } = options;

  // Determine which chains to query based on active chain type
  const queryChains = useMemo(() => {
    if (activeChainType === 'solana') {
      return '501';
    } else if (activeChainType === 'tron') {
      return '195';
    }
    return chains;
  }, [activeChainType, chains]);

  const queryKey = ['okx-tx-history', activeAddress, queryChains, tokenAddress, limit];

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!activeAddress) throw new Error('No wallet address');

      const result = await okxDexService.getTransactionHistory(
        activeAddress,
        queryChains,
        {
          tokenContractAddress: tokenAddress,
          limit,
        }
      );

      return result;
    },
    enabled: !!activeAddress && enabled && (activeChainType === 'evm' || activeChainType === 'solana' || activeChainType === 'tron'),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Refresh transactions
  const refreshTransactions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['okx-tx-history', activeAddress] });
    return refetch();
  }, [queryClient, activeAddress, refetch]);

  // Get transaction details
  const getTransactionDetail = useCallback(async (chainIndex: string, txHash: string) => {
    return okxDexService.getTransactionDetail(chainIndex, txHash);
  }, []);

  // Format transactions with additional details
  const transactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions;
  }, [data]);

  // Get transactions by type
  const swapTransactions = useMemo(() => {
    return transactions.filter(tx => tx.itype === 'swap' || tx.methodId?.includes('swap'));
  }, [transactions]);

  const transferTransactions = useMemo(() => {
    return transactions.filter(tx => tx.itype === 'transfer' || tx.itype === 'receive');
  }, [transactions]);

  return {
    transactions,
    swapTransactions,
    transferTransactions,
    cursor: data?.cursor,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    refreshTransactions,
    getTransactionDetail,
  };
}

// Hook for fetching wallet balances with caching
export function useOkxWalletBalances(options: { chains?: string; enabled?: boolean } = {}) {
  const { activeAddress, activeChainType } = useMultiWallet();

  const chains = useMemo(() => {
    if (options.chains) return options.chains;
    if (activeChainType === 'solana') return '501';
    if (activeChainType === 'tron') return '195';
    return ALL_EVM_CHAINS;
  }, [activeChainType, options.chains]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['okx-wallet-balances', activeAddress, chains],
    queryFn: async () => {
      if (!activeAddress) throw new Error('No wallet address');
      return okxDexService.getWalletBalances(activeAddress, chains, true);
    },
    enabled: !!activeAddress && options.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Calculate total portfolio value
  const totalValue = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, token) => {
      const balance = parseFloat(token.balance) || 0;
      const price = parseFloat(token.tokenPrice) || 0;
      return sum + (balance * price);
    }, 0);
  }, [data]);

  return {
    balances: data || [],
    totalValue,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

// Hook for portfolio value
export function useOkxPortfolioValue(options: { chains?: string; enabled?: boolean } = {}) {
  const { activeAddress, activeChainType } = useMultiWallet();

  const chains = useMemo(() => {
    if (options.chains) return options.chains;
    if (activeChainType === 'solana') return '501';
    if (activeChainType === 'tron') return '195';
    return ALL_EVM_CHAINS;
  }, [activeChainType, options.chains]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['okx-portfolio-value', activeAddress, chains],
    queryFn: async () => {
      if (!activeAddress) throw new Error('No wallet address');
      return okxDexService.getPortfolioValue(activeAddress, chains);
    },
    enabled: !!activeAddress && options.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    totalValue: data?.totalValue ? parseFloat(data.totalValue) : 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
