/**
 * useHyperliquidFills Hook
 * 
 * Fetches user trade fills/history from Hyperliquid.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { hyperliquidService } from '@/services/hyperliquid';

export interface TradeFill {
  time: number;
  coin: string;
  side: 'B' | 'S';
  px: string;
  sz: string;
  startPosition: string;
  closedPnl: string;
  hash: string;
  fee: string;
  feeToken: string;
  oid: number;
  crossed: boolean;
  dir: string;
}

export interface UseHyperliquidFillsResult {
  fills: TradeFill[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  
  // Computed values
  totalPnl: number;
  totalFees: number;
  totalVolume: number;
  winRate: number;
  tradeCount: number;
}

export function useHyperliquidFills(coin?: string): UseHyperliquidFillsResult {
  const { activeAddress, activeChainType, isConnected } = useMultiWallet();
  
  const isEVM = activeChainType === 'evm';
  const enabled = isConnected && isEVM && !!activeAddress;

  const {
    data: rawFills = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hyperliquid', 'fills', activeAddress, coin],
    queryFn: async () => {
      const fills = await hyperliquidService.getTradeHistory(activeAddress!);
      // Filter by coin if specified
      if (coin) {
        return fills.filter((f: TradeFill) => f.coin === coin);
      }
      return fills;
    },
    enabled,
    staleTime: 30000, // 30s
    refetchInterval: 60000, // 1 min auto-refresh
  });

  // Normalize fills data
  const fills: TradeFill[] = useMemo(() => {
    if (!rawFills || !Array.isArray(rawFills)) return [];
    
    return rawFills.map((fill: any) => ({
      time: fill.time || Date.now(),
      coin: fill.coin || '',
      side: fill.side || 'B',
      px: fill.px || '0',
      sz: fill.sz || '0',
      startPosition: fill.startPosition || '0',
      closedPnl: fill.closedPnl || '0',
      hash: fill.hash || fill.tid || '',
      fee: fill.fee || '0',
      feeToken: fill.feeToken || 'USDC',
      oid: fill.oid || 0,
      crossed: fill.crossed || false,
      dir: fill.dir || '',
    }));
  }, [rawFills]);

  // Compute statistics
  const stats = useMemo(() => {
    if (!fills.length) {
      return { totalPnl: 0, totalFees: 0, totalVolume: 0, winRate: 0, tradeCount: 0 };
    }
    
    let totalPnl = 0;
    let totalFees = 0;
    let totalVolume = 0;
    let winningTrades = 0;
    let closedTrades = 0;
    
    fills.forEach((fill) => {
      const pnl = parseFloat(fill.closedPnl);
      const fee = parseFloat(fill.fee);
      const volume = parseFloat(fill.sz) * parseFloat(fill.px);
      
      totalPnl += pnl;
      totalFees += fee;
      totalVolume += volume;
      
      if (pnl !== 0) {
        closedTrades++;
        if (pnl > 0) winningTrades++;
      }
    });
    
    const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;
    
    return {
      totalPnl,
      totalFees,
      totalVolume,
      winRate,
      tradeCount: fills.length,
    };
  }, [fills]);

  return {
    fills,
    isLoading,
    error: error as Error | null,
    refetch,
    ...stats,
  };
}
