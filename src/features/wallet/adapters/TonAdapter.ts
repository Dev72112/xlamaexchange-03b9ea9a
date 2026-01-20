/**
 * TON Adapter
 * Wraps TON Connect UI for Tonkeeper and other TON wallets
 */

import { BaseAdapter } from './BaseAdapter';
import { Ecosystem, WalletCapabilities } from '../core/types';

export class TonAdapter extends BaseAdapter {
  readonly ecosystem: Ecosystem = 'ton';
  readonly name: string;
  override readonly icon?: string = undefined;

  private tonConnectUI: any = null;
  private unsubscribe: (() => void) | null = null;

  constructor(walletName: string = 'Tonkeeper', walletIcon?: string) {
    super();
    this.name = walletName;
    this.icon = walletIcon;
  }

  /**
   * Set the TonConnectUI instance from React context
   * Must be called before connect()
   */
  setTonConnectUI(ui: any): void {
    this.tonConnectUI = ui;
    this.setupStatusListener();
  }

  /**
   * Update connection state from React hook
   * Called when useTonWallet() hook updates
   */
  updateFromHook(wallet: any): void {
    if (wallet) {
      const address = wallet.account?.address;
      if (address && address !== this.address) {
        this.address = address;
        this.chainId = 'ton-mainnet';
        this.connected = true;
        this.emitAccountChange(address);
      }
    } else if (this.connected) {
      this.emitDisconnect();
    }
  }

  async connect(): Promise<string> {
    if (!this.tonConnectUI) {
      throw new Error('TonConnectUI not initialized. Call setTonConnectUI first.');
    }

    // Check if already connected
    const existingWallet = this.tonConnectUI.wallet;
    if (existingWallet?.account?.address) {
      this.address = existingWallet.account.address;
      this.chainId = 'ton-mainnet';
      this.connected = true;
      return this.address;
    }

    // Open TON Connect modal
    await this.tonConnectUI.openModal();

    // Wait for connection via status change
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('TON connection timeout'));
      }, 60000);

      const checkConnection = () => {
        const wallet = this.tonConnectUI.wallet;
        if (wallet?.account?.address) {
          clearTimeout(timeout);
          this.address = wallet.account.address;
          this.chainId = 'ton-mainnet';
          this.connected = true;
          resolve(this.address);
        }
      };

      // Poll for connection (modal handles the flow)
      const interval = setInterval(() => {
        checkConnection();
        if (this.connected) {
          clearInterval(interval);
        }
      }, 500);

      // Also clear interval on timeout
      setTimeout(() => clearInterval(interval), 60000);
    });
  }

  async disconnect(): Promise<void> {
    try {
      if (this.tonConnectUI?.disconnect) {
        await this.tonConnectUI.disconnect();
      }
    } catch (error) {
      console.warn('[TonAdapter] Disconnect error:', error);
    } finally {
      this.emitDisconnect();
      this.cleanup();
    }
  }

  getSigner(): any {
    return this.tonConnectUI;
  }

  getProvider(): any {
    return this.tonConnectUI;
  }

  async switchChain(_chainId: number | string): Promise<void> {
    // TON only has mainnet
    console.log('[TonAdapter] TON only has mainnet');
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

  private setupStatusListener(): void {
    if (!this.tonConnectUI?.onStatusChange) return;

    // Subscribe to wallet status changes
    this.unsubscribe = this.tonConnectUI.onStatusChange((wallet: any) => {
      if (wallet) {
        const address = wallet.account?.address;
        if (address && address !== this.address) {
          this.address = address;
          this.chainId = 'ton-mainnet';
          this.connected = true;
          this.emitAccountChange(address);
        }
      } else if (this.connected) {
        this.emitDisconnect();
      }
    });
  }

  protected override cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    super.cleanup();
  }
}
