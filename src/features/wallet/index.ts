/**
 * Wallet Feature Module - Public API
 * 
 * This module handles wallet connectivity:
 * - Multi-chain wallet connections
 * - Session management
 * - Chain switching
 * - Address management
 */

// Components (to be migrated)
// export { MultiWalletButton, ChainSelector, WalletPicker } from './components';

// Types
export type { 
  WalletSession, 
  ChainType, 
  ConnectionStatus,
  WalletInfo,
  ChainInfo,
  ConnectedWallet,
} from './types';

// Feature version
export const WALLET_FEATURE_VERSION = '1.0.0';
