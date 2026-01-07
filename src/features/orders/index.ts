/**
 * Orders Feature Module
 * Limit orders and DCA strategies
 */

// Components
export * from './components';

// Hooks
export {
  useLimitOrders,
  useDCAOrders,
  useDCATokenPrices,
} from './hooks';

// Types
export type { LimitOrder, DCAOrder, OrderStatus, OrderExecutionResult } from './types';

// Feature version
export const ORDERS_FEATURE_VERSION = '1.0.0';
