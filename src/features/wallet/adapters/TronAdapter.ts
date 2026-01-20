/**
 * Tron Adapter
 * Wraps TronLink and other Tron wallets
 */

import { BaseAdapter } from './BaseAdapter';
import { Ecosystem, WalletCapabilities } from '../core/types';

export class TronAdapter extends BaseAdapter {
  readonly ecosystem: Ecosystem = 'tron';
  readonly name: string;
  override readonly icon?: string = undefined;

  private tronWeb: any = null;
  private messageHandler: ((e: MessageEvent) => void) | null = null;

  constructor(walletName: string = 'TronLink', walletIcon?: string) {
    super();
    this.name = walletName;
    this.icon = walletIcon;
  }

  async connect(): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Window not available');
    }

    // Check for TronLink or OKX Tron
    const tronLink = (window as any).tronLink;
    const tronWeb = (window as any).tronWeb;
    const okxTron = (window as any).okxwallet?.tronLink;

    const provider = okxTron || tronLink;

    if (!provider && !tronWeb) {
      throw new Error('TronLink wallet not installed');
    }

    try {
      // Request connection if available
      if (provider?.request) {
        await provider.request({ method: 'tron_requestAccounts' });
      }

      // Get TronWeb instance and address
      this.tronWeb = (window as any).tronWeb;
      
      if (!this.tronWeb?.defaultAddress?.base58) {
        // Wait a moment for TronWeb to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        this.tronWeb = (window as any).tronWeb;
      }

      const address = this.tronWeb?.defaultAddress?.base58;

      if (!address) {
        throw new Error('Failed to get Tron address. Please unlock TronLink.');
      }

      this.address = address;
      this.chainId = 'tron-mainnet';
      this.connected = true;

      this.setupListeners();
      return address;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.removeListeners();
    this.tronWeb = null;
    this.emitDisconnect();
    this.cleanup();
  }

  getSigner(): any {
    return this.tronWeb;
  }

  getProvider(): any {
    return (window as any).tronWeb || this.tronWeb;
  }

  async switchChain(_chainId: number | string): Promise<void> {
    // Tron only has mainnet, no chain switching needed
    console.log('[TronAdapter] Tron only has mainnet');
  }

  getCapabilities(): WalletCapabilities {
    return {
      swap: true,       // Via OKX DEX
      bridge: false,    // Limited bridge support
      limitOrders: true,
      dca: true,
      perpetuals: false,
    };
  }

  private setupListeners(): void {
    // TronLink fires message events for account changes
    this.messageHandler = (e: MessageEvent) => {
      if (e.data?.message?.action === 'accountsChanged') {
        const newAddress = e.data.message.data?.address;
        if (newAddress && newAddress !== this.address) {
          this.emitAccountChange(newAddress);
        }
      }
      if (e.data?.message?.action === 'disconnect') {
        this.emitDisconnect();
      }
      if (e.data?.message?.action === 'setNode') {
        // Network changed
        console.log('[TronAdapter] Network changed');
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  private removeListeners(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }

  protected override cleanup(): void {
    this.removeListeners();
    super.cleanup();
  }
}
