/**
 * Session Manager - Single source of truth for wallet connections
 * 
 * This class orchestrates wallet connections and provides a stable
 * state interface for UI components to subscribe to.
 */

import {
  WalletAdapter,
  SessionState,
  DEFAULT_SESSION_STATE,
  DEFAULT_CAPABILITIES,
  Ecosystem,
} from './types';

type StateListener = (state: SessionState) => void;

class SessionManager {
  private adapter: WalletAdapter | null = null;
  private listeners: Set<StateListener> = new Set();
  private state: SessionState = { ...DEFAULT_SESSION_STATE };
  private cleanupFns: (() => void)[] = [];

  /**
   * Get current session state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Get current adapter (if any)
   */
  getAdapter(): WalletAdapter | null {
    return this.adapter;
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private setState(updates: Partial<SessionState>): void {
    this.state = { ...this.state, ...updates };
    this.emit();
  }

  /**
   * Emit current state to all listeners
   */
  private emit(): void {
    const stateCopy = { ...this.state };
    this.listeners.forEach(fn => {
      try {
        fn(stateCopy);
      } catch (error) {
        console.error('[SessionManager] Listener error:', error);
      }
    });
  }

  /**
   * Setup event listeners for the current adapter
   */
  private setupAdapterListeners(): void {
    if (!this.adapter) return;

    // Clean up any existing listeners
    this.cleanupListeners();

    // Subscribe to account changes
    const unsubAccount = this.adapter.onAccountChange((address) => {
      console.log('[SessionManager] Account changed:', address);
      if (address) {
        this.setState({ address, error: null });
      } else {
        // Account disconnected
        this.handleDisconnect();
      }
    });
    this.cleanupFns.push(unsubAccount);

    // Subscribe to chain changes
    const unsubChain = this.adapter.onChainChange((chainId) => {
      console.log('[SessionManager] Chain changed:', chainId);
      this.setState({ chainId });
    });
    this.cleanupFns.push(unsubChain);

    // Subscribe to disconnect
    const unsubDisconnect = this.adapter.onDisconnect(() => {
      console.log('[SessionManager] Wallet disconnected');
      this.handleDisconnect();
    });
    this.cleanupFns.push(unsubDisconnect);
  }

  /**
   * Clean up event listeners
   */
  private cleanupListeners(): void {
    this.cleanupFns.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('[SessionManager] Cleanup error:', error);
      }
    });
    this.cleanupFns = [];
  }

  /**
   * Handle disconnect event
   */
  private handleDisconnect(): void {
    this.cleanupListeners();
    this.adapter = null;
    this.setState({ ...DEFAULT_SESSION_STATE });
  }

  /**
   * Connect with a specific adapter
   */
  async connect(adapter: WalletAdapter): Promise<string> {
    try {
      // Disconnect existing connection first
      if (this.adapter) {
        await this.disconnect();
      }

      this.setState({ isConnecting: true, error: null });

      // Connect and get address
      const address = await adapter.connect();

      // Store adapter and setup listeners
      this.adapter = adapter;
      this.setupAdapterListeners();

      // Update state with connection info
      this.setState({
        ecosystem: adapter.ecosystem,
        address,
        chainId: adapter.getChainId(),
        isConnected: true,
        isConnecting: false,
        walletName: adapter.name,
        walletIcon: adapter.icon || null,
        capabilities: adapter.getCapabilities(),
        error: null,
      });

      console.log('[SessionManager] Connected:', {
        ecosystem: adapter.ecosystem,
        address,
        wallet: adapter.name,
      });

      return address;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      console.error('[SessionManager] Connection error:', error);
      this.setState({
        isConnecting: false,
        error: message,
      });
      throw error;
    }
  }

  /**
   * Disconnect current wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (this.adapter) {
        await this.adapter.disconnect();
      }
    } catch (error) {
      console.warn('[SessionManager] Disconnect error:', error);
    } finally {
      this.handleDisconnect();
    }
  }

  /**
   * Switch chain on current adapter
   */
  async switchChain(chainId: number | string): Promise<void> {
    if (!this.adapter) {
      throw new Error('No wallet connected');
    }

    try {
      await this.adapter.switchChain(chainId);
      this.setState({ chainId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chain switch failed';
      console.error('[SessionManager] Chain switch error:', error);
      throw error;
    }
  }

  /**
   * Get signer from current adapter
   */
  getSigner(): any {
    return this.adapter?.getSigner() || null;
  }

  /**
   * Get provider from current adapter
   */
  getProvider(): any {
    return this.adapter?.getProvider() || null;
  }

  /**
   * Check if connected to a specific ecosystem
   */
  isConnectedTo(ecosystem: Ecosystem): boolean {
    return this.state.isConnected && this.state.ecosystem === ecosystem;
  }

  /**
   * Check if connected to a specific chain
   */
  isOnChain(chainId: number | string): boolean {
    return this.state.chainId === chainId || String(this.state.chainId) === String(chainId);
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export class for testing
export { SessionManager };
