/**
 * Unified Data Context
 * Single source of truth for portfolio data across Portfolio, Analytics, and History pages.
 * Ensures synchronized cache and consistent data loading across the app.
 */

import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useExchangeMode } from '@/contexts/ExchangeModeContext';

// Query key factories for unified caching
export const unifiedQueryKeys = {
  portfolio: (address: string, chainFilter: string) => 
    ['unified-portfolio', address?.toLowerCase(), chainFilter] as const,
  balances: (address: string, chainFilter: string) => 
    ['unified-balances', address?.toLowerCase(), chainFilter] as const,
  transactions: (address: string, chainFilter: string) => 
    ['unified-transactions', address?.toLowerCase(), chainFilter] as const,
  analytics: (address: string, chainFilter: string, period: string) => 
    ['unified-analytics', address?.toLowerCase(), chainFilter, period] as const,
  nfts: (address: string) => 
    ['unified-nfts', address?.toLowerCase()] as const,
  defi: (address: string) => 
    ['unified-defi', address?.toLowerCase()] as const,
};

interface UnifiedDataContextValue {
  // Invalidate all portfolio-related queries for current wallet
  invalidateAllPortfolioData: () => Promise<void>;
  // Invalidate specific data types
  invalidateBalances: () => Promise<void>;
  invalidateTransactions: () => Promise<void>;
  invalidateAnalytics: () => Promise<void>;
  // Current wallet address (normalized)
  currentAddress: string | null;
  // Current chain filter
  currentChainFilter: string;
  // Loading state
  isRefreshing: boolean;
  setIsRefreshing: (value: boolean) => void;
}

const UnifiedDataContext = createContext<UnifiedDataContextValue | undefined>(undefined);

interface UnifiedDataProviderProps {
  children: ReactNode;
}

export function UnifiedDataProvider({ children }: UnifiedDataProviderProps) {
  const queryClient = useQueryClient();
  const { activeAddress } = useMultiWallet();
  const { globalChainFilter } = useExchangeMode();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const currentAddress = useMemo(() => 
    activeAddress?.toLowerCase() || null, 
    [activeAddress]
  );

  const currentChainFilter = useMemo(() => 
    globalChainFilter === 'all' ? 'all-evm' : globalChainFilter,
    [globalChainFilter]
  );

  // Invalidate all portfolio-related queries
  const invalidateAllPortfolioData = useCallback(async () => {
    if (!currentAddress) return;
    
    setIsRefreshing(true);
    
    try {
      // Invalidate all unified queries
      await Promise.all([
        queryClient.invalidateQueries({ 
          predicate: (query) => 
            Array.isArray(query.queryKey) && 
            query.queryKey[0]?.toString().startsWith('unified-')
        }),
        // Also invalidate legacy query keys for backward compatibility
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['token-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['zerion'] }),
        queryClient.invalidateQueries({ queryKey: ['okx-portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['hybrid-portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['trade-analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['dex-transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['bridge-transactions'] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentAddress, queryClient]);

  const invalidateBalances = useCallback(async () => {
    if (!currentAddress) return;
    await queryClient.invalidateQueries({ 
      queryKey: unifiedQueryKeys.balances(currentAddress, currentChainFilter) 
    });
    await queryClient.invalidateQueries({ queryKey: ['token-balances'] });
    await queryClient.invalidateQueries({ queryKey: ['okx-portfolio'] });
  }, [currentAddress, currentChainFilter, queryClient]);

  const invalidateTransactions = useCallback(async () => {
    if (!currentAddress) return;
    await queryClient.invalidateQueries({ 
      queryKey: unifiedQueryKeys.transactions(currentAddress, currentChainFilter) 
    });
    await queryClient.invalidateQueries({ queryKey: ['dex-transactions'] });
    await queryClient.invalidateQueries({ queryKey: ['bridge-transactions'] });
  }, [currentAddress, currentChainFilter, queryClient]);

  const invalidateAnalytics = useCallback(async () => {
    if (!currentAddress) return;
    await queryClient.invalidateQueries({ 
      predicate: (query) => 
        Array.isArray(query.queryKey) && 
        query.queryKey[0] === 'unified-analytics'
    });
    await queryClient.invalidateQueries({ queryKey: ['trade-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['gas-analytics'] });
  }, [currentAddress, queryClient]);

  const value: UnifiedDataContextValue = {
    invalidateAllPortfolioData,
    invalidateBalances,
    invalidateTransactions,
    invalidateAnalytics,
    currentAddress,
    currentChainFilter,
    isRefreshing,
    setIsRefreshing,
  };

  return (
    <UnifiedDataContext.Provider value={value}>
      {children}
    </UnifiedDataContext.Provider>
  );
}

export function useUnifiedData() {
  const context = useContext(UnifiedDataContext);
  if (context === undefined) {
    throw new Error('useUnifiedData must be used within a UnifiedDataProvider');
  }
  return context;
}

export default UnifiedDataContext;
