/**
 * useHyperliquidAccount Hook
 * 
 * Provides account state, positions, and balances for Hyperliquid.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { 
  hyperliquidService, 
  HyperliquidAccountState, 
  HyperliquidPosition,
} from '@/services/hyperliquid';

export interface UseHyperliquidAccountResult {
  accountState: HyperliquidAccountState | null;
  positions: HyperliquidPosition[];
  openOrders: any[];
  recentTrades: any[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  
  // Computed values
  totalEquity: number;
  unrealizedPnl: number;
  availableMargin: number;
  marginUsed: number;
}

export function useHyperliquidAccount(): UseHyperliquidAccountResult {
  const { activeAddress, activeChainType, isConnected } = useMultiWallet();
  const queryClient = useQueryClient();
  
  // Only enable for EVM wallets
  const isEVM = activeChainType === 'evm';
  const enabled = isConnected && isEVM && !!activeAddress;

  // Fetch account state
  const {
    data: accountState,
    isLoading: stateLoading,
    error: stateError,
    refetch: refetchState,
  } = useQuery({
    queryKey: ['hyperliquid', 'account', activeAddress],
    queryFn: () => hyperliquidService.getAccountState(activeAddress!),
    enabled,
    staleTime: 10000, // 10s
    refetchInterval: 15000, // 15s auto-refresh
    retry: 1, // Only retry once
    retryDelay: 2000,
  });

  // Fetch open orders
  const {
    data: openOrders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['hyperliquid', 'orders', activeAddress],
    queryFn: () => hyperliquidService.getOpenOrders(activeAddress!),
    enabled,
    staleTime: 5000,
    refetchInterval: 10000,
    retry: 1,
  });

  // Fetch recent trades
  const {
    data: recentTrades = [],
    isLoading: tradesLoading,
    refetch: refetchTrades,
  } = useQuery({
    queryKey: ['hyperliquid', 'trades', activeAddress],
    queryFn: () => hyperliquidService.getTradeHistory(activeAddress!),
    enabled,
    staleTime: 30000,
  });

  // Computed values
  const totalEquity = accountState?.marginSummary?.accountValue
    ? parseFloat(accountState.marginSummary.accountValue)
    : 0;

  const marginUsed = accountState?.marginSummary?.totalMarginUsed
    ? parseFloat(accountState.marginSummary.totalMarginUsed)
    : 0;

  const availableMargin = totalEquity - marginUsed;

  const unrealizedPnl = accountState?.positions?.reduce((total, pos) => {
    return total + parseFloat(pos.unrealizedPnl || '0');
  }, 0) || 0;

  // Combined refetch
  const refetch = useCallback(() => {
    refetchState();
    refetchOrders();
    refetchTrades();
  }, [refetchState, refetchOrders, refetchTrades]);

  return {
    accountState: accountState || null,
    positions: accountState?.positions || [],
    openOrders,
    recentTrades,
    isLoading: stateLoading || ordersLoading || tradesLoading,
    error: stateError as Error | null,
    refetch,
    totalEquity,
    unrealizedPnl,
    availableMargin,
    marginUsed,
  };
}
