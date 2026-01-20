/**
 * Base Wallet Adapter
 * Provides default implementations for WalletAdapter interface
 */

import { WalletAdapter, Ecosystem, WalletCapabilities, DEFAULT_CAPABILITIES } from '../core/types';

export abstract class BaseAdapter implements WalletAdapter {
  abstract readonly ecosystem: Ecosystem;
  abstract readonly name: string;
  readonly icon?: string;

  protected address: string | null = null;
  protected chainId: number | string | null = null;
  protected connected: boolean = false;

  // Event listeners
  protected accountChangeListeners: Set<(address: string | null) => void> = new Set();
  protected chainChangeListeners: Set<(chainId: number | string) => void> = new Set();
  protected disconnectListeners: Set<() => void> = new Set();

  abstract connect(): Promise<string>;
  abstract disconnect(): Promise<void>;
  abstract getSigner(): any;
  abstract getProvider(): any;
  abstract switchChain(chainId: number | string): Promise<void>;

  isConnected(): boolean {
    return this.connected && !!this.address;
  }

  getAddress(): string | null {
    return this.address;
  }

  getChainId(): number | string | null {
    return this.chainId;
  }

  getCapabilities(): WalletCapabilities {
    return { ...DEFAULT_CAPABILITIES };
  }

  // Event subscriptions
  onAccountChange(callback: (address: string | null) => void): () => void {
    this.accountChangeListeners.add(callback);
    return () => this.accountChangeListeners.delete(callback);
  }

  onChainChange(callback: (chainId: number | string) => void): () => void {
    this.chainChangeListeners.add(callback);
    return () => this.chainChangeListeners.delete(callback);
  }

  onDisconnect(callback: () => void): () => void {
    this.disconnectListeners.add(callback);
    return () => this.disconnectListeners.delete(callback);
  }

  // Protected methods for subclasses to emit events
  protected emitAccountChange(address: string | null): void {
    this.address = address;
    this.accountChangeListeners.forEach(fn => {
      try {
        fn(address);
      } catch (error) {
        console.error('[BaseAdapter] Account change listener error:', error);
      }
    });
  }

  protected emitChainChange(chainId: number | string): void {
    this.chainId = chainId;
    this.chainChangeListeners.forEach(fn => {
      try {
        fn(chainId);
      } catch (error) {
        console.error('[BaseAdapter] Chain change listener error:', error);
      }
    });
  }

  protected emitDisconnect(): void {
    this.connected = false;
    this.address = null;
    this.chainId = null;
    this.disconnectListeners.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('[BaseAdapter] Disconnect listener error:', error);
      }
    });
  }

  protected cleanup(): void {
    this.accountChangeListeners.clear();
    this.chainChangeListeners.clear();
    this.disconnectListeners.clear();
  }
}
