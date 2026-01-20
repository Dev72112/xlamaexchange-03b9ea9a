/**
 * Wallet Feature Module
 * Manages wallet connections, session auth, and chain management
 */

// Core infrastructure (new modular architecture)
export * from './core';
export * from './adapters';

// Hooks
export {
  useSession,
  useSessionSelector,
  useSessionAddress,
  useIsConnected,
  useSessionEcosystem,
  useOkxWallet,
  useTonProof,
} from './hooks';

// Components
export * from './components';

// Types (explicit exports to avoid conflicts)
export type { ChainType, ConnectionStatus, WalletInfo, ConnectedWallet } from './types';
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
export const WALLET_FEATURE_VERSION = '2.0.0';
