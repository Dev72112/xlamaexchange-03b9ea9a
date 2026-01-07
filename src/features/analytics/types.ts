/**
 * Analytics Feature Types
 */

export interface TradeAnalytics {
  totalTrades: number;
  totalVolumeUsd: number;
  winRate: number;
  averageTradeSize: number;
  mostTradedToken: string;
  mostActiveChain: string;
  tradingStreak: number;
}

export interface GasMetrics {
  totalGasSpent: string;
  totalGasSpentUsd: number;
  averageGasPerTrade: string;
  gasSavedVsBaseline: string;
  chainBreakdown: ChainGasBreakdown[];
}

export interface ChainGasBreakdown {
  chainIndex: string;
  chainName: string;
  totalGas: string;
  totalGasUsd: number;
  tradeCount: number;
}

export interface PnLData {
  date: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface TokenPnL {
  tokenSymbol: string;
  tokenAddress: string;
  chainIndex: string;
  totalBought: string;
  totalSold: string;
  averageBuyPrice: number;
  averageSellPrice: number;
  realizedPnL: number;
  unrealizedPnL: number;
  currentPrice: number;
  currentHolding: string;
}

export interface TradeVsHodl {
  tradeValue: number;
  hodlValue: number;
  difference: number;
  differencePercent: number;
  outperforming: boolean;
}
