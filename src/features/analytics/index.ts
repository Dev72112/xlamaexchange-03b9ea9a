/**
 * Analytics Feature Module - Public API
 * 
 * This module handles trading analytics:
 * - Trade history and volume
 * - Gas analysis
 * - P&L charts
 * - Performance metrics
 */

// Components (to be migrated)
// export { TokenPnLChart, GasBreakdown, TradeVolumeChart } from './components';

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
