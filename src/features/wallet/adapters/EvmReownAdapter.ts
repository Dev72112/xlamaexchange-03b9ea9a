/**
 * EVM Reown Adapter
 * Wraps Reown/AppKit for EVM wallet connections (MetaMask, WalletConnect, etc.)
 */

import { BaseAdapter } from './BaseAdapter';
import { Ecosystem, WalletCapabilities } from '../core/types';

export class EvmReownAdapter extends BaseAdapter {
  readonly ecosystem: Ecosystem = 'evm';
  readonly name: string = 'EVM Wallet';
  override readonly icon?: string = undefined;

  private provider: any = null;
  private accountsChangedHandler: ((accounts: string[]) => void) | null = null;
  private chainChangedHandler: ((chainId: string) => void) | null = null;
  private disconnectHandler: (() => void) | null = null;

  constructor(walletName?: string, walletIcon?: string) {
    super();
    if (walletName) this.name = walletName;
    if (walletIcon) this.icon = walletIcon;
  }

  async connect(): Promise<string> {
    try {
      // Get provider from AppKit or window.ethereum
      const provider = await this.getEvmProvider();
      if (!provider) {
        throw new Error('No EVM provider available');
      }

      this.provider = provider;

      // Request accounts
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      this.address = accounts[0];
      this.connected = true;

      // Get chain ID
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      this.chainId = parseInt(chainIdHex, 16);

      // Setup event listeners
      this.setupListeners();

      return this.address;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.removeListeners();
    this.emitDisconnect();
    this.provider = null;
    this.cleanup();
  }

  getSigner(): any {
    return this.provider;
  }

  getProvider(): any {
    return this.provider;
  }

  async switchChain(chainId: number | string): Promise<void> {
    if (!this.provider) {
      throw new Error('No provider connected');
    }

    const chainIdHex = `0x${Number(chainId).toString(16)}`;

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      this.chainId = Number(chainId);
    } catch (error: any) {
      // Chain not added, try to add it
      if (error.code === 4902) {
        throw new Error(`Chain ${chainId} not configured in wallet`);
      }
      throw error;
    }
  }

  getCapabilities(): WalletCapabilities {
    return {
      swap: true,
      bridge: true,
      limitOrders: false, // EVM limit orders redirect to Hyperliquid
      dca: false, // EVM DCA redirects to Hyperliquid
      perpetuals: true,
    };
  }

  private async getEvmProvider(): Promise<any> {
    // Try window.ethereum first (most common)
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return (window as any).ethereum;
    }

    // Fall back to window.ethereum
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return (window as any).ethereum;
    }

    return null;
  }

  private setupListeners(): void {
    if (!this.provider) return;

    this.accountsChangedHandler = (accounts: string[]) => {
      if (accounts.length === 0) {
        this.emitDisconnect();
      } else {
        this.emitAccountChange(accounts[0]);
      }
    };

    this.chainChangedHandler = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      this.emitChainChange(chainId);
    };

    this.disconnectHandler = () => {
      this.emitDisconnect();
    };

    this.provider.on?.('accountsChanged', this.accountsChangedHandler);
    this.provider.on?.('chainChanged', this.chainChangedHandler);
    this.provider.on?.('disconnect', this.disconnectHandler);
  }

  private removeListeners(): void {
    if (!this.provider) return;

    if (this.accountsChangedHandler) {
      this.provider.removeListener?.('accountsChanged', this.accountsChangedHandler);
    }
    if (this.chainChangedHandler) {
      this.provider.removeListener?.('chainChanged', this.chainChangedHandler);
    }
    if (this.disconnectHandler) {
      this.provider.removeListener?.('disconnect', this.disconnectHandler);
    }

    this.accountsChangedHandler = null;
    this.chainChangedHandler = null;
    this.disconnectHandler = null;
  }
}
