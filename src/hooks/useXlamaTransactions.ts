/**
 * React Query hook for xLama Transaction History
 * Falls back to OKX direct API when xLama returns empty
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { xlamaApi, XlamaTransaction, TransactionOptions } from '@/services/xlamaApi';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';
import { okxDexService, TransactionHistoryItem } from '@/services/okxdex';

// Default chains to query for transactions
const DEFAULT_CHAINS = '1,196,8453,42161,137,56';

interface UseXlamaTransactionsOptions extends Omit<TransactionOptions, 'page'> {
  enabled?: boolean;
  chains?: string;
}

// Convert OKX transaction format to xLama XlamaTransaction format
function convertOkxToXlamaTransaction(tx: TransactionHistoryItem, wallet: string): XlamaTransaction {
  const fromAddr = tx.from[0]?.address || '';
  const toAddr = tx.to[0]?.address || '';
  const isOutgoing = fromAddr.toLowerCase() === wallet.toLowerCase();
  
  // Determine transaction type based on itype
  // itype: 0=send, 1=receive, 2=contract interaction
  let txType: 'swap' | 'bridge' | 'transfer' | 'approval' = 'transfer';
  if (tx.methodId && tx.methodId !== '0x') {
    txType = 'swap'; // Assume contract calls are swaps
  }
  
  return {
    tx_hash: tx.txHash,
    wallet_address: wallet,
    chain_id: tx.chainIndex,
    chain_name: getChainName(tx.chainIndex),
    transaction_type: txType,
    token_in: {
      address: isOutgoing ? tx.tokenContractAddress : '',
      symbol: isOutgoing ? tx.symbol : '',
      name: tx.symbol,
      logo: null,
      decimals: 18,
      amount: isOutgoing ? tx.amount : '0',
      amount_usd: 0,
    },
    token_out: {
      address: !isOutgoing ? tx.tokenContractAddress : '',
      symbol: !isOutgoing ? tx.symbol : '',
      name: tx.symbol,
      logo: null,
      decimals: 18,
      amount: !isOutgoing ? tx.amount : '0',
      amount_usd: 0,
    },
    value_usd: 0, // Not available from OKX tx history
    gas_used: '0',
    gas_price: '0',
    gas_usd: parseFloat(tx.txFee) || 0,
    timestamp: new Date(parseInt(tx.txTime)).toISOString(),
    source: 'okx',
    status: tx.txStatus === 'success' ? 'success' : tx.txStatus === 'pending' ? 'pending' : 'failed',
  };
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

export function useXlamaTransactions(options: UseXlamaTransactionsOptions = {}) {
  const { activeAddress } = useMultiWallet();
  const { dataSource } = useDataSource();
  
  const isXlamaEnabled = dataSource === 'xlama';
  const shouldFetch = !!activeAddress && isXlamaEnabled && options.enabled !== false;
  const limit = options.limit ?? 20;
  const chains = options.chains ?? DEFAULT_CHAINS;

  const query = useInfiniteQuery({
    queryKey: ['xlama-transactions', activeAddress, options.source, options.chain, options.type, chains],
    queryFn: async ({ pageParam = 1 }) => {
      if (!activeAddress) {
        throw new Error('No wallet connected');
      }
      
      // Try xLama API first
      try {
        const result = await xlamaApi.getTransactions(activeAddress, {
          ...options,
          page: pageParam,
          limit,
        });
        if (result.transactions && result.transactions.length > 0) {
          return result;
        }
      } catch (err) {
        console.log('[useXlamaTransactions] xLama API failed, falling back to OKX:', err);
      }
      
      // Fallback to OKX direct API
      console.log('[useXlamaTransactions] Using OKX direct API for transactions');
      
      // For pagination, we need to handle cursor-based pagination
      // OKX uses cursor, but we're using page numbers
      // For now, just fetch the latest transactions
      const { transactions: okxTxs } = await okxDexService.getTransactionHistory(
        activeAddress,
        chains,
        { limit }
      );
      
      const transactions: XlamaTransaction[] = okxTxs.map(tx => 
        convertOkxToXlamaTransaction(tx, activeAddress)
      );
      
      return {
        success: true,
        transactions,
        total: transactions.length,
        page: pageParam,
        limit,
      };
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
