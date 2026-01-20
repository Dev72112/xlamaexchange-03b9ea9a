/**
 * useSession Hook
 * 
 * Thin React hook that provides stable wallet state to UI components.
 * This is the ONLY way UI components should interact with wallet state.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { sessionManager } from '../core/SessionManager';
import { SessionState, WalletAdapter, Ecosystem } from '../core/types';

export interface UseSessionReturn extends SessionState {
  // Actions
  connect: (adapter: WalletAdapter) => Promise<string>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number | string) => Promise<void>;
  
  // Getters
  getSigner: () => any;
  getProvider: () => any;
  getAdapter: () => WalletAdapter | null;
  
  // Helpers
  isConnectedTo: (ecosystem: Ecosystem) => boolean;
  isOnChain: (chainId: number | string) => boolean;
}

/**
 * Main hook for wallet state
 * Subscribes to SessionManager and provides stable API
 */
export function useSession(): UseSessionReturn {
  const [state, setState] = useState<SessionState>(sessionManager.getState());

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = sessionManager.subscribe(setState);
    return unsubscribe;
  }, []);

  // Memoized actions
  const connect = useCallback(async (adapter: WalletAdapter) => {
    return sessionManager.connect(adapter);
  }, []);

  const disconnect = useCallback(async () => {
    return sessionManager.disconnect();
  }, []);

  const switchChain = useCallback(async (chainId: number | string) => {
    return sessionManager.switchChain(chainId);
  }, []);

  // Memoized getters
  const getSigner = useCallback(() => {
    return sessionManager.getSigner();
  }, []);

  const getProvider = useCallback(() => {
    return sessionManager.getProvider();
  }, []);

  const getAdapter = useCallback(() => {
    return sessionManager.getAdapter();
  }, []);

  // Memoized helpers
  const isConnectedTo = useCallback((ecosystem: Ecosystem) => {
    return sessionManager.isConnectedTo(ecosystem);
  }, []);

  const isOnChain = useCallback((chainId: number | string) => {
    return sessionManager.isOnChain(chainId);
  }, []);

  // Combine state and actions
  return useMemo(() => ({
    ...state,
    connect,
    disconnect,
    switchChain,
    getSigner,
    getProvider,
    getAdapter,
    isConnectedTo,
    isOnChain,
  }), [
    state,
    connect,
    disconnect,
    switchChain,
    getSigner,
    getProvider,
    getAdapter,
    isConnectedTo,
    isOnChain,
  ]);
}

/**
 * Selector hook for derived state
 * Reduces re-renders by only subscribing to specific state
 */
export function useSessionSelector<T>(selector: (state: SessionState) => T): T {
  const [selected, setSelected] = useState<T>(() => selector(sessionManager.getState()));

  useEffect(() => {
    let currentValue = selector(sessionManager.getState());
    
    const unsubscribe = sessionManager.subscribe((state) => {
      const nextValue = selector(state);
      // Only update if the selected value changed
      if (!Object.is(currentValue, nextValue)) {
        currentValue = nextValue;
        setSelected(nextValue);
      }
    });

    return unsubscribe;
  }, [selector]);

  return selected;
}

/**
 * Simple hook for just the connected address
 */
export function useSessionAddress(): string | null {
  return useSessionSelector(state => state.address);
}

/**
 * Simple hook for connection status
 */
export function useIsConnected(): boolean {
  return useSessionSelector(state => state.isConnected);
}

/**
 * Simple hook for current ecosystem
 */
export function useSessionEcosystem(): Ecosystem | null {
  return useSessionSelector(state => state.ecosystem);
}
