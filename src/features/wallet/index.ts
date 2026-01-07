/**
 * Wallet Feature Module
 * Manages wallet connections, session auth, and chain management
 */

// Components
export * from './components';

// Hooks
export { useOkxWallet, useTonProof } from './hooks';

// Types (explicit exports to avoid conflicts)
export type { ChainType, ConnectionStatus, WalletInfo, ChainInfo, ConnectedWallet } from './types';
export type { WalletSession } from './lib/walletSession';
export type { SessionAuth, SigningProviders } from './lib/sessionAuth';

// Lib utilities (functions only, types handled above)
export {
  saveWalletSession,
  getWalletSession,
  clearWalletSession,
  isSessionValid,
  updateActiveChain,
  updateChainConnection,
} from './lib/walletSession';

export {
  clearSessionAuth,
  clearAllSessionAuth,
  hasValidSessionAuth,
  getOrCreateSessionAuth,
  getSessionTimeRemaining,
} from './lib/sessionAuth';

export * from './lib/deeplinks';

// Feature version for cache busting
export const WALLET_FEATURE_VERSION = '1.0.0';
