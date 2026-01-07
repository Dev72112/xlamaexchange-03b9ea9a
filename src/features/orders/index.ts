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

// Types - re-export LimitOrder from hooks and local types
export type { LimitOrder } from './hooks';
export type { DCAOrder, OrderStatus, OrderExecutionResult } from './types';

// Feature version
export const ORDERS_FEATURE_VERSION = '1.0.0';
