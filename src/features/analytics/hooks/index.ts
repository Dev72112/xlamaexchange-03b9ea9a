/**
 * Analytics Feature Hooks - Barrel Export
 */

// Gas analytics
export { useGasPrice } from '@/hooks/useGasPrice';
export { useGasAnalytics } from '@/hooks/useGasAnalytics';
export { useMultiChainGas } from '@/hooks/useMultiChainGas';

// Trade analytics
export { useTradeAnalytics } from '@/hooks/useTradeAnalytics';
export { useTradeVsHodl, type WalletHolding } from '@/hooks/useTradeVsHodl';

// Price analytics
export { usePricePrediction } from '@/hooks/usePricePrediction';
export { useWebSocketPrice } from '@/hooks/useWebSocketPrice';

// xLama Analytics API
export { useXlamaPortfolio } from '@/hooks/useXlamaPortfolio';
export { useXlamaAnalytics, type AnalyticsPeriod } from '@/hooks/useXlamaAnalytics';
export { useXlamaTransactions, useXlamaTransactionsPaginated } from '@/hooks/useXlamaTransactions';
