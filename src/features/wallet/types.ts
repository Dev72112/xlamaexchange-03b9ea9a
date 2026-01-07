/**
 * Wallet Feature Types
 */

export type ChainType = 'evm' | 'solana' | 'sui' | 'tron' | 'ton';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// WalletSession is exported from ./lib/walletSession.ts
// Re-exported here for convenience
export type { WalletSession } from './lib/walletSession';

export interface WalletInfo {
  name: string;
  icon: string;
  chainType: ChainType;
  installed: boolean;
  deepLink?: string;
}

export interface ChainInfo {
  chainIndex: string;
  chainId?: number;
  name: string;
  shortName: string;
  logoUrl: string;
  nativeToken: {
    symbol: string;
    decimals: number;
  };
  explorerUrl: string;
  rpcUrl?: string;
}

export interface ConnectedWallet {
  address: string;
  chainType: ChainType;
  chainIndex?: string;
  walletName?: string;
}
