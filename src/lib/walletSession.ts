/**
 * Unified Wallet Session Manager
 * @deprecated Import from '@/features/wallet' instead
 * This file is kept for backwards compatibility
 */

// Re-export everything from the new location
export {
  type WalletSession,
  saveWalletSession,
  getWalletSession,
  clearWalletSession,
  isSessionValid,
  updateActiveChain,
  updateChainConnection,
} from '@/features/wallet/lib/walletSession';
