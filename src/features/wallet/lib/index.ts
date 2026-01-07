/**
 * Wallet Feature - Lib Module
 * Re-exports all wallet utility functions
 */

// Session authentication
export {
  type SessionAuth,
  type SigningProviders,
  clearSessionAuth,
  clearAllSessionAuth,
  hasValidSessionAuth,
  getOrCreateSessionAuth,
  getSessionTimeRemaining,
} from './sessionAuth';

// Wallet session persistence
export {
  type WalletSession,
  saveWalletSession,
  getWalletSession,
  clearWalletSession,
  isSessionValid,
  updateActiveChain,
  updateChainConnection,
} from './walletSession';

// Deep-link utilities
export {
  type OkxWalletExtension,
  type DeeplinkConfig,
  type ConnectionMethod,
  getOkxWallet,
  isMobileBrowser,
  isInWalletBrowser,
  isInOkxBrowser,
  isOkxExtensionAvailable,
  getRecommendedConnectionMethod,
  openOkxDeeplink,
  isEvmWalletAvailable,
  isSolanaWalletAvailable,
  isTronWalletAvailable,
  getCurrentDappUrl,
  walletDeeplinks,
  openWalletDeeplink,
  getWalletInstallUrl,
} from './deeplinks';
