/**
 * Bridge Feature Module
 * Cross-chain bridging powered by Li.Fi
 */

// Components
export * from './components';

// Hooks
export {
  useLiFiQuote,
  useLiFiRoutes,
  useLiFiSwapExecution,
  useCrossChainQuote,
  useCrossChainSwapExecution,
  useBridgeSettings,
  useBridgeStatusPolling,
} from './hooks';

// Types
export type { 
  BridgeQuote,
  BridgeParams,
  BridgeRoute, 
  BridgeToken,
  BridgeStep,
  BridgeResult,
} from './types';

// Feature version for cache busting
export const BRIDGE_FEATURE_VERSION = '1.0.0';
