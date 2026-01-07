/**
 * React hook for OKX Wallet integration
 * Provides unified multi-chain wallet connection via OKX Universal Provider
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OKXUniversalProvider } from '@okxconnect/universal-provider';
import {
  initOkxProvider,
  connectOkxWallet,
  disconnectOkx,
  switchOkxChain,
  isOkxExtensionAvailable,
  isInOkxBrowser,
  getOkxSession,
  clearOkxSession,
  sendOkxTransaction,
  signOkxMessage,
  type OkxSession,
} from '@/lib/okxProvider';
import { isMobileBrowser } from '@/lib/wallet-deeplinks';

export interface UseOkxWalletResult {
  // State
  provider: OKXUniversalProvider | null;
  session: OkxSession | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Addresses from session
  evmAddress: string | null;
  solanaAddress: string | null;
  tronAddress: string | null;
  suiAddress: string | null;
  tonAddress: string | null;
  
  // Environment checks
  isOkxAvailable: boolean;
  isInOkxApp: boolean;
  isMobile: boolean;
  
  // Methods
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  switchChain: (chainIndex: string) => Promise<boolean>;
  sendTransaction: (chainIndex: string, tx: any) => Promise<string>;
  signMessage: (chainIndex: string, message: string, address: string) => Promise<string>;
}

export function useOkxWallet(): UseOkxWalletResult {
  const [provider, setProvider] = useState<OKXUniversalProvider | null>(null);
  const [session, setSession] = useState<OkxSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const initRef = useRef(false);
  
  // Environment checks
  const isOkxAvailable = isOkxExtensionAvailable();
  const isInOkxApp = isInOkxBrowser();
  const isMobile = isMobileBrowser();
  
  // Derived state
  const isConnected = !!session && !!session.addresses;
  const evmAddress = session?.addresses?.evm || null;
  const solanaAddress = session?.addresses?.solana || null;
  const tronAddress = session?.addresses?.tron || null;
  const suiAddress = session?.addresses?.sui || null;
  const tonAddress = session?.addresses?.ton || null;
  
  // Initialize provider on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const init = async () => {
      try {
        const okxProvider = await initOkxProvider();
        if (okxProvider) {
          setProvider(okxProvider);
          
          // Check for existing session
          const existingSession = getOkxSession();
          if (existingSession) {
            setSession(existingSession);
            console.log('[useOkxWallet] Restored session');
          }
          
          // Listen for session events
          okxProvider.on('session_delete', () => {
            console.log('[useOkxWallet] Session deleted');
            setSession(null);
            clearOkxSession();
          });
          
          okxProvider.on('session_update', (data: any) => {
            console.log('[useOkxWallet] Session updated:', data);
          });
        }
      } catch (err) {
        console.error('[useOkxWallet] Init error:', err);
      }
    };
    
    init();
  }, []);
  
  // Connect to OKX wallet
  const connect = useCallback(async (): Promise<boolean> => {
    if (!provider) {
      setError('OKX provider not initialized');
      return false;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Handle mobile external browser - open OKX app
      if (isMobile && !isInOkxApp && !isOkxAvailable) {
        const dappUrl = encodeURIComponent(window.location.href);
        const deeplink = `okx://wallet/dapp/url?dappUrl=${dappUrl}`;
        window.location.href = deeplink;
        setIsConnecting(false);
        return false; // Will redirect
      }
      
      const newSession = await connectOkxWallet(provider);
      
      if (newSession) {
        setSession(newSession);
        return true;
      }
      
      return false;
    } catch (err: any) {
      const message = err.message || 'Failed to connect OKX wallet';
      setError(message);
      console.error('[useOkxWallet] Connect error:', err);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [provider, isMobile, isInOkxApp, isOkxAvailable]);
  
  // Disconnect wallet
  const disconnect = useCallback(async (): Promise<void> => {
    if (provider) {
      await disconnectOkx(provider);
    }
    setSession(null);
    setError(null);
  }, [provider]);
  
  // Switch chain (seamless, no signing)
  const switchChain = useCallback(async (chainIndex: string): Promise<boolean> => {
    if (!provider) return false;
    return switchOkxChain(provider, chainIndex);
  }, [provider]);
  
  // Send transaction
  const sendTransaction = useCallback(async (
    chainIndex: string, 
    tx: any
  ): Promise<string> => {
    if (!provider) throw new Error('Provider not connected');
    return sendOkxTransaction(provider, chainIndex, tx);
  }, [provider]);
  
  // Sign message
  const signMessage = useCallback(async (
    chainIndex: string,
    message: string,
    address: string
  ): Promise<string> => {
    if (!provider) throw new Error('Provider not connected');
    return signOkxMessage(provider, chainIndex, message, address);
  }, [provider]);
  
  return {
    provider,
    session,
    isConnecting,
    isConnected,
    error,
    evmAddress,
    solanaAddress,
    tronAddress,
    suiAddress,
    tonAddress,
    isOkxAvailable,
    isInOkxApp,
    isMobile,
    connect,
    disconnect,
    switchChain,
    sendTransaction,
    signMessage,
  };
}
