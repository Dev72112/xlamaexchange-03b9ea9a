/**
 * Analytics Feature Hooks - Barrel Export
 */

// Gas analytics
export { useGasPrice } from '@/hooks/useGasPrice';
export { useGasAnalytics } from '@/hooks/useGasAnalytics';
export { useMultiChainGas } from '@/hooks/useMultiChainGas';

// Trade analytics
export { useTradeAnalytics } from '@/hooks/useTradeAnalytics';
export { useTradeVsHodl } from '@/hooks/useTradeVsHodl';

// Price analytics
export { usePricePrediction } from '@/hooks/usePricePrediction';
export { useWebSocketPrice } from '@/hooks/useWebSocketPrice';
