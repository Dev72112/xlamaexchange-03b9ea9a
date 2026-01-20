/**
 * OKX Universal Adapter
 * Wraps OKX Universal Provider for multi-chain support (EVM, Solana, Tron, Sui, TON)
 */

import { BaseAdapter } from './BaseAdapter';
import { Ecosystem, WalletCapabilities } from '../core/types';

// OKX Chain namespace mapping
const ECOSYSTEM_TO_NAMESPACE: Record<Ecosystem, string> = {
  evm: 'eip155',
  solana: 'solana',
  tron: 'tron',
  sui: 'sui',
  ton: 'ton',
};

export class OkxUniversalAdapter extends BaseAdapter {
  readonly ecosystem: Ecosystem;
  readonly name: string = 'OKX Wallet';
  readonly icon: string = 'https://static.okx.com/cdn/assets/imgs/247/58E63FEA47A2B7D7.png';

  private universalProvider: any = null;
  private injectedProvider: any = null;
  private chainIndex: string = '1'; // Default to Ethereum mainnet

  constructor(ecosystem: Ecosystem = 'evm') {
    super();
    this.ecosystem = ecosystem;
  }

  async connect(): Promise<string> {
    try {
      // Try injected provider first (OKX extension or in-app browser)
      const injected = this.getInjectedProvider();
      if (injected) {
        return this.connectInjected(injected);
      }

      // Fall back to Universal Provider (QR code flow)
      return this.connectUniversalProvider();
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  private async connectInjected(provider: any): Promise<string> {
    this.injectedProvider = provider;

    if (this.ecosystem === 'evm') {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }
      this.address = accounts[0];
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      this.chainId = parseInt(chainIdHex, 16);
    } else if (this.ecosystem === 'solana') {
      const solanaProvider = (window as any).okxwallet?.solana;
      if (!solanaProvider) throw new Error('OKX Solana provider not found');
      await solanaProvider.connect();
      this.address = solanaProvider.publicKey?.toString();
      this.chainId = 'solana';
    } else if (this.ecosystem === 'tron') {
      const tronProvider = (window as any).okxwallet?.tronLink;
      if (!tronProvider) throw new Error('OKX Tron provider not found');
      await tronProvider.request({ method: 'tron_requestAccounts' });
      this.address = tronProvider.tronWeb?.defaultAddress?.base58;
      this.chainId = 'tron';
    }

    if (!this.address) {
      throw new Error('Failed to get address');
    }

    this.connected = true;
    this.setupInjectedListeners();
    return this.address;
  }

  private async connectUniversalProvider(): Promise<string> {
    try {
      const { OKXUniversalProvider } = await import('@okxconnect/universal-provider');
      
      this.universalProvider = await OKXUniversalProvider.init({
        dappMetaData: {
          name: 'xLama Exchange',
          icon: 'https://xlamaexchange.lovable.app/xlama-mascot.png',
        },
      });

      const namespace = ECOSYSTEM_TO_NAMESPACE[this.ecosystem];
      const session = await this.universalProvider.connect({
        namespaces: {
          [namespace]: {
            chains: this.getChainConfig(),
          },
        },
      });

      // Extract address from session
      this.address = this.extractAddressFromSession(session);
      if (!this.address) {
        throw new Error('Failed to get address from session');
      }

      this.connected = true;
      return this.address;
    } catch (error) {
      console.error('[OkxUniversalAdapter] Universal provider error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.injectedProvider && this.ecosystem === 'solana') {
        await (window as any).okxwallet?.solana?.disconnect?.();
      }
      if (this.universalProvider) {
        await this.universalProvider.disconnect?.();
      }
    } catch (error) {
      console.warn('[OkxUniversalAdapter] Disconnect error:', error);
    } finally {
      this.emitDisconnect();
      this.universalProvider = null;
      this.injectedProvider = null;
      this.cleanup();
    }
  }

  getSigner(): any {
    if (this.ecosystem === 'solana') {
      return (window as any).okxwallet?.solana || this.universalProvider;
    }
    if (this.ecosystem === 'tron') {
      return (window as any).okxwallet?.tronLink?.tronWeb;
    }
    return this.injectedProvider || this.universalProvider;
  }

  getProvider(): any {
    return this.injectedProvider || this.universalProvider;
  }

  async switchChain(chainId: number | string): Promise<void> {
    if (this.ecosystem !== 'evm') {
      // For non-EVM, chain switching is just updating internal state
      this.chainIndex = String(chainId);
      this.chainId = chainId;
      this.emitChainChange(chainId);
      return;
    }

    // For EVM chains, we need to actually switch the wallet's network
    const numericChainId = Number(chainId);
    const chainIdHex = `0x${numericChainId.toString(16)}`;

    // Try injected provider first (OKX extension or in-app browser)
    if (this.injectedProvider) {
      try {
        await this.injectedProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        this.chainId = numericChainId;
        this.emitChainChange(numericChainId);
        console.log('[OkxUniversalAdapter] Switched chain via injected provider to:', numericChainId);
        return;
      } catch (switchError: any) {
        // Chain not added to wallet, try adding it
        if (switchError?.code === 4902) {
          console.log('[OkxUniversalAdapter] Chain not found, user needs to add it manually');
        }
        throw switchError;
      }
    }

    // Fallback: Universal provider (setDefaultChain only changes internal state, not wallet network)
    if (this.universalProvider) {
      try {
        // For Universal Provider, we can only set the default chain for requests
        // The actual wallet network won't change, but we can track which chain we're on
        this.universalProvider.setDefaultChain?.(`eip155:${numericChainId}`, 'eip155');
        this.chainId = numericChainId;
        this.emitChainChange(numericChainId);
        console.log('[OkxUniversalAdapter] Set default chain on Universal Provider to:', numericChainId);
        return;
      } catch (err) {
        console.warn('[OkxUniversalAdapter] Failed to set default chain:', err);
      }
    }

    throw new Error('No provider available for chain switching');
  }

  getCapabilities(): WalletCapabilities {
    const base = {
      swap: true,
      bridge: this.ecosystem === 'evm',
      perpetuals: this.ecosystem === 'evm',
    };

    // Solana has full order support via Jupiter
    if (this.ecosystem === 'solana') {
      return { ...base, limitOrders: true, dca: true };
    }

    // EVM redirects to Hyperliquid
    return { ...base, limitOrders: false, dca: false };
  }

  private getInjectedProvider(): any {
    if (typeof window === 'undefined') return null;
    return (window as any).okxwallet;
  }

  private getChainConfig(): string[] {
    if (this.ecosystem === 'evm') {
      return ['eip155:1', 'eip155:42161', 'eip155:137', 'eip155:10'];
    }
    if (this.ecosystem === 'solana') {
      return ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'];
    }
    if (this.ecosystem === 'tron') {
      return ['tron:mainnet'];
    }
    return [];
  }

  private extractAddressFromSession(session: any): string | null {
    try {
      const namespace = ECOSYSTEM_TO_NAMESPACE[this.ecosystem];
      const accounts = session?.namespaces?.[namespace]?.accounts;
      if (accounts && accounts.length > 0) {
        // Format: "namespace:chain:address"
        const parts = accounts[0].split(':');
        return parts[parts.length - 1];
      }
    } catch (error) {
      console.error('[OkxUniversalAdapter] Failed to extract address:', error);
    }
    return null;
  }

  private setupInjectedListeners(): void {
    if (this.ecosystem === 'evm' && this.injectedProvider) {
      this.injectedProvider.on?.('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.emitDisconnect();
        } else {
          this.emitAccountChange(accounts[0]);
        }
      });

      this.injectedProvider.on?.('chainChanged', (chainIdHex: string) => {
        this.emitChainChange(parseInt(chainIdHex, 16));
      });
    }
  }
}
