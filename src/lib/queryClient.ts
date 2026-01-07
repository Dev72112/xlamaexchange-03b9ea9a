/**
 * Optimized React Query Client Configuration
 * Provides consistent caching, retry logic, and performance settings
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data freshness - 30 seconds before refetch
      staleTime: 30 * 1000,
      // Garbage collection - 5 minutes after last usage
      gcTime: 5 * 60 * 1000,
      // Don't refetch on window focus (reduces unnecessary calls)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect (handled manually where needed)
      refetchOnReconnect: false,
      // Retry failed requests with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Network mode - fetch when online
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
  },
});

// Query key factories for consistent cache keys
export const queryKeys = {
  // Token-related queries
  tokens: {
    all: ['tokens'] as const,
    byChain: (chainIndex: string) => ['tokens', chainIndex] as const,
    search: (chainIndex: string, query: string) => ['tokens', chainIndex, 'search', query] as const,
  },
  // Balance queries
  balances: {
    all: ['balances'] as const,
    byAddress: (address: string, chains: string) => ['balances', address, chains] as const,
  },
  // Quote queries (short cache)
  quotes: {
    dex: (params: Record<string, unknown>) => ['quotes', 'dex', params] as const,
    bridge: (params: Record<string, unknown>) => ['quotes', 'bridge', params] as const,
  },
  // Price queries
  prices: {
    token: (chainIndex: string, address: string) => ['prices', chainIndex, address] as const,
    history: (from: string, to: string) => ['prices', 'history', from, to] as const,
  },
  // Transaction history
  transactions: {
    dex: (address: string) => ['transactions', 'dex', address] as const,
    instant: (address: string) => ['transactions', 'instant', address] as const,
    bridge: (address: string) => ['transactions', 'bridge', address] as const,
  },
  // Orders
  orders: {
    limit: (address: string) => ['orders', 'limit', address] as const,
    dca: (address: string) => ['orders', 'dca', address] as const,
  },
} as const;
