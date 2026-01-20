/**
 * Core Wallet Architecture Types
 * Defines the standardized interface for all wallet adapters
 */

export type Ecosystem = 'evm' | 'solana' | 'sui' | 'tron' | 'ton';

export interface WalletCapabilities {
  swap: boolean;
  bridge: boolean;
  limitOrders: boolean;
  dca: boolean;
  perpetuals: boolean;
}

/**
 * Standardized wallet adapter interface
 * All wallet providers must implement this interface
 */
export interface WalletAdapter {
  readonly ecosystem: Ecosystem;
  readonly name: string;
  readonly icon?: string;

  // Connection lifecycle
  connect(): Promise<string>; // Returns address on success
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // State getters
  getAddress(): string | null;
  getChainId(): number | string | null;
  getSigner(): any;
  getProvider(): any;

  // Chain management
  switchChain(chainId: number | string): Promise<void>;
  getCapabilities(): WalletCapabilities;

  // Event subscriptions - returns unsubscribe function
  onAccountChange(callback: (address: string | null) => void): () => void;
  onChainChange(callback: (chainId: number | string) => void): () => void;
  onDisconnect(callback: () => void): () => void;
}

/**
 * Session state exposed to UI components
 * This is the stable, derived state that UI subscribes to
 */
export interface SessionState {
  // Connection status
  ecosystem: Ecosystem | null;
  address: string | null;
  chainId: number | string | null;
  isConnected: boolean;
  isConnecting: boolean;

  // Wallet info
  walletName: string | null;
  walletIcon: string | null;

  // Capabilities
  capabilities: WalletCapabilities;

  // Error state
  error: string | null;
}

/**
 * Default empty capabilities
 */
export const DEFAULT_CAPABILITIES: WalletCapabilities = {
  swap: false,
  bridge: false,
  limitOrders: false,
  dca: false,
  perpetuals: false,
};

/**
 * Default empty session state
 */
export const DEFAULT_SESSION_STATE: SessionState = {
  ecosystem: null,
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  walletName: null,
  walletIcon: null,
  capabilities: DEFAULT_CAPABILITIES,
  error: null,
};

/**
 * Chain info for DEX operations
 * Maps chainIndex to chain metadata
 */
export interface ChainInfo {
  chainIndex: string;
  chainId?: number;
  ecosystem: Ecosystem;
  name: string;
  shortName: string;
  icon: string;
  nativeToken: {
    symbol: string;
    decimals: number;
  };
  explorerUrl: string;
  rpcUrl?: string;
}

/**
 * Chains that are NOT supported by OKX DEX
 * These should be hidden from the DEX chain selector
 */
export const DEX_EXCLUDED_CHAIN_IDS: (number | string)[] = [
  999,   // HyperEVM - not supported by OKX DEX routing
];

/**
 * Check if a chain is excluded from DEX operations
 */
export function isChainExcludedFromDex(chainId: number | string | null): boolean {
  if (chainId === null) return false;
  return DEX_EXCLUDED_CHAIN_IDS.includes(chainId) || 
         DEX_EXCLUDED_CHAIN_IDS.includes(String(chainId));
}
