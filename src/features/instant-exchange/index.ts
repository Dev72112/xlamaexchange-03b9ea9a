/**
 * Instant Exchange Feature Module - Public API
 * 
 * This module handles ChangeNow instant swaps including:
 * - Currency selection
 * - Rate estimation
 * - Transaction creation and tracking
 */

// Components (to be migrated)
// export { InstantExchangeWidget, CurrencySelector } from './components';

// Types
export type { 
  InstantQuote, 
  InstantParams, 
  InstantCurrency, 
  InstantTransaction, 
  InstantTransactionStatus 
} from './types';

// Feature version
export const INSTANT_EXCHANGE_FEATURE_VERSION = '1.0.0';
