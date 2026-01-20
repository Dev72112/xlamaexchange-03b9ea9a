/**
 * Sui Adapter
 * Wraps @mysten/dapp-kit for Sui Wallet and other Sui wallets
 */

import { BaseAdapter } from './BaseAdapter';
import { Ecosystem, WalletCapabilities } from '../core/types';

export class SuiAdapter extends BaseAdapter {
  readonly ecosystem: Ecosystem = 'sui';
  readonly name: string;
  override readonly icon?: string = undefined;

  private suiWallet: any = null;
  private signPersonalMessage: any = null;

  constructor(walletName: string = 'Sui Wallet', walletIcon?: string) {
    super();
    this.name = walletName;
    this.icon = walletIcon;
  }

  /**
   * Set the Sui wallet instance from dapp-kit hooks
   * Called from React component that has access to useCurrentWallet()
   */
  setSuiWallet(wallet: any): void {
    this.suiWallet = wallet;
  }

  /**
   * Set the signing function from dapp-kit hooks
   * Called from React component that has access to useSignPersonalMessage()
   */
  setSignFunction(signFn: any): void {
    this.signPersonalMessage = signFn;
  }

  /**
   * Update address from React hook
   * Called when useCurrentAccount() updates
   */
  updateAddressFromHook(address: string | null): void {
    if (address !== this.address) {
      this.address = address;
      this.connected = !!address;
      this.chainId = address ? 'sui:mainnet' : null;
      this.emitAccountChange(address);
    }
  }

  async connect(): Promise<string> {
    // Sui connection is primarily handled by dapp-kit's ConnectButton/Modal
    // This method is for programmatic connection if wallet ref is available
    
    if (!this.suiWallet) {
      throw new Error('Sui wallet not initialized. Use dapp-kit ConnectButton.');
    }

    try {
      // If wallet has connect method
      if (this.suiWallet.connect) {
        await this.suiWallet.connect();
      }

      // Get address from wallet
      const account = this.suiWallet.currentAccount || this.suiWallet.accounts?.[0];
      const address = account?.address;

      if (!address) {
        throw new Error('Failed to get Sui address');
      }

      this.address = address;
      this.chainId = 'sui:mainnet';
      this.connected = true;

      return address;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.suiWallet?.disconnect) {
        await this.suiWallet.disconnect();
      }
    } catch (error) {
      console.warn('[SuiAdapter] Disconnect error:', error);
    } finally {
      this.emitDisconnect();
      this.cleanup();
    }
  }

  getSigner(): any {
    return this.signPersonalMessage || this.suiWallet;
  }

  getProvider(): any {
    return this.suiWallet;
  }

  async switchChain(_chainId: number | string): Promise<void> {
    // Sui mainnet only for now
    console.log('[SuiAdapter] Sui mainnet only');
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

  /**
   * Sign a personal message using dapp-kit
   */
  async signMessage(message: string): Promise<string> {
    if (!this.signPersonalMessage) {
      throw new Error('Sign function not available');
    }

    const result = await this.signPersonalMessage({
      message: new TextEncoder().encode(message),
    });

    return result.signature;
  }
}
