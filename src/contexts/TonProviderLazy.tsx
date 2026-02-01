/**
 * Lazy TON Connect Provider
 * 
 * TON Connect eagerly fetches 30+ wallet icons from config.ton.org (~487KB)
 * This wrapper defers loading until the user explicitly requests TON connection
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, Suspense, lazy } from 'react';

// Context to control lazy TON provider loading and share hook values
interface TonLazyContextType {
  isTonLoaded: boolean;
  loadTonProvider: () => void;
  tonConnectUI: any | null;
  tonWallet: any | null;
  tonAddress: string | null;
}

const TonLazyContext = createContext<TonLazyContextType>({
  isTonLoaded: false,
  loadTonProvider: () => {},
  tonConnectUI: null,
  tonWallet: null,
  tonAddress: null,
});

export function useTonLazy() {
  return useContext(TonLazyContext);
}

// Lazy load the TON hooks bridge component (contains actual hook calls)
const LazyTonHooksBridge = lazy(() => import('./TonHooksBridge'));

interface TonProviderLazyProps {
  children: ReactNode;
}

/**
 * TonProviderLazy - Wraps children and only loads TON Connect when requested
 * 
 * By default, children are rendered without TON Connect overhead.
 * When loadTonProvider() is called (e.g., user clicks Connect TON),
 * the full TON Connect provider is dynamically loaded.
 */
export function TonProviderLazy({ children }: TonProviderLazyProps) {
  const [isTonLoaded, setIsTonLoaded] = useState(false);
  const [tonHooks, setTonHooks] = useState<{ tonConnectUI: any; tonWallet: any; tonAddress: string | null }>({
    tonConnectUI: null,
    tonWallet: null,
    tonAddress: null,
  });
  
  const loadTonProvider = useCallback(() => {
    if (!isTonLoaded) {
      console.log('[TonProviderLazy] Loading TON Connect provider...');
      setIsTonLoaded(true);
    }
  }, [isTonLoaded]);

  const handleHooksReady = useCallback((hooks: { tonConnectUI: any; tonWallet: any; tonAddress: string | null }) => {
    setTonHooks(hooks);
  }, []);

  const contextValue: TonLazyContextType = {
    isTonLoaded,
    loadTonProvider,
    tonConnectUI: tonHooks.tonConnectUI,
    tonWallet: tonHooks.tonWallet,
    tonAddress: tonHooks.tonAddress,
  };

  if (isTonLoaded) {
    // Once loaded, render the lazy bridge that will load TON provider + hooks
    return (
      <TonLazyContext.Provider value={contextValue}>
        <Suspense fallback={children}>
          <LazyTonHooksBridge onHooksReady={handleHooksReady}>
            {children}
          </LazyTonHooksBridge>
        </Suspense>
      </TonLazyContext.Provider>
    );
  }

  // Before loading: render children without TON overhead
  return (
    <TonLazyContext.Provider value={contextValue}>
      {children}
    </TonLazyContext.Provider>
  );
}
