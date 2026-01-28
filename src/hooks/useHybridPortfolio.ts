/**
 * Hybrid Portfolio Hook
 * Aggregates data from OKX for comprehensive portfolio view
 * (Zerion integration removed)
 */

import { useMemo } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useQuery } from '@tanstack/react-query';
import { okxDexService, OkxToken } from '@/services/okxdex';

export interface HybridAsset {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  valueUsd: number;
  price: number;
  logoUrl: string;
  chainId: string;
  source: 'okx' | 'xlama';
}

export interface UseHybridPortfolioResult {
  assets: HybridAsset[];
  totalValue: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  activeSource: 'okx' | 'xlama';
}

export function useHybridPortfolio(): UseHybridPortfolioResult {
  const { isConnected, activeAddress, activeChainType, activeChain } = useMultiWallet();
  const { dataSource, isOKXEnabled } = useDataSource();
  
  // OKX token balances - Include dataSource for proper cache invalidation on mode switch
  const okxQuery = useQuery({
    queryKey: ['okx-portfolio', activeAddress, activeChain?.chainIndex, dataSource],
    queryFn: async () => {
      if (!activeAddress || !activeChain) return [];
      
      // Get token list for the chain
      const tokens = await okxDexService.getTokens(activeChain.chainIndex);
      
      // This is a placeholder - in a real implementation, we would fetch balances
      // For now, return empty array - the actual balance fetching happens in useTokenBalance
      return tokens.slice(0, 50); // Limit to prevent overload
    },
    enabled: isConnected && !!activeAddress && isOKXEnabled,
    staleTime: 30 * 1000,
  });

  // Assets from OKX (simplified since Zerion is removed)
  const assets = useMemo((): HybridAsset[] => {
    // Return empty for now - actual implementation would fetch balances
    return [];
  }, []);

  // Calculate total value
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);
  }, [assets]);

  const refetch = () => {
    okxQuery.refetch();
  };

  return {
    assets,
    totalValue,
    isLoading: okxQuery.isLoading,
    isError: okxQuery.isError,
    refetch,
    activeSource: dataSource === 'xlama' ? 'xlama' : 'okx',
  };
}
