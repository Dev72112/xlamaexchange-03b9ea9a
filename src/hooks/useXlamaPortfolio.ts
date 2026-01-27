/**
 * React Query hook for xLama Portfolio data
 * Falls back to OKX direct API when xLama returns empty
 */

import { useQuery } from '@tanstack/react-query';
import { xlamaApi, XlamaPortfolio, TokenHolding } from '@/services/xlamaApi';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';

// Default chains to query for portfolio
const DEFAULT_CHAINS = '1,196,8453,42161,137,56,43114,10,324';

interface UseXlamaPortfolioOptions {
  enabled?: boolean;
  refetchInterval?: number;
  chains?: string;
}

// Convert OKX balance format to xLama TokenHolding format
function convertOkxToXlamaHolding(balance: WalletTokenBalance): TokenHolding {
  const price = parseFloat(balance.tokenPrice) || 0;
  const balanceNum = parseFloat(balance.balance) || 0;
  return {
    token_address: balance.tokenContractAddress || '',
    token_symbol: balance.symbol,
    token_name: balance.symbol, // OKX doesn't provide name in balance
    token_logo: null,
    chain_id: balance.chainIndex,
    chain_name: getChainName(balance.chainIndex),
    balance: balance.balance,
    balance_raw: balance.rawBalance || '0',
    decimals: 18, // Default, OKX doesn't return this in balance
    price_usd: price,
    value_usd: price * balanceNum,
    price_change_24h: 0, // Not available from balance endpoint
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

export function useXlamaPortfolio(options: UseXlamaPortfolioOptions = {}) {
  const { activeAddress } = useMultiWallet();
  const { dataSource } = useDataSource();
  
  const isXlamaEnabled = dataSource === 'xlama';
  const shouldFetch = !!activeAddress && isXlamaEnabled && options.enabled !== false;
  const chains = options.chains ?? DEFAULT_CHAINS;

  const query = useQuery({
    queryKey: ['xlama-portfolio', activeAddress, chains],
    queryFn: async (): Promise<XlamaPortfolio> => {
      if (!activeAddress) {
        throw new Error('No wallet connected');
      }
      
      // Try xLama API first
      try {
        const xlamaResult = await xlamaApi.getPortfolio(activeAddress);
        if (xlamaResult.holdings && xlamaResult.holdings.length > 0) {
          return xlamaResult;
        }
      } catch (err) {
        console.log('[useXlamaPortfolio] xLama API failed, falling back to OKX:', err);
      }
      
      // Fallback to OKX direct API
      console.log('[useXlamaPortfolio] Using OKX direct API for portfolio');
      const balances = await okxDexService.getWalletBalances(activeAddress, chains);
      
      // Convert to xLama format
      const holdings: TokenHolding[] = balances
        .filter(b => parseFloat(b.balance) > 0)
        .map(convertOkxToXlamaHolding);
      
      const totalValue = holdings.reduce((sum, h) => sum + h.value_usd, 0);
      
      // Calculate chain breakdown
      const chainMap = new Map<string, number>();
      for (const holding of holdings) {
        const current = chainMap.get(holding.chain_name) || 0;
        chainMap.set(holding.chain_name, current + holding.value_usd);
      }
      const chainBreakdown = Array.from(chainMap.entries()).map(([chain, value_usd]) => ({
        chain,
        value_usd,
      }));
      
      return {
        success: true,
        wallet: activeAddress,
        holdings,
        total_value_usd: totalValue,
        chain_breakdown: chainBreakdown,
        updated_at: new Date().toISOString(),
      };
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
    chainBreakdown: query.data?.chain_breakdown ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useXlamaPortfolio;
