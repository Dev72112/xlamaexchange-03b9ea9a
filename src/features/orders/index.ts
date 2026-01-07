/**
 * Orders Feature Module - Public API
 * 
 * This module handles limit orders and DCA:
 * - Limit order creation and management
 * - DCA strategy setup
 * - Order monitoring and execution
 */

// Components (to be migrated)
// export { LimitOrderForm, DCAOrderForm, ActiveOrders } from './components';

// Types
export type { LimitOrder, DCAOrder, OrderStatus, OrderExecutionResult } from './types';

// Feature version
export const ORDERS_FEATURE_VERSION = '1.0.0';
