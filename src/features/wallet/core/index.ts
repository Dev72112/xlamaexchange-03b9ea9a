/**
 * Core Wallet Module
 * Exports the session manager, types, and utilities
 */

// Types
export type {
  Ecosystem,
  WalletCapabilities,
  WalletAdapter,
  SessionState,
  ChainInfo,
} from './types';

export {
  DEFAULT_CAPABILITIES,
  DEFAULT_SESSION_STATE,
  DEX_EXCLUDED_CHAIN_IDS,
  isChainExcludedFromDex,
} from './types';

// Session Manager
export { sessionManager, SessionManager } from './SessionManager';
