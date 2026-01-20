/**
 * Adapter Factory
 * Creates appropriate wallet adapter based on configuration
 */

import { WalletAdapter, Ecosystem } from '../core/types';
import { EvmReownAdapter } from './EvmReownAdapter';
import { OkxUniversalAdapter } from './OkxUniversalAdapter';
import { SolanaAdapter } from './SolanaAdapter';
import { SuiAdapter } from './SuiAdapter';
import { TronAdapter } from './TronAdapter';
import { TonAdapter } from './TonAdapter';

export interface AdapterConfig {
  type: 'okx' | 'reown' | 'solana' | 'sui' | 'tron' | 'ton';
  ecosystem?: Ecosystem;
  walletName?: string;
  walletIcon?: string;
}

/**
 * Create a wallet adapter based on configuration
 */
export function createAdapter(config: AdapterConfig): WalletAdapter {
  switch (config.type) {
    case 'okx':
      return new OkxUniversalAdapter(config.ecosystem || 'evm');
    
    case 'reown':
      return new EvmReownAdapter(config.walletName, config.walletIcon);
    
    case 'solana':
      return new SolanaAdapter(config.walletName, config.walletIcon);
    
    case 'sui':
      return new SuiAdapter(config.walletName, config.walletIcon);
    
    case 'tron':
      return new TronAdapter(config.walletName, config.walletIcon);
    
    case 'ton':
      return new TonAdapter(config.walletName, config.walletIcon);
    
    default:
      throw new Error(`Unknown adapter type: ${config.type}`);
  }
}

/**
 * Get recommended adapter for a given ecosystem
 */
export function getRecommendedAdapter(ecosystem: Ecosystem): WalletAdapter {
  // OKX is recommended for all ecosystems due to multi-chain support
  return new OkxUniversalAdapter(ecosystem);
}

/**
 * Check if OKX wallet is available
 */
export function isOkxAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).okxwallet;
}

/**
 * Check if specific wallet is available
 */
export function isWalletAvailable(type: 'phantom' | 'solflare' | 'metamask' | 'okx'): boolean {
  if (typeof window === 'undefined') return false;
  
  switch (type) {
    case 'phantom':
      return !!(window as any).phantom?.solana;
    case 'solflare':
      return !!(window as any).solflare;
    case 'metamask':
      return !!(window as any).ethereum?.isMetaMask;
    case 'okx':
      return !!(window as any).okxwallet;
    default:
      return false;
  }
}
