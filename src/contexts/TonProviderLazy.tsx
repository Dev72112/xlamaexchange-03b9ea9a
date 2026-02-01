/**
 * Lazy TON Connect Provider
 * 
 * TON Connect eagerly fetches 30+ wallet icons from config.ton.org (~487KB)
 * This wrapper defers loading until the user explicitly requests TON connection
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, Suspense, lazy } from 'react';

// Context to control lazy TON provider loading
interface TonLazyContextType {
  isTonLoaded: boolean;
  loadTonProvider: () => void;
}

const TonLazyContext = createContext<TonLazyContextType>({
  isTonLoaded: false,
  loadTonProvider: () => {},
});

export function useTonLazy() {
  return useContext(TonLazyContext);
}

// Lazy load the actual TON provider
const LazyTonConnectUIProvider = lazy(() => 
  import('@tonconnect/ui-react').then(m => ({ 
    default: m.TonConnectUIProvider 
  }))
);

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
  
  const loadTonProvider = useCallback(() => {
    if (!isTonLoaded) {
      console.log('[TonProviderLazy] Loading TON Connect provider...');
      setIsTonLoaded(true);
    }
  }, [isTonLoaded]);

  const contextValue = { isTonLoaded, loadTonProvider };

  if (isTonLoaded) {
    // Once loaded, wrap with actual TON provider
    return (
      <TonLazyContext.Provider value={contextValue}>
        <Suspense fallback={children}>
          <LazyTonConnectUIProvider 
            manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}
            actionsConfiguration={{ 
              twaReturnUrl: window.location.origin as `${string}://${string}` 
            }}
            walletsListConfiguration={{ 
              includeWallets: [{ 
                appName: 'tonkeeper', 
                name: 'Tonkeeper', 
                imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png', 
                aboutUrl: 'https://tonkeeper.com', 
                universalLink: 'https://app.tonkeeper.com/ton-connect', 
                bridgeUrl: 'https://bridge.tonapi.io/bridge', 
                platforms: ['ios', 'android', 'chrome', 'firefox', 'safari'] 
              }] 
            }}
          >
            {children}
          </LazyTonConnectUIProvider>
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

/**
 * Hook stubs for when TON is not loaded
 * These return safe defaults to prevent errors in components using TON hooks
 */
export function useTonConnectUIStub() {
  return [null] as const;
}

export function useTonWalletStub() {
  return null;
}

export function useTonAddressStub() {
  return null;
}
