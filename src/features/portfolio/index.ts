/**
 * Portfolio Feature Module - Public API
 * 
 * This module handles portfolio management:
 * - Holdings overview
 * - Allocation tracking
 * - Rebalancing strategies
 * - P&L tracking
 */

// Components (to be migrated)
// export { PortfolioOverview, HoldingsTable, AllocationChart, Rebalancer } from './components';

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
