/**
 * Swap Feature Module - Public API
 * 
 * This module handles DEX swap functionality including:
 * - Token selection and search
 * - Quote fetching and comparison
 * - Swap execution
 * - Transaction tracking
 */

// Components
export { 
  TokenAmountInput,
  SwapButton,
  RateDisplay,
  GasEstimate,
  formatGasDisplay,
  WalletConnectionPrompt,
  ChainSwitchPrompt,
  NonEvmChainInfo,
} from './components';

// Types
export type { SwapQuote, SwapParams, SwapToken, SwapRoute, SwapResult } from './types';

// Feature version
export const SWAP_FEATURE_VERSION = '1.0.0';
