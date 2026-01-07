/**
 * Swap Feature Hooks - Barrel Export
 * 
 * Note: Hooks are re-exported from their original locations
 * for backwards compatibility during migration
 */

// Core swap hooks
export { useDexQuote } from '@/hooks/useDexQuote';
export { useDexSwap, type SwapStep } from '@/hooks/useDexSwap';
export { useDexTokens } from '@/hooks/useDexTokens';

// Token-related hooks
export { useTokenBalance } from '@/hooks/useTokenBalance';
export { useTokenPrices } from '@/hooks/useTokenPrice';
export { useRecentTokens } from '@/hooks/useRecentTokens';
export { useCustomTokens } from '@/hooks/useCustomTokens';

// Slippage hook
export { useAutoSlippage } from '@/hooks/useAutoSlippage';
