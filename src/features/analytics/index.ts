/**
 * Analytics Feature Module
 * Trading analytics and performance tracking
 */

// Components
export * from './components';

// Hooks
export {
  useGasPrice,
  useGasAnalytics,
  useMultiChainGas,
  useTradeAnalytics,
  useTradeVsHodl,
  usePricePrediction,
  useWebSocketPrice,
  useXlamaPortfolio,
  useXlamaAnalytics,
  useXlamaTransactions,
  useXlamaTransactionsPaginated,
} from './hooks';

// Re-export TimePeriod type from useTradeAnalytics
export type { TimePeriod } from '@/hooks/useTradeAnalytics';
export type { AnalyticsPeriod } from './hooks';

// Types
export type { 
  TradeAnalytics, 
  GasMetrics, 
  PnLData,
  ChainGasBreakdown,
  TokenPnL,
  TradeVsHodl,
} from './types';

// Feature version
export const ANALYTICS_FEATURE_VERSION = '1.0.0';
