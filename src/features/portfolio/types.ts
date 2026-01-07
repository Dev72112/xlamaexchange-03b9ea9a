/**
 * Portfolio Feature Types
 */

export interface PortfolioHolding {
  chainIndex: string;
  chainName: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenLogoUrl?: string;
  balance: string;
  balanceUsd: number;
  price: number;
  priceChange24h?: number;
  allocation: number;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  totalChange24h: number;
  totalChangePercent24h: number;
  stablecoinValue: number;
  stablecoinPercent: number;
  holdingsCount: number;
  chainsCount: number;
}

export interface RebalanceStrategy {
  id: string;
  name: string;
  description?: string;
  allocations: TokenAllocation[];
}

export interface TokenAllocation {
  tokenSymbol: string;
  targetPercent: number;
  currentPercent?: number;
  drift?: number;
}

export interface RebalanceTrade {
  fromToken: string;
  toToken: string;
  amount: string;
  chainIndex: string;
}

export interface RebalanceSchedule {
  id: string;
  name: string;
  strategy: RebalanceStrategy;
  frequency: 'daily' | 'weekly' | 'monthly';
  thresholdPercent: number;
  nextExecution: string;
  status: 'active' | 'paused';
}
