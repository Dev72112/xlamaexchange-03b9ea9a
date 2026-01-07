/**
 * Wallet Feature Types
 */

export type ChainType = 'evm' | 'solana' | 'sui' | 'tron' | 'ton';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface WalletSession {
  evmConnected: boolean;
  solanaConnected: boolean;
  suiConnected: boolean;
  tronConnected: boolean;
  tonConnected: boolean;
  lastConnected: number;
  activeChainType: ChainType;
  activeChainIndex?: string;
}

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
