/**
 * SwapFeature Components - Public API
 */

// Core swap components
export { TokenAmountInput } from './TokenAmountInput';
export { SwapButton } from './SwapButton';
export { RateDisplay } from './RateDisplay';
export { GasEstimate, formatGasDisplay } from './GasEstimate';

// Connection prompts
export { 
  WalletConnectionPrompt, 
  ChainSwitchPrompt, 
  NonEvmChainInfo 
} from './ConnectionPrompts';

// Decomposed SwapWidget components
export {
  SwapHeader,
  SwapTokenInput,
  SwapRateDisplay,
  SwapActions,
} from './SwapWidget';

// Types
export type {
  SwapMode,
  SwapToken,
  SwapQuote,
  SwapState,
  SwapWidgetProps,
} from './SwapWidget';
