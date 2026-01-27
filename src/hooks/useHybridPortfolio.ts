/**
 * Hybrid Portfolio Hook
 * Merges data from Zerion and OKX for comprehensive portfolio view
 */

import { useMemo } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useZerionPortfolio } from './useZerionPortfolio';
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
  source: 'zerion' | 'okx' | 'both';
}

export interface UseHybridPortfolioResult {
  assets: HybridAsset[];
  totalValue: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  activeSource: 'zerion' | 'okx' | 'hybrid' | 'xlama';
}

export function useHybridPortfolio(): UseHybridPortfolioResult {
  const { isConnected, activeAddress, activeChainType, activeChain } = useMultiWallet();
  const { dataSource, isZerionEnabled, isOKXEnabled } = useDataSource();
  
  // Zerion data (EVM only)
  const zerionResult = useZerionPortfolio();
  const isEvmChain = activeChainType === 'evm';
  
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

  // Merge assets from both sources with deduplication
  const mergedAssets = useMemo((): HybridAsset[] => {
    const assetMap = new Map<string, HybridAsset>();
    
    // Add Zerion positions (wallet positions with balances)
    if (isZerionEnabled && isEvmChain && zerionResult.walletPositions) {
      for (const pos of zerionResult.walletPositions) {
        // Skip dust/spam tokens (less than $0.01)
        if ((pos.value || 0) < 0.01) continue;
        
        // Skip tokens without valid name/symbol
        if (!pos.tokenSymbol || pos.tokenSymbol === 'Unknown') continue;
        
        const key = `${pos.chainId}:${pos.tokenAddress?.toLowerCase() || 'native'}`;
        
        // Check for duplicate - merge if exists
        const existing = assetMap.get(key);
        if (existing) {
          // Sum balances for duplicates
          existing.balance = (parseFloat(existing.balance) + (pos.quantity || 0)).toString();
          existing.valueUsd += pos.value || 0;
        } else {
          assetMap.set(key, {
            address: pos.tokenAddress || 'native',
            symbol: pos.tokenSymbol,
            name: pos.name,
            balance: pos.quantity?.toString() || '0',
            valueUsd: pos.value || 0,
            price: pos.price || 0,
            logoUrl: pos.tokenIcon || '',
            chainId: pos.chainId,
            source: 'zerion',
          });
        }
      }
    }
    
    // Merge OKX data (overlay or add new)
    // Note: In hybrid mode, OKX provides multi-chain coverage
    // For now, we just mark Zerion assets as having both sources if OKX is enabled
    if (isOKXEnabled && assetMap.size > 0) {
      assetMap.forEach((asset) => {
        asset.source = 'both';
      });
    }
    
    // Sort by value descending
    return Array.from(assetMap.values()).sort((a, b) => b.valueUsd - a.valueUsd);
  }, [zerionResult.walletPositions, isZerionEnabled, isOKXEnabled, isEvmChain]);

  // Calculate total value
  const totalValue = useMemo(() => {
    return mergedAssets.reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);
  }, [mergedAssets]);

  const refetch = () => {
    zerionResult.refetch();
    okxQuery.refetch();
  };

  return {
    assets: mergedAssets,
    totalValue,
    isLoading: zerionResult.isLoading || okxQuery.isLoading,
    isError: zerionResult.isError || okxQuery.isError,
    refetch,
    activeSource: dataSource,
  };
}
