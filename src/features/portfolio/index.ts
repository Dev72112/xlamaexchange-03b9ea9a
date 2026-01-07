/**
 * Portfolio Feature Module
 * Portfolio management and rebalancing
 */

// Components
export * from './components';

// Hooks
export {
  usePortfolioPnL,
  usePortfolioRebalance,
  useRebalanceSchedule,
  useTokenWatchlist,
  useTokenPnL,
} from './hooks';

// Types
export type { 
  PortfolioHolding, 
  PortfolioSummary, 
  RebalanceStrategy, 
  TokenAllocation,
  RebalanceTrade,
  RebalanceSchedule,
} from './types';

// Feature version
export const PORTFOLIO_FEATURE_VERSION = '1.0.0';
