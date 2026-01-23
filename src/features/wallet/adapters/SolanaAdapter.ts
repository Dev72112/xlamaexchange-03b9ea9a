/**
 * Solana Adapter
 * Wraps Solana wallet adapters (Phantom, Solflare, etc.)
 */

import { BaseAdapter } from './BaseAdapter';
import { Ecosystem, WalletCapabilities } from '../core/types';

export class SolanaAdapter extends BaseAdapter {
  readonly ecosystem: Ecosystem = 'solana';
  readonly name: string;
  override readonly icon?: string = undefined;

  private wallet: any = null;

  constructor(walletName: string = 'Phantom', walletIcon?: string) {
    super();
    this.name = walletName;
    this.icon = walletIcon;
  }

  async connect(): Promise<string> {
    try {
      const wallet = await this.getWallet();
      if (!wallet) {
        throw new Error(`${this.name} wallet not found`);
      }

      this.wallet = wallet;

      // Connect to wallet
      if (!wallet.isConnected) {
        await wallet.connect();
      }

      const publicKey = wallet.publicKey;
      if (!publicKey) {
        throw new Error('No public key returned');
      }

      this.address = publicKey.toString();
      this.chainId = 'solana';
      this.connected = true;

      this.setupListeners();
      return this.address;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.wallet?.disconnect?.();
    } catch (error) {
      console.warn('[SolanaAdapter] Disconnect error:', error);
    } finally {
      this.emitDisconnect();
      this.wallet = null;
      this.cleanup();
    }
  }

  getSigner(): any {
    return this.wallet;
  }

  getProvider(): any {
    return this.wallet;
  }

  async switchChain(_chainId: number | string): Promise<void> {
    // Solana doesn't have chain switching - it's always mainnet
    console.log('[SolanaAdapter] Solana is single-chain (mainnet)');
  }

  getCapabilities(): WalletCapabilities {
    return {
      swap: true,
      bridge: false,
      limitOrders: false, // Coming soon
      dca: false, // Coming soon
      perpetuals: false,
    };
  }

  private async getWallet(): Promise<any> {
    if (typeof window === 'undefined') return null;

    const solana = (window as any).solana;
    const phantom = (window as any).phantom?.solana;
    const solflare = (window as any).solflare;
    const okxSolana = (window as any).okxwallet?.solana;

    // Return based on wallet name preference
    if (this.name.toLowerCase().includes('phantom')) {
      return phantom || solana;
    }
    if (this.name.toLowerCase().includes('solflare')) {
      return solflare;
    }
    if (this.name.toLowerCase().includes('okx')) {
      return okxSolana;
    }

    // Default to first available
    return phantom || solana || solflare || okxSolana;
  }

  private setupListeners(): void {
    if (!this.wallet) return;

    this.wallet.on?.('connect', () => {
      const address = this.wallet.publicKey?.toString();
      if (address) {
        this.emitAccountChange(address);
      }
    });

    this.wallet.on?.('disconnect', () => {
      this.emitDisconnect();
    });

    this.wallet.on?.('accountChanged', (publicKey: any) => {
      if (publicKey) {
        this.emitAccountChange(publicKey.toString());
      } else {
        this.emitDisconnect();
      }
    });
  }
}
